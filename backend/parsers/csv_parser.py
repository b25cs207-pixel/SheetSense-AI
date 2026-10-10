import io
import csv
import pandas as pd
from backend.parsers.base import ParsedData

def parse_csv(file_bytes: bytes, filename: str = "upload.csv") -> ParsedData:
    encodings = ["utf-8-sig", "utf-8", "latin-1", "cp1252"]
    text = None
    used_encoding = None
    
    for enc in encodings:
        try:
            text = file_bytes.decode(enc)
            used_encoding = enc
            break
        except UnicodeDecodeError:
            continue
            
    if text is None:
        text = file_bytes.decode("utf-8", errors="replace")
        used_encoding = "utf-8 (lossy)"

    # Sniff delimiter
    delimiter = ","
    try:
        sample = text[:4096]
        sniffer = csv.Sniffer()
        dialect = sniffer.sniff(sample, delimiters=",\t;|")
        delimiter = dialect.delimiter
    except Exception:
        # Fallback counting
        first_line = text.split("\n")[0] if "\n" in text else text
        counts = {",": first_line.count(","), "\t": first_line.count("\t"), ";": first_line.count(";"), "|": first_line.count("|")}
        delimiter = max(counts, key=counts.get)
        if counts[delimiter] == 0:
            delimiter = ","

    try:
        df = pd.read_csv(io.StringIO(text), sep=delimiter, on_bad_lines="skip", low_memory=False)
        # Strip string column headers
        df.columns = [str(c).strip() for c in df.columns]
        return ParsedData(
            df=df,
            metadata={"encoding": used_encoding, "delimiter": delimiter, "rows": len(df), "cols": len(df.columns)},
            is_structured=True
        )
    except Exception as e:
        return ParsedData(
            df=None,
            text_content=text[:5000],
            warnings=[f"Failed to parse CSV cleanly: {str(e)}"],
            is_structured=False
        )
