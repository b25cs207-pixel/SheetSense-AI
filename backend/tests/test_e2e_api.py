import unittest
from fastapi.testclient import TestClient
from backend.main import app

class TestSheetSenseE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_check(self):
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "SheetSense AI")

    def test_sample_dataset_load(self):
        resp = self.client.post("/api/sample/sales")
        self.assertEqual(resp.status_code, 200)
        ds = resp.json()
        self.assertIn("id", ds)
        self.assertEqual(ds["name"], "Sales Performance Analysis")
        self.assertGreater(ds["row_count"], 100)
        self.assertIn("schema", ds)
        self.assertIn("summary", ds)

        # Check KPIs
        kpis = ds["summary"]["stats"]["kpis"]
        self.assertGreater(len(kpis), 3)

        # Check Charts
        charts = ds["summary"]["charts"]
        self.assertGreater(len(charts), 3)

        # Check Insights
        insights = ds["summary"]["insights"]
        self.assertGreater(len(insights), 3)

        # Check Recommendations
        recs = ds["summary"]["recommendations"]
        self.assertGreater(len(recs), 3)

        # Store dataset id for subsequent tests
        ds_id = ds["id"]

        # Test Chat with Data
        chat_resp = self.client.post(f"/api/datasets/{ds_id}/chat", json={"message": "What is the total revenue?"})
        self.assertEqual(chat_resp.status_code, 200)
        chat_data = chat_resp.json()
        self.assertIn("text", chat_data)

        # Test Run Recommendation
        rec = recs[0]
        run_resp = self.client.post(f"/api/datasets/{ds_id}/recommendation/run", json={"spec": rec["spec"]})
        self.assertEqual(run_resp.status_code, 200)
        run_data = run_resp.json()
        self.assertIn("data", run_data)
        self.assertGreater(len(run_data["data"]), 0)

        # Test Filtering
        flt_resp = self.client.post(f"/api/datasets/{ds_id}/filter", json={"page": 1, "page_size": 10})
        self.assertEqual(flt_resp.status_code, 200)
        flt_data = flt_resp.json()
        self.assertEqual(len(flt_data["rows"]), 10)

        # Test Exports
        pdf_resp = self.client.get(f"/api/datasets/{ds_id}/export/pdf")
        self.assertEqual(pdf_resp.status_code, 200)
        self.assertEqual(pdf_resp.headers["content-type"], "application/pdf")

        csv_resp = self.client.get(f"/api/datasets/{ds_id}/export/csv")
        self.assertEqual(csv_resp.status_code, 200)
        self.assertEqual(csv_resp.headers["content-type"], "text/csv; charset=utf-8")

        xlsx_resp = self.client.get(f"/api/datasets/{ds_id}/export/xlsx")
        self.assertEqual(xlsx_resp.status_code, 200)

        # Test Sharing
        share_resp = self.client.post(f"/api/datasets/{ds_id}/share", json={"is_shared": True})
        self.assertEqual(share_resp.status_code, 200)
        share_data = share_resp.json()
        self.assertTrue(share_data["is_shared"])
        token = share_data["share_token"]
        self.assertIsNotNone(token)

        # Test Get Shared Dashboard
        pub_resp = self.client.get(f"/api/shared/{token}")
        self.assertEqual(pub_resp.status_code, 200)
        pub_ds = pub_resp.json()
        self.assertTrue(pub_ds["is_read_only"])
        self.assertEqual(pub_ds["name"], ds["name"])

    def test_frontend_spa_serving(self):
        resp = self.client.get("/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("<title>SheetSense AI", resp.text)

if __name__ == "__main__":
    unittest.main()
