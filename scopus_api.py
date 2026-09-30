# COEP Scopus Live Dashboard - Production Release
"""
Scopus API Client Module for COEP Research Dashboard.
Handles Elsevier Scopus Search API querying, pagination, rate limiting,
cache management, and parsing into standardized publication records.
"""

import os
import json
import time
import datetime
import requests
from typing import Optional, Callable, Dict, Any, List

# Journal Quartile and CiteScore reference mapping table for common journals
JOURNAL_METRICS_DB = {
    "ieee transactions on industrial informatics": {"citescore": 21.4, "sjr": 3.82, "quartile": "Q1"},
    "applied energy": {"citescore": 20.8, "sjr": 3.25, "quartile": "Q1"},
    "journal of cleaner production": {"citescore": 18.5, "sjr": 2.15, "quartile": "Q1"},
    "ieee internet of things journal": {"citescore": 19.2, "sjr": 2.94, "quartile": "Q1"},
    "materials science and engineering: a": {"citescore": 11.2, "sjr": 1.76, "quartile": "Q1"},
    "materials science and engineering a": {"citescore": 11.2, "sjr": 1.76, "quartile": "Q1"},
    "ieee transactions on power systems": {"citescore": 16.3, "sjr": 3.10, "quartile": "Q1"},
    "sensors and actuators b: chemical": {"citescore": 14.7, "sjr": 2.08, "quartile": "Q1"},
    "sensors and actuators b chemical": {"citescore": 14.7, "sjr": 2.08, "quartile": "Q1"},
    "expert systems with applications": {"citescore": 15.6, "sjr": 2.21, "quartile": "Q1"},
    "renewable and sustainable energy reviews": {"citescore": 30.5, "sjr": 4.12, "quartile": "Q1"},
    "composite structures": {"citescore": 12.8, "sjr": 1.85, "quartile": "Q1"},
    "ieee transactions on smart grid": {"citescore": 18.1, "sjr": 3.45, "quartile": "Q1"},
    "chemical engineering journal": {"citescore": 22.1, "sjr": 3.01, "quartile": "Q1"},
    "ieee access": {"citescore": 7.4, "sjr": 0.92, "quartile": "Q2"},
    "journal of materials engineering and performance": {"citescore": 4.5, "sjr": 0.65, "quartile": "Q2"},
    "international journal of thermal sciences": {"citescore": 8.1, "sjr": 1.18, "quartile": "Q2"},
    "iet control theory & applications": {"citescore": 5.9, "sjr": 0.88, "quartile": "Q2"},
    "iet control theory and applications": {"citescore": 5.9, "sjr": 0.88, "quartile": "Q2"},
    "computers & electrical engineering": {"citescore": 7.8, "sjr": 0.95, "quartile": "Q2"},
    "measurement": {"citescore": 9.3, "sjr": 1.22, "quartile": "Q2"},
    "journal of building engineering": {"citescore": 9.8, "sjr": 1.34, "quartile": "Q2"},
    "surface and coatings technology": {"citescore": 8.9, "sjr": 1.15, "quartile": "Q2"},
    "journal of electronic materials": {"citescore": 3.8, "sjr": 0.48, "quartile": "Q3"},
    "arabian journal for science and engineering": {"citescore": 4.2, "sjr": 0.54, "quartile": "Q3"},
    "materials today: proceedings": {"citescore": 3.4, "sjr": 0.38, "quartile": "Q3"},
    "advances in manufacturing": {"citescore": 4.8, "sjr": 0.61, "quartile": "Q3"},
    "international journal of civil engineering": {"citescore": 3.6, "sjr": 0.45, "quartile": "Q3"},
    "indian journal of engineering & materials sciences": {"citescore": 1.5, "sjr": 0.22, "quartile": "Q4"},
    "journal of the institution of engineers (india): series b": {"citescore": 2.1, "sjr": 0.29, "quartile": "Q4"}
}

INDUSTRY_KEYWORDS = [
    "ltd", "limited", "inc", "corp", "corporation", "gmbh", "technologies",
    "motors", "tata", "siemens", "larsen", "toubro", "cummins", "bajaj",
    "john deere", "thermax", "kirloskar", "forge", "abb", "honeywell",
    "bosch", "boeing", "airbus", "google", "microsoft", "intel", "ibm"
]

DEPARTMENT_KEYWORDS = {
    "Computer Engineering & IT": [
        "computer", "computing", "software", "artificial intelligence", "machine learning",
        "deep learning", "iot", "cloud", "cyber", "data science", "algorithm", "blockchain",
        "vision", "nlp", "neural"
    ],
    "Electronics & Telecommunication (E&TC)": [
        "telecommunication", "antenna", "signal processing", "wireless", "communication",
        "vlsi", "rf", "radar", "5g", "6g", "mimo", "optical communication", "circuit"
    ],
    "Mechanical Engineering": [
        "mechanical", "thermal", "fluid", "combustion", "engine", "finite element",
        "aerodynamics", "cfd", "heat transfer", "turbomachinery", "additive manufacturing"
    ],
    "Electrical Engineering": [
        "electrical", "power system", "smart grid", "inverter", "motor", "traction",
        "converter", "voltage", "renewable energy", "high voltage", "microgrid"
    ],
    "Civil & Environmental Engineering": [
        "civil", "concrete", "structural", "geotechnical", "hydrology", "flood",
        "seismic", "pavement", "waste water", "environmental", "transportation"
    ],
    "Metallurgical & Materials Engineering": [
        "metallurgy", "metallurgical", "alloy", "corrosion", "microstructure", "sintering",
        "composite", "titanium", "coating", "tribology", "wear", "crystal"
    ],
    "Instrumentation & Control Engineering": [
        "instrumentation", "control system", "sensor", "mems", "sliding mode", "actuator",
        "observer", "process control", "robotics", "automation"
    ],
    "Manufacturing & Industrial Engineering": [
        "manufacturing", "machining", "scheduling", "supply chain", "industry 4.0",
        "laser powder", "welding", "lean", "optimization"
    ],
    "Applied Sciences & Mathematics": [
        "mathematics", "differential equations", "numerical analysis", "stochastic",
        "applied mathematics"
    ],
    "Physics & Applied Materials": [
        "physics", "perovskite", "solar cell", "graphene", "semiconductor", "quantum"
    ],
    "Chemistry & Chemical Sciences": [
        "chemistry", "photocatalyst", "nanoparticles", "synthesis", "polymer", "catalysis"
    ]
}


class ScopusAPIClient:
    """Client for interacting with Elsevier Scopus API."""

    BASE_URL = "https://api.elsevier.com/content/search/scopus"
    AFFIL_SEARCH_URL = "https://api.elsevier.com/content/search/affiliation"
    
    def __init__(self, api_key: str = "", inst_token: Optional[str] = None):
        self.api_key = api_key.strip() if api_key else ""
        self.inst_token = inst_token.strip() if inst_token else None

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/json"
        }
        if self.api_key:
            headers["X-ELS-APIKey"] = self.api_key
        if self.inst_token:
            headers["X-ELS-Insttoken"] = self.inst_token
        return headers

    def test_connection(self) -> tuple[bool, str]:
        """Tests if the provided Scopus API key is valid and responsive."""
        if not self.api_key:
            return False, "Scopus API Key is empty."
        
        try:
            params = {
                "query": 'AFFIL("COEP Pune")',
                "count": 1,
                "view": "STANDARD"
            }
            resp = requests.get(
                self.BASE_URL,
                headers=self._get_headers(),
                params=params,
                timeout=12
            )
            
            if resp.status_code == 200:
                data = resp.json()
                total_results = data.get("search-results", {}).get("opensearch:totalResults", "0")
                return True, f"Connection successful! Scopus API returned {total_results} matching records for COEP."
            elif resp.status_code == 401:
                return False, "Authentication Error (401): Invalid API Key or Unauthorized."
            elif resp.status_code == 429:
                return False, "Quota Exceeded (429): Scopus API rate limit reached."
            else:
                return False, f"Scopus API error HTTP {resp.status_code}: {resp.text[:200]}"
        except requests.exceptions.RequestException as e:
            return False, f"Network connection error: {str(e)}"

    def fetch_coep_publications(
        self,
        query: str = "AF-ID(60069506)",
        max_results: int = 500,
        progress_callback: Optional[Callable[[int, int, str], None]] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetches COEP publications from Scopus Search API with pagination and rate control.
        """
        if not self.api_key:
            raise ValueError("Scopus API Key is required to fetch live data.")

        all_publications = []
        start = 0
        count_per_req = 25  # standard page limit for Scopus API
        total_available = 0
        session = requests.Session()
        session.headers.update(self._get_headers())

        while len(all_publications) < max_results:
            params = {
                "query": query,
                "count": count_per_req,
                "start": start,
                "view": "STANDARD",
                "sort": "-coverDate"
            }

            resp = None
            for attempt in range(4):
                try:
                    resp = session.get(
                        self.BASE_URL,
                        params=params,
                        timeout=25
                    )
                    if resp.status_code == 200:
                        break
                    elif resp.status_code == 429:
                        time.sleep(2.5 * (attempt + 1))
                    else:
                        time.sleep(1.0)
                except requests.exceptions.RequestException:
                    time.sleep(2.0 * (attempt + 1))

            if not resp or resp.status_code != 200:
                break

            data = resp.json()
            search_results = data.get("search-results", {})
            total_available = int(search_results.get("opensearch:totalResults", "0"))
            entries = search_results.get("entry", [])

            if not entries:
                break

            for entry in entries:
                if "error" in entry:
                    continue
                parsed = self.parse_scopus_entry(entry)
                all_publications.append(parsed)

            if progress_callback:
                progress_callback(
                    len(all_publications),
                    min(total_available, max_results),
                    f"Fetched {len(all_publications)} of {min(total_available, max_results)} publications from Scopus..."
                )

            start += count_per_req
            if start >= total_available or len(all_publications) >= max_results:
                break

            time.sleep(0.1)  # Respectful pacing between queries

        return all_publications

    def parse_scopus_entry(self, entry: Dict[str, Any]) -> Dict[str, Any]:
        """Normalizes a raw Scopus API JSON item into a rich standardized dictionary."""
        eid = entry.get("eid", "")
        identifier = entry.get("dc:identifier", "")
        scopus_id = identifier.replace("SCOPUS_ID:", "") if identifier else entry.get("scopus_id", "")
        
        title = str(entry.get("dc:title") or "Untitled Publication").strip()
        
        # Authors parsing
        authors = []
        creator = entry.get("dc:creator")
        if creator:
            authors.append(str(creator).strip())
        
        # Check author array if present in COMPLETE view
        author_list = entry.get("author", [])
        if isinstance(author_list, list):
            for a in author_list:
                if isinstance(a, dict):
                    auth_name = a.get("authname") or f"{a.get('given-name', '')} {a.get('surname', '')}".strip()
                    if auth_name and auth_name not in authors:
                        authors.append(str(auth_name).strip())
        elif isinstance(author_list, dict):
            auth_name = author_list.get("authname")
            if auth_name and auth_name not in authors:
                authors.append(str(auth_name).strip())

        if not authors:
            authors = ["COEP Researcher(s)"]

        authors_str = ", ".join(authors[:8]) + (" et al." if len(authors) > 8 else "")
        primary_author = authors[0]

        # Journal / Source
        journal = str(entry.get("prism:publicationName") or "Academic Journal / Proceedings").strip()
        issn = str(entry.get("prism:issn") or entry.get("prism:eIssn") or "").strip()
        publisher = str(entry.get("prism:publisher") or "Academic Publisher").strip()
        
        # Publication Date & Year
        cover_date_str = str(entry.get("prism:coverDate") or "2025-01-01").strip()
        try:
            pub_date = datetime.datetime.strptime(cover_date_str[:10], "%Y-%m-%d").date()
            year = pub_date.year
            month_name = pub_date.strftime("%B")
            month_num = pub_date.month
        except Exception:
            # Fallback for year extraction if format is YYYY or non-standard
            try:
                year = int(cover_date_str[:4])
            except Exception:
                year = 2025
            month_name = "January"
            month_num = 1
            pub_date = datetime.date(year, 1, 1)

        # DOI & Links
        doi = str(entry.get("prism:doi") or "").strip()
        doi_url = f"https://doi.org/{doi}" if doi else ""
        scopus_url = ""
        link_list = entry.get("link", [])
        if isinstance(link_list, list):
            for link_obj in link_list:
                if isinstance(link_obj, dict) and link_obj.get("@ref") == "scopus":
                    scopus_url = str(link_obj.get("@href") or "").strip()
                    break
        if not scopus_url and eid:
            scopus_url = f"https://www.scopus.com/record/display.uri?eid={eid}&origin=resultslist"

        # Citations
        try:
            citations = int(entry.get("citedby-count", 0))
        except (ValueError, TypeError):
            citations = 0

        # Metrics & Quartile lookup
        j_key = journal.lower().strip()
        metrics = JOURNAL_METRICS_DB.get(j_key)
        if metrics:
            citescore = metrics["citescore"]
            sjr = metrics["sjr"]
            quartile = metrics["quartile"]
        else:
            # Heuristic estimation based on journal keywords if not in lookup
            if any(k in j_key for k in ["lecture notes", "aip conference", "advances in intelligent systems", "communications in computer", "journal of physics: conference", "materials science forum", "key engineering", "applied mechanics and materials", "iop conference"]):
                quartile, citescore, sjr = "Q4", 1.2, 0.22
            elif any(k in j_key for k in ["ieee transactions", "nature", "science", "applied energy", "chemical engineering journal", "journal of cleaner production", "composite structures", "expert systems with applications", "ieee internet of things"]):
                quartile, citescore, sjr = "Q1", 16.5, 2.85
            elif any(k in j_key for k in ["ieee", "elsevier", "springer", "wiley", "applied", "journal of", "measurement", "computers & electrical", "surface and coatings"]):
                quartile, citescore, sjr = "Q2", 7.2, 0.98
            elif any(k in j_key for k in ["proceedings", "conference", "letters", "advances", "sae technical", "materials today"]):
                quartile, citescore, sjr = "Q3", 3.8, 0.45
            else:
                quartile, citescore, sjr = "Q3" if citations >= 3 else "Q4", 2.5, 0.30

        is_top_10 = citations >= 25 or (quartile == "Q1" and citescore >= 15.0)

        # Affiliations, International and Industry collaboration detection
        affiliations = entry.get("affiliation", [])
        if isinstance(affiliations, dict):
            affiliations = [affiliations]
        elif not isinstance(affiliations, list):
            affiliations = []
            
        countries = ["India"]
        foreign_countries = []
        institutions = ["COEP Technological University, Pune"]
        external_institutions = []
        is_industry = False

        for aff in affiliations:
            if isinstance(aff, dict):
                c_name = str(aff.get("affiliation-country") or "").strip()
                aff_name = str(aff.get("affilname") or "").strip()
                
                if c_name and c_name.lower() not in ["india", "in"]:
                    if c_name not in countries:
                        countries.append(c_name)
                    if c_name not in foreign_countries:
                        foreign_countries.append(c_name)
                
                if aff_name:
                    if aff_name not in institutions:
                        institutions.append(aff_name)
                    if "coep" not in aff_name.lower() and "college of engineering, pune" not in aff_name.lower():
                        if aff_name not in external_institutions:
                            external_institutions.append(aff_name)
                    
                    # Industry check
                    aff_lower = aff_name.lower()
                    if any(ik in aff_lower for ik in INDUSTRY_KEYWORDS):
                        is_industry = True

        is_intl = len(foreign_countries) > 0
        
        if is_intl:
            collab_type = "International"
        elif is_industry:
            collab_type = "Industry"
        elif len(external_institutions) > 0:
            collab_type = "National"
        else:
            collab_type = "Institutional"

        # Department classification heuristic based on title & keywords
        assigned_dept = "General Engineering"
        combined_text = f"{title.lower()} {journal.lower()}"
        for dept_name, keywords in DEPARTMENT_KEYWORDS.items():
            if any(kw in combined_text for kw in keywords):
                assigned_dept = dept_name
                break
        
        if assigned_dept == "General Engineering":
            if any(k in combined_text for k in ["smart", "network", "node", "packet", "security", "web"]):
                assigned_dept = "Computer Engineering & IT"
            elif any(k in combined_text for k in ["signal", "channel", "frequency", "band"]):
                assigned_dept = "Electronics & Telecommunication (E&TC)"
            elif any(k in combined_text for k in ["power", "energy", "grid"]):
                assigned_dept = "Electrical Engineering"
            elif any(k in combined_text for k in ["material", "structure", "crack", "fracture"]):
                assigned_dept = "Metallurgical & Materials Engineering"
            else:
                assigned_dept = "Mechanical Engineering"

        doc_type = entry.get("subtypeDescription", "Article")
        open_access = entry.get("openaccessFlag", False) in [True, "1", "true", 1]
        abstract = entry.get("dc:description", f"Scopus indexed publication from COEP Technological University on {title}.")

        return {
            "id": scopus_id or eid or str(int(time.time())),
            "eid": eid,
            "scopus_id": scopus_id,
            "title": title,
            "authors": authors,
            "authors_str": authors_str,
            "coep_authors": [primary_author],
            "primary_author": primary_author,
            "department": assigned_dept,
            "journal": journal,
            "issn": issn,
            "publisher": publisher,
            "publication_date": pub_date.strftime("%Y-%m-%d"),
            "year": year,
            "month": month_name,
            "month_num": month_num,
            "doi": doi,
            "doi_url": doi_url,
            "scopus_url": scopus_url,
            "citations": citations,
            "citescore": citescore,
            "sjr": sjr,
            "quartile": quartile,
            "is_top_10_percent": is_top_10,
            "collaboration_type": collab_type,
            "is_international_collab": is_intl,
            "is_industry_collab": is_industry,
            "collaborating_countries": countries,
            "foreign_countries": foreign_countries,
            "collaborating_institutions": institutions,
            "external_institutions": external_institutions,
            "document_type": doc_type,
            "open_access": open_access,
            "abstract": abstract
        }


def save_cache(data: List[Dict[str, Any]], filepath: str = "data/coep_scopus_cache.json"):
    """Saves publications dataset to a local JSON cache file."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    payload = {
        "last_synced": datetime.datetime.now().isoformat(),
        "total_records": len(data),
        "publications": data
    }
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)


def load_cache(filepath: str = "data/coep_scopus_cache.json") -> tuple[List[Dict[str, Any]], Optional[str]]:
    """Loads publications dataset from the local JSON cache file."""
    if not os.path.exists(filepath):
        return [], None
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            payload = json.load(f)
            return payload.get("publications", []), payload.get("last_synced")
    except Exception:
        return [], None


def incremental_auto_sync(
    api_key: str,
    interval_hours: float = 1.0,
    max_incremental_records: int = 100,
    cache_path: str = "data/coep_scopus_cache.json"
) -> tuple[List[Dict[str, Any]], bool, str]:
    """
    Performs a lightweight incremental synchronization if more than interval_hours
    have elapsed since the last sync. Automatically merges latest papers with existing cache.
    """
    cached_data, last_synced_str = load_cache(cache_path)
    
    if not api_key:
        return cached_data, False, "No API key configured for auto-sync."
        
    should_sync = False
    if not last_synced_str or not cached_data:
        should_sync = True
    else:
        try:
            last_synced_dt = datetime.datetime.fromisoformat(last_synced_str)
            elapsed_seconds = (datetime.datetime.now() - last_synced_dt).total_seconds()
            if elapsed_seconds >= interval_hours * 3600:
                should_sync = True
        except Exception:
            should_sync = True

    if not should_sync:
        return cached_data, False, "Cache is current (within 1-hour interval)."

    try:
        client = ScopusAPIClient(api_key=api_key)
        current_year = datetime.datetime.now().year
        query = f"(AF-ID(60069506)) AND PUBYEAR >= {current_year - 1}"
        latest_entries = client.fetch_coep_publications(query=query, max_results=max_incremental_records)
        
        if not latest_entries:
            return cached_data, False, "No new entries retrieved from Scopus."

        existing_map = {}
        for p in cached_data:
            key = p.get("eid") or p.get("scopus_id") or p.get("doi") or p.get("title", "").strip().lower()
            if key:
                existing_map[key] = p

        added_count = 0
        updated_count = 0
        for item in latest_entries:
            key = item.get("eid") or item.get("scopus_id") or item.get("doi") or item.get("title", "").strip().lower()
            if key in existing_map:
                existing_map[key].update({
                    "citations": max(existing_map[key].get("citations", 0), item.get("citations", 0)),
                    "citescore": item.get("citescore", existing_map[key].get("citescore")),
                    "sjr": item.get("sjr", existing_map[key].get("sjr")),
                    "quartile": item.get("quartile", existing_map[key].get("quartile")),
                })
                updated_count += 1
            else:
                existing_map[key] = item
                added_count += 1

        merged_list = list(existing_map.values())
        save_cache(merged_list, cache_path)
        return merged_list, True, f"Auto-synced: {added_count} new paper(s) added, {updated_count} updated."
    except Exception as ex:
        return cached_data, False, f"Auto-sync skipped: {str(ex)}"
