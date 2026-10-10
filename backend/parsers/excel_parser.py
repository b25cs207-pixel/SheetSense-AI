import io
from typing import Optional
import pandas as pd
from backend.parsers.base import ParsedData

def parse_excel(file_bytes: bytes, filename: str = "upload.xlsx", sheet_name: Optional[str] = None) -> ParsedData:
    try:
        excel_file = pd.ExcelFile(io.BytesIO(file_bytes))
        sheet_names = excel_file.sheet_names
        
        selected_sheet = sheet_name if (sheet_name and sheet_name in sheet_names) else sheet_names[0]
        df = pd.read_excel(excel_file, sheet_name=selected_sheet)
        df.columns = [str(c).strip() for c in df.columns]

        return ParsedData(
            df=df,
            sheets=sheet_names,
            active_sheet=selected_sheet,
            metadata={"sheet_count": len(sheet_names), "active_sheet": selected_sheet, "rows": len(df), "cols": len(df.columns)},
            is_structured=True
        )
    except Exception as e:
        return ParsedData(
            df=None,
            warnings=[f"Failed to read Excel file: {str(e)}"],
            is_structured=False
        )
