from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

def calculate_numeric_stats(series: pd.Series) -> Dict[str, Any]:
    clean = pd.to_numeric(series.dropna(), errors='coerce').dropna()
    if len(clean) == 0:
        return {}
    
    count = int(len(clean))
    total_sum = float(clean.sum())
    mean_val = float(clean.mean())
    median_val = float(clean.median())
    std_val = float(clean.std()) if count > 1 else 0.0
    min_val = float(clean.min())
    max_val = float(clean.max())
    range_val = float(max_val - min_val)
    q25 = float(np.percentile(clean, 25))
    q75 = float(np.percentile(clean, 75))
    iqr = float(q75 - q25)

    return {
        "count": count,
        "sum": round(total_sum, 2),
        "mean": round(mean_val, 2),
        "median": round(median_val, 2),
        "std": round(std_val, 2),
        "min": round(min_val, 2),
        "max": round(max_val, 2),
        "range": round(range_val, 2),
        "q25": round(q25, 2),
        "q75": round(q75, 2),
        "iqr": round(iqr, 2)
    }

def calculate_categorical_stats(series: pd.Series) -> Dict[str, Any]:
    clean = series.dropna().astype(str)
    if len(clean) == 0:
        return {}
    
    counts = clean.value_counts()
    unique_count = int(len(counts))
    top_cat = str(counts.index[0])
    top_freq = int(counts.iloc[0])
    top_pct = round((top_freq / len(clean)) * 100, 2)
    
    bottom_cat = str(counts.index[-1])
    bottom_freq = int(counts.iloc[-1])

    top_items = []
    for cat, cnt in counts.head(10).items():
        top_items.append({
            "category": str(cat),
            "count": int(cnt),
            "percentage": round((cnt / len(clean)) * 100, 2)
        })

    return {
        "unique_count": unique_count,
        "top_category": top_cat,
        "top_frequency": top_freq,
        "top_share_pct": top_pct,
        "bottom_category": bottom_cat,
        "bottom_frequency": bottom_freq,
        "distribution": top_items
    }

def analyze_time_series(df: pd.DataFrame, date_col: str, metric_col: Optional[str] = None) -> Optional[Dict[str, Any]]:
    try:
        temp_df = df[[date_col]].copy()
        if metric_col and metric_col in df.columns:
            temp_df[metric_col] = pd.to_numeric(df[metric_col], errors='coerce')
        else:
            temp_df["_count"] = 1
            metric_col = "_count"

        temp_df = temp_df.dropna()
        temp_df["parsed_date"] = pd.to_datetime(temp_df[date_col], errors='coerce')
        temp_df = temp_df.dropna(subset=["parsed_date"]).sort_values("parsed_date")

        if len(temp_df) < 2:
            return None

        min_date = temp_df["parsed_date"].min().strftime("%Y-%m-%d")
        max_date = temp_df["parsed_date"].max().strftime("%Y-%m-%d")
        span_days = (temp_df["parsed_date"].max() - temp_df["parsed_date"].min()).days

        # Aggregate by Month or Day
        if span_days > 60:
            temp_df["period"] = temp_df["parsed_date"].dt.to_period("M").astype(str)
        elif span_days > 14:
            temp_df["period"] = temp_df["parsed_date"].dt.to_period("W").astype(str)
        else:
            temp_df["period"] = temp_df["parsed_date"].dt.strftime("%Y-%m-%d")

        period_agg = temp_df.groupby("period")[metric_col].agg(["sum", "mean", "count"]).reset_index()

        trend_data = []
        for _, row in period_agg.iterrows():
            trend_data.append({
                "period": str(row["period"]),
                "value": round(float(row["sum"]), 2),
                "average": round(float(row["mean"]), 2),
                "count": int(row["count"])
            })

        # Calculate growth rate between first and last periods
        trend_direction = "Stable"
        growth_pct = 0.0
        if len(period_agg) >= 2:
            first_val = float(period_agg.iloc[0]["sum"])
            last_val = float(period_agg.iloc[-1]["sum"])
            if first_val > 0:
                growth_pct = round(((last_val - first_val) / first_val) * 100, 2)
            if growth_pct > 5:
                trend_direction = "Upward"
            elif growth_pct < -5:
                trend_direction = "Downward"

        return {
            "date_column": date_col,
            "metric_column": metric_col if metric_col != "_count" else "Records",
            "min_date": min_date,
            "max_date": max_date,
            "span_days": span_days,
            "trend_direction": trend_direction,
            "growth_rate_pct": growth_pct,
            "timeline": trend_data
        }
    except Exception:
        return None

def compute_dataset_statistics(df: pd.DataFrame, schema_profile: Dict[str, Any]) -> Dict[str, Any]:
    numeric_stats = {}
    categorical_stats = {}
    correlations = {}
    
    num_cols = [c["name"] for c in schema_profile["columns"] if c["type"] in ["numeric", "currency", "percentage"]]
    cat_cols = [c["name"] for c in schema_profile["columns"] if c["type"] in ["categorical", "boolean"]]
    date_cols = [c["name"] for c in schema_profile["columns"] if c["type"] == "datetime"]

    for col in num_cols:
        if col in df.columns:
            stats = calculate_numeric_stats(df[col])
            if stats:
                numeric_stats[col] = stats

    for col in cat_cols:
        if col in df.columns:
            cstats = calculate_categorical_stats(df[col])
            if cstats:
                categorical_stats[col] = cstats

    # Correlation matrix for numerical
    if len(num_cols) >= 2:
        try:
            num_df = df[num_cols].apply(pd.to_numeric, errors='coerce').dropna()
            if len(num_df) > 3:
                corr_matrix = num_df.corr().round(2).to_dict()
                correlations = corr_matrix
        except Exception:
            correlations = {}

    # Time series
    time_series_data = None
    if date_cols:
        best_num = num_cols[0] if num_cols else None
        time_series_data = analyze_time_series(df, date_cols[0], best_num)

    # Executive KPIs
    kpis = []
    # 1. Total records
    kpis.append({
        "label": "Total Observations",
        "value": f"{len(df):,}",
        "raw_value": len(df),
        "type": "count",
        "subtitle": f"{len(df.columns)} dimensions analyzed"
    })

    # 2. Key primary metric (e.g. Revenue, Total Score, Total Amount, Hours)
    primary_metric = None
    for priority_term in ["revenue", "total_amount", "total_score", "sales", "profit", "score", "hours_worked", "price"]:
        for col in num_cols:
            if priority_term in col.lower():
                primary_metric = col
                break
        if primary_metric:
            break
            
    if not primary_metric and num_cols:
        primary_metric = num_cols[0]

    if primary_metric and primary_metric in numeric_stats:
        pstats = numeric_stats[primary_metric]
        kpis.append({
            "label": f"Total {primary_metric.replace('_', ' ').title()}",
            "value": f"{pstats['sum']:,.2f}" if pstats['sum'] > 1000 else f"{pstats['sum']:.2f}",
            "raw_value": pstats['sum'],
            "type": "currency" if "revenue" in primary_metric.lower() or "price" in primary_metric.lower() or "cost" in primary_metric.lower() or "amount" in primary_metric.lower() else "number",
            "subtitle": f"Average: {pstats['mean']:,.2f} | Median: {pstats['median']:,.2f}"
        })

    # 3. Secondary numerical metric (e.g. Profit, Attendance, Rating, Units)
    secondary_metric = None
    for col in num_cols:
        if col != primary_metric and any(term in col.lower() for term in ["profit", "attendance", "rating", "units", "discount", "midterm", "final"]):
            secondary_metric = col
            break
            
    if not secondary_metric and len(num_cols) > 1:
        secondary_metric = [c for c in num_cols if c != primary_metric][0]

    if secondary_metric and secondary_metric in numeric_stats:
        sstats = numeric_stats[secondary_metric]
        kpis.append({
            "label": f"Average {secondary_metric.replace('_', ' ').title()}",
            "value": f"{sstats['mean']:,.2f}",
            "raw_value": sstats['mean'],
            "type": "percentage" if "pct" in secondary_metric.lower() or "percent" in secondary_metric.lower() else "number",
            "subtitle": f"Min: {sstats['min']} | Max: {sstats['max']}"
        })

    # 4. Top category KPI
    if cat_cols and cat_cols[0] in categorical_stats:
        cstats = categorical_stats[cat_cols[0]]
        kpis.append({
            "label": f"Top {cat_cols[0].replace('_', ' ').title()}",
            "value": str(cstats["top_category"]),
            "raw_value": cstats["top_frequency"],
            "type": "string",
            "subtitle": f"{cstats['top_frequency']} occurrences ({cstats['top_share_pct']}% share)"
        })

    # 5. Data Quality KPI
    kpis.append({
        "label": "Data Quality Health",
        "value": f"{schema_profile['summary']['overall_quality_score']}%",
        "raw_value": schema_profile['summary']['overall_quality_score'],
        "type": "percentage",
        "subtitle": f"{schema_profile['summary']['total_missing_cells']} missing cells, {schema_profile['summary']['duplicate_rows']} duplicates"
    })

    return {
        "kpis": kpis,
        "numeric_stats": numeric_stats,
        "categorical_stats": categorical_stats,
        "correlations": correlations,
        "time_series": time_series_data
    }
