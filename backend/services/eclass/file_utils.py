from __future__ import annotations

from datetime import datetime
import json
import os
import re
import shutil
import sys
import time
import uuid
from pathlib import Path, PurePosixPath
from typing import Any

from .schemas import EclassError


APP_NAME = "技术支持效率平台"
ALLOWED_SUFFIXES = {".xlsx", ".xls", ".xlsm", ".csv", ".docx", ".png", ".jpg", ".jpeg"}
MODULE_FOLDER_LABELS = {
    "big_teach": "大练兵",
    "communication": "交流会",
}


def eclass_output_root() -> Path:
    if getattr(sys, "frozen", False):
        local_app_data = os.environ.get("LOCALAPPDATA")
        base_dir = Path(local_app_data) if local_app_data else Path.home() / "AppData" / "Local"
        return base_dir / APP_NAME / "output" / "eclass"
    return Path(__file__).resolve().parents[2] / "output" / "eclass"


def create_job_dirs() -> tuple[str, Path, Path]:
    job_id = uuid.uuid4().hex
    root = eclass_output_root()
    input_dir = root / job_id / "input"
    output_dir = root / job_id / "output"
    input_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    return job_id, input_dir, output_dir


def _user_downloads_dir() -> Path:
    downloads = Path.home() / "Downloads"
    if downloads.exists():
        return downloads
    return eclass_output_root() / "results"


def eclass_result_folder_name(product_line: str, module: str) -> str:
    module_label = MODULE_FOLDER_LABELS.get(str(module or ""), str(module or "数据"))
    name = f"{str(product_line or '').strip().upper()}{module_label}数据统计结果"
    return re.sub(r"[\\/:*?\"<>|]+", "_", name).strip() or "E课堂数据统计结果"


def create_result_output_dir(product_line: str, module: str) -> Path:
    output_dir = _user_downloads_dir() / eclass_result_folder_name(product_line, module)
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def _timestamped_filename(filename: str) -> str:
    path = Path(safe_filename(filename))
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{path.stem}_{stamp}{path.suffix}"


def _next_available_target(folder: Path, filename: str) -> Path:
    target = folder / safe_filename(filename)
    if not target.exists():
        return target

    stem = target.stem
    suffix = target.suffix
    for index in range(2, 1000):
        candidate = folder / f"{stem}_{index}{suffix}"
        if not candidate.exists():
            return candidate
    return folder / _timestamped_filename(target.name)


def publish_result_file(source_path: Path, result_dir: Path, filename: str | None = None) -> Path:
    source = Path(source_path)
    if not source.exists() or not source.is_file():
        raise EclassError(f"结果文件不存在：{source.name}")

    result_dir.mkdir(parents=True, exist_ok=True)
    preferred_name = safe_filename(filename or source.name)
    preferred_target = result_dir / preferred_name

    for attempt in range(3):
        try:
            if preferred_target.exists():
                preferred_target.unlink()
            shutil.copy2(source, preferred_target)
            return preferred_target
        except PermissionError:
            if attempt < 2:
                time.sleep(0.35)
                continue
            break

    fallback_target = _next_available_target(result_dir, _timestamped_filename(preferred_name))
    shutil.copy2(source, fallback_target)
    return fallback_target


def safe_filename(filename: str) -> str:
    name = Path(str(filename or "upload")).name
    name = re.sub(r"[\\/:*?\"<>|]+", "_", name).strip()
    return name or f"upload_{uuid.uuid4().hex}"


def ensure_allowed_upload(filename: str, accept: str) -> None:
    suffix = Path(filename or "").suffix.lower()
    accepted = {item.strip().lower() for item in str(accept or "").split(",") if item.strip()}
    if suffix not in ALLOWED_SUFFIXES:
        raise EclassError(f"不支持的文件格式：{filename}")
    if accepted and suffix not in accepted:
        raise EclassError(f"文件 {filename} 应为 {', '.join(sorted(accepted))} 格式")


def _accepted_suffixes(accept: str) -> set[str]:
    return {item.strip().lower() for item in str(accept or "").split(",") if item.strip()}


def _matches_accept(filename: str, accept: str) -> bool:
    suffix = Path(filename or "").suffix.lower()
    accepted = _accepted_suffixes(accept)
    return suffix in ALLOWED_SUFFIXES and (not accepted or suffix in accepted)


def _slot_storage_dir(input_dir: Path, slot_key: str, input_type: str) -> Path:
    if input_type == "file" and slot_key == "template_doc":
        return input_dir / "template"
    return input_dir / slot_key


def _safe_relative_upload_path(raw_path: str, fallback_filename: str) -> Path:
    raw = str(raw_path or fallback_filename or "").replace("\\", "/").strip()
    if not raw:
        raw = str(fallback_filename or "upload")

    if raw.startswith("/") or raw.startswith("//") or re.match(r"^[A-Za-z]:", raw):
        raise EclassError("上传文件路径非法：不允许绝对路径或盘符路径")

    parts = [part for part in PurePosixPath(raw).parts if part not in {"", "."}]
    if any(part == ".." for part in parts):
        raise EclassError("上传文件路径非法：不允许 .. 路径穿越")
    if len(parts) > 1:
        parts = parts[1:]
    if not parts:
        parts = [safe_filename(fallback_filename)]

    safe_parts = [safe_filename(part) for part in parts]
    if any(not part for part in safe_parts):
        raise EclassError("上传文件路径非法")
    return Path(*safe_parts)


def _deduplicate_target(target: Path, index: int) -> Path:
    if not target.exists():
        return target
    return target.with_name(f"{target.stem}_{index}{target.suffix}")


def save_uploads(
    uploads_by_slot: dict[str, list[Any]],
    upload_slots: list[dict[str, Any]],
    input_dir: Path,
    relative_paths_by_slot: dict[str, list[str]] | None = None,
) -> tuple[dict[str, list[Path]], list[str]]:
    saved: dict[str, list[Path]] = {}
    warnings: list[str] = []
    slot_map = {slot["key"]: slot for slot in upload_slots}
    relative_paths_by_slot = relative_paths_by_slot or {}

    for slot in upload_slots:
        key = slot["key"]
        input_type = slot.get("input_type", "file")
        files = [file for file in uploads_by_slot.get(key, []) if getattr(file, "filename", "")]
        if slot.get("required") and not files:
            raise EclassError(f"请上传：{slot['label']}")
        if not files:
            saved[key] = []
            continue
        if input_type != "folder" and not slot.get("multiple") and len(files) > 1:
            raise EclassError(f"{slot['label']} 只能上传 1 个文件")

        slot_dir = _slot_storage_dir(input_dir, key, input_type)
        slot_dir.mkdir(parents=True, exist_ok=True)
        saved[key] = []

        if input_type == "folder":
            relative_paths = relative_paths_by_slot.get(key) or []
            ignored_count = 0
            temp_count = 0

            for index, upload in enumerate(files, start=1):
                raw_path = relative_paths[index - 1] if index - 1 < len(relative_paths) else upload.filename
                filename = Path(str(raw_path or upload.filename).replace("\\", "/")).name or safe_filename(upload.filename)
                if filename.startswith("~$"):
                    temp_count += 1
                    continue
                if not _matches_accept(filename, slot.get("accept", "")):
                    ignored_count += 1
                    continue

                relative_path = _safe_relative_upload_path(str(raw_path), filename)
                target = _deduplicate_target(slot_dir / relative_path, index)
                ensure_path_inside(target, slot_dir)
                target.parent.mkdir(parents=True, exist_ok=True)
                upload.file.seek(0)
                with target.open("wb") as buffer:
                    shutil.copyfileobj(upload.file, buffer)
                saved[key].append(target)

            if temp_count:
                warnings.append(f"{slot['label']} 已忽略 {temp_count} 个临时文件（~$ 开头）")
            if ignored_count:
                warnings.append(f"{slot['label']} 已忽略 {ignored_count} 个非当前槽位格式文件")
            if slot.get("required") and not saved[key]:
                if key == "first_folder":
                    raise EclassError("第一次考试文件夹中未识别到 Excel 文件")
                if key == "data_folder":
                    raise EclassError("交流会数据文件夹中未识别到 Excel 文件")
                raise EclassError(f"{slot['label']} 中未识别到可处理文件")
            if files and not saved[key] and not slot.get("required"):
                warnings.append(f"{slot['label']} 未识别到 Excel 文件，已按未选择处理")
            continue

        for index, upload in enumerate(files, start=1):
            filename = safe_filename(upload.filename)
            ensure_allowed_upload(filename, slot.get("accept", ""))
            if filename.startswith("~$"):
                warnings.append(f"{slot['label']} 已忽略临时文件：{filename}")
                continue
            target = _deduplicate_target(slot_dir / filename, index)
            upload.file.seek(0)
            with target.open("wb") as buffer:
                shutil.copyfileobj(upload.file, buffer)
            saved[key].append(target)
        if slot.get("required") and not saved[key]:
            raise EclassError(f"请上传：{slot['label']}")

    unknown_slots = sorted(set(uploads_by_slot) - set(slot_map))
    if unknown_slots:
        raise EclassError(f"上传字段不属于当前处理模板：{', '.join(unknown_slots)}")

    return saved, warnings


def count_excel_files(folder_path: str | Path, recursive: bool = True, suffixes: set[str] | None = None) -> int:
    folder = Path(folder_path) if folder_path else None
    if not folder or not folder.exists() or not folder.is_dir():
        return 0
    allowed = suffixes or {".xlsx", ".xls", ".xlsm"}
    iterator = folder.rglob("*") if recursive else folder.iterdir()
    return sum(
        1
        for path in iterator
        if path.is_file() and not path.name.startswith("~$") and path.suffix.lower() in allowed
    )


def ensure_path_inside(path: Path, root: Path) -> Path:
    resolved_path = path.resolve()
    resolved_root = root.resolve()
    if resolved_path == resolved_root or resolved_root in resolved_path.parents:
        return resolved_path
    raise EclassError("文件路径非法", 400)


def write_manifest(job_id: str, outputs: list[dict[str, Any]], output_dir: Path | None = None) -> None:
    manifest_path = eclass_output_root() / job_id / "manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(
            {
                "job_id": job_id,
                "outputs": outputs,
                "output_dir": str(output_dir) if output_dir else "",
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def read_manifest(job_id: str) -> dict[str, Any]:
    if not re.fullmatch(r"[a-f0-9]{32}", str(job_id or "")):
        raise EclassError("无效的下载编号")
    manifest_path = eclass_output_root() / job_id / "manifest.json"
    if not manifest_path.exists():
        raise EclassError("下载任务不存在或已被清理", 404)
    try:
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise EclassError("下载任务记录损坏", 500) from exc
    return data if isinstance(data, dict) else {"outputs": []}


def media_type_for(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix in {".xlsx", ".xlsm", ".xls"}:
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    if suffix == ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if suffix == ".png":
        return "image/png"
    if suffix in {".jpg", ".jpeg"}:
        return "image/jpeg"
    return "application/octet-stream"
