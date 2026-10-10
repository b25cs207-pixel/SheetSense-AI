import io
import re
import pandas as pd
from pypdf import PdfReader
from backend.parsers.base import ParsedData
from backend.parsers.document_structurer import structure_text_content

def parse_pdf(file_bytes: bytes, filename: str = "upload.pdf") -> ParsedData:
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        full_text = []
        for i, page in enumerate(reader.pages):
            txt = page.extract_text()
            if txt:
                full_text.append(txt)
                
        joined_text = "\n".join(full_text)
        if not joined_text.strip():
            return ParsedData(
                df=None,
                text_content="",
                warnings=["The PDF contains no extractable text layer (may be scanned). OCR recommended."],
                is_structured=False,
                metadata={"page_count": len(reader.pages)}
            )

        # 1. Attempt table extraction from lines with consistent multi-column separators
        lines = [line.strip() for line in joined_text.split("\n") if line.strip()]
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
            if freq >= 3 and common_len >= 2:
                filtered_rows = [r for r in table_rows if len(r) == common_len]
                headers = filtered_rows[0]
                unique_headers = []
                seen = set()
                for idx, h in enumerate(headers):
                    col_name = h if h not in seen else f"{h}_{idx}"
                    seen.add(col_name)
                    unique_headers.append(col_name)
                    
                data = filtered_rows[1:]
                if len(data) > 0:
                    df = pd.DataFrame(data, columns=unique_headers)
                    for c in df.columns:
                        df[c] = pd.to_numeric(df[c], errors="ignore")
                    return ParsedData(
                        df=df,
                        text_content=joined_text[:4000],
                        metadata={"page_count": len(reader.pages), "reconstructed_table": True, "rows": len(df), "cols": len(df.columns)},
                        is_structured=True
                    )

        # 2. Resilient fallback: Structure extracted document text & measurements
        df_struct, struct_warnings, struct_meta = structure_text_content(joined_text, filename)
        if df_struct is not None:
            struct_meta["page_count"] = len(reader.pages)
            return ParsedData(
                df=df_struct,
                text_content=joined_text,
                metadata=struct_meta,
                warnings=struct_warnings,
                is_structured=True
            )

        return ParsedData(
            df=None,
            text_content=joined_text,
            metadata={"page_count": len(reader.pages)},
            warnings=["Document text extracted successfully, but no quantitative or structural records could be formed."],
            is_structured=False
        )
    except Exception as e:
        return ParsedData(
            df=None,
            warnings=[f"Failed to process PDF: {str(e)}"],
            is_structured=False
        )
