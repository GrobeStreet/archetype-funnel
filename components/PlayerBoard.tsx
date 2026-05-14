'use client';

import { useMemo, useState } from 'react';
import type { PlayerValue } from '@/lib/data';
import { formatInt, formatNumber } from '@/lib/format';

type SortKey = keyof Pick<PlayerValue, 'player' | 'team' | 'season' | 'age' | 'wevLite' | 'tradeValueSeed' | 'availability' | 'offensiveValue' | 'defensiveValue'>;

const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'player', label: 'Player' },
  { key: 'team', label: 'Team' },
  { key: 'season', label: 'Season' },
  { key: 'age', label: 'Age', numeric: true },
  { key: 'wevLite', label: 'WEV-lite', numeric: true },
  { key: 'tradeValueSeed', label: 'Trade value seed', numeric: true },
  { key: 'availability', label: 'Availability', numeric: true },
  { key: 'offensiveValue', label: 'Offensive value', numeric: true },
  { key: 'defensiveValue', label: 'Defensive value', numeric: true }
];

export function PlayerBoard({ players, teams, seasons }: { players: PlayerValue[]; teams: string[]; seasons: string[] }) {
  const [team, setTeam] = useState('all');
  const [season, setSeason] = useState('all');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('wevLite');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    return players
      .filter((player) => team === 'all' || player.team === team)
      .filter((player) => season === 'all' || player.season === season)
      .filter((player) => player.player.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => {
        const av = a[sortKey] ?? (typeof a[sortKey] === 'string' ? '' : -Infinity);
        const bv = b[sortKey] ?? (typeof b[sortKey] === 'string' ? '' : -Infinity);
        const comparison = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
        return direction === 'asc' ? comparison : -comparison;
      });
  }, [players, team, season, query, sortKey, direction]);

  function setSort(key: SortKey) {
    if (key === sortKey) setDirection(direction === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setDirection('desc');
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <input className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" placeholder="Search players" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" value={team} onChange={(event) => setTeam(event.target.value)}><option value="all">All teams</option>{teams.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" value={season} onChange={(event) => setSeason(event.target.value)}><option value="all">All seasons</option>{seasons.map((item) => <option key={item}>{item}</option>)}</select>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-slate-300">{filtered.length.toLocaleString()} rows</div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-slate-400"><tr>{columns.map((column) => <th key={column.key} className="px-4 py-3"><button className="font-black hover:text-white" onClick={() => setSort(column.key)}>{column.label}{sortKey === column.key ? ` ${direction === 'asc' ? '↑' : '↓'}` : ''}</button></th>)}</tr></thead>
          <tbody className="divide-y divide-white/10">
            {filtered.map((player) => <tr key={player.id} className="hover:bg-white/[0.03]"><td className="px-4 py-3 font-bold text-white">{player.player}</td><td className="px-4 py-3">{player.team}</td><td className="px-4 py-3">{player.season}</td><td className="px-4 py-3">{formatInt(player.age)}</td><td className="px-4 py-3">{formatNumber(player.wevLite)}</td><td className="px-4 py-3">{formatNumber(player.tradeValueSeed)}</td><td className="px-4 py-3">{formatNumber(player.availability, 2)}</td><td className="px-4 py-3">{formatNumber(player.offensiveValue)}</td><td className="px-4 py-3">{formatNumber(player.defensiveValue)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
