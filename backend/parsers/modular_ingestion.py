import os
from typing import Optional
from backend.config import settings
from backend.parsers.base import ParsedData
from backend.parsers.csv_parser import parse_csv
from backend.parsers.excel_parser import parse_excel
from backend.parsers.json_parser import parse_json
from backend.parsers.pdf_parser import parse_pdf
from backend.parsers.doc_parser import parse_docx, parse_txt
from backend.parsers.image_parser import parse_image
from backend.parsers.url_parser import parse_url

def ingest_source(
    source_type: str,
    file_bytes: Optional[bytes] = None,
    filename: str = "data",
    url: Optional[str] = None,
    sheet_name: Optional[str] = None
) -> ParsedData:
    if source_type == "url":
        if not url:
            return ParsedData(df=None, warnings=["No URL provided."], is_structured=False)
        return parse_url(url)

    if not file_bytes:
        return ParsedData(df=None, warnings=["No file content received."], is_structured=False)

    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        return ParsedData(
            df=None,
            warnings=[f"File size ({size_mb:.1f} MB) exceeds maximum allowed limit of {settings.MAX_FILE_SIZE_MB} MB."],
            is_structured=False
        )

    ext = os.path.splitext(filename)[1].lower()

    if ext in [".csv", ".tsv"]:
        res = parse_csv(file_bytes, filename)
    elif ext in [".xlsx", ".xls"]:
        res = parse_excel(file_bytes, filename, sheet_name=sheet_name)
    elif ext == ".json":
        res = parse_json(file_bytes, filename)
    elif ext == ".pdf":
        res = parse_pdf(file_bytes, filename)
    elif ext == ".docx":
        res = parse_docx(file_bytes, filename)
    elif ext in [".txt", ".log"]:
        res = parse_txt(file_bytes, filename)
    elif ext in [".png", ".jpg", ".jpeg", ".webp"]:
        res = parse_image(file_bytes, filename)
    else:
        # Try generic CSV first
        res = parse_csv(file_bytes, filename)
        if res.df is None:
            res.warnings.append(f"Unrecognized file format '{ext}'. Supported: CSV, Excel, JSON, PDF, DOCX, TXT, PNG, JPG.")

    # Check row limit
    if res.df is not None and len(res.df) > settings.MAX_ROWS_LIMIT:
        res.warnings.append(f"Dataset has {len(res.df):,} rows; capped to {settings.MAX_ROWS_LIMIT:,} for responsive analysis.")
        res.df = res.df.iloc[:settings.MAX_ROWS_LIMIT].copy()

    return res
