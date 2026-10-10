import json
import io
import pandas as pd
from backend.parsers.base import ParsedData

def parse_json(file_bytes: bytes, filename: str = "upload.json") -> ParsedData:
    try:
        text = file_bytes.decode("utf-8-sig", errors="replace")
        data = json.loads(text)
        
        target_list = None
        if isinstance(data, list):
            target_list = data
        elif isinstance(data, dict):
            # check common keys
            for key in ["data", "items", "records", "results", "rows", "elements"]:
                if key in data and isinstance(data[key], list) and len(data[key]) > 0:
                    target_list = data[key]
                    break
            if target_list is None:
                # If flat dict with primitive values, wrap as single row
                if all(not isinstance(v, (list, dict)) for v in data.values()):
                    target_list = [data]
                else:
                    # Try json_normalize
                    df = pd.json_normalize(data)
                    return ParsedData(
                        df=df,
                        metadata={"type": "normalized_json_object", "rows": len(df), "cols": len(df.columns)},
                        is_structured=True
                    )

        if target_list and isinstance(target_list, list):
            df = pd.json_normalize(target_list)
            df.columns = [str(c).strip() for c in df.columns]
            return ParsedData(
                df=df,
                metadata={"type": "json_array", "rows": len(df), "cols": len(df.columns)},
                is_structured=True
            )
            
        return ParsedData(
            df=None,
            text_content=json.dumps(data, indent=2)[:5000],
            warnings=["JSON does not contain tabular records. Summarized as document."],
            is_structured=False
        )
    except Exception as e:
        return ParsedData(
            df=None,
            warnings=[f"Failed to parse JSON: {str(e)}"],
            is_structured=False
        )
