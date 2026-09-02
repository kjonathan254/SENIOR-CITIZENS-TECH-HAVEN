# Security Policy

## Supported

The live site at https://seniorcitizenstechhaven.netlify.app is actively
maintained. Security fixes are prioritised for anything reachable there,
including the Elsah AI function under `/netlify/functions/`.

## Reporting a vulnerability

Please report vulnerabilities privately via GitHub's
**Security > Report a vulnerability** (private vulnerability reporting), or
through the contact details published on the website.

Please include:

- A description of the issue and its impact
- Steps or a URL to reproduce
- Any proof-of-concept details

We aim to acknowledge reports within **72 hours** and will keep you informed
of progress. Please allow reasonable time for a fix before any public
disclosure.

## Out of scope

- Missing security headers on third-party sites we link to
- Self-XSS in user-controlled fields that never leave the browser
- Rate-limit edge cases that require hundreds of requests
- Anything requiring a compromised GitHub or Netlify account

## Scope notes

Server-side secrets (e.g. the Groq API key) live only in Netlify environment
variables and are never shipped to the browser. CI runs a secret scan
(`scripts/ci/check_secrets.py`) on every push; false positives can be reported
via a regular issue.
