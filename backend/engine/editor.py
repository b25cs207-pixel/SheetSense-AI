import re
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np

def apply_cell_edits(df: pd.DataFrame, changes: List[Dict[str, Any]]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Applies a batch of cell modifications.
    changes: [{"row": int, "column": str, "value": any}]
    """
    updated_df = df.copy()
    applied_count = 0
    errors = []

    for item in changes:
        row_idx = item.get("row")
        col_name = item.get("column")
        new_val = item.get("value")

        if col_name not in updated_df.columns:
            errors.append(f"Column '{col_name}' does not exist.")
            continue

        if not (0 <= row_idx < len(updated_df)):
            errors.append(f"Row index {row_idx} is out of bounds.")
            continue

        # Type conversion & validation
        col_series = updated_df[col_name]
        coerced_val = new_val

        # If original column is numeric, attempt numeric conversion
        if pd.api.types.is_numeric_dtype(col_series):
            if str(new_val).strip() == "" or new_val is None:
                coerced_val = np.nan
            else:
                try:
                    clean_str = str(new_val).replace("$", "").replace(",", "").replace("%", "").strip()
                    coerced_val = float(clean_str) if "." in clean_str else int(clean_str)
                except ValueError:
                    # Keep as string or nan
                    coerced_val = np.nan
                    errors.append(f"Row {row_idx}, Col '{col_name}': '{new_val}' could not be converted to number.")

        updated_df.at[row_idx, col_name] = coerced_val
        applied_count += 1

    return updated_df, {
        "applied_count": applied_count,
        "errors": errors,
        "status": "success" if not errors else "partial"
    }

def add_spreadsheet_row(df: pd.DataFrame, row_data: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
    updated = df.copy()
    new_row = {}
    for col in updated.columns:
        if row_data and col in row_data:
            new_row[col] = row_data[col]
        else:
            if pd.api.types.is_numeric_dtype(updated[col]):
                new_row[col] = 0
            else:
                new_row[col] = ""
    updated = pd.concat([updated, pd.DataFrame([new_row])], ignore_index=True)
    return updated

def delete_spreadsheet_rows(df: pd.DataFrame, indices: List[int]) -> pd.DataFrame:
    valid_indices = [i for i in indices if 0 <= i < len(df)]
    updated = df.drop(index=valid_indices).reset_index(drop=True)
    return updated

def add_spreadsheet_column(df: pd.DataFrame, col_name: str, col_type: str = "text", default_val: Any = "") -> pd.DataFrame:
    clean_name = col_name.strip()
    if not clean_name or clean_name in df.columns:
        clean_name = f"{clean_name or 'New_Column'}_{len(df.columns) + 1}"
    
    updated = df.copy()
    if col_type == "numeric":
        val = float(default_val) if default_val not in ["", None] else 0.0
        updated[clean_name] = val
    elif col_type == "datetime":
        updated[clean_name] = pd.to_datetime(default_val, errors='coerce')
    else:
        updated[clean_name] = str(default_val) if default_val not in ["", None] else ""
    return updated

def rename_spreadsheet_column(df: pd.DataFrame, old_name: str, new_name: str) -> pd.DataFrame:
    clean_new = new_name.strip()
    if old_name in df.columns and clean_new:
        return df.rename(columns={old_name: clean_new})
    return df

def delete_spreadsheet_column(df: pd.DataFrame, col_name: str) -> pd.DataFrame:
    if col_name in df.columns and len(df.columns) > 1:
        return df.drop(columns=[col_name])
    return df

def find_and_replace_text(
    df: pd.DataFrame,
    search_term: str,
    replace_term: str,
    target_column: Optional[str] = None,
    match_case: bool = False
) -> Tuple[pd.DataFrame, int]:
    updated = df.copy()
    match_count = 0
    cols_to_search = [target_column] if (target_column and target_column in updated.columns) else updated.columns

    for col in cols_to_search:
        series_str = updated[col].astype(str)
        if match_case:
            count = series_str.str.count(re.escape(search_term)).sum()
            updated[col] = series_str.str.replace(search_term, replace_term, regex=False)
        else:
            pattern = re.compile(re.escape(search_term), re.IGNORECASE)
            count = series_str.apply(lambda s: len(pattern.findall(s))).sum()
            updated[col] = series_str.apply(lambda s: pattern.sub(replace_term, s))
        match_count += int(count)

    return updated, match_count

def evaluate_spreadsheet_formulas(df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
    """
    Safely calculates supported spreadsheet formulas:
    - =SUM(col) or =SUM(A1:A10)
    - =AVERAGE(col)
    - =colA + colB, =colA - colB, =colA * colB, =colA / colB
    Does NOT execute macros or arbitrary code.
    """
    updated = df.copy()
    evaluated_count = 0

    for col in updated.columns:
        for idx in range(len(updated)):
            val = str(updated.at[idx, col]).strip()
            if val.startswith("="):
                formula = val[1:].strip().upper()
                calc_val = None

                # Pattern 1: =SUM(column_name)
                sum_match = re.match(r'^SUM\(([A-Z0-9_]+)\)$', formula)
                if sum_match:
                    target_c = sum_match.group(1)
                    found = [c for c in updated.columns if c.upper() == target_c]
                    if found:
                        calc_val = float(pd.to_numeric(updated[found[0]], errors='coerce').sum())

                # Pattern 2: =AVERAGE(column_name)
                avg_match = re.match(r'^(?:AVERAGE|AVG)\(([A-Z0-9_]+)\)$', formula)
                if avg_match:
                    target_c = avg_match.group(1)
                    found = [c for c in updated.columns if c.upper() == target_c]
                    if found:
                        calc_val = float(pd.to_numeric(updated[found[0]], errors='coerce').mean())

                # Pattern 3: =colA + colB (row wise)
                bin_match = re.match(r'^([A-Z0-9_]+)\s*([\+\-\*\/])\s*([A-Z0-9_]+)$', formula)
                if bin_match:
                    c1_name, op, c2_name = bin_match.group(1), bin_match.group(2), bin_match.group(3)
                    f1 = [c for c in updated.columns if c.upper() == c1_name]
                    f2 = [c for c in updated.columns if c.upper() == c2_name]
                    if f1 and f2:
                        v1 = float(pd.to_numeric(updated.at[idx, f1[0]], errors='coerce') or 0)
                        v2 = float(pd.to_numeric(updated.at[idx, f2[0]], errors='coerce') or 0)
                        if op == "+": calc_val = v1 + v2
                        elif op == "-": calc_val = v1 - v2
                        elif op == "*": calc_val = v1 * v2
                        elif op == "/" and v2 != 0: calc_val = v1 / v2

                if calc_val is not None:
                    updated.at[idx, col] = round(calc_val, 2)
                    evaluated_count += 1

    return updated, evaluated_count

def apply_quick_cleaning_action(df: pd.DataFrame, action: str, column: Optional[str] = None) -> Tuple[pd.DataFrame, str]:
    updated = df.copy()
    cols = [column] if column and column in updated.columns else updated.columns

    if action == "trim_whitespace":
        for c in cols:
            if updated[c].dtype == object or pd.api.types.is_string_dtype(updated[c]):
                updated[c] = updated[c].astype(str).str.strip()
        return updated, "Trimmed whitespace across text columns."

    elif action == "uppercase":
        for c in cols:
            if updated[c].dtype == object or pd.api.types.is_string_dtype(updated[c]):
                updated[c] = updated[c].astype(str).str.upper()
        return updated, "Converted text to uppercase."

    elif action == "lowercase":
        for c in cols:
            if updated[c].dtype == object or pd.api.types.is_string_dtype(updated[c]):
                updated[c] = updated[c].astype(str).str.lower()
        return updated, "Converted text to lowercase."

    elif action == "titlecase":
        for c in cols:
            if updated[c].dtype == object or pd.api.types.is_string_dtype(updated[c]):
                updated[c] = updated[c].astype(str).str.title()
        return updated, "Converted text to titlecase."

    elif action == "standardize_dates" and column and column in updated.columns:
        updated[column] = pd.to_datetime(updated[column], errors='coerce').dt.strftime('%Y-%m-%d')
        return updated, f"Standardized dates in '{column}' to YYYY-MM-DD."

    return updated, "No action applied."
