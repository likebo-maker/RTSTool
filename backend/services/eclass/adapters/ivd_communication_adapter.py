from __future__ import annotations

import contextlib
import io
import os
import re
from pathlib import Path
from typing import Any

try:
    from legacy.eclass import Comunication_meeting as communication
except ModuleNotFoundError:  # pragma: no cover - packaged import path
    from backend.legacy.eclass import Comunication_meeting as communication


SUBJECTS = [
    ("凝血", "凝血_file", "凝血成绩"),
    ("化免", "化免_file", "化免成绩"),
    ("临检", "临检_file", "临检成绩"),
    ("TLA", "TLA_file", "TLA成绩"),
    ("微生物", "微生物_file", "微生物成绩"),
    ("尿液", "urine_file", "尿液成绩"),
]


@contextlib.contextmanager
def _working_directory(path: Path):
    previous = Path.cwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(previous)


def _slot_folder(input_files: dict[str, list[Path]], slot_key: str) -> str:
    files = input_files.get(slot_key) or []
    if not files:
        return ""
    first_file = Path(files[0])
    for parent in [first_file.parent, *first_file.parents]:
        if parent.name == slot_key:
            return str(parent)
    return str(first_file.parent)


def _required_file(input_files: dict[str, list[Path]], slot_key: str) -> str:
    files = input_files.get(slot_key) or []
    if not files:
        if slot_key == "template_doc":
            raise ValueError("请选择交流会 Word 模板文件")
        raise ValueError(f"缺少上传文件：{slot_key}")
    return str(files[0])


def _filename_contains_subject(filename: str, subject: str) -> bool:
    if subject.upper() == "TLA":
        return "TLA" in filename.upper()
    return subject in filename


def _extract_date_for_sort(filename: str) -> str:
    name = str(filename)
    patterns = [
        r"(\d{4})-(\d{1,2})-(\d{1,2})",
        r"(\d{4})_(\d{1,2})_(\d{1,2})",
        r"(\d{4})\.(\d{1,2})\.(\d{1,2})",
        r"(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日",
    ]
    for pattern in patterns:
        match = re.search(pattern, name)
        if match:
            year, month, day = match.groups()
            return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"

    month_match = re.search(r"(\d{4})年\s*(\d{1,2})月", name)
    if month_match:
        year, month = month_match.groups()
        return f"{int(year):04d}-{int(month):02d}-01"
    return ""


def _extract_timestamp_for_sort(filename: str) -> str:
    name = Path(str(filename)).stem
    ending = re.search(r"(\d{14})$", name)
    if ending:
        return ending.group(1)
    matches = re.findall(r"\d{14}", name)
    return matches[-1] if matches else ""


def _file_sort_key(path: Path) -> tuple[str, str, float, str]:
    return (
        _extract_date_for_sort(path.name),
        _extract_timestamp_for_sort(path.name),
        path.stat().st_mtime,
        path.name,
    )


def detect_communication_files(data_folder: str | Path) -> tuple[dict[str, str], list[str], dict[str, str]]:
    folder = Path(data_folder)
    if not folder.exists() or not folder.is_dir():
        raise ValueError("交流会数据文件夹不存在或未上传")

    logs = [
        "自动识别规则：不再读取 名单.xlsx；文件名包含科目名即可；只扫描交流会数据文件夹当前层级文件。",
        f"交流会数据文件夹：{folder}",
    ]
    excel_files = [
        path
        for path in folder.iterdir()
        if path.is_file() and not path.name.startswith("~$") and path.suffix.lower() in {".xlsx", ".xls"}
    ]

    result: dict[str, str] = {key: "" for _, key, _ in SUBJECTS}
    display_names: dict[str, str] = {}

    for subject, key, label in SUBJECTS:
        candidates = [path for path in excel_files if _filename_contains_subject(path.name, subject)]
        if not candidates:
            logs.append(f"{label}：未识别到")
            continue
        candidates.sort(key=_file_sort_key, reverse=True)
        selected = candidates[0]
        result[key] = str(selected)
        display_names[subject] = selected.name
        if len(candidates) > 1:
            logs.append(f"{label}：发现 {len(candidates)} 个候选文件，已选择最新文件 {selected.name}")
        else:
            logs.append(f"{label}：已识别 {selected.name}")

    return result, logs, display_names


def run(input_files: dict[str, list[Path]], output_dir: Path) -> dict[str, Any]:
    logs: list[str] = ["开始处理 IVD 技术交流会数据"]
    buffer = io.StringIO()

    data_folder = _slot_folder(input_files, "data_folder")
    template_doc = _required_file(input_files, "template_doc")
    detected_files, detect_logs, display_names = detect_communication_files(data_folder)
    missing = [label for _, key, label in SUBJECTS if not detected_files.get(key)]
    if missing:
        raise ValueError("以下交流会成绩文件未识别到：" + "、".join(missing))

    main_excel = output_dir / "交流会统计结果.xlsx"
    appendix_excel = output_dir / "中国区技术交流会出勤和考核情况-IVD线.xlsx"
    word_report = output_dir / "中国区技术交流会总结邮件.docx"
    for stale_path in (main_excel, appendix_excel, word_report):
        try:
            stale_path.unlink(missing_ok=True)
        except PermissionError as exc:
            raise ValueError(f"结果文件正在被占用，请关闭后重试：{stale_path.name}") from exc

    logs.extend(detect_logs)

    with contextlib.redirect_stdout(buffer), contextlib.redirect_stderr(buffer), _working_directory(output_dir):
        result = communication.main(
            凝血_file=detected_files["凝血_file"],
            化免_file=detected_files["化免_file"],
            临检_file=detected_files["临检_file"],
            TLA_file=detected_files["TLA_file"],
            微生物_file=detected_files["微生物_file"],
            urine_file=detected_files["urine_file"],
            output_path=str(main_excel),
            template_path=template_doc,
            word_output_path=str(word_report),
        )

    captured_logs = [line.strip() for line in buffer.getvalue().splitlines() if line.strip()]
    logs.extend(captured_logs[-40:])

    outputs = []
    for file_id, path, file_type in [
        ("main_excel", main_excel, "excel"),
        ("appendix_excel", appendix_excel, "excel"),
        ("summary_word", word_report, "word"),
    ]:
        if path.exists():
            outputs.append({"id": file_id, "path": path, "filename": path.name, "type": file_type})

    if not outputs:
        raise ValueError("处理完成但未生成结果文件")

    logs.append("交流会数据统计完成。")

    summary = {
        "output_file_count": len(outputs),
        "输出文件数": len(outputs),
        "detected_files": display_names,
    }
    if isinstance(result, dict) and isinstance(result.get("overall_summary"), dict):
        summary.update(result["overall_summary"])

    return {
        "message": "交流会数据统计完成",
        "summary": summary,
        "outputs": outputs,
        "logs": logs,
        "warnings": [],
    }
