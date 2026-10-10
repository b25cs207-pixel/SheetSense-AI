from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np

def generate_candidate_charts(df: pd.DataFrame, schema_profile: Dict[str, Any], stats: Dict[str, Any]) -> List[Dict[str, Any]]:
    charts = []
    num_cols = [c["name"] for c in schema_profile["columns"] if c["type"] in ["numeric", "currency", "percentage"]]
    cat_cols = [c["name"] for c in schema_profile["columns"] if c["type"] in ["categorical", "boolean"]]
    date_cols = [c["name"] for c in schema_profile["columns"] if c["type"] == "datetime"]

    # 1. Primary Categorical Breakdown (Bar & Pie)
    if cat_cols:
        primary_cat = cat_cols[0]
        # Choose primary metric if available, else count
        primary_metric = num_cols[0] if num_cols else None

        if primary_metric:
            grouped = df.groupby(primary_cat)[primary_metric].agg(["sum", "mean", "count"]).reset_index()
            grouped = grouped.sort_values("sum", ascending=False).head(10)
            
            bar_data = []
            for _, r in grouped.iterrows():
                bar_data.append({
                    "name": str(r[primary_cat]),
                    "value": round(float(r["sum"]), 2),
                    "average": round(float(r["mean"]), 2),
                    "count": int(r["count"])
                })

            charts.append({
                "id": "chart_cat_primary_bar",
                "title": f"Total {primary_metric.replace('_', ' ')} by {primary_cat.replace('_', ' ')}",
                "type": "bar",
                "category": "categorical_comparison",
                "x_key": "name",
                "y_key": "value",
                "data": bar_data,
                "description": f"Displays the aggregated sum of {primary_metric} across top {primary_cat} categories.",
                "insights": f"{bar_data[0]['name']} leads with {bar_data[0]['value']:,}." if bar_data else ""
            })

            # If categories are manageable (3 to 8), add Donut / Pie
            if 2 <= len(bar_data) <= 8:
                charts.append({
                    "id": "chart_cat_primary_pie",
                    "title": f"Distribution of {primary_metric.replace('_', ' ')} across {primary_cat.replace('_', ' ')}",
                    "type": "donut",
                    "category": "composition",
                    "x_key": "name",
                    "y_key": "value",
                    "data": bar_data,
                    "description": f"Proportional contribution of each {primary_cat} to total {primary_metric}.",
                    "insights": f"{bar_data[0]['name']} represents the largest share." if bar_data else ""
                })
        else:
            # Frequency count bar chart
            counts = df[primary_cat].value_counts().head(10).reset_index()
            counts.columns = ["name", "count"]
            freq_data = [{"name": str(r["name"]), "value": int(r["count"])} for _, r in counts.iterrows()]
            charts.append({
                "id": "chart_cat_freq_bar",
                "title": f"Frequency Count by {primary_cat.replace('_', ' ')}",
                "type": "bar",
                "category": "frequency",
                "x_key": "name",
                "y_key": "value",
                "data": freq_data,
                "description": f"Frequency distribution across {primary_cat}.",
                "insights": f"Most frequent item: {freq_data[0]['name']} ({freq_data[0]['value']} records)." if freq_data else ""
            })

    # 2. Secondary Categorical Breakdown (Horizontal Bar or Pie)
    if len(cat_cols) > 1:
        sec_cat = cat_cols[1]
        sec_metric = num_cols[1] if len(num_cols) > 1 else (num_cols[0] if num_cols else None)
        
        if sec_metric:
            grouped_sec = df.groupby(sec_cat)[sec_metric].agg(["sum", "mean"]).reset_index()
            grouped_sec = grouped_sec.sort_values("sum", ascending=False).head(8)
            sec_data = [{"name": str(r[sec_cat]), "value": round(float(r["sum"]), 2), "average": round(float(r["mean"]), 2)} for _, r in grouped_sec.iterrows()]
            
            charts.append({
                "id": "chart_cat_sec_horizontal_bar",
                "title": f"{sec_metric.replace('_', ' ')} by {sec_cat.replace('_', ' ')}",
                "type": "horizontal_bar",
                "category": "categorical_comparison",
                "x_key": "name",
                "y_key": "value",
                "data": sec_data,
                "description": f"Horizontal comparison of {sec_metric} ranked by {sec_cat}.",
                "insights": f"Top category: {sec_data[0]['name']} with {sec_data[0]['value']:,}." if sec_data else ""
            })

    # 3. Time Series Line / Area Chart
    if stats.get("time_series") and stats["time_series"].get("timeline"):
        ts = stats["time_series"]
        charts.append({
            "id": "chart_time_series_line",
            "title": f"Timeline: {ts['metric_column'].replace('_', ' ')} over Time",
            "type": "area",
            "category": "time_series",
            "x_key": "period",
            "y_key": "value",
            "data": ts["timeline"],
            "description": f"Chronological trajectory from {ts['min_date']} to {ts['max_date']}.",
            "insights": f"Overall trend is {ts['trend_direction']} with a {ts['growth_rate_pct']}% change over the period."
        })

    # 4. Numerical Distribution (Histogram)
    if num_cols:
        dist_metric = num_cols[0]
        num_clean = pd.to_numeric(df[dist_metric].dropna(), errors='coerce').dropna()
        if len(num_clean) >= 10:
            counts, bin_edges = np.histogram(num_clean, bins=8)
            hist_data = []
            for i in range(len(counts)):
                label = f"{bin_edges[i]:.1f} - {bin_edges[i+1]:.1f}"
                hist_data.append({
                    "range": label,
                    "count": int(counts[i]),
                    "value": int(counts[i])
                })
            charts.append({
                "id": "chart_distribution_hist",
                "title": f"Distribution of {dist_metric.replace('_', ' ')}",
                "type": "histogram",
                "category": "distribution",
                "x_key": "range",
                "y_key": "count",
                "data": hist_data,
                "description": f"Frequency bin histogram showing dispersion and clustering of {dist_metric}.",
                "insights": f"Peak concentration occurs in the range {hist_data[int(np.argmax(counts))]['range']}."
            })

    # 5. Scatter Plot (Correlation between two numerical variables)
    if len(num_cols) >= 2:
        x_metric = num_cols[0]
        y_metric = num_cols[1]
        
        scatter_sample = df[[x_metric, y_metric]].dropna().head(100)
        scatter_data = []
        for _, r in scatter_sample.iterrows():
            try:
                scatter_data.append({
                    "x": round(float(r[x_metric]), 2),
                    "y": round(float(r[y_metric]), 2)
                })
            except Exception:
                continue

        corr_val = stats.get("correlations", {}).get(x_metric, {}).get(y_metric, 0.0)
        charts.append({
            "id": "chart_scatter_correlation",
            "title": f"{x_metric.replace('_', ' ')} vs {y_metric.replace('_', ' ')} Correlation",
            "type": "scatter",
            "category": "correlation",
            "x_key": "x",
            "y_key": "y",
            "x_label": x_metric.replace('_', ' '),
            "y_label": y_metric.replace('_', ' '),
            "data": scatter_data,
            "description": f"Scatter plot exploring relationship between {x_metric} and {y_metric}.",
            "insights": f"Pearson correlation coefficient: r = {corr_val}. " + (
                "Strong positive relationship." if corr_val > 0.6 else
                "Strong negative relationship." if corr_val < -0.6 else
                "Moderate or weak linear relationship."
            )
        })

    # 6. Grouped Bar Chart if 2 categories and 1 metric
    if len(cat_cols) >= 2 and num_cols:
        cat1 = cat_cols[0]
        cat2 = cat_cols[1]
        metric = num_cols[0]
        
        # Limit cardinality
        c1_top = df[cat1].value_counts().head(5).index
        c2_top = df[cat2].value_counts().head(4).index
        sub_df = df[df[cat1].isin(c1_top) & df[cat2].isin(c2_top)]
        
        pivot = sub_df.groupby([cat1, cat2])[metric].sum().unstack(fill_value=0).reset_index()
        pivot_data = []
        series_keys = [str(c) for c in pivot.columns if c != cat1]
        for _, r in pivot.iterrows():
            row_dict = {"name": str(r[cat1])}
            for sk in series_keys:
                row_dict[sk] = round(float(r[sk]), 2)
            pivot_data.append(row_dict)

        if pivot_data and len(series_keys) > 1:
            charts.append({
                "id": "chart_grouped_breakdown",
                "title": f"{metric.replace('_', ' ')} by {cat1.replace('_', ' ')} and {cat2.replace('_', ' ')}",
                "type": "grouped_bar",
                "category": "multi_dimensional",
                "x_key": "name",
                "series_keys": series_keys,
                "data": pivot_data,
                "description": f"Multi-series breakdown showing {metric} split across {cat1} and {cat2}.",
                "insights": f"Allows multi-dimensional comparison across sub-segments."
            })

    return charts
