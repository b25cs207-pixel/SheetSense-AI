import io
import re
from PIL import Image
import pandas as pd
from backend.parsers.base import ParsedData
from backend.parsers.document_structurer import structure_text_content

def parse_image(file_bytes: bytes, filename: str = "upload.png") -> ParsedData:
    try:
        img = Image.open(io.BytesIO(file_bytes))
        width, height = img.size
        img_format = img.format

        extracted_text = ""
        has_ocr = False
        try:
            import pytesseract
            extracted_text = pytesseract.image_to_string(img)
            has_ocr = True
        except Exception:
            extracted_text = ""
            has_ocr = False

        if has_ocr and extracted_text.strip():
            # 1. Look for delimited tables
            lines = [l.strip() for l in extracted_text.split("\n") if l.strip()]
            table_rows = []
            for line in lines:
                parts = re.split(r'\s{2,}|\t|\|', line)
                parts = [p.strip() for p in parts if p.strip()]
                if len(parts) >= 2:
                    table_rows.append(parts)

            if len(table_rows) >= 3:
                from collections import Counter
                lens = [len(r) for r in table_rows]
                common_len, freq = Counter(lens).most_common(1)[0]
                if freq >= 2 and common_len >= 2:
                    filtered = [r for r in table_rows if len(r) == common_len]
                    headers = filtered[0]
                    df = pd.DataFrame(filtered[1:], columns=headers)
                    for c in df.columns:
                        df[c] = pd.to_numeric(df[c], errors="ignore")
                    return ParsedData(
                        df=df,
                        text_content=extracted_text,
                        metadata={"image_dimensions": f"{width}x{height}", "format": img_format, "ocr_engine": "tesseract"},
                        is_structured=True
                    )

            # 2. Resilient fallback: Structure extracted OCR text
            df_struct, struct_warnings, struct_meta = structure_text_content(extracted_text, filename)
            if df_struct is not None:
                struct_meta["image_dimensions"] = f"{width}x{height}"
                struct_meta["ocr_engine"] = "tesseract"
                return ParsedData(
                    df=df_struct,
                    text_content=extracted_text,
                    metadata=struct_meta,
                    warnings=struct_warnings,
                    is_structured=True
                )

            return ParsedData(
                df=None,
                text_content=extracted_text,
                metadata={"image_dimensions": f"{width}x{height}", "format": img_format, "ocr_engine": "tesseract"},
                warnings=["Text extracted from image via OCR. No tabular numbers could be inferred."],
                is_structured=False
            )

        # Fallback when local OCR binary is not installed: synthesize image property metadata table
        img_meta_rows = [
            {"Property": "Width (pixels)", "Value": float(width), "Unit": "px", "Category": "Geometry"},
            {"Property": "Height (pixels)", "Value": float(height), "Unit": "px", "Category": "Geometry"},
            {"Property": "Aspect Ratio", "Value": round(float(width) / max(height, 1), 2), "Unit": "ratio", "Category": "Geometry"},
            {"Property": "Total Pixels (MP)", "Value": round(float(width * height) / 1000000.0, 2), "Unit": "Megapixels", "Category": "Resolution"},
            {"Property": "File Size (KB)", "Value": round(len(file_bytes) / 1024.0, 1), "Unit": "KB", "Category": "Storage"}
        ]
        df_img = pd.DataFrame(img_meta_rows)
        return ParsedData(
            df=df_img,
            text_content=f"Image file '{filename}' ({width}x{height} {img_format}). Local Tesseract OCR binary not detected in PATH; extracted image geometric attributes.",
            metadata={"image_dimensions": f"{width}x{height}", "format": img_format, "has_ocr_binary": False},
            warnings=["Local Tesseract binary was not found in PATH. Extracted image geometric attributes and dimensions."],
            is_structured=True
        )
    except Exception as e:
        return ParsedData(
            df=None,
            warnings=[f"Failed to process image: {str(e)}"],
            is_structured=False
        )
