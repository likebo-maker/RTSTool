from __future__ import annotations

import os
import sys
import threading
import webbrowser
from pathlib import Path

import uvicorn

from backend.main import _find_free_port, app


def _prepare_runtime_streams() -> None:
    log_dir = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "RTS_Toolbox" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "runtime.log"

    if sys.stdout is None:
        sys.stdout = open(log_file, "a", encoding="utf-8", buffering=1)
    if sys.stderr is None:
        sys.stderr = open(log_file, "a", encoding="utf-8", buffering=1)


def main() -> None:
    _prepare_runtime_streams()
    start_port = int(os.environ.get("RTS_TOOLBOX_PORT", "8000"))
    port = _find_free_port(start_port)
    url = f"http://127.0.0.1:{port}"
    threading.Timer(1.2, lambda: webbrowser.open(url)).start()
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="warning",
        log_config=None,
        access_log=False,
    )


if __name__ == "__main__":
    main()
