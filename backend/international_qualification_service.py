"""Local aggregation service for the international qualification map.

The browser uploads parsed rows once after import.  This module keeps the full
dataset on the local service and returns only query results that the UI needs.
"""

from __future__ import annotations

from collections import Counter, OrderedDict, defaultdict
from copy import deepcopy
from datetime import datetime, timezone
from io import BytesIO
import json
import math
from pathlib import Path
import threading
from typing import Any

import pandas as pd


FILTER_FIELDS = (
    ("secondaryRegions", "secondaryRegion"),
    ("countries", "country"),
    ("productLines", "productLine"),
    ("subProductLines", "subProductLine"),
    ("modelCategories", "modelCategory"),
    ("qualificationTypes", "qualificationType"),
)
QUERY_CACHE_LIMIT = 12


class InternationalQualificationDataError(RuntimeError):
    """Raised when the local international qualification dataset is unavailable."""


class InternationalQualificationStore:
    def __init__(self, dataset_dir: Path, config_path: Path) -> None:
        self.dataset_path = dataset_dir / "international_service_qualification_backend.json"
        self.state_path = dataset_dir / "international_service_qualification_backend_state.json"
        self.legacy_path = dataset_dir / "international_service_qualification_map.json"
        self.config_path = config_path
        self._lock = threading.RLock()
        self._dataset: dict[str, Any] | None = None
        self._dataset_mtime_ns: int | None = None
        self._query_cache: OrderedDict[str, dict[str, Any]] = OrderedDict()
        self._filter_option_cache: OrderedDict[str, dict[str, list[str]]] = OrderedDict()
        self._capitals = self._load_capitals()

    def save_dataset(self, payload: dict[str, Any]) -> dict[str, Any]:
        records = payload.get("records") or []
        dirty_rows = payload.get("dirtyRows") or []
        warnings = payload.get("warnings") or []
        if not isinstance(records, list) or not isinstance(dirty_rows, list) or not isinstance(warnings, list):
            raise InternationalQualificationDataError("The imported dataset format is invalid.")

        dataset = {
            "version": 1,
            "records": records,
            "dirtyRows": dirty_rows,
            "warnings": warnings,
            "updatedAt": _now_iso(),
        }
        with self._lock:
            self._write_json(self.dataset_path, dataset)
            self._dataset = self._prepare_dataset(dataset)
            self._dataset_mtime_ns = self.dataset_path.stat().st_mtime_ns
            self._clear_caches()
            self._write_state(self._all_selected_filters(self._dataset["allOptions"]))
            return self._metadata(self._dataset)

    def metadata(self) -> dict[str, Any]:
        with self._lock:
            return self._metadata(self._load_dataset())

    def dynamic_filter_options(self, filters: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            dataset = self._load_dataset()
            normalized = self._normalize_filters(filters, dataset["allOptions"])
            cache_key = self._cache_key(normalized)
            cached = self._filter_option_cache.get(cache_key)
            if cached is not None:
                self._filter_option_cache.move_to_end(cache_key)
                return {"filters": normalized, "options": deepcopy(cached)}

            selected_sets = {
                key: self._effective_dynamic_selection(normalized[key], dataset["allOptions"][key])
                for key, _ in FILTER_FIELDS
            }
            buckets: dict[str, set[str]] = {key: set() for key, _ in FILTER_FIELDS}
            for record in dataset["records"]:
                for target_key, target_field in FILTER_FIELDS:
                    matches_other_fields = True
                    for key, record_field in FILTER_FIELDS:
                        if key == target_key:
                            continue
                        selected = selected_sets[key]
                        if selected and _text(record.get(record_field)) not in selected:
                            matches_other_fields = False
                            break
                    if matches_other_fields:
                        value = _text(record.get(target_field))
                        if value:
                            buckets[target_key].add(value)

            options = {
                key: [value for value in dataset["allOptions"][key] if value in buckets[key]]
                for key, _ in FILTER_FIELDS
            }
            self._remember(self._filter_option_cache, cache_key, options)
            return {"filters": normalized, "options": deepcopy(options)}

    def query(self, filters: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            dataset = self._load_dataset()
            normalized = self._normalize_filters(filters, dataset["allOptions"])
            cache_key = self._cache_key(normalized)
            cached = self._query_cache.get(cache_key)
            if cached is None:
                filtered_records = self._filter_records(dataset["records"], normalized)
                cached = self._build_dashboard(filtered_records)
                self._remember(self._query_cache, cache_key, cached)
            else:
                self._query_cache.move_to_end(cache_key)

            self._write_state(normalized)
            return {"filters": normalized, "dashboard": deepcopy(cached)}

    def country_detail(self, country: str, filters: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            dataset = self._load_dataset()
            normalized = self._normalize_filters(filters, dataset["allOptions"])
            country_name = _text(country)
            records = [
                record for record in self._filter_records(dataset["records"], normalized)
                if _text(record.get("country")) == country_name
            ]
            country_stat = self._build_country_stat(country_name, records)
            return {
                "country": country_name,
                "recordCount": len(records),
                "countryStat": country_stat,
                "productLineDistribution": self._aggregate(records, "productLine", valid_only=True),
                "subProductLineDistribution": self._aggregate(records, "subProductLine", valid_only=True),
                "qualificationTypeDistribution": self._aggregate(records, "qualificationType", valid_only=True),
                "expiryDistribution": [
                    {"label": "Valid", "value": sum(1 for record in records if _is_valid(record))},
                    {"label": "Expiring in 30 days", "value": self._count_expiry_window(records, 0, 30)},
                    {"label": "Expiring in 60 days", "value": self._count_expiry_window(records, 31, 60)},
                    {"label": "Expiring in 90 days", "value": self._count_expiry_window(records, 61, 90)},
                    {"label": "Expired", "value": self._count_expired(records)},
                ],
            }

    def current_export(self, filters: dict[str, Any]) -> tuple[bytes, str]:
        with self._lock:
            dataset = self._load_dataset()
            normalized = self._normalize_filters(filters, dataset["allOptions"])
            rows = [self._export_record(record) for record in self._filter_records(dataset["records"], normalized)]
        return self._to_excel(rows, "Qualification Details"), "international_service_qualification_results.xlsx"

    def country_export(self, country: str, filters: dict[str, Any]) -> tuple[bytes, str]:
        with self._lock:
            dataset = self._load_dataset()
            normalized = self._normalize_filters(filters, dataset["allOptions"])
            country_name = _text(country)
            rows = [
                self._export_record(record)
                for record in self._filter_records(dataset["records"], normalized)
                if _text(record.get("country")) == country_name
            ]
        safe_country = "".join("_" if char in '\\/:*?\"<>|' else char for char in (country_name or "country"))
        return self._to_excel(rows, "Qualification Details"), f"{safe_country}_qualification_details.xlsx"

    def dirty_export(self) -> tuple[bytes, str]:
        with self._lock:
            dataset = self._load_dataset()
            rows = [self._export_dirty_row(row) for row in dataset["dirtyRows"]]
        return self._to_excel(rows, "Dirty Rows"), "international_service_qualification_dirty_rows.xlsx"

    def _load_dataset(self) -> dict[str, Any]:
        if not self.dataset_path.exists() and self.legacy_path.exists():
            self._migrate_legacy_dataset()
        if not self.dataset_path.exists():
            raise InternationalQualificationDataError("Import international qualification data first.")

        mtime_ns = self.dataset_path.stat().st_mtime_ns
        if self._dataset is not None and self._dataset_mtime_ns == mtime_ns:
            return self._dataset
        try:
            raw = json.loads(self.dataset_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise InternationalQualificationDataError("The local international dataset cannot be read. Import it again.") from exc
        self._dataset = self._prepare_dataset(raw)
        self._dataset_mtime_ns = mtime_ns
        self._clear_caches()
        return self._dataset

    def _migrate_legacy_dataset(self) -> None:
        try:
            legacy = json.loads(self.legacy_path.read_text(encoding="utf-8"))
            payload = legacy.get("payload", legacy)
            records = payload.get("records") or []
            if not isinstance(records, list) or not records:
                return
            migrated = {
                "version": 1,
                "records": records,
                "dirtyRows": payload.get("dirtyRows") or [],
                "warnings": payload.get("warnings") or [],
                "updatedAt": payload.get("savedAt") or _now_iso(),
            }
            self._write_json(self.dataset_path, migrated)
            saved_filters = payload.get("filters") or {}
            all_options = self._collect_options(records)
            self._write_state(self._normalize_filters(saved_filters, all_options, fill_missing=True))
        except (OSError, json.JSONDecodeError, TypeError):
            return

    def _prepare_dataset(self, dataset: dict[str, Any]) -> dict[str, Any]:
        records = dataset.get("records") or []
        dirty_rows = dataset.get("dirtyRows") or []
        if not isinstance(records, list) or not isinstance(dirty_rows, list):
            raise InternationalQualificationDataError("The local international dataset format is invalid.")
        return {
            "records": records,
            "dirtyRows": dirty_rows,
            "warnings": dataset.get("warnings") or [],
            "updatedAt": dataset.get("updatedAt") or "",
            "allOptions": self._collect_options(records),
        }

    def _metadata(self, dataset: dict[str, Any]) -> dict[str, Any]:
        saved_filters = self._read_state(dataset["allOptions"])
        return {
            "recordCount": len(dataset["records"]),
            "dirtyRowCount": len(dataset["dirtyRows"]),
            "warnings": dataset["warnings"],
            "allOptions": deepcopy(dataset["allOptions"]),
            "filters": saved_filters,
            "updatedAt": dataset["updatedAt"],
        }

    def _collect_options(self, records: list[dict[str, Any]]) -> dict[str, list[str]]:
        options: dict[str, list[str]] = {}
        for key, record_field in FILTER_FIELDS:
            options[key] = sorted(
                {_text(record.get(record_field)) for record in records if _text(record.get(record_field))},
                key=lambda value: value.casefold(),
            )
        return options

    def _normalize_filters(
        self, filters: dict[str, Any] | None, all_options: dict[str, list[str]], fill_missing: bool = False
    ) -> dict[str, list[str]]:
        source = filters if isinstance(filters, dict) else {}
        normalized: dict[str, list[str]] = {}
        for key, _ in FILTER_FIELDS:
            values = source.get(key)
            if not isinstance(values, list):
                values = []
            allowed = set(all_options.get(key) or [])
            selected: list[str] = []
            seen: set[str] = set()
            for value in values:
                text = _text(value)
                if text and text in allowed and text not in seen:
                    selected.append(text)
                    seen.add(text)
            normalized[key] = selected or (list(all_options.get(key) or []) if fill_missing else [])
        return normalized

    def _all_selected_filters(self, all_options: dict[str, list[str]]) -> dict[str, list[str]]:
        return {key: list(all_options.get(key) or []) for key, _ in FILTER_FIELDS}

    def _filter_records(self, records: list[dict[str, Any]], filters: dict[str, list[str]]) -> list[dict[str, Any]]:
        selected = {key: set(values) for key, values in filters.items()}
        if any(not selected.get(key) for key, _ in FILTER_FIELDS):
            return []
        return [
            record for record in records
            if all(_text(record.get(record_field)) in selected[key] for key, record_field in FILTER_FIELDS)
        ]

    def _build_dashboard(self, records: list[dict[str, Any]]) -> dict[str, Any]:
        country_records: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for record in records:
            country_records[_text(record.get("country")) or "Unclassified"].append(record)
        country_stats = [
            stat for country, items in country_records.items()
            if (stat := self._build_country_stat(country, items)) is not None
        ]
        top_valid = sorted(country_stats, key=lambda item: (-item["validQualifications"], -item["totalPeople"], item["country"]))
        top_risk = sorted(
            country_stats,
            key=lambda item: (
                -item["expiredQualifications"],
                -item["expiring30"],
                -item["expiring60"],
                -item["validQualifications"],
                item["country"],
            ),
        )
        return {
            "filteredRecordCount": len(records),
            "summary": {
                "totalPeople": self._count_people(records),
                "validQualifications": sum(1 for record in records if _is_valid(record)),
                "totalQualifications": len(records),
                "coveredCountries": len(country_stats),
                "coveredPartners": self._count_partners(records),
            },
            "countryStats": country_stats,
            "mapPoints": [point for stat in country_stats if (point := self._map_point(stat)) is not None],
            "topValidCountries": top_valid,
            "topRiskCountries": top_risk,
            "productLineDistribution": self._aggregate(records, "productLine", valid_only=True),
            "subProductLineDistribution": self._aggregate(records, "subProductLine", valid_only=True),
            "modelCategoryDistribution": self._aggregate(records, "modelCategory", valid_only=True),
            "qualificationTypeDistribution": self._aggregate(records, "qualificationType", valid_only=True),
            "expiryTrend": [
                {"label": "Expiring in 30 days", "value": self._count_expiry_window(records, 0, 30)},
                {"label": "Expiring in 60 days", "value": self._count_expiry_window(records, 31, 60)},
                {"label": "Expiring in 90 days", "value": self._count_expiry_window(records, 61, 90)},
                {"label": "Expired", "value": self._count_expired(records)},
            ],
        }

    def _build_country_stat(self, country: str, records: list[dict[str, Any]]) -> dict[str, Any] | None:
        if not country or not records:
            return None
        expired = self._count_expired(records)
        expiring30 = self._count_expiry_window(records, 0, 30)
        expiring60 = self._count_expiry_window(records, 31, 60)
        expiring90 = self._count_expiry_window(records, 61, 90)
        valid = sum(1 for record in records if _is_valid(record))
        product_lines = self._aggregate(records, "productLine", valid_only=True, limit=3)
        if expired > 0 or expiring30 >= max(3, math.ceil(len(records) * 0.08)):
            risk_level = "High Risk"
        elif expiring30 > 0 or expiring60 > 0:
            risk_level = "Attention"
        else:
            risk_level = "Normal"
        return {
            "country": country,
            "secondaryRegion": _text(records[0].get("secondaryRegion")),
            "totalPeople": self._count_people(records),
            "validQualifications": valid,
            "totalQualifications": len(records),
            "coveredPartners": self._count_partners(records),
            "expiring30": expiring30,
            "expiring60": expiring60,
            "expiring90": expiring90,
            "expiredQualifications": expired,
            "riskLevel": risk_level,
            "primaryProductLines": ", ".join(item["name"] for item in product_lines) or "No valid qualification",
            "productLineDistribution": product_lines,
        }

    def _map_point(self, stat: dict[str, Any]) -> dict[str, Any] | None:
        capital = self._capitals.get(stat["country"])
        if not capital:
            return None
        return {
            **stat,
            "region": stat["secondaryRegion"],
            "capital": capital["capital"],
            "coords": capital["coords"],
            "geoSource": "capital-coordinate",
        }

    @staticmethod
    def _aggregate(records: list[dict[str, Any]], field: str, valid_only: bool = False, limit: int | None = None) -> list[dict[str, Any]]:
        values = (
            _text(record.get(field)) for record in records
            if not valid_only or _is_valid(record)
        )
        counter = Counter(value for value in values if value)
        rows = [{"name": name, "value": value} for name, value in counter.items()]
        rows.sort(key=lambda item: (-item["value"], item["name"].casefold()))
        return rows[:limit] if limit is not None else rows

    @staticmethod
    def _count_people(records: list[dict[str, Any]]) -> int:
        keys = set()
        for record in records:
            employee_id = _text(record.get("employeeId"))
            person_name = _text(record.get("personName"))
            if employee_id or person_name:
                keys.add(f"{employee_id}|{person_name}")
            else:
                keys.add(f"{_text(record.get('country'))}|{_text(record.get('partnerName'))}|{_text(record.get('sourceRow'))}")
        return len(keys)

    @staticmethod
    def _count_partners(records: list[dict[str, Any]]) -> int:
        return len({_text(record.get("partnerName")) for record in records if _text(record.get("partnerName"))})

    @staticmethod
    def _count_expiry_window(records: list[dict[str, Any]], minimum: int, maximum: int) -> int:
        return sum(1 for record in records if _is_valid(record) and minimum <= _days_until_expiry(record) <= maximum)

    @staticmethod
    def _count_expired(records: list[dict[str, Any]]) -> int:
        return sum(1 for record in records if _days_until_expiry(record) < 0)

    @staticmethod
    def _effective_dynamic_selection(selected_values: list[str], base_values: list[str]) -> set[str]:
        base = set(base_values)
        selected = set(selected_values).intersection(base)
        return set() if base and base.issubset(selected) else selected

    def _read_state(self, all_options: dict[str, list[str]]) -> dict[str, list[str]]:
        if not self.state_path.exists():
            return self._all_selected_filters(all_options)
        try:
            raw = json.loads(self.state_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return self._all_selected_filters(all_options)
        return self._normalize_filters(raw.get("filters"), all_options, fill_missing=True)

    def _write_state(self, filters: dict[str, list[str]]) -> None:
        self._write_json(self.state_path, {"filters": filters, "updatedAt": _now_iso()})

    @staticmethod
    def _write_json(path: Path, payload: dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(f"{path.suffix}.tmp")
        temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        temporary.replace(path)

    def _load_capitals(self) -> dict[str, dict[str, Any]]:
        try:
            config = json.loads(self.config_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}
        capitals: dict[str, dict[str, Any]] = {}
        for country, item in (config.get("countryCapitals") or {}).items():
            coords = item.get("coords") if isinstance(item, dict) else None
            if not isinstance(coords, list) or len(coords) < 2:
                continue
            longitude, latitude = _number(coords[0]), _number(coords[1])
            if longitude is None or latitude is None:
                continue
            capitals[_text(country)] = {"capital": _text(item.get("capital")) or _text(country), "coords": [longitude, latitude]}
        return capitals

    @staticmethod
    def _cache_key(filters: dict[str, list[str]]) -> str:
        return json.dumps(filters, ensure_ascii=False, sort_keys=True, separators=(",", ":"))

    def _remember(self, cache: OrderedDict[str, Any], key: str, value: Any) -> None:
        cache[key] = value
        cache.move_to_end(key)
        while len(cache) > QUERY_CACHE_LIMIT:
            cache.popitem(last=False)

    def _clear_caches(self) -> None:
        self._query_cache.clear()
        self._filter_option_cache.clear()

    @staticmethod
    def _export_record(record: dict[str, Any]) -> dict[str, Any]:
        return {
            "Employee ID": _text(record.get("employeeId")),
            "Employee Name": _text(record.get("personName")),
            "Account Status": _text(record.get("accountStatus")),
            "Secondary Region": _text(record.get("secondaryRegion")),
            "Country": _text(record.get("country")),
            "Raw Region": _text(record.get("rawRegion")),
            "Branch": _text(record.get("rawBranch")),
            "Department": _text(record.get("departmentName")),
            "Partner Code": _text(record.get("partnerCode")),
            "Partner Name": _text(record.get("partnerName")),
            "Product Line": _text(record.get("productLine")),
            "Sub-line": _text(record.get("subProductLine")),
            "Model Category": _text(record.get("modelCategory")),
            "Model Sub-category": _text(record.get("modelSubCategory")),
            "Qualification Type": _text(record.get("qualificationType")),
            "Qualification Type Code": _text(record.get("qualificationTypeCode")),
            "Start Date": _text(record.get("startDate")),
            "Expiry Date": _text(record.get("expiryDate")),
            "Qualification Status": _qualification_status(record),
            "Certificate Type": _text(record.get("certificateType")),
            "Certificate Status": _text(record.get("certificateStatus")),
            "Source File": _text(record.get("sourceFile")),
            "Source Sheet": _text(record.get("sourceSheet")),
            "Source Row": record.get("sourceRow") or "",
        }

    @staticmethod
    def _export_dirty_row(row: dict[str, Any]) -> dict[str, Any]:
        original = row.get("rawData") if isinstance(row.get("rawData"), dict) else {}
        raw_columns = {f"Original - {key}": value for key, value in original.items()}
        return {
            "Category": _text(row.get("category")),
            "Reason": _text(row.get("reason")),
            "Source File": _text(row.get("sourceFile")),
            "Source Sheet": _text(row.get("sourceSheet")),
            "Source Row": row.get("sourceRow") or "",
            "Raw Region": _text(row.get("rawRegion")),
            "Branch": _text(row.get("rawBranch")),
            "Department": _text(row.get("departmentName")),
            **raw_columns,
        }

    @staticmethod
    def _to_excel(rows: list[dict[str, Any]], sheet_name: str) -> bytes:
        buffer = BytesIO()
        pd.DataFrame(rows).to_excel(buffer, index=False, sheet_name=sheet_name, engine="openpyxl")
        return buffer.getvalue()


def _text(value: Any) -> str:
    return str(value if value is not None else "").strip()


def _number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _days_until_expiry(record: dict[str, Any]) -> float:
    value = _number(record.get("daysUntilExpiry"))
    return value if value is not None else math.inf


def _is_valid(record: dict[str, Any]) -> bool:
    return bool(record.get("isCurrentlyValid"))


def _qualification_status(record: dict[str, Any]) -> str:
    days = _days_until_expiry(record)
    if days < 0:
        return "Expired"
    if _is_valid(record) and 0 <= days <= 30:
        return "Expiring in 30 days"
    if _is_valid(record) and 31 <= days <= 60:
        return "Expiring in 60 days"
    if _is_valid(record) and 61 <= days <= 90:
        return "Expiring in 90 days"
    if _is_valid(record):
        return "Valid"
    return "Unknown"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
