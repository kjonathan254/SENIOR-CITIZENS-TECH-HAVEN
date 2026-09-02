#!/usr/bin/env python3
"""SCTH site integrity checks (run in CI + locally before deploys).

Checks:
1. Internal links (href/src) resolve to real files or in-page anchors
2. Image references (img src, og:image, icons) resolve
3. JSON-LD blocks are valid JSON
4. Canonical tags present on all publishable pages
5. Sitemap covers all publishable pages (and excludes noindex/utility pages)
6. No leftover dynamic inline handlers or javascript: hrefs (CSP safety)

Exit code 1 on any failure. Zero dependencies (stdlib only).
"""
import json
import re
import sys
import tomllib
from pathlib import Path
from urllib.parse import urlparse, unquote

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts" / "ci"))

PUBLISH_EXCLUDE = {"404.html", "offline.html", "scth-content-generator.html"}
UTIL_PAGES = PUBLISH_EXCLUDE

link_re = re.compile(r'(?:href|src)\s*=\s*"(#[^"]*|/[^"]*|[^":>]+)"', re.I)
img_re = re.compile(r'<img[^>]+src\s*=\s*"([^"]+)"', re.I)
ogimage_re = re.compile(r'property\s*=\s*"og:image"\s*content\s*=\s*"([^"]+)"', re.I)
canonical_re = re.compile(r'<link\s+rel="canonical"\s+href="([^"]+)"', re.I)
jsonld_re = re.compile(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', re.S | re.I)
dyn_handler_re = re.compile(r"\son[a-z]+\s*=\s*(\"[^\"]*\$\{[^\"]*\"|'[^']*\$\{[^']*)")
js_href_re = re.compile(r"href\s*=\s*[\"']javascript:", re.I)

def resolve(ref: str, page: Path):
    """Return filesystem Path for a site-relative ref, or None if external/anchor."""
    ref = ref.split("#")[0]
    if not ref or ref.startswith(("http://", "https://", "mailto:", "tel:", "data:")):
        return None
    path = unquote(urlparse(ref).path)
    base = REPO / path.lstrip("/") if ref.startswith("/") else (page.parent / path)
    return base

failures, warnings = [], []

pages = sorted(REPO.glob("*.html"))
anchors_by_page = {}
for page in pages:
    raw = page.read_text(encoding="utf-8", errors="replace")
    anchors_by_page[page.name] = set(re.findall(r'id\s*=\s*"([^"]+)"', raw))

    for m in js_href_re.finditer(raw):
        failures.append(f"{page.name}: javascript: href found (breaks hash-based CSP)")
    for m in dyn_handler_re.finditer(raw):
        failures.append(f"{page.name}: dynamic inline handler {m.group(1)[:50]} (breaks hash-based CSP)")

    # JSON-LD validity
    for i, m in enumerate(jsonld_re.finditer(raw), 1):
        try:
            json.loads(m.group(1))
        except json.JSONDecodeError as e:
            failures.append(f"{page.name}: JSON-LD block {i} invalid: {e}")

    # canonical on publishable pages
    if page.name not in UTIL_PAGES and canonical_re.search(raw) is None:
        failures.append(f"{page.name}: missing <link rel=canonical>")

    # links & images
    for m in link_re.finditer(raw):
        ref = m.group(1)
        if ref.startswith("#"):
            if ref != "#" and ref.lstrip("#") not in anchors_by_page[page.name]:
                failures.append(f"{page.name}: dead in-page anchor {ref}")
            continue
        target = resolve(ref, page)
        if target is None:
            continue
        if not target.exists():
            failures.append(f"{page.name}: broken link -> {ref}")

    for m in img_re.finditer(raw):
        target = resolve(m.group(1), page)
        if target is not None and not target.exists():
            failures.append(f"{page.name}: broken image -> {m.group(1)}")
    for m in ogimage_re.finditer(raw):
        target = resolve(m.group(1), page)
        if target is not None and not target.exists():
            failures.append(f"{page.name}: broken og:image -> {m.group(1)}")

# sitemap coverage
sitemap = REPO / "sitemap.xml"
raw_locs = re.findall(r"<loc>(.*?)</loc>", sitemap.read_text())
sm_names = set()
for loc in raw_locs:
    path = urlparse(loc).path.strip("/")
    name = path.rsplit("/", 1)[-1] if path else "index.html"
    if not name:
        name = "index.html"
    sm_names.add(name)
expected = {p.name for p in pages if p.name not in UTIL_PAGES}
missing = expected - sm_names
extra = sm_names - expected
if missing:
    failures.append(f"sitemap.xml missing pages: {sorted(missing)}")
if extra:
    failures.append(f"sitemap.xml has non-existent pages: {sorted(extra)}")

print(f"Checked {len(pages)} pages")
print(f"Sitemap: {len(sm_names)} URLs | Expected publishable: {len(expected)}")
if failures:
    print(f"\nFAIL ({len(failures)}):")
    for f in failures:
        print("  ✗", f)
    sys.exit(1)
for w in warnings:
    print("  ⚠", w)
print("OK: links, images, JSON-LD, canonical, sitemap, CSP-safety all pass")
