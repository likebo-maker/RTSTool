from __future__ import annotations

import contextlib
import io
import os
from pathlib import Path
from typing import Any

import pandas as pd

try:
    from legacy.eclass import big_teach
except ModuleNotFoundError:  # pragma: no cover - packaged import path
    from backend.legacy.eclass import big_teach

from ..file_utils import count_excel_files


DRILL_SEASONS = ("春季", "夏季", "秋季", "冬季")


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


def _single_file(input_files: dict[str, list[Path]], slot_key: str) -> str:
    files = input_files.get(slot_key) or []
    return str(files[0]) if files else ""


def _fallback_infer_season(*folders: str) -> str:
    for folder in folders:
        if not folder or not Path(folder).is_dir():
            continue
        for file_path in Path(folder).rglob("*"):
            if not file_path.is_file() or file_path.name.startswith("~$") or file_path.suffix.lower() not in {".xlsx", ".xls", ".xlsm"}:
                continue
            name = file_path.name
            for season in DRILL_SEASONS:
                if season in name and "大练兵" in name:
                    return season
    return "春季"


def _infer_season(first_folder: str, resit_folder: str, remake_folder: str) -> str:
    infer = getattr(big_teach, "infer_drill_season_from_folders", None)
    if callable(infer):
        try:
            return str(infer(first_folder, resit_folder, remake_folder) or "春季")
        except Exception:
            pass
    return _fallback_infer_season(first_folder, resit_folder, remake_folder)


def _output_filenames(season: str) -> tuple[str, str]:
    resolver = getattr(big_teach, "get_drill_output_filenames", None)
    if callable(resolver):
        try:
            excel_name, word_name = resolver(season)
            return str(excel_name), str(word_name)
        except Exception:
            pass
    normalized = season if season in DRILL_SEASONS else "春季"
    return (
        f"IVD{normalized}大练兵成绩汇总.xlsx",
        f"IVD用户服务工程师{normalized}大练兵分析报告.docx",
    )


def run(input_files: dict[str, list[Path]], output_dir: Path) -> dict[str, Any]:
    logs: list[str] = []
    warnings: list[str] = []
    buffer = io.StringIO()

    first_folder = _slot_folder(input_files, "first_folder")
    resit_folder = _slot_folder(input_files, "resit_folder")
    remake_folder = _slot_folder(input_files, "remake_folder")
    template_path = _single_file(input_files, "template_doc")

    first_excel_count = count_excel_files(first_folder)
    resit_excel_count = count_excel_files(resit_folder)
    remake_excel_count = count_excel_files(remake_folder)
    if first_excel_count <= 0:
        raise ValueError("第一次考试文件夹中未识别到 Excel 文件")

    season = _infer_season(first_folder, resit_folder, remake_folder)
    excel_name, word_name = _output_filenames(season)
    excel_path = output_dir / excel_name
    word_path = output_dir / word_name
    for stale_path in (excel_path, word_path):
        try:
            stale_path.unlink(missing_ok=True)
        except PermissionError as exc:
            raise ValueError(f"结果文件正在被占用，请关闭后重试：{stale_path.name}") from exc

    logs.extend([
        f"开始执行：{season}大练兵数据统计",
        f"识别到的大练兵季节：{season}",
        f"第一次考试文件夹：已接收 {first_excel_count} 个 Excel 文件",
        f"第一次补考文件夹：已接收 {resit_excel_count} 个 Excel 文件" if resit_excel_count else "第一次补考文件夹：未选择，跳过",
        f"第二次补考/重修文件夹：已接收 {remake_excel_count} 个 Excel 文件" if remake_excel_count else "第二次补考/重修文件夹：未选择，跳过",
        f"Word模板：{Path(template_path).name if template_path else '未选择，仅生成Excel'}",
    ])

    with contextlib.redirect_stdout(buffer), contextlib.redirect_stderr(buffer), _working_directory(output_dir):
        merged_data = big_teach.merge_all_exam_data(first_folder, remake_folder, resit_folder)
        if not merged_data:
            raise ValueError("未读取到有效大练兵成绩数据，请检查第一次考试成绩文件")

        big_teach.generate_summary_excel(merged_data, str(excel_path))
        if template_path:
            big_teach.generate_analysis_report(str(excel_path), template_path, str(word_path))
        else:
            logs.append("未选择Word模板，已跳过Word报告生成。")
            warnings.append("未上传 Word 模板，已仅生成成绩汇总 Excel")

    captured_logs = [line.strip() for line in buffer.getvalue().splitlines() if line.strip()]
    logs.extend(captured_logs[-30:])

    outputs = []
    if excel_path.exists():
        outputs.append({"id": "summary_excel", "path": excel_path, "filename": excel_path.name, "type": "excel"})
    if word_path.exists():
        outputs.append({"id": "analysis_word", "path": word_path, "filename": word_path.name, "type": "word"})

    if not outputs:
        raise ValueError("处理完成但未生成结果文件")

    summary: dict[str, Any] = {
        "season": season,
        "first_excel_count": first_excel_count,
        "resit_excel_count": resit_excel_count,
        "remake_excel_count": remake_excel_count,
        "output_file_count": len(outputs),
        "大练兵季节": season,
        "输出文件数": len(outputs),
    }
    try:
        summary_df = pd.read_excel(excel_path, sheet_name="成绩汇总")
        summary["成绩汇总人数"] = int(len(summary_df))
    except Exception:
        pass

    logs.append("大练兵数据统计完成")

    return {
        "message": "大练兵数据统计完成",
        "summary": summary,
        "outputs": outputs,
        "logs": logs,
        "warnings": warnings,
    }
