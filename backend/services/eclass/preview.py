from __future__ import annotations

from datetime import date, datetime
from pathlib import Path
from typing import Any

import pandas as pd


PREFERRED_SHEETS = [
    "成绩汇总",
    "分公司分析",
    "区域分析",
    "渠道商分析",
    "分公司出勤率以及平均成绩",
    "交流会成绩",
]


def _json_safe_value(value: Any) -> Any:
    if value is None or pd.isna(value):
        return ""
    if isinstance(value, (datetime, date, pd.Timestamp)):
        return value.strftime("%Y-%m-%d %H:%M:%S") if hasattr(value, "hour") else value.strftime("%Y-%m-%d")
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            return str(value)
    return value


def _make_preview(df: pd.DataFrame, limit: int = 10, sheet_name: str = "") -> dict[str, Any]:
    preview_df = df.head(limit).copy()
    rows = []
    for record in preview_df.to_dict(orient="records"):
        rows.append({str(key): _json_safe_value(value) for key, value in record.items()})
    return {
        "columns": [str(column) for column in df.columns],
        "rows": rows,
        "limit": limit,
        "sheet_name": sheet_name,
    }


def build_output_preview(outputs: list[dict[str, Any]], limit: int = 10) -> tuple[dict[str, Any], str]:
    excel_outputs = [
        output for output in outputs
        if Path(str(output.get("path", ""))).suffix.lower() in {".xlsx", ".xlsm", ".xls"}
    ]
    if not excel_outputs:
        return {"columns": [], "rows": [], "limit": limit, "sheet_name": ""}, "结果文件已生成，请下载查看"

    for output in excel_outputs:
        path = Path(str(output.get("path", "")))
        if not path.exists():
            continue
        try:
            with pd.ExcelFile(path) as excel:
                sheet_name = next((name for name in PREFERRED_SHEETS if name in excel.sheet_names), excel.sheet_names[0])
                df = pd.read_excel(excel, sheet_name=sheet_name, dtype=object)
            return _make_preview(df, limit=limit, sheet_name=sheet_name), f"已生成结果文件，预览 {sheet_name} 前 {limit} 行"
        except Exception:
            continue

    return {"columns": [], "rows": [], "limit": limit, "sheet_name": ""}, "结果文件已生成，预览读取失败，请下载查看"
