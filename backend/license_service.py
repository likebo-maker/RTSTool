from __future__ import annotations

import base64
from dataclasses import dataclass
from datetime import date, datetime
import getpass
import hashlib
import json
import platform
import re
import socket
import subprocess
import sys
from pathlib import Path
from typing import Any
import uuid

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding


PUBLIC_KEY_PEM = b"""-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1yFuThySUZmf1KMeA+tn
DA47OLF58AmJIXWLTE+yZdohEJYZFoPX2nV3REV6da4KyxRyhaLSiGtORlVfJ40y
+YLmv/clS5LWjLfVIZH4/KxrE62KBg9JyWAgD1h/lqkT5lVgQUpSkZxcL+sjDfcg
Kj8UMps9OFIyDYP11MWpXL2nDSMOpFjg9EKv0419B1Rt2xt+b19Rtpkhxsva3vfB
Q8+jjbDirPRwUkZxNuCNc3f9XZenPAMqwF604iliS0qLfwnvTw0teIZxKu3UmrCM
p4m2XC6xGjBreNYCCHJ9PrDuK2rvqGuYJdPLMz1mL8+xvupMdMWXJwH2vpIBuYMy
PQIDAQAB
-----END PUBLIC KEY-----"""

LICENSE_PREFIX = "RTS-LIC-"
VALID_VERSIONS = {"TRIAL", "STANDARD", "PRO", "ENTERPRISE"}
ALL_FEATURES = {
    "access_app",
    "timeout_ticket_filter",
    "online_business_calculation",
    "service_qualification_map",
    "training_coverage_map",
    "eclass_data",
}


@dataclass
class LicenseError(Exception):
    message: str
    status_code: int = 400

    def __str__(self) -> str:
        return self.message


def _project_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


def _data_dir() -> Path:
    base_dir = _project_root() / "data"
    base_dir.mkdir(parents=True, exist_ok=True)
    return base_dir


LICENSE_PATH = _data_dir() / "license.json"


def is_license_required() -> bool:
    return sys.platform.startswith("win")


def _run_windows_cmd(command: list[str]) -> str:
    if platform.system().lower() != "windows":
        return ""
    try:
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        out = subprocess.check_output(command, text=True, errors="ignore", startupinfo=startupinfo, timeout=3)
        lines = [line.strip() for line in out.splitlines() if line.strip()]
        return lines[-1] if len(lines) > 1 else (lines[0] if lines else "")
    except Exception:
        return ""


def _run_windows_powershell(script: str) -> str:
    if platform.system().lower() != "windows":
        return ""
    try:
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        out = subprocess.check_output(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
            text=True,
            errors="ignore",
            startupinfo=startupinfo,
            timeout=5,
        )
        for line in out.splitlines():
            cleaned = _clean_fingerprint_part(line)
            if cleaned:
                return cleaned
    except Exception:
        return ""
    return ""


def _clean_fingerprint_part(value: str) -> str:
    cleaned = re.sub(r"\s+", "", str(value or "").strip()).strip("{}")
    if not cleaned:
        return ""
    placeholders = {
        "0",
        "0000000000000000",
        "00000000-0000-0000-0000-000000000000",
        "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
        "TOBEFILLEDBYO.E.M.",
        "TOBEFILLEDBYOEM",
        "DEFAULTSTRING",
        "SYSTEMSERIALNUMBER",
        "NONE",
        "NULL",
        "UNKNOWN",
    }
    return "" if cleaned.upper() in placeholders else cleaned


def _windows_machine_guid() -> str:
    value = _run_windows_powershell("(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography').MachineGuid")
    if value:
        return value
    raw = _run_windows_cmd(["reg", "query", r"HKLM\SOFTWARE\Microsoft\Cryptography", "/v", "MachineGuid"])
    match = re.search(r"MachineGuid\s+REG_\w+\s+(.+)$", raw, flags=re.IGNORECASE)
    return _clean_fingerprint_part(match.group(1) if match else raw)


def _windows_cim_value(class_name: str, property_name: str) -> str:
    script = f"(Get-CimInstance -ClassName {class_name} | Select-Object -First 1 -ExpandProperty {property_name})"
    return _run_windows_powershell(script)


def legacy_machine_fingerprint_parts() -> list[str]:
    cpu = platform.processor() or platform.machine()
    mac = hex(uuid.getnode())
    username = getpass.getuser()
    if platform.system().lower() == "windows":
        board = _run_windows_cmd(["wmic", "baseboard", "get", "serialnumber"])
        disk = _run_windows_cmd(["wmic", "diskdrive", "get", "serialnumber"])
        return [cpu, board, disk, mac, username]
    return [platform.system().lower(), cpu, platform.machine(), mac, username, socket.gethostname()]


def _windows_stable_fingerprint_values() -> list[str]:
    if platform.system().lower() == "windows":
        return [
            _windows_machine_guid(),
            _windows_cim_value("Win32_ComputerSystemProduct", "UUID"),
            _windows_cim_value("Win32_BIOS", "SerialNumber"),
            _windows_cim_value("Win32_BaseBoard", "SerialNumber"),
        ]
    return []


def machine_fingerprint_parts() -> list[str]:
    if platform.system().lower() == "windows":
        stable_parts = [part for part in _windows_stable_fingerprint_values() if part]
        if stable_parts:
            return ["windows-stable-v2", stable_parts[0]]
    return legacy_machine_fingerprint_parts()


def _machine_code_from_parts(parts: list[str]) -> str:
    raw = "|".join(part.strip() for part in parts if part)
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest().upper()[:16]
    return "-".join(digest[i : i + 4] for i in range(0, 16, 4))


def get_machine_code() -> str:
    return _machine_code_from_parts(machine_fingerprint_parts())


def valid_machine_codes() -> set[str]:
    codes = {get_machine_code()}
    if platform.system().lower() == "windows":
        stable_parts = [part for part in _windows_stable_fingerprint_values() if part]
        for index, part in enumerate(stable_parts):
            if index == 0 or len(stable_parts) == 1:
                codes.add(_machine_code_from_parts(["windows-stable-v2", part]))
        for mask in range(1, 1 << len(stable_parts)):
            subset = [part for index, part in enumerate(stable_parts) if mask & (1 << index)]
            if len(subset) >= 2:
                codes.add(_machine_code_from_parts(["windows-stable-v2", *subset]))
    legacy_code = _machine_code_from_parts(legacy_machine_fingerprint_parts())
    if legacy_code:
        codes.add(legacy_code)
    return codes


def _b64url_decode(data: str) -> bytes:
    padding_len = (-len(data)) % 4
    return base64.urlsafe_b64decode(data + ("=" * padding_len))


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _canonical_payload(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def parse_license_code(code: str) -> tuple[dict[str, Any], bytes]:
    cleaned = re.sub(r"\s+", "", code.strip())
    if cleaned.startswith(LICENSE_PREFIX):
        cleaned = cleaned[len(LICENSE_PREFIX):]
    try:
        blob = json.loads(_b64url_decode(cleaned))
        payload = blob["payload"]
        signature = _b64url_decode(blob["signature"])
        if not isinstance(payload, dict):
            raise ValueError("payload must be object")
        return payload, signature
    except Exception as exc:
        raise LicenseError("注册码格式无效") from exc


def verify_signature(payload: dict[str, Any], signature: bytes) -> None:
    public_key = serialization.load_pem_public_key(PUBLIC_KEY_PEM)
    try:
        public_key.verify(
            signature,
            _canonical_payload(payload),
            padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
            hashes.SHA256(),
        )
    except InvalidSignature as exc:
        raise LicenseError("注册码被篡改") from exc


def validate_payload(payload: dict[str, Any], *, require_feature: str | None = None) -> None:
    required = {"machine_code", "license_user", "department", "expire_date", "version", "features", "created_at"}
    if not required.issubset(payload):
        raise LicenseError("注册码无效")
    if str(payload["machine_code"]).upper() not in valid_machine_codes():
        raise LicenseError(f"注册码与当前设备不匹配。请使用当前机器码 {get_machine_code()} 重新生成注册码。", 403)
    try:
        expire = date.fromisoformat(str(payload["expire_date"]))
    except ValueError as exc:
        raise LicenseError("注册码无效") from exc
    if expire < date.today():
        raise LicenseError("注册码已过期", 403)
    if str(payload["version"]).upper() not in VALID_VERSIONS:
        raise LicenseError("注册码无效")
    features = set(payload.get("features") or [])
    if not features.issubset(ALL_FEATURES):
        raise LicenseError("注册码无效")
    if require_feature and require_feature not in features:
        raise LicenseError("当前注册码不包含此功能", 403)


def _read_license_file() -> dict[str, Any] | None:
    if not LICENSE_PATH.exists():
        return None
    try:
        data = json.loads(LICENSE_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def _write_license_file(record: dict[str, Any]) -> None:
    LICENSE_PATH.parent.mkdir(parents=True, exist_ok=True)
    LICENSE_PATH.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")


def activate_license(code: str) -> dict[str, Any]:
    payload, signature = parse_license_code(code)
    verify_signature(payload, signature)
    validate_payload(payload)
    record = {
        "machine_code": payload["machine_code"],
        "license_user": payload["license_user"],
        "department": payload["department"],
        "expire_date": payload["expire_date"],
        "version": str(payload["version"]).upper(),
        "features": payload.get("features", []),
        "license_code": code.strip(),
        "payload": payload,
        "signature": _b64url(signature),
        "status": "active",
        "activated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    _write_license_file(record)
    return license_to_info(record)


def current_license() -> dict[str, Any] | None:
    return _read_license_file()


def license_to_info(row: dict[str, Any] | None = None) -> dict[str, Any]:
    machine_code = get_machine_code()
    if not is_license_required():
        return {
            "enabled": False,
            "machine_code": machine_code,
            "features": sorted(ALL_FEATURES),
            "status": "active",
            "remaining_days": None,
            "message": "macOS 不启用注册码校验",
        }
    if not row:
        return {"enabled": True, "machine_code": machine_code, "features": [], "status": "inactive", "remaining_days": None}

    features = row.get("features") or []
    status = "active"
    remaining_days = None
    try:
        remaining_days = (date.fromisoformat(str(row.get("expire_date", ""))) - date.today()).days
        if remaining_days < 0:
            status = "expired"
    except Exception:
        status = "invalid"

    registered_machine_code = str(row.get("machine_code", "")).upper()
    message = ""
    if registered_machine_code not in valid_machine_codes():
        status = "mismatch"
        message = (
            f"本地 license.json 绑定机器码 {registered_machine_code or '-'}，"
            f"与当前机器码 {machine_code} 不匹配。请复制当前机器码重新生成注册码。"
        )
    elif status == "expired":
        message = "注册码已过期，请重新申请授权。"
    elif status == "invalid":
        message = "本地授权信息格式异常，请重新激活。"

    return {
        "enabled": True,
        "machine_code": machine_code,
        "registered_machine_code": registered_machine_code,
        "license_user": row.get("license_user", ""),
        "department": row.get("department", ""),
        "expire_date": row.get("expire_date", ""),
        "version": row.get("version", ""),
        "features": features,
        "status": status,
        "activated_at": row.get("activated_at", ""),
        "remaining_days": remaining_days,
        "message": message,
    }


def require_valid_license(feature: str | None = None) -> dict[str, Any]:
    if not is_license_required():
        return license_to_info(None)
    row = current_license()
    if not row:
        raise LicenseError("未授权", 401)
    payload, signature = parse_license_code(str(row.get("license_code", "")))
    verify_signature(payload, signature)
    validate_payload(payload, require_feature=feature)
    return license_to_info(row)
