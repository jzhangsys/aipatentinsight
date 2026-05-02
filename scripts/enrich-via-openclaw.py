#!/usr/bin/env python3
"""
enrich-via-openclaw.py
======================

掃 public/data/insights-*-abstracts.json,把缺漏 / 過短的 abstract,
透過 openclaw_workspace 的 google_patent_consistent_fetcher 補回來。

跟 enrich-patent-abstracts.mjs 的差別:
  - 不重寫一份 fallback 爬蟲,reuse openclaw 既有的 fetch 邏輯
  - 跟 openclaw MCP server 共用同一份 sections.json cache,
    所以 MCP 調用過的也能 reuse,反之亦然

Usage:
    cd /Users/zhangjingjun/aipatentinsight
    /Users/zhangjingjun/openclaw_workspace/venv/bin/python3 scripts/enrich-via-openclaw.py
    # 只跑前 100 筆驗一下:
    /Users/zhangjingjun/openclaw_workspace/venv/bin/python3 scripts/enrich-via-openclaw.py --limit 100
    # 強制重抓(忽略 cache):
    /Users/zhangjingjun/openclaw_workspace/venv/bin/python3 scripts/enrich-via-openclaw.py --force
    # 連線測試,只抓 1 筆:
    /Users/zhangjingjun/openclaw_workspace/venv/bin/python3 scripts/enrich-via-openclaw.py --limit 1
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from glob import glob
from pathlib import Path

# 把 openclaw_workspace 加進 sys.path
OPENCLAW = Path("/Users/zhangjingjun/openclaw_workspace")
if str(OPENCLAW) not in sys.path:
    sys.path.insert(0, str(OPENCLAW))

# reuse openclaw 的 cache 跟 fetch
from openclaw_mcp_server import _get_sections_cached, _maybe_persist_cache  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
PUBLIC_DATA = REPO / "public" / "data"


def is_low_quality(abstract: str) -> bool:
    if not abstract:
        return True
    if len(abstract) < 30:
        return True
    return False


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="最多處理幾筆(0=全部)")
    ap.add_argument("--force", action="store_true", help="忽略 cache 重抓")
    ap.add_argument("--sleep-ms", type=int, default=300)
    ap.add_argument("--dry-run", action="store_true", help="只列要抓的,不真的抓")
    args = ap.parse_args()

    # 1. 掃所有 -abstracts.json
    files = sorted(glob(str(PUBLIC_DATA / "insights-*-abstracts.json")))
    print(f"[scan] 掃到 {len(files)} 個 -abstracts.json")

    all_data = {}  # path → loaded dict
    need_pids: set[str] = set()
    for f in files:
        data = json.load(open(f, encoding="utf-8"))
        all_data[f] = data
        for pid, abst in data.items():
            if args.force or is_low_quality(abst):
                need_pids.add(pid)

    print(f"[scan] 需要補的 unique patent IDs: {len(need_pids)}")

    targets = sorted(need_pids)
    if args.limit > 0:
        targets = targets[: args.limit]
        print(f"[scan] --limit {args.limit},只跑前 {len(targets)} 筆")

    if args.dry_run:
        for pid in targets:
            print(f"  would fetch: {pid}")
        return

    # 2. 一筆一筆抓(走 cache,有則 instant return)
    abstracts: dict[str, str] = {}
    success = fail = cache_hit = 0
    start = time.time()
    for i, pid in enumerate(targets, 1):
        sections = _get_sections_cached(pid, force=args.force)
        if sections.get("error"):
            fail += 1
            mark = "✗"
        elif sections.get("fromCache"):
            cache_hit += 1
            mark = "●"  # cache hit
        else:
            success += 1
            mark = "✓"

        abstract = sections.get("abstract", "")
        if abstract and len(abstract) >= 30:
            abstracts[pid] = abstract

        # 進度條 — 每 10 筆 + 最後一筆 印一次
        if i % 10 == 0 or i == len(targets):
            elapsed = time.time() - start
            rate = i / elapsed if elapsed > 0 else 0
            eta = (len(targets) - i) / rate if rate > 0 else 0
            print(
                f"  [{i}/{len(targets)}] {mark} {pid:<20} "
                f"hit={cache_hit} new={success} fail={fail} "
                f"({rate:.1f}/s, ETA {eta:.0f}s)"
            )
        else:
            print(f"  [{i}/{len(targets)}] {mark} {pid}")

        # 只有真的抓網路才 sleep(cache hit 不用)
        if mark == "✓" and i < len(targets) and args.sleep_ms > 0:
            time.sleep(args.sleep_ms / 1000.0)

    _maybe_persist_cache(force=True)

    print(f"\n[fetch] 完成 — cache_hit={cache_hit} new_fetch={success} fail={fail}")
    print(f"[fetch] 拿到 {len(abstracts)} 筆有效 abstract")

    # 3. 寫回各個 -abstracts.json
    written_files = 0
    written_abstracts = 0
    for f, data in all_data.items():
        modified = False
        for pid in list(data.keys()):
            if pid in abstracts and (args.force or is_low_quality(data[pid])):
                data[pid] = abstracts[pid]
                modified = True
                written_abstracts += 1
        if modified:
            with open(f, "w", encoding="utf-8") as fp:
                json.dump(data, fp, ensure_ascii=False)
            written_files += 1

    print(f"[write] 更新 {written_files} 個檔案,共寫入 {written_abstracts} 筆 abstract")
    print(f"[write] 同時更新 openclaw cache: {OPENCLAW}/openclaw_mcp_cache/sections.json")


if __name__ == "__main__":
    main()
