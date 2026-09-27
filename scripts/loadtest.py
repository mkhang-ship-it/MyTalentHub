#!/usr/bin/env python3
"""Đo hiệu năng mặt đọc FTalentHub — chỉ dùng thư viện chuẩn, không cài gì.

Chạy nhẹ (mặc định 20 request/endpoint, 4 luồng), an toàn khi server đang
có người dùng khác. ĐỪNG tăng --requests/--concurrency cao trên máy dùng chung.

    python3 scripts/loadtest.py
    python3 scripts/loadtest.py --requests 50 --concurrency 8 --json
    python3 scripts/loadtest.py --role teacher --p95-max 800

Exit code khác 0 khi p95 của bất kỳ endpoint nào vượt --p95-max (mặc định
500ms) để dùng được trong CI. Lỗi HTTP (kể cả 403 khi ép --role sai vai trò)
chỉ liệt kê, không tính vào p95.

LƯU Ý QUAN TRỌNG: số đo phụ thuộc dữ liệu seed hiện tại (~40 học sinh, DB nhỏ
vài trăm KB) và KHÔNG đại diện cho production — production đông user, DB lớn,
mạng thật thì số sẽ khác hẳn. Đừng trích bảng này làm cam kết hiệu năng.
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE_DEFAULT = "http://127.0.0.1:8001/api/v1"
PASSWORD = "demo123"
ACCOUNTS = {
    "student": "hs01@ftalenthub.edu.vn",
    "teacher": "nguyen.van.hung@ftalenthub.edu.vn",
    "school": "bgh@ftalenthub.edu.vn",
}
# Endpoint → vai trò token phù hợp (chế độ auto).
ENDPOINTS = [
    ("GET", "/student/profile", "student"),
    ("GET", "/student/activities", "student"),
    ("GET", "/teacher/activities", "teacher"),
    ("GET", "/school/teachers", "school"),
    ("GET", "/student/evaluations", "student"),
]
NOTE = (
    "Số đo phụ thuộc dữ liệu seed hiện tại (~40 học sinh) và KHÔNG đại diện "
    "cho production — không dùng làm cam kết hiệu năng."
)


def call(base: str, method: str, path: str, token: str | None, timeout: float):
    req = urllib.request.Request(base + path, method=method)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            res.read()
            return (time.perf_counter() - started) * 1000.0, None
    except urllib.error.HTTPError as exc:
        return (time.perf_counter() - started) * 1000.0, f"HTTP {exc.code}"
    except Exception as exc:  # noqa: BLE001 - gộp mọi lỗi mạng thành chuỗi
        return (time.perf_counter() - started) * 1000.0, type(exc).__name__


def login(base: str, email: str, timeout: float) -> str:
    body = json.dumps({"email": email, "password": PASSWORD}).encode()
    req = urllib.request.Request(
        base + "/auth/login", data=body, method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            payload = json.loads(res.read().decode())
    except urllib.error.HTTPError as exc:
        sys.exit(f"loadtest: đăng nhập {email} thất bại HTTP {exc.code} — backend có chạy ở {base} không?")
    except Exception as exc:  # noqa: BLE001
        sys.exit(f"loadtest: không nối được backend ở {base} ({exc})")
    return payload["token"]


def percentile(data: list[float], pct: float) -> float:
    if not data:
        return float("nan")
    if len(data) == 1:
        return data[0]
    return statistics.quantiles(data, n=100)[min(99, int(pct)) - 1]


def main() -> int:
    parser = argparse.ArgumentParser(description="Đo hiệu năng mặt đọc FTalentHub (nhẹ, thư viện chuẩn).")
    parser.add_argument("--base", default=BASE_DEFAULT, help="API base URL")
    parser.add_argument("--requests", type=int, default=20, help="số request mỗi endpoint")
    parser.add_argument("--concurrency", type=int, default=4, help="số luồng đồng thời")
    parser.add_argument("--role", default="auto",
                        help="auto (mỗi endpoint dùng token đúng vai trò) hoặc student|teacher|school (ép mọi endpoint dùng 1 vai trò — 403 là chuyện bình thường)")
    parser.add_argument("--p95-max", type=float, default=500.0, help="ngưỡng p95 (ms), vượt thì exit khác 0")
    parser.add_argument("--json", action="store_true", help="xuất JSON thay vì bảng")
    parser.add_argument("--timeout", type=float, default=15.0, help="timeout mỗi request (giây)")
    args = parser.parse_args()

    if args.requests < 1 or args.concurrency < 1:
        sys.exit("loadtest: --requests và --concurrency phải >= 1")
    if args.role != "auto" and args.role not in ACCOUNTS:
        sys.exit("loadtest: --role phải là auto|student|teacher|school")

    tokens = {role: login(args.base, email, args.timeout) for role, email in ACCOUNTS.items()}
    jobs = [
        (method, path, tokens[args.role if args.role != "auto" else need])
        for method, path, need in ENDPOINTS
    ]

    results: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        for method, path, token in jobs:
            futures = [
                pool.submit(call, args.base, method, path, token, args.timeout)
                for _ in range(args.requests)
            ]
            lat: list[float] = []
            errs: dict[str, int] = {}
            for fut in futures:
                ms, err = fut.result()
                if err is None:
                    lat.append(ms)
                else:
                    errs[err] = errs.get(err, 0) + 1
            lat.sort()
            results[f"{method} {path}"] = {
                "n": args.requests,
                "ok": len(lat),
                "errors": errs,
                "median_ms": round(statistics.median(lat), 1) if lat else None,
                "p95_ms": round(percentile(lat, 95), 1) if lat else None,
                "p99_ms": round(percentile(lat, 99), 1) if lat else None,
                "max_ms": round(max(lat), 1) if lat else None,
            }

    breached = [
        name for name, r in results.items()
        if r["p95_ms"] is None or r["p95_ms"] > args.p95_max
    ]
    ok = not breached
    payload = {
        "note": NOTE,
        "threshold_p95_ms": args.p95_max,
        "ok": ok,
        "breached": breached,
        "endpoints": results,
    }
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(f"Loadtest FTalentHub — {args.base} (mỗi endpoint {args.requests} req, {args.concurrency} luồng)")
        print("-" * 88)
        print(f"  {'endpoint':<28}{'ok/n':>7}{'median':>9}{'p95':>9}{'p99':>9}{'max':>9}  lỗi")
        for name, r in results.items():
            err_txt = ", ".join(f"{k}x{v}" for k, v in r["errors"].items()) or "-"
            fmt = lambda v: f"{v:>9.1f}" if v is not None else "        -"
            print(f"  {name:<28}{r['ok']:>3}/{r['n']:<3}{fmt(r['median_ms'])}{fmt(r['p95_ms'])}{fmt(r['p99_ms'])}{fmt(r['max_ms'])}  {err_txt}")
        print("-" * 88)
        print(f"LƯU Ý: {NOTE}")
        print(f"KẾT QUẢ: {'ĐẠT (mọi p95 ≤ ' + str(args.p95_max) + 'ms)' if ok else 'VƯỢT NGƯỠNG: ' + ', '.join(breached)}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
