import re
from typing import Dict, Any, List
import pandas as pd
import numpy as np

def infer_column_type(series: pd.Series) -> str:
    # Drop NAs
    clean = series.dropna()
    if len(clean) == 0:
        return "text"

    # Check boolean
    unique_vals = set(clean.astype(str).str.lower().unique())
    if unique_vals.issubset({"true", "false", "yes", "no", "0", "1", "y", "n"}):
        return "boolean"

    # Check numeric
    if pd.api.types.is_numeric_dtype(series):
        # Check if percentage
        if series.name and ("pct" in str(series.name).lower() or "percent" in str(series.name).lower() or "rate" in str(series.name).lower()):
            return "percentage"
        return "numeric"

    # Check string representation of numbers (including currency / percentage symbols)
    first_few = clean.astype(str).head(100)
    has_currency = first_few.str.contains(r'[$€£₹]').mean() > 0.6
    if has_currency:
        return "currency"
        
    has_pct = first_few.str.contains(r'%$').mean() > 0.6
    if has_pct:
        return "percentage"

    # Check datetime
    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"
    
    # Try parsing date strings
    if clean.dtype == object:
        # Common date name indicators
        name_lower = str(series.name).lower()
        date_keywords = ["date", "time", "day", "timestamp", "year", "month", "created_at", "updated_at"]
        if any(k in name_lower for k in date_keywords):
            try:
                pd.to_datetime(clean.head(50), errors='raise')
                return "datetime"
            except Exception:
                pass

    # Categorical vs Text
    unique_count = series.nunique()
    total_count = len(clean)
    if unique_count <= 25 or (unique_count / max(total_count, 1) < 0.2):
        return "categorical"

    return "text"

def detect_outliers_iqr(series: pd.Series) -> (int, List[float]):
    try:
        numeric = pd.to_numeric(series.dropna(), errors='coerce').dropna()
        if len(numeric) < 5:
            return 0, []
        q25, q75 = np.percentile(numeric, 25), np.percentile(numeric, 75)
        iqr = q75 - q25
        if iqr == 0:
            return 0, []
        lower_bound = q25 - 1.5 * iqr
        upper_bound = q75 + 1.5 * iqr
        outliers = numeric[(numeric < lower_bound) | (numeric > upper_bound)]
        return len(outliers), outliers.head(5).tolist()
    except Exception:
        return 0, []

def profile_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    total_rows = len(df)
    total_cols = len(df.columns)
    
    duplicate_rows = int(df.duplicated().sum())
    dup_percentage = round((duplicate_rows / max(total_rows, 1)) * 100, 2)
    
    columns_profile = []
    total_missing_cells = 0
    issues = []
    
    for col in df.columns:
        series = df[col]
        missing_count = int(series.isnull().sum())
        total_missing_cells += missing_count
        missing_pct = round((missing_count / max(total_rows, 1)) * 100, 2)
        inferred_type = infer_column_type(series)
        unique_count = int(series.nunique())

        col_stat = {
            "name": str(col),
            "type": inferred_type,
            "missing_count": missing_count,
            "missing_percentage": missing_pct,
            "unique_count": unique_count,
            "sample_values": series.dropna().astype(str).head(3).tolist(),
            "outlier_count": 0,
            "sample_outliers": []
        }

        # Outlier detection for numeric / currency
        if inferred_type in ["numeric", "currency", "percentage"] or pd.api.types.is_numeric_dtype(series):
            out_count, out_samples = detect_outliers_iqr(series)
            col_stat["outlier_count"] = out_count
            col_stat["sample_outliers"] = out_samples
            if out_count > 0:
                issues.append({
                    "column": str(col),
                    "type": "outlier",
                    "severity": "Medium" if out_count < 10 else "High",
                    "message": f"Found {out_count} potential outlier(s) using 1.5*IQR boundary.",
                    "recommendation": "Inspect extreme values or filter outliers using the Data Cleaner."
                })

        if missing_pct > 20:
            issues.append({
                "column": str(col),
                "type": "missing_values",
                "severity": "High" if missing_pct > 50 else "Medium",
                "message": f"{missing_pct}% of values are missing ({missing_count} rows).",
                "recommendation": "Impute with mean/mode or drop rows with missing values."
            })
        elif missing_pct > 0:
            issues.append({
                "column": str(col),
                "type": "missing_values",
                "severity": "Low",
                "message": f"{missing_pct}% values missing ({missing_count} rows).",
                "recommendation": "Fill empty values or drop affected rows."
            })

        columns_profile.append(col_stat)

    if duplicate_rows > 0:
        issues.append({
            "column": "Dataset",
            "type": "duplicate_rows",
            "severity": "High" if dup_percentage > 10 else "Medium",
            "message": f"Found {duplicate_rows} duplicate row(s) ({dup_percentage}%).",
            "recommendation": "Remove duplicate rows using the Data Cleaner."
        })

    total_cells = max(total_rows * total_cols, 1)
    completeness_score = max(0, 100 - (total_missing_cells / total_cells * 100))
    uniqueness_score = max(0, 100 - dup_percentage)
    quality_score = round(0.7 * completeness_score + 0.3 * uniqueness_score, 1)

    return {
        "summary": {
            "total_rows": total_rows,
            "total_columns": total_cols,
            "duplicate_rows": duplicate_rows,
            "duplicate_percentage": dup_percentage,
            "total_missing_cells": total_missing_cells,
            "overall_quality_score": quality_score
        },
        "columns": columns_profile,
        "issues": issues
    }
