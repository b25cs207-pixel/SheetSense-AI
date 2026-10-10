import re
from typing import Dict, Any, List, Tuple, Optional
import pandas as pd
import numpy as np

DOMAIN_DEFINITIONS = {
    "business": {
        "title": "Business Intelligence & Sales",
        "keywords": ["revenue", "sales", "profit", "cost", "margin", "customer", "product", "segment", "region", "discount", "order_id", "transaction_id", "units_sold", "channel", "quota", "target"],
        "icon": "Briefcase"
    },
    "finance": {
        "title": "Banking & Personal Finance",
        "keywords": ["deposit", "withdrawal", "balance", "bank", "credit", "debit", "account", "merchant", "transfer", "fee", "atm", "interest", "loan", "repayment", "savings", "budget", "cheque", "cash"],
        "icon": "Wallet"
    },
    "education": {
        "title": "Education & Student Performance",
        "keywords": ["student", "marks", "score", "grade", "exam", "midterm", "final", "subject", "attendance", "gpa", "course", "rollno", "class", "teacher", "assignment", "faculty", "term", "credits"],
        "icon": "GraduationCap"
    },
    "accounting": {
        "title": "Accounting & Company Finance",
        "keywords": ["invoice", "receivable", "payable", "ledger", "voucher", "asset", "liability", "tax", "gst", "vat", "equity", "audit", "balance_sheet", "depreciation", "journal", "reconciliation"],
        "icon": "Calculator"
    },
    "healthcare": {
        "title": "Healthcare Administration",
        "keywords": ["patient", "doctor", "clinic", "hospital", "diagnosis", "admission", "discharge", "bed", "appointment", "prescription", "wait_time", "nurse", "surgery", "medical", "treatment"],
        "icon": "Activity"
    },
    "retail": {
        "title": "Retail & Inventory Analytics",
        "keywords": ["sku", "stock", "inventory", "reorder", "supplier", "warehouse", "barcode", "shelf", "shrinkage", "retail", "stock_level", "out_of_stock", "restock", "unit_price"],
        "icon": "ShoppingBag"
    },
    "manufacturing": {
        "title": "Manufacturing & Production",
        "keywords": ["production", "defect", "machine", "downtime", "scrap", "yield", "batch", "operator", "cycle_time", "inspection", "tolerance", "assembly", "plant", "maintenance"],
        "icon": "Factory"
    },
    "logistics": {
        "title": "Logistics & Supply Chain",
        "keywords": ["shipment", "delivery", "freight", "carrier", "route", "tracking", "origin", "destination", "delay", "transit", "fleet", "courier", "dispatch", "lead_time"],
        "icon": "Truck"
    },
    "hr": {
        "title": "Human Resources & Workforce",
        "keywords": ["employee", "salary", "payroll", "hire_date", "department", "attendance", "turnover", "leave", "overtime", "job_title", "performance_rating", "bonus", "benefits", "attrition"],
        "icon": "Users"
    },
    "marketing": {
        "title": "Marketing & Advertising",
        "keywords": ["campaign", "clicks", "impressions", "ctr", "cpc", "roas", "conversion", "leads", "ad_spend", "traffic", "bounce_rate", "keyword", "cac", "acquisition"],
        "icon": "Megaphone"
    },
    "general": {
        "title": "Universal & General Analytics",
        "keywords": [],
        "icon": "BarChart3"
    }
}

def detect_data_domain(df: pd.DataFrame, text_content: Optional[str] = None) -> Tuple[str, float, str]:
    """
    Intelligently identifies the industry domain from column names, data contents, and text.
    Returns (domain_key, confidence_score, explanation_str).
    """
    col_names = " ".join([str(c).lower().replace("_", " ") for c in df.columns])
    sample_values = " ".join(df.head(5).astype(str).values.flatten()).lower()
    full_haystack = f"{col_names} {sample_values} {(text_content or '')[:1000].lower()}"

    scores = {}
    for dom_key, defn in DOMAIN_DEFINITIONS.items():
        if dom_key == "general":
            continue
        score = 0
        for kw in defn["keywords"]:
            if kw in col_names:
                score += 3  # Column name match carries higher weight
            elif kw in full_haystack:
                score += 1
        scores[dom_key] = score

    best_domain = max(scores, key=scores.get)
    max_score = scores[best_domain]

    if max_score >= 3:
        confidence = min(0.95, 0.5 + (max_score * 0.08))
        explanation = f"Detected {DOMAIN_DEFINITIONS[best_domain]['title']} based on identified markers ({max_score} keyword matches in columns/data)."
        return best_domain, round(confidence, 2), explanation
    else:
        return "general", 0.50, "General multi-attribute dataset without dominant industry-specific markers."

def mask_financial_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Protects user financial privacy by masking sensitive account numbers, card digits, or identifiers.
    """
    masked_df = df.copy()
    account_patterns = [r'\b\d{4,16}\b', r'acct\s*#?\s*\d+', r'card\s*#?\s*\d+']
    for col in masked_df.columns:
        col_lower = str(col).lower()
        if any(term in col_lower for term in ["account", "acct", "card", "pan", "ssn", "identifier", "bank_no"]):
            masked_df[col] = masked_df[col].astype(str).apply(
                lambda val: f"****{val[-4:]}" if len(val) >= 4 and val.strip().isalnum() else "****"
            )
    return masked_df

def generate_domain_kpis(df: pd.DataFrame, domain: str, schema_profile: Dict[str, Any], stats: Dict[str, Any]) -> List[Dict[str, Any]]:
    kpis = []
    num_stats = stats.get("numeric_stats", {})
    cat_stats = stats.get("categorical_stats", {})
    num_cols = list(num_stats.keys())
    cat_cols = list(cat_stats.keys())

    # Helper search
    def find_col(terms: List[str]) -> Optional[str]:
        for t in terms:
            for c in num_cols:
                if t in c.lower():
                    return c
        return None

    def find_cat(terms: List[str]) -> Optional[str]:
        for t in terms:
            for c in cat_cols:
                if t in c.lower():
                    return c
        return None

    # DOMAIN: FINANCE / BANKING
    if domain in ["finance", "banking"]:
        amount_col = find_col(["amount", "trans", "total", "value", "balance", "price"])
        deposit_col = find_col(["deposit", "credit", "inflow", "income"])
        withdraw_col = find_col(["withdrawal", "debit", "outflow", "expense", "spend"])

        if deposit_col and withdraw_col:
            dep_sum = num_stats[deposit_col]["sum"]
            wth_sum = num_stats[withdraw_col]["sum"]
            net_flow = round(dep_sum - wth_sum, 2)
            kpis.append({"label": "Net Cash Flow", "value": f"${net_flow:,.2f}", "type": "currency", "subtitle": "Total Inflow minus Outflow"})
            kpis.append({"label": "Total Deposits / Inflow", "value": f"${dep_sum:,.2f}", "type": "currency", "subtitle": f"Across {num_stats[deposit_col]['count']} records"})
            kpis.append({"label": "Total Debits / Spending", "value": f"${wth_sum:,.2f}", "type": "currency", "subtitle": f"Across {num_stats[withdraw_col]['count']} records"})
        elif amount_col:
            amt = num_stats[amount_col]
            kpis.append({"label": "Total Financial Volume", "value": f"${amt['sum']:,.2f}", "type": "currency", "subtitle": f"Average: ${amt['mean']:,.2f} per transaction"})
            kpis.append({"label": "Max Single Transaction", "value": f"${amt['max']:,.2f}", "type": "currency", "subtitle": f"Median: ${amt['median']:,.2f}"})

        cat_col = find_cat(["category", "merchant", "type", "description"])
        if cat_col:
            c = cat_stats[cat_col]
            kpis.append({"label": f"Top Expense / Category", "value": str(c["top_category"]), "type": "string", "subtitle": f"{c['top_share_pct']}% of transactions"})

    # DOMAIN: EDUCATION
    elif domain == "education":
        score_col = find_col(["total", "score", "final", "midterm", "marks", "gpa"])
        att_col = find_col(["attendance", "presence", "rate"])

        if score_col:
            sc = num_stats[score_col]
            kpis.append({"label": "Class Average Score", "value": f"{sc['mean']:.1f}", "type": "number", "subtitle": f"Range: {sc['min']} to {sc['max']} (Median: {sc['median']})"})
            # Pass rate estimate if >= 40
            clean_scores = pd.to_numeric(df[score_col], errors='coerce').dropna()
            pass_count = (clean_scores >= 40).sum()
            pass_rate = round((pass_count / max(len(clean_scores), 1)) * 100, 1)
            kpis.append({"label": "Estimated Pass Rate", "value": f"{pass_rate}%", "type": "percentage", "subtitle": f"{pass_count} of {len(clean_scores)} students (Benchmark: ≥40)"})
            kpis.append({"label": "Top Examination Mark", "value": f"{sc['max']:.1f}", "type": "number", "subtitle": f"Std Dev spread: ±{sc['std']:.1f}"})

        if att_col:
            at = num_stats[att_col]
            kpis.append({"label": "Average Attendance", "value": f"{at['mean']:.1f}%", "type": "percentage", "subtitle": f"Lowest recorded: {at['min']:.1f}%"})

        dept_col = find_cat(["dept", "department", "grade", "class", "subject"])
        if dept_col:
            d = cat_stats[dept_col]
            kpis.append({"label": "Largest Cohort", "value": str(d["top_category"]), "type": "string", "subtitle": f"{d['top_frequency']} students ({d['top_share_pct']}%)"})

    # DOMAIN: BUSINESS & SALES
    elif domain == "business":
        rev_col = find_col(["revenue", "sales", "total_amount", "amount", "price"])
        profit_col = find_col(["profit", "margin", "income"])
        cost_col = find_col(["cost", "expense"])

        if rev_col:
            rc = num_stats[rev_col]
            kpis.append({"label": "Gross Revenue", "value": f"${rc['sum']:,.2f}", "type": "currency", "subtitle": f"Average ticket: ${rc['mean']:,.2f}"})

        if profit_col:
            pc = num_stats[profit_col]
            kpis.append({"label": "Total Net Profit", "value": f"${pc['sum']:,.2f}", "type": "currency", "subtitle": f"Average profit/deal: ${pc['mean']:,.2f}"})
            if rev_col and rc["sum"] > 0:
                margin = round((pc["sum"] / rc["sum"]) * 100, 1)
                kpis.append({"label": "Operating Margin", "value": f"{margin}%", "type": "percentage", "subtitle": "Net Profit / Gross Revenue"})
        elif cost_col:
            cc = num_stats[cost_col]
            kpis.append({"label": "Total Operational Cost", "value": f"${cc['sum']:,.2f}", "type": "currency", "subtitle": f"Average per order: ${cc['mean']:,.2f}"})

        seg_col = find_cat(["region", "segment", "category", "product"])
        if seg_col:
            sc = cat_stats[seg_col]
            kpis.append({"label": f"Top Segment: {seg_col.title()}", "value": str(sc["top_category"]), "type": "string", "subtitle": f"{sc['top_share_pct']}% of recorded deals"})

    # DOMAIN: RETAIL & INVENTORY
    elif domain == "retail":
        stock_col = find_col(["stock", "quantity", "inventory", "qty"])
        price_col = find_col(["price", "cost", "amount"])

        if stock_col:
            st = num_stats[stock_col]
            kpis.append({"label": "Total Stock Units", "value": f"{int(st['sum']):,}", "type": "count", "subtitle": f"Average stock/SKU: {st['mean']:.1f}"})
            # Check low stock count (under 10)
            low_stock = (pd.to_numeric(df[stock_col], errors='coerce').dropna() < 10).sum()
            kpis.append({"label": "Low-Stock Reorder Alerts", "value": f"{low_stock} SKUs", "type": "count", "subtitle": "Items below 10 unit buffer threshold"})

        if price_col:
            pr = num_stats[price_col]
            kpis.append({"label": "Average Unit Price", "value": f"${pr['mean']:,.2f}", "type": "currency", "subtitle": f"Range: ${pr['min']} - ${pr['max']}"})

        cat_col = find_cat(["category", "supplier", "warehouse", "status"])
        if cat_col:
            kpis.append({"label": "Leading Category", "value": str(cat_stats[cat_col]["top_category"]), "type": "string", "subtitle": f"{cat_stats[cat_col]['top_share_pct']}% of inventory catalog"})

    # DOMAIN: MANUFACTURING & PRODUCTION
    elif domain == "manufacturing":
        prod_col = find_col(["output", "production", "produced", "units", "quantity"])
        defect_col = find_col(["defect", "scrap", "reject", "fault"])
        down_col = find_col(["downtime", "delay", "idle", "maintenance"])

        if prod_col:
            p = num_stats[prod_col]
            kpis.append({"label": "Total Production Volume", "value": f"{int(p['sum']):,}", "type": "count", "subtitle": f"Average batch: {p['mean']:.1f} units"})

        if defect_col:
            d = num_stats[defect_col]
            kpis.append({"label": "Total Scrapped / Defects", "value": f"{int(d['sum']):,}", "type": "count", "subtitle": f"Average per batch: {d['mean']:.1f}"})
            if prod_col and p["sum"] > 0:
                defect_rate = round((d["sum"] / p["sum"]) * 100, 2)
                kpis.append({"label": "Overall Defect Rate", "value": f"{defect_rate}%", "type": "percentage", "subtitle": "Quality yield: " + f"{100 - defect_rate:.1f}%"})

        if down_col:
            dw = num_stats[down_col]
            kpis.append({"label": "Equipment Downtime", "value": f"{dw['sum']:.1f} hrs", "type": "number", "subtitle": f"Average incident: {dw['mean']:.1f} hrs"})

    # DOMAIN: HUMAN RESOURCES (HR)
    elif domain == "hr":
        hours_col = find_col(["hours", "worked", "time"])
        overtime_col = find_col(["overtime", "ot"])
        salary_col = find_col(["salary", "wage", "pay", "compensation"])

        kpis.append({"label": "Total Workforce Entries", "value": f"{len(df):,}", "type": "count", "subtitle": "Active logs & records analyzed"})

        if hours_col:
            h = num_stats[hours_col]
            kpis.append({"label": "Average Hours Worked", "value": f"{h['mean']:.1f} hrs", "type": "number", "subtitle": f"Total accumulated: {h['sum']:,.0f} hrs"})

        if overtime_col:
            ot = num_stats[overtime_col]
            kpis.append({"label": "Total Overtime Logged", "value": f"{ot['sum']:.1f} hrs", "type": "number", "subtitle": f"Average per employee: {ot['mean']:.1f} hrs"})

        if salary_col:
            sal = num_stats[salary_col]
            kpis.append({"label": "Total Payroll Volume", "value": f"${sal['sum']:,.2f}", "type": "currency", "subtitle": f"Average compensation: ${sal['mean']:,.2f}"})

        dept_col = find_cat(["dept", "department", "team", "role"])
        if dept_col:
            kpis.append({"label": "Largest Department", "value": str(cat_stats[dept_col]["top_category"]), "type": "string", "subtitle": f"{cat_stats[dept_col]['top_share_pct']}% of headcount"})

    # DOMAIN: MARKETING & ADVERTISING
    elif domain == "marketing":
        spend_col = find_col(["spend", "cost", "budget", "ad_spend"])
        conv_col = find_col(["conversion", "lead", "signup", "sale", "order"])
        click_col = find_col(["click", "impression", "visit", "view"])

        if spend_col:
            s = num_stats[spend_col]
            kpis.append({"label": "Total Advertising Spend", "value": f"${s['sum']:,.2f}", "type": "currency", "subtitle": f"Average campaign spend: ${s['mean']:,.2f}"})

        if conv_col:
            c = num_stats[conv_col]
            kpis.append({"label": "Total Conversions / Leads", "value": f"{int(c['sum']):,}", "type": "count", "subtitle": f"Average per campaign: {c['mean']:.1f}"})
            if spend_col and c["sum"] > 0:
                cpa = round(s["sum"] / c["sum"], 2)
                kpis.append({"label": "Cost per Acquisition (CPA)", "value": f"${cpa:,.2f}", "type": "currency", "subtitle": "Ad Spend divided by Conversions"})

    # FALLBACK TO STANDARD STATISTICS KPIS
    if len(kpis) < 2:
        return stats.get("kpis", [])

    # Always ensure Data Quality Health is included
    kpis.append({
        "label": "Data Quality Health",
        "value": f"{schema_profile['summary']['overall_quality_score']}%",
        "type": "percentage",
        "subtitle": f"{schema_profile['summary']['total_missing_cells']} missing, {schema_profile['summary']['duplicate_rows']} duplicates"
    })

    return kpis

def generate_educational_concepts() -> List[Dict[str, Any]]:
    return [
        {
            "id": "concept_mean_vs_median",
            "title": "Mean vs. Median: When to Use Which?",
            "category": "Descriptive Statistics",
            "summary": "The Mean is the arithmetic average (sensitive to extreme outliers). The Median is the exact middle observation (robust to extreme values).",
            "tip": "If average salary or spend is much higher than median, high-value outliers are skewing the distribution to the right."
        },
        {
            "id": "concept_correlation",
            "title": "Correlation (r) vs. Causation",
            "category": "Bivariate Analysis",
            "summary": "Pearson correlation measures linear association (-1.0 to +1.0). An r close to +1 means variables rise together, but does NOT prove one causes the other.",
            "tip": "Always test confounding factors before assuming an action directly changes an outcome."
        },
        {
            "id": "concept_iqr_outliers",
            "title": "Interquartile Range (IQR) & Anomaly Detection",
            "category": "Data Hygiene",
            "summary": "IQR is the distance between the 25th percentile (Q1) and 75th percentile (Q3). Values beyond 1.5 * IQR are mathematically identified as potential outliers.",
            "tip": "Outliers can represent data entry typos, system glitches, or legitimate VIP high-value events."
        },
        {
            "id": "concept_pie_charts",
            "title": "Best Practices for Proportions & Pie Charts",
            "category": "Visualization Literacy",
            "summary": "Pie and donut charts work best when displaying 3 to 7 categorical slices that represent a meaningful whole (100%).",
            "tip": "For more than 8 categories or continuous variables, ranked bar charts are vastly easier to read and compare."
        }
    ]
