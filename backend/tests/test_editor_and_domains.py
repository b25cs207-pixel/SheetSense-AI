import unittest
from fastapi.testclient import TestClient
import pandas as pd
import io

from backend.main import app

class TestEditorAndDomains(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        
        # Upload a test dataset
        csv_data = "Student,Math,Physics,Attendance\nAlice,85,90,95\nBob,70,65,80\nCharlie,55,60,75\nDavid,40,45,60\n"
        files = {"file": ("students.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
        res = self.client.post("/api/upload", files=files)
        self.assertEqual(res.status_code, 200)
        self.dataset = res.json()
        self.dataset_id = self.dataset["id"]

    def test_domain_detection_and_switch(self):
        # Initial detection should be education
        self.assertEqual(self.dataset["domain"], "education")
        self.assertIn("domain_kpis", self.dataset["summary"]["stats"])
        
        # Switch domain to business
        switch_res = self.client.post(
            f"/api/datasets/{self.dataset_id}/domain",
            json={"domain": "business", "analysis_mode": "industry"}
        )
        self.assertEqual(switch_res.status_code, 200)
        updated = switch_res.json()
        self.assertEqual(updated["domain"], "business")
        self.assertEqual(updated["analysis_mode"], "industry")

    def test_educational_concepts(self):
        res = self.client.get(f"/api/datasets/{self.dataset_id}/educational-concepts")
        self.assertEqual(res.status_code, 200)
        concepts = res.json()
        self.assertTrue(len(concepts) >= 3)
        self.assertIn("Mean vs. Median", concepts[0]["title"])

    def test_editor_get_rows(self):
        res = self.client.get(f"/api/datasets/{self.dataset_id}/editor/rows?page=1&page_size=10")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total_rows"], 4)
        self.assertEqual(len(data["columns"]), 4)
        self.assertEqual(len(data["rows"]), 4)
        self.assertEqual(data["rows"][0]["Student"], "Alice")

    def test_editor_save_cell_edit_and_formula(self):
        # Edit Bob's Math score to 95 and add a formula
        changes = [
            {"row": 1, "column": "Math", "value": 95}
        ]
        res = self.client.post(
            f"/api/datasets/{self.dataset_id}/editor/save",
            json={"changes": changes, "evaluate_formulas": True, "summary": "Updated Bob Math score"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["applied_edits"], 1)
        self.assertEqual(data["version"], 2)

        # Check rows reflect edit
        row_res = self.client.get(f"/api/datasets/{self.dataset_id}/editor/rows")
        self.assertEqual(row_res.json()["rows"][1]["Math"], 95)

    def test_editor_row_and_column_mutations(self):
        # Add row
        add_r = self.client.post(
            f"/api/datasets/{self.dataset_id}/editor/row/add",
            json={"row_data": {"Student": "Eve", "Math": 99, "Physics": 98, "Attendance": 100}}
        )
        self.assertEqual(add_r.status_code, 200)
        self.assertEqual(add_r.json()["row_count"], 5)

        # Add column
        add_c = self.client.post(
            f"/api/datasets/{self.dataset_id}/editor/column/add",
            json={"col_name": "Grade", "col_type": "text", "default_val": "A"}
        )
        self.assertEqual(add_c.status_code, 200)
        self.assertEqual(add_c.json()["col_count"], 5)

        # Rename column
        ren_c = self.client.post(
            f"/api/datasets/{self.dataset_id}/editor/column/rename",
            json={"old_name": "Grade", "new_name": "LetterGrade"}
        )
        self.assertEqual(ren_c.status_code, 200)

        # Delete column
        del_c = self.client.post(
            f"/api/datasets/{self.dataset_id}/editor/column/delete",
            json={"col_name": "LetterGrade"}
        )
        self.assertEqual(del_c.status_code, 200)
        self.assertEqual(del_c.json()["col_count"], 4)

    def test_find_replace_and_quick_clean(self):
        # Find and replace "Alice" with "Alicia"
        fr_res = self.client.post(
            f"/api/datasets/{self.dataset_id}/editor/find-replace",
            json={"search_term": "Alice", "replace_term": "Alicia", "match_case": True}
        )
        self.assertEqual(fr_res.status_code, 200)
        self.assertEqual(fr_res.json()["matches_replaced"], 1)

        # Quick clean uppercase
        qc_res = self.client.post(
            f"/api/datasets/{self.dataset_id}/editor/quick-clean",
            json={"action": "uppercase", "column": "Student"}
        )
        self.assertEqual(qc_res.status_code, 200)
        
        # Verify
        row_res = self.client.get(f"/api/datasets/{self.dataset_id}/editor/rows")
        self.assertEqual(row_res.json()["rows"][0]["Student"], "ALICIA")

    def test_version_history_and_restore(self):
        # Make an edit to create version 2
        self.client.post(
            f"/api/datasets/{self.dataset_id}/editor/save",
            json={"changes": [{"row": 0, "column": "Math", "value": 100}], "summary": "Set Alice to 100"}
        )

        # Check version history
        v_res = self.client.get(f"/api/datasets/{self.dataset_id}/editor/versions")
        self.assertEqual(v_res.status_code, 200)
        versions = v_res.json()
        self.assertTrue(len(versions) >= 2)
        self.assertEqual(versions[0]["version_number"], 2)

        # Restore original
        orig_res = self.client.post(f"/api/datasets/{self.dataset_id}/editor/restore-original")
        self.assertEqual(orig_res.status_code, 200)

        # Alice's Math should be back to 85
        row_res = self.client.get(f"/api/datasets/{self.dataset_id}/editor/rows")
        self.assertEqual(row_res.json()["rows"][0]["Math"], 85)

if __name__ == "__main__":
    unittest.main()
