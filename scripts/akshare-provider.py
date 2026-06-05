#!/usr/bin/env python3
import contextlib
import datetime as dt
import io
import json
import os
import sys
import time

for key in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"):
    os.environ.pop(key, None)
os.environ["NO_PROXY"] = "*"
os.environ["no_proxy"] = "*"

try:
    import requests

    _request = requests.sessions.Session.request

    def _request_without_proxy(self, method, url, **kwargs):
        self.trust_env = False
        kwargs["proxies"] = {"http": None, "https": None}
        return _request(self, method, url, **kwargs)

    requests.sessions.Session.request = _request_without_proxy
except Exception:
    pass


def to_float(value, default=0.0):
    try:
        if value is None:
            return default
        numeric = float(value)
        if numeric != numeric:
            return default
        return numeric
    except Exception:
        return default


def normalize_sector_row(row, sector_type):
    return {
        "type": sector_type,
        "name": str(row.get("名称", "")).strip(),
        "change": round(to_float(row.get("今日涨跌幅")), 2),
        "flow": round(to_float(row.get("今日主力净流入-净额")) / 1e8, 2),
        "mainRatio": round(to_float(row.get("今日主力净流入-净占比")), 2),
        "superLargeFlow": round(to_float(row.get("今日超大单净流入-净额")) / 1e8, 2),
        "largeFlow": round(to_float(row.get("今日大单净流入-净额")) / 1e8, 2),
        "mediumFlow": round(to_float(row.get("今日中单净流入-净额")) / 1e8, 2),
        "smallFlow": round(to_float(row.get("今日小单净流入-净额")) / 1e8, 2),
        "leadingStock": str(row.get("今日主力净流入最大股", "")).strip(),
        "dataProvider": "akshare",
    }


def fetch_rank(ak, sector_type):
    last_error = None
    for attempt in range(3):
        try:
            with contextlib.redirect_stderr(io.StringIO()):
                df = ak.stock_sector_fund_flow_rank(indicator="今日", sector_type=sector_type)
            break
        except Exception as exc:
            last_error = exc
            print(f"AKShare {sector_type} attempt {attempt + 1} failed: {type(exc).__name__}: {exc}", file=sys.stderr)
            time.sleep(1.5 * (attempt + 1))
    else:
        raise last_error

    output_type = "industry" if sector_type == "行业资金流" else "concept"
    return [
        normalize_sector_row(row, output_type)
        for row in df.to_dict("records")
        if str(row.get("名称", "")).strip()
    ]


def main():
    try:
        import akshare as ak
    except Exception as exc:
        print(json.dumps({"error": f"AKShare import failed: {exc}"}, ensure_ascii=False))
        return 2

    errors = []
    sectors = []
    for sector_type in ("行业资金流", "概念资金流"):
        try:
            sectors.extend(fetch_rank(ak, sector_type))
        except Exception as exc:
            errors.append(f"{sector_type}: {type(exc).__name__}: {exc}")

    if not sectors:
        print(json.dumps({"error": "; ".join(errors)}, ensure_ascii=False))
        return 2

    payload = {
        "meta": {
            "provider": "AKShare",
            "akshareVersion": getattr(ak, "__version__", ""),
            "fetchedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
            "partialErrors": errors,
        },
        "sectors": sectors,
    }
    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
