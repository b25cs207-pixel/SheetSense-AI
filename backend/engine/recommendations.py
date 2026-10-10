from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np

def generate_proactive_recommendations(df: pd.DataFrame, schema_profile: Dict[str, Any], stats: Dict[str, Any]) -> List[Dict[str, Any]]:
    recommendations = []
    num_cols = [c["name"] for c in schema_profile["columns"] if c["type"] in ["numeric", "currency", "percentage"]]
    cat_cols = [c["name"] for c in schema_profile["columns"] if c["type"] in ["categorical", "boolean"]]
    date_cols = [c["name"] for c in schema_profile["columns"] if c["type"] == "datetime"]

    # 1. Cross-Category Comparison (e.g. Compare Metric across Dim 1)
    if cat_cols and num_cols:
        cat = cat_cols[0]
        metric = num_cols[0]
        recommendations.append({
            "id": f"rec_group_{cat}_{metric}",
            "title": f"Compare {metric.replace('_', ' ')} across {cat.replace('_', ' ')}",
            "why_it_matters": f"Identifies which {cat} segments generate the highest and lowest {metric}, surfacing performance gaps.",
            "required_columns": [cat, metric],
            "expected_output": "Ranked bar chart with category totals, averages, and percentage contribution.",
            "spec": {
                "type": "groupby_agg",
                "groupby_col": cat,
                "metric_col": metric,
                "agg_funcs": ["sum", "mean", "count"],
                "chart_type": "bar"
            }
        })

    # 2. Secondary Category Analysis
    if len(cat_cols) > 1 and num_cols:
        cat2 = cat_cols[1]
        metric = num_cols[0]
        recommendations.append({
            "id": f"rec_group_{cat2}_{metric}",
            "title": f"Analyze {metric.replace('_', ' ')} by {cat2.replace('_', ' ')}",
            "why_it_matters": f"Reveals how {metric} varies by {cat2}, highlighting secondary drivers of variance.",
            "required_columns": [cat2, metric],
            "expected_output": "Horizontal bar chart showing ranked distribution across categories.",
            "spec": {
                "type": "groupby_agg",
                "groupby_col": cat2,
                "metric_col": metric,
                "agg_funcs": ["sum", "mean"],
                "chart_type": "horizontal_bar"
            }
        })

    # 3. Two-Variable Correlation & Scatter
    if len(num_cols) >= 2:
        num1, num2 = num_cols[0], num_cols[1]
        corr_val = stats.get("correlations", {}).get(num1, {}).get(num2, 0.0)
        recommendations.append({
            "id": f"rec_corr_{num1}_{num2}",
            "title": f"Explore Relationship: {num1.replace('_', ' ')} vs {num2.replace('_', ' ')}",
            "why_it_matters": f"Calculates linear correlation (r = {corr_val}) to test if increases in {num1} correspond to changes in {num2}.",
            "required_columns": [num1, num2],
            "expected_output": "Interactive scatter plot with trend line and correlation coefficient.",
            "spec": {
                "type": "scatter_correlation",
                "x_col": num1,
                "y_col": num2,
                "chart_type": "scatter"
            }
        })

    # 4. Time Series Trend Analysis
    if date_cols and num_cols:
        dcol = date_cols[0]
        mcol = num_cols[0]
        recommendations.append({
            "id": f"rec_trend_{dcol}_{mcol}",
            "title": f"Track Chronological Trend of {mcol.replace('_', ' ')}",
            "why_it_matters": f"Evaluates period-over-period trajectory to detect growth, seasonality, or sudden drops over time.",
            "required_columns": [dcol, mcol],
            "expected_output": "Time-series area/line visualization with period growth percentage.",
            "spec": {
                "type": "time_series_agg",
                "date_col": dcol,
                "metric_col": mcol,
                "chart_type": "area"
            }
        })

    # 5. Outlier Detection Investigation
    outlier_issues = [issue for issue in schema_profile.get("issues", []) if issue["type"] == "outlier"]
    if outlier_issues:
        target_col = outlier_issues[0]["column"]
        recommendations.append({
            "id": f"rec_outlier_{target_col}",
            "title": f"Investigate Extreme Values in {target_col.replace('_', ' ')}",
            "why_it_matters": f"Outliers in {target_col} may skew aggregate averages and indicate data entry anomalies or top-tier VIP activity.",
            "required_columns": [target_col],
            "expected_output": "Distribution breakdown highlighting extreme values outside the 1.5*IQR threshold.",
            "spec": {
                "type": "outlier_analysis",
                "column": target_col,
                "chart_type": "histogram"
            }
        })

    # 6. Top & Bottom Performers Ranking
    if cat_cols and num_cols:
        cat = cat_cols[0]
        metric = num_cols[0]
        recommendations.append({
            "id": f"rec_rank_{cat}_{metric}",
            "title": f"Identify Top and Bottom 5 {cat.replace('_', ' ')} by {metric.replace('_', ' ')}",
            "why_it_matters": f"Directly surfaces the highest 5 assets and lowest 5 underperformers for operational focus.",
            "required_columns": [cat, metric],
            "expected_output": "Side-by-side comparison of leaders vs laggards.",
            "spec": {
                "type": "top_bottom_rank",
                "cat_col": cat,
                "metric_col": metric,
                "chart_type": "bar"
            }
        })

    return recommendations

def execute_recommendation(df: pd.DataFrame, spec: Dict[str, Any]) -> Dict[str, Any]:
    action_type = spec.get("type")
    
    if action_type == "groupby_agg":
        gcol = spec["groupby_col"]
        mcol = spec["metric_col"]
        grouped = df.groupby(gcol)[mcol].agg(["sum", "mean", "count"]).reset_index()
        grouped = grouped.sort_values("sum", ascending=False).head(15)
        
        data = []
        for _, r in grouped.iterrows():
            data.append({
                "name": str(r[gcol]),
                "value": round(float(r["sum"]), 2),
                "average": round(float(r["mean"]), 2),
                "count": int(r["count"])
            })
            
        return {
            "title": f"{mcol.replace('_', ' ')} aggregated by {gcol.replace('_', ' ')}",
            "chart_type": spec.get("chart_type", "bar"),
            "x_key": "name",
            "y_key": "value",
            "data": data,
            "summary": f"Calculated totals across {len(data)} distinct categories. Leader: {data[0]['name']} with {data[0]['value']:,}." if data else "No data."
        }

    elif action_type == "scatter_correlation":
        xcol = spec["x_col"]
        ycol = spec["y_col"]
        sub = df[[xcol, ycol]].dropna().head(150)
        data = []
        for _, r in sub.iterrows():
            try:
                data.append({"x": round(float(r[xcol]), 2), "y": round(float(r[ycol]), 2)})
            except Exception:
                pass
        corr = round(float(pd.to_numeric(sub[xcol], errors='coerce').corr(pd.to_numeric(sub[ycol], errors='coerce'))), 3)
        return {
            "title": f"{xcol.replace('_', ' ')} vs {ycol.replace('_', ' ')} (r = {corr})",
            "chart_type": "scatter",
            "x_key": "x",
            "y_key": "y",
            "x_label": xcol.replace('_', ' '),
            "y_label": ycol.replace('_', ' '),
            "data": data,
            "summary": f"Computed correlation coefficient r = {corr}. Sample points analyzed: {len(data)}."
        }

    elif action_type == "time_series_agg":
        dcol = spec["date_col"]
        mcol = spec["metric_col"]
        sub = df[[dcol, mcol]].dropna().copy()
        sub["dt"] = pd.to_datetime(sub[dcol], errors='coerce')
        sub = sub.dropna(subset=["dt"]).sort_values("dt")
        sub["period"] = sub["dt"].dt.to_period("M").astype(str)
        agg = sub.groupby("period")[mcol].sum().reset_index()
        data = [{"period": str(r["period"]), "value": round(float(r[mcol]), 2)} for _, r in agg.iterrows()]
        return {
            "title": f"Monthly Trajectory of {mcol.replace('_', ' ')}",
            "chart_type": "area",
            "x_key": "period",
            "y_key": "value",
            "data": data,
            "summary": f"Trend analyzed across {len(data)} monthly periods."
        }

    elif action_type == "top_bottom_rank":
        cat = spec["cat_col"]
        metric = spec["metric_col"]
        grouped = df.groupby(cat)[metric].sum().reset_index().sort_values(metric, ascending=False)
        top5 = grouped.head(5)
        bot5 = grouped.tail(5)
        data = []
        for _, r in top5.iterrows():
            data.append({"name": f"Top: {r[cat]}", "value": round(float(r[metric]), 2), "tier": "Top"})
        for _, r in bot5.iterrows():
            data.append({"name": f"Low: {r[cat]}", "value": round(float(r[metric]), 2), "tier": "Bottom"})
        return {
            "title": f"Top 5 vs Bottom 5 {cat.replace('_', ' ')} by {metric.replace('_', ' ')}",
            "chart_type": "bar",
            "x_key": "name",
            "y_key": "value",
            "data": data,
            "summary": f"Contrasts top leader ({top5.iloc[0][cat]}: {top5.iloc[0][metric]:,}) with lowest performer ({bot5.iloc[-1][cat]}: {bot5.iloc[-1][metric]:,})."
        }

    elif action_type == "outlier_analysis":
        col = spec["column"]
        clean = pd.to_numeric(df[col].dropna(), errors='coerce').dropna()
        q25, q75 = np.percentile(clean, 25), np.percentile(clean, 75)
        iqr = q75 - q25
        low_b, high_b = q25 - 1.5 * iqr, q75 + 1.5 * iqr
        outliers = clean[(clean < low_b) | (clean > high_b)]
        counts, edges = np.histogram(clean, bins=8)
        data = [{"range": f"{edges[i]:.1f}-{edges[i+1]:.1f}", "count": int(counts[i]), "value": int(counts[i])} for i in range(len(counts))]
        return {
            "title": f"Outlier Distribution in {col.replace('_', ' ')}",
            "chart_type": "histogram",
            "x_key": "range",
            "y_key": "count",
            "data": data,
            "summary": f"Found {len(outliers)} value(s) outside [{low_b:.2f}, {high_b:.2f}]. Outlier count: {len(outliers)}."
        }

    return {"title": "Analysis Result", "chart_type": "bar", "data": [], "summary": "Unrecognized analysis specification."}
