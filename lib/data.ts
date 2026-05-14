import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv, type CsvRow } from './csv';
import { numberOrNull, slugify } from './format';

const DATA_DIR = path.join(process.cwd(), 'data');

const files = {
  players: 'gold_player_value_v01.csv',
  teams: 'gold_team_season_summary.csv',
  health: 'source_health.csv',
  reconciliation: 'source_reconciliation.csv'
} as const;

function readCsv(fileName: string): CsvRow[] {
  const filePath = path.join(DATA_DIR, fileName);
  if (!existsSync(filePath)) return [];
  return parseCsv(readFileSync(filePath, 'utf8'));
}

function pick(row: CsvRow, aliases: string[]): string {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== '') return row[alias];
  }
  return '';
}

function pickNumber(row: CsvRow, aliases: string[]): number | null {
  return numberOrNull(pick(row, aliases));
}

const teamAliases = ['team', 'team_abbr', 'team_abbreviation', 'tm', 'abbreviation', 'franchise'];
const seasonAliases = ['season', 'season_year', 'year'];

export type PlayerValue = {
  id: string;
  player: string;
  team: string;
  season: string;
  age: number | null;
  wevLite: number | null;
  tradeValueSeed: number | null;
  availability: number | null;
  offensiveValue: number | null;
  defensiveValue: number | null;
  raw: CsvRow;
};

export type TeamSeason = {
  id: string;
  team: string;
  teamName: string;
  season: string;
  wins: number | null;
  losses: number | null;
  pointDifferential: number | null;
  netRating: number | null;
  offensiveRating: number | null;
  defensiveRating: number | null;
  raw: CsvRow;
};

export type SourceRecord = {
  id: string;
  status: 'pass' | 'warn' | 'fail' | 'unknown';
  raw: CsvRow;
};

export function getPlayers(): PlayerValue[] {
  return readCsv(files.players).map((row, index) => {
    const player = pick(row, ['player', 'player_name', 'name']) || `Player ${index + 1}`;
    const team = pick(row, teamAliases) || 'UNK';
    const season = pick(row, seasonAliases) || 'Unknown';
    return {
      id: `${slugify(player)}-${slugify(team)}-${slugify(season)}-${index}`,
      player,
      team,
      season,
      age: pickNumber(row, ['age', 'player_age']),
      wevLite: pickNumber(row, ['wev_lite', 'wev-lite', 'wev', 'value_over_replacement']),
      tradeValueSeed: pickNumber(row, ['trade_value_seed', 'trade_value', 'value_seed', 'seed_trade_value']),
      availability: pickNumber(row, ['availability', 'availability_score', 'games_pct', 'gp_pct', 'games_played_pct']),
      offensiveValue: pickNumber(row, ['offense_value', 'offensive_value', 'off_value', 'ov', 'offense', 'o_value']),
      defensiveValue: pickNumber(row, ['defense_value', 'defensive_value', 'def_value', 'dv', 'defense', 'd_value']),
      raw: row
    };
  });
}

export function getTeamSeasons(): TeamSeason[] {
  return readCsv(files.teams).map((row, index) => {
    const team = pick(row, teamAliases) || 'UNK';
    const season = pick(row, seasonAliases) || 'Unknown';
    return {
      id: `${slugify(team)}-${slugify(season)}-${index}`,
      team,
      teamName: pick(row, ['team_name', 'name', 'franchise_name']) || team,
      season,
      wins: pickNumber(row, ['wins', 'w']),
      losses: pickNumber(row, ['losses', 'l']),
      pointDifferential: pickNumber(row, ['point_differential', 'point_diff', 'pts_diff', 'diff', 'plus_minus']),
      netRating: pickNumber(row, ['net_rating', 'net_rtg', 'nrtg']),
      offensiveRating: pickNumber(row, ['off_rating', 'offensive_rating', 'off_rtg', 'ortg']),
      defensiveRating: pickNumber(row, ['def_rating', 'defensive_rating', 'def_rtg', 'drtg']),
      raw: row
    };
  });
}

export function getSourceHealth(): SourceRecord[] {
  return readCsv(files.health).map((raw, index) => ({ id: `health-${index}`, status: statusFromRow(raw), raw }));
}

export function getSourceReconciliation(): SourceRecord[] {
  return readCsv(files.reconciliation).map((raw, index) => ({ id: `reconciliation-${index}`, status: statusFromRow(raw), raw }));
}

function statusFromRow(row: CsvRow): SourceRecord['status'] {
  const status = pick(row, ['status', 'health', 'check_status', 'result']).toLowerCase();
  if (status.includes('pass') || status === 'ok' || status === 'green') return 'pass';
  if (status.includes('warn') || status === 'yellow') return 'warn';
  if (status.includes('fail') || status.includes('error') || status === 'red') return 'fail';
  return 'unknown';
}

export function getTeams(): string[] {
  const teams = new Set<string>();
  getTeamSeasons().forEach((team) => teams.add(team.team));
  getPlayers().forEach((player) => teams.add(player.team));
  return Array.from(teams).filter(Boolean).sort();
}

export function latestSeason<T extends { season: string }>(items: T[]): T | undefined {
  return [...items].sort((a, b) => b.season.localeCompare(a.season, undefined, { numeric: true })).at(0);
}

export function dataStatus() {
  return Object.values(files).map((fileName) => ({ fileName, present: existsSync(path.join(DATA_DIR, fileName)) }));
}
