from __future__ import annotations

import base64
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding


PRIVATE_KEY_PEM = b"""-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDXIW5OHJJRmZ/U
ox4D62cMDjs4sXnwCYkhdYtMT7Jl2iEQlhkWg9fadXdERXp1rgrLFHKFotKIa05G
VV8njTL5gua/9yVLktaMt9Uhkfj8rGsTrYoGD0nJYCAPWH+WqRPmVWBBSlKRnFwv
6yMN9yAqPxQymz04UjINg/XUxalcvacNIw6kWOD0Qq/TjX0HVG3bG35vX1G2mSHG
y9re98FDz6ONsOKs9HBSRnE24I1zd/1dl6c8AyrAXrTiKWJLSot/Ce9PDS14hnEq
7dSasIynibZcLrEaMGt41gIIcn0+sO4rau+oa5gl08szPWYvz7G+6kx0xZcnAfa+
kgG5gzI9AgMBAAECggEAMOipTrnhLAsMkseo1cRJb6y2mwuCSOeqFQDHtAg0a0J9
nOs69erwgnqNLGjNT/7K9mOGK8qaKaiXqZbUJMZNrfssIb167aULAP/0RQcOP8el
KlqcVAdaw50GfOamTybOXuHPGdjfT7poHP7Mv+qMlf40RdMURn8tYPQ8yexMNkh/
AnphnEQWsu1o+0GWo1XKyA3mTURnoigMmMst03dac9ejPGBDDpKPM1z/hk9oRh5d
etBsi27ATJXyaiW1emMYLQSL8qYJZuWXG+febQRc7xYL1wg9vzNxN4kp2ylDlfOT
e4lF9UTsd+ThZtbulwfdOqZoT/J1TG4ibrz+eAWvQwKBgQDrYNTW2KtGykip+PYl
ceGr1RGte7NLK5r7jX77kpKlTMInaxKzq5RDo+gqWSBhNainZs8zmxMkbzZPajJU
Js+laQnX4wX0dyKYNP18Xmg9HET1573grzuHlgVbWk8V1F+ifOUu40Mi9ievLFNL
jbwnh89zgMg2RwfPwXQE6tD5KwKBgQDp+nnXSqXp+RwawK4KhCW9EbxsYBpIZB2o
Brz2041pFzlZQYcpQssXkxsfrYf6dO9t/4wg/Jsd7XcAxezfdTuz/ZKXsqVG7H9C
zPGIea02KtpzCEnd6BABI2us9GAYKR5V6VtqzORRvkrUaNhL3Axnrfu5K1YTPa3e
Fq9VUa/+NwKBgQC0othUlW1EY4NGZljIvc/5pgfuAmvDeZB0Es/r0z2VfAXYaHSu
zDN5gXVv4nxV/e8ToXPMX+td37dnVNGRAUQD5kt2kbSFO1SiSLBsXKtUkrhdm159
6x0dXcV4qSLeVuCZ+42K4UApuY0VA0hdSEWodLKBKsj71qEpEIawK2D6hwKBgQCX
R2hhp5UQaw0dyvh8OibAUOhX1ecIaRq3meuxVuS2Ttq4d+Kw7cur6WP/Hk6tw89O
eoyag1izh+aKbG4TqJO6czfFty6fZad+hE2iJLG2NQzalUBVJoa6hbFHuRUsaeGA
QInnyqPQqk1teoBmw9aNbnMzrO5RMG7rChXA/zjgDwKBgQCbwIaQABAq0/o6U2eR
DSNi+5DF6iYctfDORccfHpfA5J+KkZM9T9RoxUPmNVq2pqELw/tk8nQSjzW6HZxf
oMrYl369gCizmAEyrl5HoImNdedTIThqoyHPSe4MvqFLpxh7fqBB5OoayrJrM7x6
GeJ3R1TlGMx4tbm88l7W9TXrXA==
-----END PRIVATE KEY-----"""

LICENSE_PREFIX = "RTS-LIC-"
VALID_FEATURES = [
    "access_app",
    "timeout_ticket_filter",
    "online_business_calculation",
    "service_qualification_map",
    "training_coverage_map",
    "eclass_data",
]
VALID_VERSIONS = ["PRO", "TRIAL", "STANDARD", "ENTERPRISE"]
FEATURE_LABELS = {
    "access_app": "主程序访问",
    "timeout_ticket_filter": "超时工单筛选",
    "online_business_calculation": "在线业务计算",
    "service_qualification_map": "服务资质地图",
    "training_coverage_map": "培训覆盖地图",
    "eclass_data": "E课堂数据处理",
}
MACHINE_CODE_PATTERN = re.compile(r"^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$")


class LicenseInputError(ValueError):
    pass


def app_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[1]


def records_path() -> Path:
    return app_root() / "data" / "license_records.json"


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def canonical(payload: dict) -> bytes:
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def normalize_machine_code(machine: str) -> str:
    return re.sub(r"\s+", "", machine or "").upper()


def validate_inputs(machine: str, user: str, department: str, expire: str, version: str, features: list[str]) -> None:
    if not machine:
        raise LicenseInputError("请输入机器码")
    if not MACHINE_CODE_PATTERN.match(machine):
        raise LicenseInputError("机器码格式不正确，应为 XXXX-XXXX-XXXX-XXXX")
    if not user.strip():
        raise LicenseInputError("请输入授权人")
    if not department.strip():
        raise LicenseInputError("请输入部门")
    try:
        expire_date = date.fromisoformat(expire)
    except ValueError as exc:
        raise LicenseInputError("到期日期格式不正确，应为 YYYY-MM-DD") from exc
    if expire_date < date.today():
        raise LicenseInputError("到期日期不能早于今天")
    if version.upper() not in VALID_VERSIONS:
        raise LicenseInputError("请选择有效版本")
    if not features:
        raise LicenseInputError("请选择至少一个功能权限")
    bad = sorted(set(features) - set(VALID_FEATURES))
    if bad:
        raise LicenseInputError(f"未知功能权限：{','.join(bad)}")


def generate_license(machine: str, user: str, department: str, expire: str, version: str, features: list[str]) -> tuple[str, dict]:
    machine_code = normalize_machine_code(machine)
    features = [item.strip() for item in features if item.strip()]
    validate_inputs(machine_code, user, department, expire, version, features)
    payload = {
        "machine_code": machine_code,
        "license_user": user.strip(),
        "department": department.strip(),
        "expire_date": expire,
        "version": version.upper(),
        "features": features,
        "created_at": date.today().isoformat(),
    }
    private_key = serialization.load_pem_private_key(PRIVATE_KEY_PEM, password=None)
    signature = private_key.sign(
        canonical(payload),
        padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
        hashes.SHA256(),
    )
    blob = {"payload": payload, "signature": b64url(signature)}
    code = LICENSE_PREFIX + b64url(json.dumps(blob, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    return code, payload


def save_record(code: str, payload: dict) -> Path:
    path = records_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    records = []
    if path.exists():
        try:
            records = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            records = []
    records.append(
        {
            "machine_code": payload["machine_code"],
            "license_user": payload["license_user"],
            "department": payload["department"],
            "expire_date": payload["expire_date"],
            "version": payload["version"],
            "features": payload.get("features", []),
            "license_code": code,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
    )
    path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def load_records() -> list[dict]:
    path = records_path()
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []
