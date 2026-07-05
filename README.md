# CodeRobots Editor

By Duncan Johnson, Bill Church, Ethan Danahy, Yash Ajay Garje, and Morgan Hynes

A browser-based Python editor + AI tutor for classroom robotics hardware
(LilyBot, micro:bit, Cutebot, ESP32, LEGO Education). One codebase serves
multiple deployments through per-instance configuration — from a
full-telemetry research tool to a no-data-collection localized tutor.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in the vars your instance needs
npm run dev
```

## Instances

A deployment is described by one file in `src/config/instances/` and selected
at build time:

```bash
VITE_INSTANCE=purdue npm run build        # default: research tool
VITE_INSTANCE=skolegpt-dk npm run build   # Danish anonymous tutor
```

| | `purdue` | `skolegpt-dk` |
|---|---|---|
| Data storage | Supabase (auth required) | Browser localStorage (anonymous) |
| Chat | Multi-provider, budget-enforced | SkoleGPT tutor pipeline |
| Platforms | lilybot, microbit, cutebot, esp32 | lego, microbit, esp32 |
| Languages | en | da (default), en |
| Admin routes (`/data`, `/usage`, `/view-data`) | yes | no |

To add an instance, copy an existing file in `src/config/instances/`, adjust
the flags, and create a hosting project (e.g. Vercel) with `VITE_INSTANCE`
plus that instance's env vars. Endpoint URLs and secrets always live in env
vars, never in instance files.

## Backend

Serverless Python on Modal under `modal_functions/` — see
`modal_functions/README.md` for deploy commands, secrets, and the SSE
protocol. Telemetry instances additionally use Supabase (schemas in
`src/services/dbSchemas.js`, regenerate the backend mirror with
`npm run generate:schema`).

## Development

See `CLAUDE.md` for the architecture guide (instance config, persistence
adapters, i18n, platform abstraction, chat modes). `npm run lint` includes
locale dictionary checks; there are no automated tests.

## History

This repository unifies the original research-tool lineage with the Danish
SkoleGPT fork. The pre-handoff git history is grafted onto `main`, and the
old repository's branches are preserved as `import/*` and `archive/*` refs.
