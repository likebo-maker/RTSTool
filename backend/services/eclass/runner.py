from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from typing import Any

from .file_utils import (
    create_job_dirs,
    create_result_output_dir,
    eclass_output_root,
    ensure_path_inside,
    media_type_for,
    publish_result_file,
    read_manifest,
    save_uploads,
    write_manifest,
)
from .preview import build_output_preview
from .schemas import EclassError, build_upload_schema, require_enabled_combination


def _resolve_adapter(product_line: str, module: str):
    if (product_line, module) == ("IVD", "big_teach"):
        from .adapters import ivd_big_teach_adapter

        return ivd_big_teach_adapter.run
    if (product_line, module) == ("IVD", "communication"):
        from .adapters import ivd_communication_adapter

        return ivd_communication_adapter.run
    return None


def _json_safe(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, (str, int, float, bool)):
        return value
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            return str(value)
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(item) for item in value]
    return str(value)


def process_eclass_job(
    product_line: str,
    module: str,
    uploads_by_slot: dict[str, list[Any]],
    relative_paths_by_slot: dict[str, list[str]] | None = None,
) -> dict[str, Any]:
    product_line, module = require_enabled_combination(product_line, module)
    schema = build_upload_schema(product_line, module)
    upload_slots = schema["upload_slots"]
    adapter = _resolve_adapter(product_line, module)
    if adapter is None:
        raise EclassError("当前产线或业务方向待开发")

    job_id, input_dir, staging_output_dir = create_job_dirs()
    output_dir = staging_output_dir
    result_dir = create_result_output_dir(product_line, module)
    logs = [
        "文件上传完成",
        f"准备处理 {schema['title']}",
        f"输出目录：{result_dir}",
    ]

    try:
        input_files, upload_warnings = save_uploads(
            uploads_by_slot,
            upload_slots,
            input_dir,
            relative_paths_by_slot,
        )
        adapter_result = adapter(input_files, output_dir)
    except EclassError:
        raise
    except ValueError as exc:
        raise EclassError(str(exc), 400, logs=[*logs, str(exc)]) from exc
    except Exception as exc:
        raise EclassError(f"处理失败：{exc}", 500, logs=[*logs, f"处理失败：{exc}"]) from exc

    raw_outputs = adapter_result.get("outputs") or []
    outputs_for_preview = []
    manifest_outputs = []
    response_outputs = []

    for index, output in enumerate(raw_outputs, start=1):
        path = ensure_path_inside(Path(output["path"]), output_dir)
        file_id = str(output.get("id") or f"output_{index}")
        filename = str(output.get("filename") or path.name)
        file_type = str(output.get("type") or "other")
        published_path = publish_result_file(path, result_dir, filename)
        manifest_record = {
            "file_id": file_id,
            "filename": published_path.name,
            "path_name": published_path.name,
            "type": file_type,
        }
        manifest_outputs.append(manifest_record)
        response_outputs.append({
            "file_id": file_id,
            "filename": published_path.name,
            "type": file_type,
            "download_url": f"/api/eclass/download/{job_id}/{file_id}",
        })
        outputs_for_preview.append({"path": str(path), "filename": filename, "type": file_type})

    write_manifest(job_id, manifest_outputs, result_dir)
    preview, preview_message = build_output_preview(outputs_for_preview)
    warnings = [*upload_warnings, *(adapter_result.get("warnings") or [])]
    result_logs = [*logs, *(adapter_result.get("logs") or []), "处理完成"]
    summary = _json_safe(adapter_result.get("summary") or {})
    stats: dict[str, Any] = {
        "product_line": product_line,
        "module": module,
        "output_file_count": len(response_outputs),
        "preview_rows": len(preview.get("rows") or []),
        "warning_count": len(warnings),
    }
    if isinstance(summary, dict):
        for key, value in summary.items():
            if isinstance(value, (str, int, float, bool)) or value is None:
                stats[key] = _json_safe(value)

    return {
        "job_id": job_id,
        "status": "success",
        "message": adapter_result.get("message") or preview_message,
        "stats": stats,
        "summary": summary,
        "outputs": response_outputs,
        "output_folder": str(result_dir),
        "open_folder_url": f"/api/eclass/open-output-folder/{job_id}",
        "preview": preview,
        "logs": result_logs[-50:],
        "warnings": warnings,
    }


def _manifest_output_root(job_id: str) -> Path:
    manifest = read_manifest(job_id)
    output_dir = str(manifest.get("output_dir") or "").strip()
    if output_dir:
        return Path(output_dir)
    return eclass_output_root() / job_id / "output"


def resolve_download(job_id: str, file_id: str) -> tuple[Path, str, str]:
    manifest = read_manifest(job_id)
    output_root = _manifest_output_root(job_id)
    for output in manifest.get("outputs") or []:
        if output.get("file_id") != file_id:
            continue
        filename = str(output.get("filename") or output.get("path_name") or "download")
        path = ensure_path_inside(output_root / str(output.get("path_name")), output_root)
        if not path.exists():
            raise EclassError("结果文件不存在或已被清理", 404)
        return path, filename, media_type_for(filename)
    raise EclassError("下载文件不存在", 404)


def resolve_output_folder(job_id: str) -> Path:
    output_root = _manifest_output_root(job_id)
    if not output_root.exists() or not output_root.is_dir():
        raise EclassError("输出文件夹不存在或已被清理", 404)
    return output_root


def open_output_folder(job_id: str) -> Path:
    output_root = resolve_output_folder(job_id)
    try:
        if sys.platform.startswith("win"):
            os.startfile(str(output_root))  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(output_root)])
        else:
            subprocess.Popen(["xdg-open", str(output_root)])
    except Exception as exc:
        raise EclassError(f"打开输出文件夹失败：{exc}", 500) from exc
    return output_root
