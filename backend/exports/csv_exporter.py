import io
import pandas as pd

def export_to_safe_csv(df: pd.DataFrame) -> bytes:
    """Exports dataframe to CSV preventing formula injection (CSV Injection/DDE)."""
    safe_df = df.copy()
    
    # Check text columns for leading dangerous characters (=, +, -, @, \t, \r)
    for col in safe_df.select_dtypes(include=['object', 'string']).columns:
        safe_df[col] = safe_df[col].astype(str).apply(
            lambda val: f"'{val}" if val.startswith(('=', '+', '-', '@')) else val
        )
        
    out = io.StringIO()
    safe_df.to_csv(out, index=False)
    return out.getvalue().encode('utf-8')
