import unittest
import io
import pandas as pd
import numpy as np

from backend.parsers.csv_parser import parse_csv
from backend.parsers.excel_parser import parse_excel
from backend.parsers.json_parser import parse_json
from backend.parsers.url_parser import is_safe_url
from backend.engine.profiler import profile_dataset, infer_column_type
from backend.engine.statistics import compute_dataset_statistics, calculate_numeric_stats
from backend.engine.charts import generate_candidate_charts
from backend.engine.recommendations import generate_proactive_recommendations, execute_recommendation
from backend.engine.cleaner import clean_dataset
from backend.ai.chat import answer_data_query_fallback
from backend.exports.csv_exporter import export_to_safe_csv
from backend.exports.excel_exporter import export_to_excel
from backend.exports.pdf_exporter import generate_pdf_report

class TestSheetSenseCore(unittest.TestCase):
    def setUp(self):
        self.sample_csv_data = (
            "Region,Product,Revenue,Units,Rating\n"
            "North,Widget A,150.50,10,4.5\n"
            "North,Widget B,200.00,15,4.8\n"
            "South,Widget A,300.00,20,4.2\n"
            "East,Widget C,120.00,8,3.9\n"
            "West,Widget B,250.00,18,4.9\n"
            "West,Widget A,180.00,12,4.6\n"
        ).encode('utf-8')

    def test_csv_parser(self):
        res = parse_csv(self.sample_csv_data)
        self.assertTrue(res.is_structured)
        self.assertIsNotNone(res.df)
        self.assertEqual(len(res.df), 6)
        self.assertEqual(list(res.df.columns), ["Region", "Product", "Revenue", "Units", "Rating"])

    def test_deterministic_statistics(self):
        res = parse_csv(self.sample_csv_data)
        df = res.df
        stats_num = calculate_numeric_stats(df["Revenue"])
        expected_sum = 150.50 + 200.00 + 300.00 + 120.00 + 250.00 + 180.00
        self.assertEqual(round(stats_num["sum"], 2), round(expected_sum, 2))
        self.assertEqual(round(stats_num["mean"], 2), round(expected_sum / 6, 2))
        self.assertEqual(stats_num["count"], 6)

    def test_schema_profiling(self):
        res = parse_csv(self.sample_csv_data)
        df = res.df
        profile = profile_dataset(df)
        self.assertEqual(profile["summary"]["total_rows"], 6)
        self.assertEqual(profile["summary"]["total_columns"], 5)
        self.assertEqual(profile["summary"]["duplicate_rows"], 0)
        self.assertEqual(profile["summary"]["overall_quality_score"], 100.0)

    def test_charts_generation(self):
        res = parse_csv(self.sample_csv_data)
        df = res.df
        profile = profile_dataset(df)
        stats = compute_dataset_statistics(df, profile)
        charts = generate_candidate_charts(df, profile, stats)
        self.assertGreater(len(charts), 0)
        
        # Verify chart data values match actual data
        bar_chart = [c for c in charts if c["type"] == "bar"][0]
        self.assertTrue(len(bar_chart["data"]) > 0)
        self.assertIn("value", bar_chart["data"][0])

    def test_cleaner_operations(self):
        # Create df with duplicate and null
        test_df = pd.DataFrame({
            "A": [1, 2, 2, None],
            "B": ["x", "y", "y", "z"]
        })
        # Test drop duplicates
        cleaned_dup, rep_dup = clean_dataset(test_df, "drop_duplicates")
        self.assertEqual(len(cleaned_dup), 3)
        self.assertEqual(rep_dup["modified_rows"], 1)

        # Test impute missing
        cleaned_imp, rep_imp = clean_dataset(test_df, "impute_missing", {"column": "A", "strategy": "mean"})
        self.assertEqual(int(cleaned_imp["A"].isnull().sum()), 0)

    def test_recommendation_generation_and_execution(self):
        res = parse_csv(self.sample_csv_data)
        df = res.df
        profile = profile_dataset(df)
        stats = compute_dataset_statistics(df, profile)
        recs = generate_proactive_recommendations(df, profile, stats)
        self.assertGreater(len(recs), 0)

        # Execute first recommendation
        first_rec = recs[0]
        result = execute_recommendation(df, first_rec["spec"])
        self.assertIn("data", result)
        self.assertGreater(len(result["data"]), 0)

    def test_ask_data_chat(self):
        res = parse_csv(self.sample_csv_data)
        df = res.df
        profile = profile_dataset(df)
        stats = compute_dataset_statistics(df, profile)
        
        # Query summary
        ans = answer_data_query_fallback("Summarize this dataset", df, profile, stats)
        self.assertIn("Dataset Summary", ans["text"])
        self.assertIn("6 rows", ans["text"])

        # Query pie chart
        ans_pie = answer_data_query_fallback("Generate a pie chart of Region", df, profile, stats)
        self.assertIsNotNone(ans_pie["chart_data"])
        self.assertEqual(ans_pie["chart_data"]["type"], "donut")

    def test_ssrf_protection(self):
        unsafe_urls = [
            "http://localhost:8000/secret",
            "http://127.0.0.1:5000",
            "http://192.168.1.1/admin",
            "http://10.0.0.1/config",
            "ftp://files.example.com",
            "file:///etc/passwd"
        ]
        for u in unsafe_urls:
            safe, msg = is_safe_url(u)
            self.assertFalse(safe, f"URL {u} should have been blocked!")

    def test_safe_csv_export(self):
        # Malicious spreadsheet formula
        malicious_df = pd.DataFrame({
            "Command": ["=CMD|' /C calc'!A0", "+12345", "-500", "@SUM(A1:A5)", "Normal Text"]
        })
        csv_bytes = export_to_safe_csv(malicious_df)
        csv_str = csv_bytes.decode('utf-8')
        # Check that dangerous formulas are prefixed with single quote
        self.assertIn("'=CMD", csv_str)
        self.assertIn("'+12345", csv_str)
        self.assertIn("'-500", csv_str)
        self.assertIn("'@SUM", csv_str)

    def test_pdf_and_excel_export(self):
        res = parse_csv(self.sample_csv_data)
        df = res.df
        profile = profile_dataset(df)
        stats = compute_dataset_statistics(df, profile)

        # Excel export
        xlsx_bytes = export_to_excel(df, "Test Sheet")
        self.assertGreater(len(xlsx_bytes), 100)

        # PDF export
        pdf_bytes = generate_pdf_report(
            dataset_name="Test Sales",
            schema_profile=profile,
            stats=stats,
            insights=[],
            recommendations=[]
        )
        self.assertGreater(len(pdf_bytes), 500)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

if __name__ == "__main__":
    unittest.main()
