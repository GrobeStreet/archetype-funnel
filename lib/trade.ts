import type { PlayerValue } from './data';

export type TradeSide = {
  team: string;
  players: PlayerValue[];
};

export type TradeTotals = {
  wevLite: number;
  tradeValueSeed: number;
  playerCount: number;
};

export type TradeEvaluation = {
  teamA: TradeTotals;
  teamB: TradeTotals;
  netForA: TradeTotals;
  winner: 'teamA' | 'teamB' | 'balanced' | 'incomplete';
  verdict: string;
  balanceLabel: 'balanced' | 'moderate' | 'extreme' | 'incomplete';
  imbalanceRatio: number;
  warnings: string[];
};

const BALANCED_SEED_TOLERANCE = 1;
const EXTREME_RATIO = 0.4;
const EXTREME_MIN_SEED_GAP = 5;

function safeNumber(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function sideTotals(players: PlayerValue[]): TradeTotals {
  return players.reduce<TradeTotals>(
    (totals, player) => ({
      wevLite: totals.wevLite + safeNumber(player.wevLite),
      tradeValueSeed: totals.tradeValueSeed + safeNumber(player.tradeValueSeed),
      playerCount: totals.playerCount + 1
    }),
    { wevLite: 0, tradeValueSeed: 0, playerCount: 0 }
  );
}

export function playTrade(teamA: TradeSide, teamB: TradeSide): TradeEvaluation {
  const totalsA = sideTotals(teamA.players);
  const totalsB = sideTotals(teamB.players);
  const seedNetForA = totalsB.tradeValueSeed - totalsA.tradeValueSeed;
  const wevNetForA = totalsB.wevLite - totalsA.wevLite;
  const seedGap = Math.abs(seedNetForA);
  const averageSeed = Math.max(1, (Math.abs(totalsA.tradeValueSeed) + Math.abs(totalsB.tradeValueSeed)) / 2);
  const imbalanceRatio = seedGap / averageSeed;
  const warnings: string[] = [];

  if (totalsA.playerCount === 0 || totalsB.playerCount === 0) {
    warnings.push('Select at least one player for both teams before judging the trade.');
  }

  if (teamA.team === teamB.team && teamA.team) {
    warnings.push('Team A and Team B are the same team; choose two different teams for a realistic trade.');
  }

  if ([...teamA.players, ...teamB.players].some((player) => player.tradeValueSeed === null || player.wevLite === null)) {
    warnings.push('One or more selected players are missing WEV-lite or trade value seed, so missing values were treated as zero.');
  }

  const incomplete = totalsA.playerCount === 0 || totalsB.playerCount === 0;
  const extreme = !incomplete && imbalanceRatio > EXTREME_RATIO && seedGap > EXTREME_MIN_SEED_GAP;
  const balanced = !incomplete && seedGap < BALANCED_SEED_TOLERANCE;
  const winner = incomplete ? 'incomplete' : balanced ? 'balanced' : seedNetForA > 0 ? 'teamA' : 'teamB';
  const balanceLabel = incomplete ? 'incomplete' : balanced ? 'balanced' : extreme ? 'extreme' : 'moderate';

  if (extreme) {
    warnings.push('Extreme imbalance: value seed gap exceeds 40% of average exchanged seed and is greater than 5.');
  }

  const verdict = buildVerdict({ winner, teamA: teamA.team || 'Team A', teamB: teamB.team || 'Team B', seedNetForA, wevNetForA });

  return {
    teamA: totalsA,
    teamB: totalsB,
    netForA: {
      wevLite: wevNetForA,
      tradeValueSeed: seedNetForA,
      playerCount: totalsB.playerCount - totalsA.playerCount
    },
    winner,
    verdict,
    balanceLabel,
    imbalanceRatio,
    warnings
  };
}

function buildVerdict({ winner, teamA, teamB, seedNetForA, wevNetForA }: { winner: TradeEvaluation['winner']; teamA: string; teamB: string; seedNetForA: number; wevNetForA: number }) {
  if (winner === 'incomplete') return 'Add players to both sides to play the trade.';
  if (winner === 'balanced') return 'Balanced by trade value seed.';

  const winningTeam = winner === 'teamA' ? teamA : teamB;
  const wevDirectionMatches = Math.sign(seedNetForA) === Math.sign(wevNetForA) || Math.abs(wevNetForA) < 0.5;
  const context = wevDirectionMatches ? 'WEV-lite agrees with the trade value seed direction.' : 'WEV-lite and trade value seed point in different directions.';
  return `${winningTeam} receives more trade value seed. ${context}`;
}
