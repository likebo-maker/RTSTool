from __future__ import annotations

import argparse

from license_core import FEATURE_LABELS, VALID_FEATURES, VALID_VERSIONS, generate_license, save_record


def main() -> None:
    parser = argparse.ArgumentParser(description="RTS 工具箱注册码生成器")
    parser.add_argument("--machine", required=True, help="机器码")
    parser.add_argument("--user", required=True, help="授权人")
    parser.add_argument("--department", required=True, help="部门")
    parser.add_argument("--expire", required=True, help="到期日期 YYYY-MM-DD")
    parser.add_argument("--version", default="PRO", choices=VALID_VERSIONS)
    parser.add_argument("--features", nargs="+", default=["access_app"], choices=VALID_FEATURES)
    args = parser.parse_args()

    code, payload = generate_license(
        machine=args.machine,
        user=args.user,
        department=args.department,
        expire=args.expire,
        version=args.version,
        features=args.features,
    )
    save_record(code, payload)
    print(code)
    print("功能权限：", "、".join(FEATURE_LABELS[item] for item in args.features))


if __name__ == "__main__":
    main()
