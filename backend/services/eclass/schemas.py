from __future__ import annotations

from dataclasses import dataclass
from typing import Any


class EclassError(Exception):
    def __init__(self, message: str, status_code: int = 400, logs: list[str] | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.logs = logs or [message]


@dataclass(frozen=True)
class UploadSlot:
    key: str
    label: str
    description: str
    required: bool
    accept: str
    input_type: str = "file"
    multiple: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "label": self.label,
            "description": self.description,
            "required": self.required,
            "accept": self.accept,
            "input_type": self.input_type,
            "multiple": self.multiple,
        }


PRODUCT_LINES = [
    {"key": "IVD", "label": "IVD", "enabled": True},
    {"key": "PLMS", "label": "PLMS", "enabled": False, "message": "待开发"},
    {"key": "MIS", "label": "MIS", "enabled": False, "message": "待开发"},
]

MODULES = [
    {"key": "big_teach", "label": "大练兵"},
    {"key": "communication", "label": "交流会"},
]

ENABLED_COMBINATIONS = {
    ("IVD", "big_teach"),
    ("IVD", "communication"),
}

UPLOAD_SCHEMAS: dict[tuple[str, str], dict[str, Any]] = {
    ("IVD", "big_teach"): {
        "title": "IVD大练兵数据处理",
        "description": "用于处理春季 / 夏季 / 秋季 / 冬季大练兵数据，并根据成绩文件名自动识别季节生成对应文件名；Word 模板可不选择，不选择时只生成 Excel。补考文件夹可不选择：支持只上传第一次考试、第一次考试 + 一次补考、第一次考试 + 两次补考。输出文件自动归档到当前任务结果中。",
        "upload_slots": [
            UploadSlot(
                key="first_folder",
                label="第一次考试文件夹 first",
                description="上传第一次考试文件夹，系统会读取其中全部考试文件。",
                required=True,
                accept=".xlsx,.xls,.xlsm",
                input_type="folder",
                multiple=True,
            ),
            UploadSlot(
                key="resit_folder",
                label="第一次补考文件夹 resit（可选）",
                description="不选择则跳过，支持只上传第一次考试。",
                required=False,
                accept=".xlsx,.xls,.xlsm",
                input_type="folder",
                multiple=True,
            ),
            UploadSlot(
                key="remake_folder",
                label="第二次补考 / 重修 remake（可选）",
                description="不选择则跳过，支持第一次考试 + 两次补考。",
                required=False,
                accept=".xlsx,.xls,.xlsm",
                input_type="folder",
                multiple=True,
            ),
            UploadSlot(
                key="template_doc",
                label="Word 模板文件（可选）",
                description="不上传时只生成 Excel。",
                required=False,
                accept=".docx",
                input_type="file",
                multiple=False,
            ),
        ],
    },
    ("IVD", "communication"): {
        "title": "IVD交流会数据处理",
        "description": "选择交流会数据文件夹后，系统会自动检索六科成绩文件；名单由六科成绩中所有账号自动去重汇总。输出文件自动归档到当前任务结果中。",
        "upload_slots": [
            UploadSlot(
                key="data_folder",
                label="交流会数据文件夹",
                description="上传整个交流会文件夹，系统自动识别六科成绩文件。",
                required=True,
                accept=".xlsx,.xls",
                input_type="folder",
                multiple=True,
            ),
            UploadSlot(
                key="template_doc",
                label="Word 模板文件",
                description="用于生成交流会总结邮件 Word。",
                required=True,
                accept=".docx",
                input_type="file",
                multiple=False,
            ),
        ],
    },
}


def build_options() -> dict[str, Any]:
    return {
        "product_lines": PRODUCT_LINES,
        "modules": MODULES,
        "enabled_combinations": [
            {"product_line": product_line, "module": module}
            for product_line, module in sorted(ENABLED_COMBINATIONS)
        ],
    }


def build_upload_schema(product_line: str, module: str) -> dict[str, Any]:
    normalized_product_line = str(product_line or "").strip().upper()
    normalized_module = str(module or "").strip()
    schema = UPLOAD_SCHEMAS.get((normalized_product_line, normalized_module))
    if not schema:
        return {
            "product_line": normalized_product_line,
            "module": normalized_module,
            "title": "待开发",
            "description": "当前产线或业务方向暂未接入底层处理逻辑。",
            "enabled": False,
            "message": "待开发",
            "upload_slots": [],
        }

    return {
        "product_line": normalized_product_line,
        "module": normalized_module,
        "title": schema["title"],
        "description": schema["description"],
        "enabled": True,
        "message": "",
        "upload_slots": [slot.to_dict() for slot in schema["upload_slots"]],
    }


def require_enabled_combination(product_line: str, module: str) -> tuple[str, str]:
    normalized_product_line = str(product_line or "").strip().upper()
    normalized_module = str(module or "").strip()
    if not normalized_product_line:
        raise EclassError("请选择大产线")
    if not normalized_module:
        raise EclassError("请选择业务方向")
    if (normalized_product_line, normalized_module) not in ENABLED_COMBINATIONS:
        raise EclassError("当前产线或业务方向待开发")
    return normalized_product_line, normalized_module
