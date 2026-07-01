from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse

try:
    from license_service import FEATURES, LicenseError, require_valid_license
except ModuleNotFoundError:  # pragma: no cover - packaged import path
    from backend.license_service import FEATURES, LicenseError, require_valid_license

from .runner import open_output_folder, process_eclass_job, resolve_download
from .schemas import EclassError, build_options, build_upload_schema


router = APIRouter(prefix="/api/eclass", tags=["eclass"])


def _require_feature(feature: str | None = None) -> None:
    try:
        require_valid_license(feature)
    except LicenseError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


def _error_response(error: EclassError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={
            "status": "error",
            "message": error.message,
            "detail": error.message,
            "logs": error.logs,
        },
    )


@router.get("/options")
def eclass_options() -> dict[str, Any]:
    return build_options()


@router.get("/upload-schema")
def eclass_upload_schema(product_line: str = "", module: str = "") -> dict[str, Any]:
    return build_upload_schema(product_line, module)


@router.post("/process")
async def eclass_process(request: Request):
    _require_feature(FEATURES["ELEARNING_DATA"])
    form = await request.form()
    product_line = str(form.get("product_line") or "")
    module = str(form.get("module") or "")
    uploads_by_slot: dict[str, list[Any]] = {}
    relative_paths_by_slot: dict[str, list[str]] = {}

    for key, value in form.multi_items():
        if key in {"product_line", "module"}:
            continue
        if key.endswith("_paths"):
            slot_key = key[: -len("_paths")]
            try:
                paths = json.loads(str(value or "[]"))
            except json.JSONDecodeError as exc:
                raise HTTPException(status_code=400, detail=f"{slot_key} 路径清单格式错误") from exc
            relative_paths_by_slot[slot_key] = [str(item) for item in paths] if isinstance(paths, list) else []
            continue
        if hasattr(value, "filename") and hasattr(value, "file"):
            slot_key = key[: -len("_files")] if key.endswith("_files") else key
            uploads_by_slot.setdefault(slot_key, []).append(value)

    try:
        return process_eclass_job(product_line, module, uploads_by_slot, relative_paths_by_slot)
    except EclassError as exc:
        return _error_response(exc)


@router.get("/download/{job_id}/{file_id}")
def eclass_download(job_id: str, file_id: str) -> FileResponse:
    _require_feature(FEATURES["ELEARNING_DATA"])
    _require_feature(FEATURES["EXPORT_EXCEL"])
    try:
        path, filename, media_type = resolve_download(job_id, file_id)
    except EclassError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return FileResponse(path, media_type=media_type, filename=filename)


@router.post("/open-output-folder/{job_id}")
def eclass_open_output_folder(job_id: str) -> dict[str, Any]:
    _require_feature(FEATURES["ELEARNING_DATA"])
    try:
        output_dir = open_output_folder(job_id)
    except EclassError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return {"success": True, "output_folder": str(output_dir)}
