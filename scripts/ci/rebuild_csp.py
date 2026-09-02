#!/usr/bin/env python3
"""Regenerate the hash-based CSP in netlify.toml after any HTML change.
Run this BEFORE committing whenever an inline <script> or on*= handler changed.

Usage: python3 scripts/ci/rebuild_csp.py
"""
import base64
import hashlib
import html
import re
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

body_hashes, handler_hashes, problems = set(), set(), []
for page in sorted(REPO.glob("*.html")):
    raw = page.read_text(encoding="utf-8", errors="replace")
    if js_href_re.search(raw):
        problems.append(f"{page.name}: javascript: href")
    for m in dyn_re.finditer(raw):
        problems.append(f"{page.name}: dynamic handler {m.group(1)[:60]} (use data-attrs + delegation)")
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

if problems:
    print("FIX FIRST — hash-unfixable patterns found:")
    for p in problems:
        print("  ✗", p)
    raise SystemExit(1)

all_hashes = sorted(body_hashes | handler_hashes)
for h in all_hashes:
    assert re.fullmatch(r"[A-Za-z0-9+/]{43}=", h), f"not base64 sha256: {h}"
hash_tokens = " ".join(f"'sha256-{h}'" for h in all_hashes)
csp = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-hashes' " + hash_tokens + " "
    "https://www.googletagmanager.com https://www.google-analytics.com "
    "https://*.googlesyndication.com https://googleads.g.doubleclick.net "
    "https://www.google.com https://ssl.google-analytics.com; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com; "
    "img-src 'self' data: https:; "
    "connect-src 'self' https://www.google-analytics.com "
    "https://*.google-analytics.com https://*.analytics.google.com "
    "https://*.googletagmanager.com https://api.groq.com; "
    "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com; "
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
)

toml = TOML.read_text()
updated = re.sub(r'    Content-Security-Policy = ".*"', f'    Content-Security-Policy = "{csp}"', toml, flags=re.S)
assert updated != toml, "CSP line not found in netlify.toml"
TOML.write_text(updated)
tomllib.loads(TOML.read_text())  # validate TOML still parses
print(f"CSP rebuilt: {len(all_hashes)} hashes ({len(body_hashes)} script bodies, {len(handler_hashes)} handlers), {len(csp)} chars")
print("Next: run scripts/ci/check_csp.py to verify")
