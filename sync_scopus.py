#!/usr/bin/env python3
"""
COEP Scopus Synchronization Engine
Fetches, normalizes, and caches real-time publications from Elsevier Scopus API
under Institutional Affiliation ID 60069506 (COEP Technological University, Pune).

Supports:
  --full         : Fetches all historical publications (4,633+ records)
  --incremental  : Fast 60-minute sync for recent updates & citation accruals
"""

import os
import sys
import json
import time
import shutil
import argparse
import datetime
from pathlib import Path
import requests

from scopus_api import ScopusAPIClient, JOURNAL_METRICS_DB, DEPARTMENT_KEYWORDS, INDUSTRY_KEYWORDS

API_KEY = os.getenv("SCOPUS_API_KEY", "6e4a05c4e7829e38a64ffc958487c027")
AFFIL_ID = "60069506"
CACHE_PATHS = [
    Path("data/coep_scopus_cache.json"),
    Path("web_dashboard/data/coep_scopus_cache.json"),
    Path("../coep-scopus-web-dashboard/data/coep_scopus_cache.json")
]


def fetch_full_scopus_archive(api_key: str = API_KEY):
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Starting FULL Scopus Sync for AF-ID({AFFIL_ID})...")
    client = ScopusAPIClient(api_key=api_key)
    
    session = requests.Session()
    session.headers.update({
        "Accept": "application/json",
        "X-ELS-APIKey": api_key
    })
    
    url = "https://api.elsevier.com/content/search/scopus"
    query = f"AF-ID({AFFIL_ID})"
    count_per_req = 25
    start = 0
    all_publications = []
    
    # Initial probe to determine total available
    probe = session.get(url, params={"query": query, "count": 1, "view": "STANDARD"}, timeout=20)
    if probe.status_code != 200:
        print(f"Error connecting to Scopus API: {probe.status_code} {probe.text}")
        return []
        
    total_available = int(probe.json().get("search-results", {}).get("opensearch:totalResults", "0"))
    print(f"Found {total_available} total publications in Elsevier Scopus under AF-ID({AFFIL_ID}).")

    start_time = time.time()
    
    while start < total_available:
        params = {
            "query": query,
            "count": count_per_req,
            "start": start,
            "view": "STANDARD",
            "sort": "-coverDate"
        }
        
        resp = None
        for attempt in range(5):
            try:
                resp = session.get(url, params=params, timeout=25)
                if resp.status_code == 200:
                    break
                elif resp.status_code == 429:
                    wait_sec = 2.0 * (attempt + 1)
                    print(f"Rate limited (429). Backing off {wait_sec:.1f}s...")
                    time.sleep(wait_sec)
                else:
                    print(f"HTTP {resp.status_code} at start={start}. Retrying...")
                    time.sleep(1.0)
            except Exception as e:
                print(f"Request exception at start={start}: {e}. Retrying...")
                time.sleep(2.0)

        if not resp or resp.status_code != 200:
            print(f"Failed to fetch page at start={start}. Terminating sync loop.")
            break

        data = resp.json().get("search-results", {})
        entries = data.get("entry", [])
        if not entries:
            break

        for entry in entries:
            if "error" in entry:
                continue
            parsed = client.parse_scopus_entry(entry)
            all_publications.append(parsed)

        start += count_per_req
        if len(all_publications) % 250 == 0 or start >= total_available:
            elapsed = time.time() - start_time
            rate = len(all_publications) / elapsed if elapsed > 0 else 0
            print(f"  -> Progress: {len(all_publications)} / {total_available} ({(len(all_publications)/total_available)*100:.1f}%) | {rate:.1f} pubs/sec")

        time.sleep(0.08)  # Polite pacing

    # Sort descending by publication date
    all_publications.sort(key=lambda x: x.get("publication_date", ""), reverse=True)
    return all_publications


def fetch_incremental_sync(api_key: str = API_KEY, cache_file: str = "data/coep_scopus_cache.json"):
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Starting 60-Minute Incremental Sync for AF-ID({AFFIL_ID})...")
    client = ScopusAPIClient(api_key=api_key)
    
    existing_data = []
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                existing_data = json.load(f).get("publications", [])
        except Exception as e:
            print(f"Warning loading existing cache: {e}")

    current_year = datetime.datetime.now().year
    query = f"(AF-ID({AFFIL_ID})) AND PUBYEAR >= {current_year - 1}"
    print(f"Querying recent publications: {query}")
    
    new_entries = client.fetch_coep_publications(query=query, max_results=250)
    if not new_entries:
        print("No updates found from Scopus.")
        return existing_data

    existing_map = {}
    for p in existing_data:
        key = p.get("eid") or p.get("scopus_id") or p.get("doi") or p.get("title", "").strip().lower()
        if key:
            existing_map[key] = p

    added = 0
    updated = 0
    for item in new_entries:
        key = item.get("eid") or item.get("scopus_id") or item.get("doi") or item.get("title", "").strip().lower()
        if key in existing_map:
            # Update citations & metrics
            existing_map[key]["citations"] = max(existing_map[key].get("citations", 0), item.get("citations", 0))
            if item.get("citescore"):
                existing_map[key]["citescore"] = item.get("citescore")
            if item.get("quartile"):
                existing_map[key]["quartile"] = item.get("quartile")
            updated += 1
        else:
            existing_map[key] = item
            added += 1

    merged = list(existing_map.values())
    merged.sort(key=lambda x: x.get("publication_date", ""), reverse=True)
    print(f"Sync complete: {added} new publications added, {updated} updated. Total: {len(merged)} records.")
    return merged


def save_and_distribute(publications: list):
    payload = {
        "last_synced": datetime.datetime.now().isoformat(),
        "affiliation_id": AFFIL_ID,
        "institution": "COEP Technological University, Pune",
        "sync_frequency_minutes": 60,
        "total_records": len(publications),
        "publications": publications
    }
    
    base_dir = Path(__file__).resolve().parent
    
    for rel_path in CACHE_PATHS:
        target = base_dir / rel_path
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            with open(target, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2, ensure_ascii=False)
            print(f"Saved cache to: {target.resolve()} ({len(publications)} records)")
        except Exception as e:
            print(f"Could not save to {target}: {e}")


def main():
    parser = argparse.ArgumentParser(description="COEP Scopus Sync Utility")
    parser.add_argument("--full", action="store_true", help="Perform complete historical sync (all 4,633+ records)")
    parser.add_argument("--incremental", action="store_true", help="Perform 60-min incremental sync")
    args = parser.parse_args()

    if args.full:
        pubs = fetch_full_scopus_archive()
    else:
        # Default to incremental if cache exists, otherwise full
        cache_path = Path("data/coep_scopus_cache.json")
        if cache_path.exists() and not args.incremental:
            pubs = fetch_incremental_sync()
        else:
            pubs = fetch_full_scopus_archive()

    if pubs:
        save_and_distribute(pubs)
        print(f"Successfully synchronized {len(pubs)} Scopus records for COEP Technological University!")
    else:
        print("Sync completed with 0 records or error.")


if __name__ == "__main__":
    main()
