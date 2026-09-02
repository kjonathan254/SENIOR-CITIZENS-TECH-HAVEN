# Senior Citizens Tech Haven (SCTH)

**Bridging Seniors to the Digital World**

Senior Citizens Tech Haven (SCTH) helps older adults navigate digital life safely, confidently, and with dignity through research, education, and practical digital capability frameworks.

SCTH researches how older adults interact with digital services, identifies the barriers and risks they face, and develops practical frameworks, guidance, and tools that help them participate fully in an increasingly digital society.

Rather than teaching technology for its own sake, SCTH focuses on real-world outcomes such as accessing government services, managing digital finances, using health systems, communicating securely, and protecting against fraud.

## Website

Static site hosted on **Netlify**: https://seniorcitizenstechhaven.netlify.app

Plain-language guides for Kenyan seniors: smartphones, M-Pesa, WhatsApp, eCitizen, email, online safety, AI, and more — plus **Elsah**, our AI assistant.

## Project Structure

```
/                       Static HTML pages (published as-is by Netlify)
├── index.html          Homepage (Elsah chat UI lives here)
├── articles.html       Article index
├── images/             Optimised images (webp preferred)
├── icon/               PWA icons (any + maskable variants)
├── netlify/functions/  Serverless functions
│   ├── elsah.cjs       Elsah AI backend (Groq + local knowledge base)
│   ├── elsah-kb.json   Knowledge base bundled with the function
│   └── content-generator.mts  Internal AI writing tool (key-gated)
├── data/               Source copy of the Elsah knowledge base
├── reports/            Downloadable PDF reports referenced by articles
├── docs/               Internal audit / planning docs (not linked publicly)
├── tests/              Node test runner tests
├── netlify.toml        Netlify config (redirects, headers, security)
├── manifest.json       PWA manifest
└── service-worker.js   Offline-first service worker
```

## Local Development

```bash
npm install
npm run dev      # netlify dev (site + functions)
npm test         # rate-limit + sensitive-data tests
```

`elsah.cjs` is CommonJS on purpose: `package.json` declares `"type": "module"`, so
CommonJS files must use the `.cjs` extension (this fixed a production 502).

## Environment Variables

Copy `.env.example` to `.env` for local work — **never commit `.env`**:

| Variable | Used by | Purpose |
|---|---|---|
| `GROQ_API_KEY` | Elsah function (Netlify env) | Groq AI fallback when the local KB has no answer |
| `HELPLINE_NUMBER` | Elsah function | Support line shown to seniors (also set in netlify.toml) |
| `CONTENT_GENERATOR_KEY` | Content generator function | Access key for the internal writing tool |

## Deployment

Push to `main` → Netlify deploys automatically. There is no build step.
Security and cache headers are defined in `netlify.toml`.

## Contact

- Phone / WhatsApp: 0115 258 958 / 0711 707 229
- Email: kjonath92@gmail.com
- Nakuru, Kenya
