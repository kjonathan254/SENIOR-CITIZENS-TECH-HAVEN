#!/usr/bin/env python3
"""CSP coverage check: every inline <script> body and inline event handler in the
HTML must have a matching sha256 hash in the netlify.toml Content-Security-Policy.
Guards against future HTML edits silently breaking site JS under hash-based CSP.

Also fails if:
- 'unsafe-inline' appears in script-src
- dynamic (${...}) inline handlers exist
- javascript: hrefs exist
"""
import base64
import hashlib
import html
import re
import sys
import tomllib
from pathlib import Path


def csp_hash(data: bytes) -> str:
    """CSP sha256 token digest: base64-encoded (NOT hex)."""
    return base64.b64encode(hashlib.sha256(data).digest()).decode("ascii")

REPO = Path(__file__).resolve().parents[2]
TOML = REPO / "netlify.toml"

script_re = re.compile(r"<script(\b[^>]*)>(.*?)</script>", re.S | re.I)
src_attr_re = re.compile(r"\bsrc\s*=")
type_re = re.compile(r"\btype\s*=\s*[\"']([^\"']*)[\"']", re.I)
handler_re = re.compile(r"\son[a-z]+\s*=\s*\"([^\"]*)\"|\son[a-z]+\s*=\s*'([^']*)'", re.I)
dyn_re = re.compile(r"\son[a-z]+\s*=\s*(\"[^\"]*\$\{[^\"]*\"|'[^']*\$\{[^']*)")
js_href_re = re.compile(r"href\s*=\s*[\"']javascript:", re.I)

data = tomllib.loads(TOML.read_text())
csp = None
for rule in data.get("headers", []):
    if rule["for"] == "/*" and "Content-Security-Policy" in rule.get("values", {}):
        csp = rule["values"]["Content-Security-Policy"]
if not csp:
    print("FAIL: no CSP header found for /* in netlify.toml")
    sys.exit(1)

csp_hashes = set(re.findall(r"sha256-([A-Za-z0-9+/]{43}=)", csp))
malformed = re.findall(r"sha256-([A-Za-z0-9+/=]+)", csp)
bad = [h for h in malformed if not re.fullmatch(r"[A-Za-z0-9+/]{43}=", h)]
if bad:
    print(f"FAIL: {len(bad)} malformed sha256 tokens in CSP (must be 43-char base64 + '='); "
          f"e.g. {bad[0][:20]}... — hex digests are NOT valid CSP hashes")
    sys.exit(1)
script_part = csp.split(";")[1] if ";" in csp else ""
if "'unsafe-inline'" in script_part:
    print("FAIL: 'unsafe-inline' present in script-src")
    sys.exit(1)
if "'unsafe-hashes'" not in script_part:
    print("FAIL: 'unsafe-hashes' missing from script-src (inline handlers would break)")
    sys.exit(1)

body_hashes, handler_hashes = set(), set()
problems = []
for page in sorted(REPO.glob("*.html")):
    raw = page.read_text(encoding="utf-8", errors="replace")
    if js_href_re.search(raw):
        problems.append(f"{page.name}: javascript: href")
    for m in dyn_re.finditer(raw):
        problems.append(f"{page.name}: dynamic handler {m.group(1)[:50]}")
    for m in script_re.finditer(raw):
        attrs, body = m.group(1), m.group(2)
        if src_attr_re.search(attrs):
            continue
        t = type_re.search(attrs)
        tval = t.group(1).lower() if t else ""
        if "ld+json" in tval or (tval and tval not in ("text/javascript", "module", "application/javascript")):
            continue
        body_hashes.add(csp_hash(body.encode()))
    for m in handler_re.finditer(raw):
        val = html.unescape(m.group(1) if m.group(1) is not None else m.group(2))
        handler_hashes.add(csp_hash(val.encode()))

missing = (body_hashes | handler_hashes) - csp_hashes
stale = csp_hashes - (body_hashes | handler_hashes)

for p in problems:
    print("FAIL:", p)
for h in sorted(missing):
    print(f"FAIL: hash missing from CSP: sha256-{h}")
for h in sorted(stale):
    print(f"NOTE: stale hash in CSP (harmless, safe to prune): sha256-{h[:16]}...")

if problems or missing:
    print("\nRESULT: FAIL — run scripts/ci/rebuild_csp.py to regenerate")
    sys.exit(1)
print(f"RESULT: OK — {len(body_hashes)} script bodies + {len(handler_hashes)} handler bodies all covered by CSP ({len(csp_hashes)} hashes listed)")
