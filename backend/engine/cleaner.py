from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

def clean_dataset(
    df: pd.DataFrame,
    action: str,
    params: Optional[Dict[str, Any]] = None
) -> (pd.DataFrame, Dict[str, Any]):
    params = params or {}
    original_rows = len(df)
    clean_df = df.copy()
    report = {"action": action, "original_rows": original_rows, "modified_rows": 0, "status": "success", "message": ""}

    if action == "drop_duplicates":
        subset = params.get("columns")
        clean_df = clean_df.drop_duplicates(subset=subset)
        diff = original_rows - len(clean_df)
        report["modified_rows"] = diff
        report["message"] = f"Removed {diff} duplicate row(s)."

    elif action == "drop_missing":
        cols = params.get("columns")
        how = params.get("how", "any")  # 'any' or 'all'
        clean_df = clean_df.dropna(subset=cols, how=how)
        diff = original_rows - len(clean_df)
        report["modified_rows"] = diff
        report["message"] = f"Dropped {diff} row(s) containing missing values."

    elif action == "impute_missing":
        column = params.get("column")
        strategy = params.get("strategy", "mean")  # mean, median, mode, constant
        fill_val = params.get("fill_value")

        if column in clean_df.columns:
            missing_count = int(clean_df[column].isnull().sum())
            if strategy == "mean" and pd.api.types.is_numeric_dtype(clean_df[column]):
                val = clean_df[column].mean()
                clean_df[column] = clean_df[column].fillna(val)
            elif strategy == "median" and pd.api.types.is_numeric_dtype(clean_df[column]):
                val = clean_df[column].median()
                clean_df[column] = clean_df[column].fillna(val)
            elif strategy == "mode":
                mode_series = clean_df[column].mode()
                if not mode_series.empty:
                    clean_df[column] = clean_df[column].fillna(mode_series[0])
            elif strategy == "constant" and fill_val is not None:
                clean_df[column] = clean_df[column].fillna(fill_val)

            report["modified_rows"] = missing_count
            report["message"] = f"Imputed {missing_count} missing values in '{column}' using {strategy} strategy."

    elif action == "filter_outliers":
        col = params.get("column")
        if col in clean_df.columns:
            numeric = pd.to_numeric(clean_df[col], errors='coerce')
            q25, q75 = np.percentile(numeric.dropna(), 25), np.percentile(numeric.dropna(), 75)
            iqr = q75 - q25
            lower = q25 - 1.5 * iqr
            upper = q75 + 1.5 * iqr
            mask = (numeric >= lower) & (numeric <= upper) | clean_df[col].isnull()
            clean_df = clean_df[mask]
            diff = original_rows - len(clean_df)
            report["modified_rows"] = diff
            report["message"] = f"Filtered {diff} outlier row(s) in '{col}' outside [{lower:.2f}, {upper:.2f}]."

    elif action == "convert_type":
        col = params.get("column")
        target_type = params.get("target_type")
        if col in clean_df.columns:
            try:
                if target_type == "numeric":
                    clean_df[col] = pd.to_numeric(clean_df[col].astype(str).str.replace(r'[$€£,%]', '', regex=True), errors='coerce')
                elif target_type == "datetime":
                    clean_df[col] = pd.to_datetime(clean_df[col], errors='coerce')
                elif target_type == "text" or target_type == "categorical":
                    clean_df[col] = clean_df[col].astype(str)
                report["message"] = f"Converted column '{col}' to {target_type}."
            except Exception as e:
                report["status"] = "error"
                report["message"] = f"Failed to convert type: {str(e)}"

    elif action == "rename_column":
        old_name = params.get("old_name")
        new_name = params.get("new_name")
        if old_name in clean_df.columns and new_name:
            clean_df = clean_df.rename(columns={old_name: new_name.strip()})
            report["message"] = f"Renamed column '{old_name}' to '{new_name}'."

    report["final_rows"] = len(clean_df)
    report["final_cols"] = len(clean_df.columns)
    return clean_df, report
