# NBA Warehouse v0.1 data

This directory includes fictional seed/demo CSVs so the app is playable immediately. Replace them with real NBA Warehouse v0.1 exports when available:

- `gold_player_value_v01.csv`
- `gold_team_season_summary.csv`
- `source_health.csv`
- `source_reconciliation.csv`

The app reads these files directly from disk at build/runtime and normalizes common column-name variants for player, team, season, WEV-lite, trade value seed, availability, offense, defense, wins, losses, point differential, pace, offensive rating, defensive rating, and net rating.
