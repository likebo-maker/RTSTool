from __future__ import annotations

import os
import re
import socket
import uuid
import sys
import threading
import webbrowser
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles


APP_NAME = "RTS工程师效率工具箱"


def _bundle_root() -> Path:
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent.parent


def _resolve_frontend_dist_dir() -> Path:
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        bundle_root = Path(sys._MEIPASS)
        candidates = [
            bundle_root / "frontend" / "dist",
            bundle_root / "dist",
            bundle_root,
        ]
        for candidate in candidates:
            if (candidate / "index.html").exists():
                return candidate

    source_candidate = Path(__file__).resolve().parent.parent / "frontend" / "dist"
    return source_candidate


def _resolve_output_dir() -> Path:
    if getattr(sys, "frozen", False):
        local_app_data = os.environ.get("LOCALAPPDATA")
        if local_app_data:
            return Path(local_app_data) / APP_NAME / "output"
        return Path.home() / "AppData" / "Local" / APP_NAME / "output"
    return Path(__file__).resolve().parent / "output"


def _find_free_port(start_port: int = 8000, attempts: int = 50) -> int:
    for port in range(start_port, start_port + attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind(("127.0.0.1", port))
            except OSError:
                continue
            return port
    raise RuntimeError("无法找到可用端口")


def _prepare_runtime_streams() -> None:
    if sys.stdout is not None and sys.stderr is not None:
        return

    log_dir = Path(os.environ.get("LOCALAPPDATA", Path.home())) / APP_NAME / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "runtime.log"

    if sys.stdout is None:
        sys.stdout = open(log_file, "a", encoding="utf-8", buffering=1)
    if sys.stderr is None:
        sys.stderr = open(log_file, "a", encoding="utf-8", buffering=1)


FRONTEND_DIST_DIR = _resolve_frontend_dist_dir()
OUTPUT_DIR = _resolve_output_dir()
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

WORK_ORDER_SHEET_NAME = "工单报表 - 已筛选"
TARGET_PRODUCT_LINE = "IVD"
TARGET_STATUSES = {"服务执行中", "已派工", "已预约"}

WORK_ORDER_ALIASES = {
    "product_line": ["大产线", "产品线"],
    "status": ["工单状态", "状态"],
    "ticket_id": ["工单号", "服务工单号", "工单编号"],
}

QUALITY_ALIASES = {
    "ticket_id": ["前续工单", "工单号", "服务工单号", "前续工单号"],
}


app = FastAPI(title=APP_NAME, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if FRONTEND_DIST_DIR.exists():
    assets_dir = FRONTEND_DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


def _normalize_column_name(name: Any) -> str:
    return re.sub(r"\s+", "", str(name or "")).strip()


def _find_column(df: pd.DataFrame, aliases: list[str], label: str) -> str:
    normalized_to_original = {
        _normalize_column_name(column): column for column in df.columns
    }
    for alias in aliases:
        column = normalized_to_original.get(_normalize_column_name(alias))
        if column is not None:
            return column

    raise HTTPException(
        status_code=400,
        detail=f"未找到必需字段：{label}。当前表头：{', '.join(map(str, df.columns))}",
    )


def _normalize_cell_text(value: Any) -> str:
    if value is None or pd.isna(value):
        return ""
    return str(value).strip()


def _normalize_ticket_id(value: Any) -> str:
    if value is None or pd.isna(value):
        return ""
    if isinstance(value, (int, np.integer)):
        return str(int(value))
    if isinstance(value, (float, np.floating)) and float(value).is_integer():
        return str(int(value))

    text = str(value).strip()
    if re.fullmatch(r"\d+\.0", text):
        return text[:-2]
    return text


def _expand_ticket_ids(value: Any) -> set[str]:
    normalized = _normalize_ticket_id(value)
    if not normalized:
        return set()

    values = {normalized}
    for token in re.split(r"[,，;；、\s]+", normalized):
        token = _normalize_ticket_id(token)
        if token:
            values.add(token)
    return values


def _read_table(upload: UploadFile, label: str) -> pd.DataFrame:
    filename = upload.filename or ""
    lower_filename = filename.lower()
    if not lower_filename.endswith((".xlsx", ".xlsm", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail=f"{label}必须是 Excel 或 CSV 文件")

    try:
        upload.file.seek(0)
        if lower_filename.endswith(".csv"):
            try:
                return pd.read_csv(upload.file, dtype=object, encoding="utf-8-sig")
            except UnicodeDecodeError:
                upload.file.seek(0)
                return pd.read_csv(upload.file, dtype=object, encoding="gbk")

        return pd.read_excel(upload.file, sheet_name=0, dtype=object)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"{label}解析失败：{exc}") from exc


def _json_safe_value(value: Any) -> Any:
    if value is None or pd.isna(value):
        return ""
    if isinstance(value, pd.Timestamp):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    return value


def _make_preview(df: pd.DataFrame, limit: int = 10) -> dict[str, Any]:
    preview_df = df.head(limit).copy()
    rows = []
    for record in preview_df.to_dict(orient="records"):
        rows.append({str(key): _json_safe_value(value) for key, value in record.items()})

    return {
        "columns": [str(column) for column in df.columns],
        "rows": rows,
        "limit": limit,
    }


def process_excels(work_order_file: UploadFile, quality_file: UploadFile) -> dict[str, Any]:
    work_df = _read_table(work_order_file, "工单报表")
    quality_df = _read_table(quality_file, "质量上升报表")

    product_line_col = _find_column(
        work_df, WORK_ORDER_ALIASES["product_line"], "工单报表.大产线"
    )
    status_col = _find_column(work_df, WORK_ORDER_ALIASES["status"], "工单报表.工单状态")
    work_ticket_col = _find_column(
        work_df, WORK_ORDER_ALIASES["ticket_id"], "工单报表.工单号"
    )
    quality_ticket_col = _find_column(
        quality_df, QUALITY_ALIASES["ticket_id"], "质量上升报表.前续工单"
    )

    product_line = work_df[product_line_col].map(_normalize_cell_text)
    status = work_df[status_col].map(_normalize_cell_text)

    pending_df = work_df[
        (product_line == TARGET_PRODUCT_LINE) & (status.isin(TARGET_STATUSES))
    ].copy()

    quality_ticket_ids: set[str] = set()
    for value in quality_df[quality_ticket_col]:
        quality_ticket_ids.update(_expand_ticket_ids(value))

    pending_ticket_ids = pending_df[work_ticket_col].map(_normalize_ticket_id)
    result_df = pending_df[~pending_ticket_ids.isin(quality_ticket_ids)].copy()

    job_id = uuid.uuid4().hex
    filename = f"工单报表-已筛选-{job_id}.xlsx"
    output_path = OUTPUT_DIR / filename

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        result_df.to_excel(writer, index=False, sheet_name=WORK_ORDER_SHEET_NAME)

    return {
        "job_id": job_id,
        "filename": filename,
        "download_url": f"/api/download/{job_id}",
        "stats": {
            "work_order_total": int(len(work_df)),
            "quality_total": int(len(quality_df)),
            "pending_total": int(len(pending_df)),
            "matched_quality_ticket_total": int(
                pending_ticket_ids.isin(quality_ticket_ids).sum()
            ),
            "result_total": int(len(result_df)),
        },
        "columns": {
            "product_line": str(product_line_col),
            "status": str(status_col),
            "work_ticket_id": str(work_ticket_col),
            "quality_ticket_id": str(quality_ticket_col),
        },
        "preview": _make_preview(result_df),
    }


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/process")
def process_files(
    work_order_file: UploadFile = File(...),
    quality_file: UploadFile = File(...),
) -> dict[str, Any]:
    return process_excels(work_order_file, quality_file)


@app.get("/api/download/{job_id}")
def download_file(job_id: str) -> FileResponse:
    if not re.fullmatch(r"[a-f0-9]{32}", job_id):
        raise HTTPException(status_code=400, detail="无效的下载编号")

    matches = list(OUTPUT_DIR.glob(f"工单报表-已筛选-{job_id}.xlsx"))
    if not matches:
        raise HTTPException(status_code=404, detail="导出文件不存在或已被清理")

    return FileResponse(
        matches[0],
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="工单报表-已筛选.xlsx",
    )


@app.get("/", include_in_schema=False)
def serve_frontend():
    index_file = FRONTEND_DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    return HTMLResponse(
        """
        <!doctype html>
        <html lang="zh-CN">
          <head>
            <meta charset="utf-8" />
            <title>RTS工程师效率工具箱</title>
            <style>
              body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                background: #06111f;
                color: #e8f3ff;
                font-family: -apple-system, BlinkMacSystemFont, "PingFang SC",
                  "Microsoft YaHei", sans-serif;
              }
              main {
                width: min(680px, calc(100% - 32px));
                padding: 28px;
                border: 1px solid rgba(112, 198, 255, 0.28);
                border-radius: 8px;
                background: rgba(8, 25, 43, 0.9);
              }
              code {
                color: #65e7ff;
              }
            </style>
          </head>
          <body>
            <main>
              <h1>后端服务已启动</h1>
              <p>如果要打开完整前端页面，请在项目根目录执行：</p>
              <p><code>cd frontend && npm run dev</code></p>
              <p>然后访问：<code>http://127.0.0.1:5173</code></p>
              <p>或执行 <code>cd frontend && npm run build</code> 后刷新当前后端地址。</p>
            </main>
          </body>
        </html>
        """
    )


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend_routes(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="接口不存在")

    index_file = FRONTEND_DIST_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="前端页面未构建")

    return FileResponse(index_file)


if __name__ == "__main__":
    import uvicorn

    _prepare_runtime_streams()
    port = _find_free_port(8000)
    url = f"http://127.0.0.1:{port}"
    threading.Timer(1.2, lambda: webbrowser.open(url)).start()
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_config=None,
        access_log=False,
    )
