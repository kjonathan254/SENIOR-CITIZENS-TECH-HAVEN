# Contributing to Senior Citizens Tech Haven

Thank you for considering a contribution! SCTH serves older adults navigating
digital life, so clarity and accessibility come first in everything we merge.

## Before you open a pull request

1. **Run the checks locally** — CI enforces all of these on every push:

   ```bash
   npm ci
   npm test                          # unit tests (rate limiting, data handling)
   python3 scripts/ci/check_csp.py   # every inline script must be hash-allowlisted
   python3 scripts/ci/check_site.py  # links, images, schema, canonical, sitemap
   python3 scripts/ci/check_secrets.py
   ```

   All five must pass. A red X in CI means the PR will not be merged.

2. **Keep pages self-contained.** Pages are plain HTML published as-is by
   Netlify; avoid adding build steps or frameworks without prior discussion.

3. **Write for seniors.** Short sentences, large readable text, plain language.
   If a guide needs jargon, explain it in the same breath.

4. **Accessibility is non-negotiable.** Every interactive element needs a
   keyboard path and a visible focus state. Images need alt text.

## CSP rules (the easy way to get blocked)

JavaScript is governed by a strict hash-based Content Security Policy.
`onclick=""` attributes, `javascript:` URLs, and dynamically generated inline
handlers will be rejected by `check_csp.py`. Use `data-*` attributes plus
event delegation on an existing allowlisted script block instead.

If you edit or add inline scripts, regenerate the CSP hashes:

```bash
python3 scripts/ci/rebuild_csp.py
```

then commit the updated `netlify.toml` together with your HTML changes.

## Content additions

New articles should ship with:

- A `<link rel="canonical">` and Article JSON-LD (see any existing article page)
- An entry in `sitemap.xml` (run `python3 scripts/gen_sitemap.py`)
- Favicon block copied from an existing page
- Claims backed by sources; no personal data in screenshots

## Reporting issues

Use the issue templates. For security vulnerabilities, please follow
[SECURITY.md](.github/SECURITY.md) rather than opening a public issue.
