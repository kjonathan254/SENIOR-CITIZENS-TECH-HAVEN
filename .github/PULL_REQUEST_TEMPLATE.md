# Summary of changes

<!-- What does this PR do? One or two sentences. -->

## Type of change

- [ ] Content fix (typo, factual correction, clearer wording)
- [ ] New article / page
- [ ] Bug fix (layout, JS behaviour, broken link)
- [ ] Accessibility improvement
- [ ] Infrastructure / CI
- [ ] Other

## Checklist

- [ ] `npm test` passes
- [ ] `python3 scripts/ci/check_csp.py` passes (inline scripts re-hashed via
      `scripts/ci/rebuild_csp.py` if HTML scripts changed)
- [ ] `python3 scripts/ci/check_site.py` passes (no dead links/images)
- [ ] `python3 scripts/ci/check_secrets.py` passes
- [ ] New pages added to `sitemap.xml`
- [ ] Content uses plain language suitable for senior readers
- [ ] Keyboard-accessible and screen-reader friendly

## Deployment note

Netlify deploys `main` automatically. This repository does **not** have a
deploy job in CI — CI only verifies. If this PR must not trigger a deploy,
include `[skip ci]` in the merge commit message.
