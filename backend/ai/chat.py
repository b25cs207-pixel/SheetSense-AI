import json
import re
from typing import Dict, Any, List, Optional
import pandas as pd
from backend.ai.provider import get_ai_provider, FallbackProvider

def answer_data_query_fallback(
    query: str,
    df: pd.DataFrame,
    schema_profile: Dict[str, Any],
    stats: Dict[str, Any]
) -> Dict[str, Any]:
    q_lower = query.lower()
    num_cols = [c["name"] for c in schema_profile["columns"] if c["type"] in ["numeric", "currency", "percentage"]]
    cat_cols = [c["name"] for c in schema_profile["columns"] if c["type"] in ["categorical", "boolean"]]
    date_cols = [c["name"] for c in schema_profile["columns"] if c["type"] == "datetime"]
    
    response_text = ""
    chart_data = None
    follow_ups = []

    # 1. Summary query
    if any(k in q_lower for k in ["summarize", "overview", "summary", "about this", "describe"]):
        summary = schema_profile["summary"]
        kpis = stats.get("kpis", [])
        kpi_lines = "\n".join([f"• **{k['label']}**: {k['value']} ({k.get('subtitle', '')})" for k in kpis])
        response_text = (
            f"### Dataset Summary\n"
            f"This dataset contains **{summary['total_rows']:,} rows** and **{summary['total_columns']} columns**.\n\n"
            f"**Key Performance Indicators:**\n{kpi_lines}\n\n"
            f"**Data Cleanliness:** The quality score is **{summary['overall_quality_score']}%** with {summary['total_missing_cells']} missing values and {summary['duplicate_rows']} duplicates."
        )
        follow_ups = [
            "What are the top 3 findings?",
            "Which category has the highest total?",
            "Show the monthly trend over time"
        ]

    # 2. Top findings / important insights
    elif any(k in q_lower for k in ["finding", "insight", "important", "highlights"]):
        kpis = stats.get("kpis", [])
        num_stats = stats.get("numeric_stats", {})
        cat_stats = stats.get("categorical_stats", {})
        
        findings = []
        if num_stats:
            first_num = list(num_stats.keys())[0]
            findings.append(f"1. **Aggregate Scale**: Total {first_num.replace('_', ' ')} reached **{num_stats[first_num]['sum']:,}** (average: **{num_stats[first_num]['mean']:,}** per record).")
        if cat_stats:
            first_cat = list(cat_stats.keys())[0]
            c = cat_stats[first_cat]
            findings.append(f"2. **Category Dominance**: '{c['top_category']}' is the highest volume segment representing **{c['top_share_pct']}%** of entries ({c['top_frequency']} records).")
        if stats.get("time_series"):
            ts = stats["time_series"]
            findings.append(f"3. **Chronological Trajectory**: Historical pattern shows an **{ts['trend_direction']}** movement ({ts['growth_rate_pct']}% change) over {ts['span_days']} days.")
        elif len(findings) < 3 and num_cols:
            findings.append(f"3. **Variance**: Highest single observation recorded was **{num_stats[num_cols[0]]['max']:,}**.")

        response_text = "### Top Verified Findings\n" + "\n".join(findings)
        follow_ups = [
            "Compare categories in detail",
            "Generate a chart of category breakdown",
            "Are there any outliers in the data?"
        ]

    # 3. Chart request: Pie / Donut
    elif "pie" in q_lower or "donut" in q_lower or "share" in q_lower or "proportion" in q_lower:
        if cat_cols:
            cat = cat_cols[0]
            metric = num_cols[0] if num_cols else None
            if metric:
                grouped = df.groupby(cat)[metric].sum().reset_index().sort_values(metric, ascending=False).head(8)
                data = [{"name": str(r[cat]), "value": round(float(r[metric]), 2)} for _, r in grouped.iterrows()]
                chart_data = {
                    "title": f"{metric.replace('_', ' ')} Share by {cat.replace('_', ' ')}",
                    "type": "donut",
                    "x_key": "name",
                    "y_key": "value",
                    "data": data
                }
                response_text = f"Here is the breakdown chart of **{metric.replace('_', ' ')}** by **{cat.replace('_', ' ')}**. '{data[0]['name']}' leads with {data[0]['value']:,}."
            else:
                counts = df[cat].value_counts().head(8).reset_index()
                counts.columns = ["name", "value"]
                data = [{"name": str(r["name"]), "value": int(r["value"])} for _, r in counts.iterrows()]
                chart_data = {
                    "title": f"Distribution by {cat.replace('_', ' ')}",
                    "type": "donut",
                    "x_key": "name",
                    "y_key": "value",
                    "data": data
                }
                response_text = f"Here is the distribution chart across **{cat.replace('_', ' ')}**."
        else:
            response_text = "Unable to generate a pie chart: no suitable categorical dimension detected."
        follow_ups = ["Show as a bar chart instead", "What are the averages for each group?", "Download this visualization"]

    # 4. Chart request: Trend / Time-series / Line
    elif any(k in q_lower for k in ["trend", "over time", "monthly", "timeline", "line chart", "trajectory"]):
        if stats.get("time_series") and stats["time_series"].get("timeline"):
            ts = stats["time_series"]
            chart_data = {
                "title": f"{ts['metric_column'].replace('_', ' ')} Timeline",
                "type": "area",
                "x_key": "period",
                "y_key": "value",
                "data": ts["timeline"]
            }
            response_text = (
                f"### Chronological Trend Analysis\n"
                f"• **Span**: {ts['min_date']} to {ts['max_date']} ({ts['span_days']} days)\n"
                f"• **Direction**: {ts['trend_direction']} trajectory\n"
                f"• **Growth Rate**: {ts['growth_rate_pct']}%\n\n"
                f"Interactive chart plotted below."
            )
        else:
            response_text = "No date/time column detected in this dataset to generate a chronological timeline."
        follow_ups = ["Show totals by category", "What is the peak period?", "Summarize dataset"]

    # 5. Outliers and missing values
    elif any(k in q_lower for k in ["outlier", "missing", "clean", "error", "null", "quality"]):
        issues = schema_profile.get("issues", [])
        if issues:
            issue_lines = "\n".join([f"• **{i['column']}** ({i['severity']} Severity): {i['message']} — *{i['recommendation']}*" for i in issues])
            response_text = f"### Data Quality & Outlier Report\n{issue_lines}\n\nYou can resolve these using the **Data Explorer** cleaning tools."
        else:
            response_text = "### Data Quality Health\nNo critical data quality issues or severe outliers detected! The dataset is clean."
        follow_ups = ["Filter out extreme outliers", "Show data summary", "Show highest total category"]

    # 6. Highest / Lowest / Ranking query
    elif any(k in q_lower for k in ["highest", "top", "leader", "best", "lowest", "worst", "poor"]):
        if cat_cols and num_cols:
            cat = cat_cols[0]
            metric = num_cols[0]
            grouped = df.groupby(cat)[metric].sum().reset_index().sort_values(metric, ascending=False)
            top_row = grouped.iloc[0]
            bot_row = grouped.iloc[-1]
            data = [{"name": str(r[cat]), "value": round(float(r[metric]), 2)} for _, r in grouped.head(8).iterrows()]
            chart_data = {
                "title": f"Ranked {metric.replace('_', ' ')} by {cat.replace('_', ' ')}",
                "type": "bar",
                "x_key": "name",
                "y_key": "value",
                "data": data
            }
            response_text = (
                f"### Performance Rankings: {metric.replace('_', ' ')} by {cat.replace('_', ' ')}\n"
                f"• **Top Performer**: **{top_row[cat]}** with **{top_row[metric]:,}** total.\n"
                f"• **Lowest Performer**: **{bot_row[cat]}** with **{bot_row[metric]:,}** total.\n"
                f"• **Difference**: Top segment generated {round(top_row[metric] / max(bot_row[metric], 0.01), 1)}x more than the lowest."
            )
        else:
            response_text = "Insufficient categorical or numeric fields to rank performance groups."
        follow_ups = ["Show as a pie chart", "Compare averages across departments", "What recommendations exist?"]

    # 7. Generic data question fallback
    else:
        # Check if question mentions any known column
        matched_cols = [c for c in df.columns if c.lower() in q_lower]
        if matched_cols:
            col = matched_cols[0]
            if col in stats.get("numeric_stats", {}):
                ns = stats["numeric_stats"][col]
                response_text = (
                    f"### Metrics for column '{col}':\n"
                    f"• **Sum**: {ns['sum']:,}\n"
                    f"• **Average (Mean)**: {ns['mean']:,}\n"
                    f"• **Median**: {ns['median']:,}\n"
                    f"• **Range**: {ns['min']:,} to {ns['max']:,}\n"
                    f"• **Standard Deviation**: {ns['std']:,}"
                )
            elif col in stats.get("categorical_stats", {}):
                cs = stats["categorical_stats"][col]
                response_text = (
                    f"### Statistics for '{col}':\n"
                    f"• **Unique Categories**: {cs['unique_count']}\n"
                    f"• **Top Category**: {cs['top_category']} ({cs['top_share_pct']}% share)\n"
                    f"• **Least Frequent**: {cs['bottom_category']}"
                )
            else:
                response_text = f"Information for column '{col}': Total observations = {len(df[col].dropna())}."
        else:
            response_text = (
                f"I analyzed your dataset ({len(df):,} rows). You can ask me to summarize key metrics, "
                f"find top-performing segments, generate charts (bar, pie, line), detect outliers, or compare categories."
            )
        follow_ups = [
            "Summarize this dataset",
            "What are the top 3 findings?",
            "Generate a bar chart of top categories"
        ]

    return {
        "text": response_text,
        "chart_data": chart_data,
        "follow_ups": follow_ups
    }

def ask_data_chat(
    query: str,
    df: pd.DataFrame,
    schema_profile: Dict[str, Any],
    stats: Dict[str, Any],
    provider_type: str = "fallback",
    api_key: str = ""
) -> Dict[str, Any]:
    # Sanitize query
    clean_query = query.strip()[:500]
    
    # Check if user specifically requested a chart
    wants_chart = any(k in clean_query.lower() for k in ["chart", "plot", "graph", "visualize", "pie", "bar", "trend", "histogram"])
    
    provider = get_ai_provider(provider_type, api_key)
    if isinstance(provider, FallbackProvider) or not (api_key or settings.GEMINI_API_KEY or settings.OPENAI_API_KEY):
        return answer_data_query_fallback(clean_query, df, schema_profile, stats)

    # If LLM configured, generate text using verified metrics
    try:
        # First compute fallback response to have verified facts and candidate chart ready
        fallback_res = answer_data_query_fallback(clean_query, df, schema_profile, stats)

        system_prompt = (
            "You are SheetSense AI Assistant. Answer the user's question about the dataset based strictly on the verified mathematical context provided. "
            "Never fabricate numbers. Be concise, professional, and friendly. Use markdown formatting with bolding for numbers."
        )
        context = {
            "summary": schema_profile["summary"],
            "kpis": stats.get("kpis", []),
            "numeric_stats": stats.get("numeric_stats", {}),
            "categorical_stats": stats.get("categorical_stats", {}),
            "time_series": stats.get("time_series"),
            "fallback_grounded_answer": fallback_res["text"]
        }
        user_prompt = f"Verified facts:\n{json.dumps(context, default=str)}\n\nUser Question:\n{clean_query}"
        llm_reply = provider.generate_text(system_prompt, user_prompt, temperature=0.2)
        
        return {
            "text": llm_reply,
            "chart_data": fallback_res["chart_data"],
            "follow_ups": fallback_res["follow_ups"]
        }
    except Exception:
        return answer_data_query_fallback(clean_query, df, schema_profile, stats)
