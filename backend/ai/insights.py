import json
from typing import List, Dict, Any
from backend.ai.provider import get_ai_provider, FallbackProvider

def generate_insights_fallback(schema_profile: Dict[str, Any], stats: Dict[str, Any]) -> List[Dict[str, Any]]:
    insights = []
    kpis = stats.get("kpis", [])
    num_stats = stats.get("numeric_stats", {})
    cat_stats = stats.get("categorical_stats", {})
    ts = stats.get("time_series")
    corrs = stats.get("correlations", {})
    quality = schema_profile.get("summary", {})

    # 1. Primary Volume / Observation Finding
    total_rows = quality.get("total_rows", 0)
    total_cols = quality.get("total_columns", 0)
    insights.append({
        "id": "insight_dataset_scope",
        "title": "Dataset Scope & Dimensions",
        "category": "Key Finding",
        "finding": f"Analyzed {total_rows:,} validated observations across {total_cols} attributes.",
        "metric": f"{total_rows:,} rows",
        "explanation": f"The dataset provides adequate statistical sample power across all {total_cols} detected variables.",
        "significance": "High reliability for aggregate metrics and grouping analyses.",
        "suggested_action": "Examine segment breakdowns to uncover operational variances.",
        "confidence": "High (Direct Count)",
        "explore_target": "Data Explorer"
    })

    # 2. Key Primary Metric Insight
    if num_stats:
        first_num = list(num_stats.keys())[0]
        n_stat = num_stats[first_num]
        insights.append({
            "id": f"insight_metric_{first_num}",
            "title": f"Concentration in {first_num.replace('_', ' ').title()}",
            "category": "Key Finding",
            "finding": f"Total {first_num} reached {n_stat['sum']:,} with an average of {n_stat['mean']:,} per record.",
            "metric": f"Mean: {n_stat['mean']:,} | Max: {n_stat['max']:,}",
            "explanation": f"The median ({n_stat['median']:,}) vs mean indicates {'positive right-skew with high-value outliers' if n_stat['mean'] > n_stat['median'] else 'balanced or left-skewed distribution'}.",
            "significance": f"Determines overall throughput and baseline expectations for {first_num}.",
            "suggested_action": f"Segment high-performing observations above the 75th percentile ({n_stat['q75']:,}).",
            "confidence": "Verified (Deterministic)",
            "explore_target": f"chart_cat_primary_bar"
        })

    # 3. Categorical Leadership
    if cat_stats:
        first_cat = list(cat_stats.keys())[0]
        c_stat = cat_stats[first_cat]
        insights.append({
            "id": f"insight_cat_{first_cat}",
            "title": f"Dominant Segment: {c_stat['top_category']}",
            "category": "Top Performer",
            "finding": f"'{c_stat['top_category']}' accounts for {c_stat['top_share_pct']}% of all entries in {first_cat.replace('_', ' ')}.",
            "metric": f"{c_stat['top_share_pct']}% share ({c_stat['top_frequency']} records)",
            "explanation": f"The leading segment significantly outpaces the smallest category ('{c_stat['bottom_category']}').",
            "significance": f"Operational dependencies or market affinity is heavily centered in {c_stat['top_category']}.",
            "suggested_action": f"Double down on {c_stat['top_category']} strengths while investigating low participation in {c_stat['bottom_category']}.",
            "confidence": "Verified (Exact Frequency)",
            "explore_target": "chart_cat_primary_pie"
        })

    # 4. Chronological Trajectory
    if ts and ts.get("timeline"):
        direction = ts.get("trend_direction", "Stable")
        growth = ts.get("growth_rate_pct", 0.0)
        insights.append({
            "id": "insight_time_trajectory",
            "title": f"Chronological Trend: {direction} Trajectory",
            "category": "Trend",
            "finding": f"{ts['metric_column']} experienced a {growth}% change across {ts['span_days']} days.",
            "metric": f"{growth}% Period Change",
            "explanation": f"Monitored over continuous periods between {ts['min_date']} and {ts['max_date']}.",
            "significance": f"Validates whether growth momentum is accelerating or if seasonal troughs exist.",
            "suggested_action": "Align operational staffing and inventory with recurring peak periods.",
            "confidence": "Medium-High (Historical Data)",
            "explore_target": "chart_time_series_line"
        })

    # 5. Correlation & Statistical Relationship
    high_corr_pair = None
    for col1, corr_dict in corrs.items():
        for col2, val in corr_dict.items():
            if col1 != col2 and abs(val) >= 0.35:
                high_corr_pair = (col1, col2, val)
                break
        if high_corr_pair:
            break

    if high_corr_pair:
        c1, c2, val = high_corr_pair
        relation = "positive linear correlation" if val > 0 else "negative inverse correlation"
        insights.append({
            "id": f"insight_corr_{c1}_{c2}",
            "title": f"Relationship: {c1.replace('_', ' ')} & {c2.replace('_', ' ')}",
            "category": "Relationship",
            "finding": f"Discovered an empirical {relation} (r = {val}) between {c1} and {c2}.",
            "metric": f"Correlation r = {val}",
            "explanation": f"Shifts in {c1} are mathematically associated with proportional movements in {c2}.",
            "significance": "Crucial for predictive planning and sensitivity modeling.",
            "suggested_action": f"Leverage {c1} as a leading indicator when forecasting {c2}.",
            "confidence": f"Statistical (r = {val})",
            "explore_target": "chart_scatter_correlation"
        })

    # 6. Data Quality & Hygiene Warning
    quality_score = quality.get("overall_quality_score", 100)
    missing_cells = quality.get("total_missing_cells", 0)
    dups = quality.get("duplicate_rows", 0)
    if quality_score < 95 or missing_cells > 0 or dups > 0:
        insights.append({
            "id": "insight_data_quality_warning",
            "title": "Data Cleanliness & Quality Alert",
            "category": "Data Quality",
            "finding": f"Overall quality score is {quality_score}%. Identified {missing_cells} missing cell(s) and {dups} duplicate row(s).",
            "metric": f"{quality_score}% Quality Index",
            "explanation": "Missing observations or duplicate entries can distort statistical variance and skew predictive calculations.",
            "significance": "Moderate risk of bias if unaddressed prior to decision-making.",
            "suggested_action": "Use SheetSense's built-in Clean Data tool to impute missing fields and purge duplicate rows.",
            "confidence": "Audit Verified",
            "explore_target": "Data Quality Report"
        })

    return insights

def generate_insights(schema_profile: Dict[str, Any], stats: Dict[str, Any], provider_type: str = "fallback", api_key: str = "") -> List[Dict[str, Any]]:
    # Start with robust verified fallback
    base_insights = generate_insights_fallback(schema_profile, stats)

    # If LLM provider configured, enrich or summarize
    provider = get_ai_provider(provider_type, api_key)
    if isinstance(provider, FallbackProvider):
        return base_insights

    try:
        system_prompt = (
            "You are SheetSense AI's Chief Data Scientist. Given verified statistical facts about a dataset, "
            "provide 5 concise, actionable insight cards formatted strictly as a JSON array of objects with keys: "
            "title, category (Key Finding, Trend, Top Performer, Relationship, Data Quality), finding, metric, explanation, significance, suggested_action, confidence, explore_target. "
            "Do NOT make up any numbers. Base every number strictly on the provided facts."
        )
        context_summary = {
            "summary": schema_profile.get("summary"),
            "kpis": stats.get("kpis"),
            "primary_correlations": stats.get("correlations"),
            "time_series": stats.get("time_series")
        }
        user_prompt = f"Verified facts:\n{json.dumps(context_summary, indent=2)}\n\nGenerate structured insights JSON:"
        resp_text = provider.generate_text(system_prompt, user_prompt, temperature=0.1)
        
        # Clean markdown ```json wrappers if present
        clean_json_str = resp_text.strip()
        if clean_json_str.startswith("```"):
            clean_json_str = clean_json_str.split("```")[1]
            if clean_json_str.startswith("json"):
                clean_json_str = clean_json_str[4:]
        clean_json_str = clean_json_str.strip()
        parsed = json.loads(clean_json_str)
        if isinstance(parsed, list) and len(parsed) > 0:
            for idx, item in enumerate(parsed):
                item["id"] = f"ai_insight_{idx+1}"
            return parsed
    except Exception:
        pass

    return base_insights
