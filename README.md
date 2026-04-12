# Eisdealer Flavor Tracker

A fan-made web app that tracks daily ice cream flavors from [Die Eisdealer](https://www.dieeisdealer.de/). An automated scraper fetches Instagram Stories, uses AI vision to extract flavor lists, and publishes them to a static site.

## How it works

```
Instagram Stories
       |
       v
  Playwright scraper (storysaver.net)
       |
       v
  Gemini Flash (image -> structured JSON)
       |
       v
  data/current.json + data/history.json
       |
       v
  Git push triggers GitHub Pages deploy
```

1. A Docker container runs the scraper on a schedule (via Dokploy)
2. Playwright navigates an Instagram story downloader to fetch story images
3. Images are deduplicated via SHA256 hashes (`data/seen-hashes.json`)
4. New images are sent to Google Gemini for structured extraction of flavor names, tags (vegan/milk), and opening hours
5. Results are written to `data/current.json` and appended to `data/history.json`
6. The scraper commits and pushes data changes, which triggers a GitHub Actions deploy

## Project structure

```
eisdealer/
├── src/                        # Frontend (React + TanStack Start)
│   ├── routes/
│   │   ├── __root.tsx          # Root layout
│   │   ├── index.tsx           # Home — today's flavors
│   │   └── history.tsx         # History — past days
│   ├── components/
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── router.tsx
│   ├── types.ts                # Re-exports types from scraper
│   └── styles.css              # Tailwind + custom styles
│
├── packages/scraper/           # Scraper (bun + Playwright + Gemini)
│   ├── src/
│   │   ├── index.ts            # Orchestrator
│   │   ├── scrape.ts           # Instagram story fetching
│   │   ├── analyze.ts          # Gemini vision analysis
│   │   ├── store.ts            # Data persistence & dedup
│   │   └── types.ts            # Shared type definitions (ArkType)
│   ├── Dockerfile
│   └── run.sh                  # Entrypoint: pull, scrape, commit, push
│
├── data/                       # Scraped flavor data (committed to repo)
│   ├── current.json            # Latest flavors per location
│   ├── history.json            # All historical entries
│   └── seen-hashes.json        # Image dedup hashes
│
├── .github/workflows/
│   └── deploy.yml              # Build & deploy to GitHub Pages
│
├── vite.config.ts              # Vite + TanStack Start + Tailwind
├── biome.json                  # Linter & formatter config
└── package.json                # Workspace root
```

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TanStack Start (file-based routing), Tailwind CSS 4 |
| Scraper | Bun, Playwright, Google Gemini Flash (vision API) |
| Validation | ArkType (runtime type checking for API responses) |
| Hosting | GitHub Pages (static prerendered site) |
| Scraper hosting | Docker on Dokploy (scheduled execution) |
| CI/CD | GitHub Actions (build + deploy on push to main) |
| Linting | Biome (formatting + linting) |

## Development

### Prerequisites

- [Bun](https://bun.sh/) (package manager and runtime)

### Setup

```bash
bun install
```

### Frontend dev server

```bash
bun run dev
```

Starts the Vite dev server on http://localhost:3000. The app reads flavor data from `data/current.json` and `data/history.json`.

### Running the scraper locally

```bash
GEMINI_API_KEY=your-key bun run scrape
```

This runs the full scrape pipeline: fetch stories, deduplicate, analyze with Gemini, and write results to `data/`. You need a [Google Gemini API key](https://ai.google.dev/).

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for image analysis |
| `INSTAGRAM_USERNAME` | No | Instagram account to scrape (default: `die_eisdealer`) |
| `GH_TOKEN` | Only in Docker | GitHub token for pushing data commits |

### Build

```bash
bun run build
```

Produces a prerendered static site in `dist/client/`. Both `/` and `/history` are prerendered at build time.

### Preview production build

```bash
bun run preview
```

### Linting & formatting

[Biome](https://biomejs.dev/) handles both linting and formatting. Config is in `biome.json`.

```bash
bun run lint       # check
bun run lint:fix   # auto-fix
```

## Data format

`data/current.json` holds the latest flavors per location:

```json
{
  "main": {
    "flavors": [
      { "name": "Schokomousse", "tags": ["vegan"], "nameEnglish": "Chocolate Mousse" }
    ],
    "lastUpdated": "2026-03-24T14:30:46.174Z",
    "openUntil": "19:00"
  },
  "buga": { ... }
}
```

`data/history.json` is an array of timestamped entries with the same structure, one per scrape run.

Two locations are tracked:
- **main** — Hauptfiliale (main shop)
- **buga** — Bunter Garten

## Deployment

### Frontend

Deploys automatically via GitHub Actions on every push to `main`. The workflow installs deps, builds the static site, and uploads to GitHub Pages.

### Scraper

The scraper runs as a Docker container on Dokploy with scheduled job execution:

```bash
docker build -f packages/scraper/Dockerfile -t eisdealer-scraper .
```

The container stays alive (`tail -f /dev/null`) and Dokploy triggers `run.sh` on a schedule. The script pulls the latest `main`, runs the scraper, and pushes any data changes back to the repo — which in turn triggers a fresh frontend deploy.
