#!/usr/bin/env python3
"""Secret scan: fail if credential-looking strings appear in tracked source files.
Ignores package-lock.json, image/font binaries, and known public IDs (GA/AdSense pub ids).
"""
import re
import subprocess
import sys

# patterns that indicate real secrets if found in source
PATTERNS = [
    (r"ghp_[A-Za-z0-9]{30,}", "GitHub PAT"),
    (r"gho_[A-Za-z0-9]{30,}", "GitHub OAuth token"),
    (r"github_pat_[A-Za-z0-9_]{20,}", "GitHub fine-grained PAT"),
    (r"sk-[A-Za-z0-9]{20,}", "Generic sk- API key (OpenAI/Groq style)"),
    (r"gsk_[A-Za-z0-9]{20,}", "Groq API key"),
    (r"AKIA[0-9A-Z]{16}", "AWS access key"),
    (r"AIza[0-9A-Za-z_-]{30,}", "Google API key"),
    (r"xox[baprs]-[A-Za-z0-9-]{10,}", "Slack token"),
    (r"eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.", "JWT"),
    (r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----", "Private key block"),
]
# allowed: public identifiers that look like keys but are safe
ALLOW = [
    r"ca-pub-\d+",           # AdSense publisher id (public)
    r"\bG-[A-Z0-9]{8,12}\b", # GA4 measurement id (public)
]

tracked = subprocess.run(["git", "ls-files"], capture_output=True, text=True, cwd=__import__("pathlib").Path(__file__).resolve().parents[2]).stdout.splitlines()
SKIP_EXT = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".pdf", ".docx", ".woff", ".woff2")
hits = []
for f in tracked:
    if f in ("package-lock.json",) or f.lower().endswith(SKIP_EXT):
        continue
    try:
        text = open(f, encoding="utf-8", errors="replace").read()
    except (FileNotFoundError, IsADirectoryError):
        continue
    for pat, label in PATTERNS:
        for m in re.finditer(pat, text):
            ctx_allow = any(re.search(a, text[max(0, m.start()-60):m.end()+60]) for a in ALLOW)
            if not ctx_allow:
                hits.append(f"{f}: {label} -> {m.group(0)[:14]}...")

if hits:
    print("SECRET SCAN FAIL:")
    for h in hits:
        print("  ✗", h)
    sys.exit(1)
print(f"SECRET SCAN OK ({len(tracked)} tracked files scanned)")
