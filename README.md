# Front Office Control Room

A local-first basketball front office simulation dashboard built with Next.js, TypeScript, and Tailwind CSS. It uses the NBA Warehouse v0.1 CSV exports as its data source and intentionally avoids logos or official league branding.

## Pages

- `/` — Home page with app title, team chooser, quick links, and data readiness.
- `/teams/[team]` — Team dashboard with latest season summary, roster value table, top WEV-lite players, and strengths/watch items generated from available mapped stats.
- `/players` — Sortable and filterable player value board.
- `/trade-lab` — Trade Lab v0.1 for two-team player packages, WEV-lite totals, trade value seed totals, winner/loser verdict, and imbalance warning.
- `/source-health` — Source health and reconciliation tables with pass/warn/fail badges.

## Local data setup

The repository includes fictional seed/demo CSVs so the app is playable immediately. To use real NBA Warehouse v0.1 exports, replace the files in the `data/` directory:

```text
data/gold_player_value_v01.csv
data/gold_team_season_summary.csv
data/source_health.csv
data/source_reconciliation.csv
```

The committed seed files use fictional players and text-only team abbreviations. The app will still boot if a file is removed, but pages will show empty states for missing CSVs.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Production build

```bash
npm run build
npm start
```
