'use client';

import { useMemo, useState } from 'react';
import type { PlayerValue } from '@/lib/data';
import { formatNumber } from '@/lib/format';

function total(players: PlayerValue[], key: 'wevLite' | 'tradeValueSeed') {
  return players.reduce((sum, player) => sum + (player[key] ?? 0), 0);
}

export function TradeLab({ players, teams }: { players: PlayerValue[]; teams: string[] }) {
  const [teamA, setTeamA] = useState(teams[0] ?? '');
  const [teamB, setTeamB] = useState(teams[1] ?? teams[0] ?? '');
  const [sideA, setSideA] = useState<string[]>([]);
  const [sideB, setSideB] = useState<string[]>([]);

  const rosterA = players.filter((player) => player.team === teamA);
  const rosterB = players.filter((player) => player.team === teamB);
  const sentA = useMemo(() => players.filter((player) => sideA.includes(player.id)), [players, sideA]);
  const sentB = useMemo(() => players.filter((player) => sideB.includes(player.id)), [players, sideB]);
  const wevA = total(sentA, 'wevLite');
  const wevB = total(sentB, 'wevLite');
  const seedA = total(sentA, 'tradeValueSeed');
  const seedB = total(sentB, 'tradeValueSeed');
  const netForA = wevB - wevA;
  const seedNetForA = seedB - seedA;
  const imbalance = Math.abs(seedA - seedB);
  const averageSeed = Math.max(1, (Math.abs(seedA) + Math.abs(seedB)) / 2);
  const extreme = imbalance / averageSeed > 0.4 && imbalance > 5;

  function toggle(id: string, side: 'A' | 'B') {
    const setter = side === 'A' ? setSideA : setSideB;
    setter((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  const verdict = Math.abs(seedNetForA) < 1 ? 'Balanced by trade value seed' : seedNetForA > 0 ? `${teamA} receives more trade value seed` : `${teamB} receives more trade value seed`;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        <select className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" value={teamA} onChange={(event) => { setTeamA(event.target.value); setSideA([]); }}><option value="">Team A</option>{teams.map((team) => <option key={team}>{team}</option>)}</select>
        <select className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" value={teamB} onChange={(event) => { setTeamB(event.target.value); setSideB([]); }}><option value="">Team B</option>{teams.map((team) => <option key={team}>{team}</option>)}</select>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[{ label: 'Team A sends', roster: rosterA, selected: sideA, side: 'A' as const }, { label: 'Team B sends', roster: rosterB, selected: sideB, side: 'B' as const }].map((panel) => (
          <section key={panel.side} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <h3 className="mb-3 text-lg font-black text-white">{panel.label}</h3>
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {panel.roster.map((player) => <label key={player.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3 hover:border-cyan-300/50"><span><input className="mr-3" type="checkbox" checked={panel.selected.includes(player.id)} onChange={() => toggle(player.id, panel.side)} />{player.player}</span><span className="text-sm text-slate-400">WEV {formatNumber(player.wevLite)} · Seed {formatNumber(player.tradeValueSeed)}</span></label>)}
              {panel.roster.length === 0 && <p className="text-slate-400">No roster rows for this team.</p>}
            </div>
          </section>
        ))}
      </div>
      <section className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label={`${teamA} sends WEV`} value={formatNumber(wevA)} />
          <Metric label={`${teamB} sends WEV`} value={formatNumber(wevB)} />
          <Metric label={`${teamA} sends seed`} value={formatNumber(seedA)} />
          <Metric label={`${teamB} sends seed`} value={formatNumber(seedB)} />
        </div>
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <p className="text-lg font-black text-white">Verdict: {verdict}</p>
          <p className="mt-2 text-slate-300">WEV-lite net for {teamA || 'Team A'}: {formatNumber(netForA)}. Trade value seed net for {teamA || 'Team A'}: {formatNumber(seedNetForA)}.</p>
          {extreme && <p className="mt-3 rounded-2xl border border-rose-400/40 bg-rose-400/15 p-3 font-bold text-rose-100">Extreme imbalance flagged: value seed gap exceeds 40% of average exchanged seed and is greater than 5.</p>}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-950/40 p-4"><p className="text-xs uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-white">{value}</p></div>;
}
