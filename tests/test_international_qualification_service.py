import json
from io import BytesIO
from pathlib import Path
import tempfile
import unittest

import pandas as pd

from backend.international_qualification_service import InternationalQualificationStore


class InternationalQualificationStoreTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.dataset_dir = Path(self.temporary_directory.name)
        self.config_path = self.dataset_dir / "global_region_config.json"
        self.config_path.write_text(
            json.dumps(
                {
                    "countryCapitals": {
                        "China": {"capital": "Beijing", "coords": [116.4074, 39.9042]},
                        "Singapore": {"capital": "Singapore", "coords": [103.8198, 1.3521]},
                        "Serbia": {"capital": "Belgrade", "coords": [20.4489, 44.7866]},
                    }
                }
            ),
            encoding="utf-8",
        )
        self.store = InternationalQualificationStore(self.dataset_dir, self.config_path)
        self.metadata = self.store.save_dataset(
            {
                "records": [
                    self._record(
                        "china",
                        "APAC",
                        "China",
                        sub_product_line="Ultrasound",
                    ),
                    self._record(
                        "singapore",
                        "APAC",
                        "Singapore",
                        sub_product_line="PMLS",
                        invalid_fields=["subProductLine"],
                        issues=[{"field": "subProductLine", "reason": "Sub-line contains Product Line value (PMLS)."}],
                    ),
                    self._record(
                        "serbia",
                        "EUROPE",
                        "Serbia",
                        sub_product_line="Infusion",
                    ),
                ],
                "dirtyRows": [
                    {
                        "category": "International qualification retained dimension issue",
                        "handling": "Retained; affected dimensions hidden from filters and distributions",
                        "affectedFields": ["subProductLine"],
                        "reason": "Sub-line contains a Product Line value (PMLS).",
                        "sourceFile": "qualification.xlsx",
                        "sourceSheet": "0",
                        "sourceRow": 3,
                        "rawRegion": "APAC",
                        "rawBranch": "Singapore",
                        "departmentName": "Partner",
                        "rawData": {"Sub-line": "PMLS", "Employee": "Engineer Singapore"},
                    }
                ],
                "warnings": [],
            }
        )

    def tearDown(self):
        self.temporary_directory.cleanup()

    def test_retained_dimension_issue_stays_in_totals_but_not_dimension_options_or_distribution(self):
        self.assertEqual(
            self.metadata["allOptions"]["subProductLines"],
            ["Infusion", "Ultrasound"],
        )

        result = self.store.query(self.metadata["filters"])["dashboard"]

        self.assertEqual(result["filteredRecordCount"], 3)
        self.assertEqual(result["summary"]["validQualifications"], 3)
        self.assertEqual(
            {item["name"] for item in result["subProductLineDistribution"]},
            {"Infusion", "Ultrasound"},
        )

    def test_narrow_apac_scope_excludes_china_but_all_scope_includes_china(self):
        apac_filters = dict(self.metadata["filters"])
        apac_filters["secondaryRegions"] = ["APAC"]

        result = self.store.query(apac_filters)["dashboard"]
        countries = {item["country"] for item in result["countryStats"]}
        dynamic_countries = self.store.dynamic_filter_options(apac_filters)["options"]["countries"]

        self.assertEqual(countries, {"Singapore"})
        self.assertNotIn("China", dynamic_countries)
        self.assertEqual(
            {item["country"] for item in self.store.query(self.metadata["filters"])["dashboard"]["countryStats"]},
            {"China", "Singapore", "Serbia"},
        )

    def test_dirty_export_explains_retained_handling_and_contains_original_columns(self):
        content, _ = self.store.dirty_export()
        exported = pd.read_excel(BytesIO(content), sheet_name="Dirty Rows")

        self.assertEqual(exported.loc[0, "Handling"], "Retained; affected dimensions hidden from filters and distributions")
        self.assertEqual(exported.loc[0, "Affected Fields"], "subProductLine")
        self.assertEqual(exported.loc[0, "Original - Sub-line"], "PMLS")
        self.assertEqual(exported.loc[0, "Original - Employee"], "Engineer Singapore")

    def test_legacy_cached_records_receive_dimension_flags_without_reimport(self):
        legacy_dir = self.dataset_dir / "legacy"
        legacy_store = InternationalQualificationStore(legacy_dir, self.config_path)
        legacy_record = self._record(
            "legacy",
            "APAC",
            "Singapore",
            sub_product_line="MIS",
        )
        legacy_record.pop("invalidFilterFields")
        legacy_record.pop("dataQualityIssues")
        legacy_dir.mkdir(parents=True, exist_ok=True)
        legacy_store.dataset_path.write_text(
            json.dumps(
                {
                    "version": 1,
                    "records": [legacy_record],
                    "dirtyRows": [],
                    "warnings": [],
                    "updatedAt": "2026-07-29T00:00:00+00:00",
                }
            ),
            encoding="utf-8",
        )

        metadata = legacy_store.metadata()

        self.assertEqual(metadata["allOptions"]["subProductLines"], [])
        self.assertEqual(metadata["dirtyRowCount"], 1)

    @staticmethod
    def _record(
        record_id,
        region,
        country,
        *,
        sub_product_line,
        invalid_fields=None,
        issues=None,
    ):
        return {
            "id": record_id,
            "employeeId": record_id,
            "personName": f"Engineer {record_id}",
            "accountStatus": "Enable",
            "secondaryRegion": region,
            "country": country,
            "productLine": "MIS",
            "subProductLine": sub_product_line,
            "modelCategory": "Model Series",
            "qualificationType": "MCSR",
            "isCurrentlyValid": True,
            "daysUntilExpiry": 365,
            "partnerName": f"Partner {record_id}",
            "sourceFile": "qualification.xlsx",
            "sourceSheet": "0",
            "sourceRow": 2,
            "invalidFilterFields": invalid_fields or [],
            "dataQualityIssues": issues or [],
        }


if __name__ == "__main__":
    unittest.main()
