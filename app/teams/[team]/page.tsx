import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, StatCard } from '@/components/Card';
import { getPlayers, getTeams, getTeamSeasons, latestSeason } from '@/lib/data';
import { formatInt, formatNumber } from '@/lib/format';

export function generateStaticParams() {
  return getTeams().map((team) => ({ team }));
}

function insight(label: string, value: string) {
  return <li className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><span className="font-black text-white">{label}:</span> <span className="text-slate-300">{value}</span></li>;
}

export default function TeamDashboard({ params }: { params: { team: string } }) {
  const team = decodeURIComponent(params.team);
  const players = getPlayers().filter((player) => player.team === team);
  const seasons = getTeamSeasons().filter((season) => season.team === team || season.teamName === team);
  const summary = latestSeason(seasons);

  if (!summary && players.length === 0) notFound();

  const topPlayers = [...players].sort((a, b) => (b.wevLite ?? -Infinity) - (a.wevLite ?? -Infinity)).slice(0, 5);
  const positiveSignals = [
    summary?.netRating !== null && summary?.netRating !== undefined ? `Net rating sits at ${formatNumber(summary.netRating)}.` : null,
    summary?.pointDifferential !== null && summary?.pointDifferential !== undefined ? `Point differential is ${formatNumber(summary.pointDifferential)}.` : null,
    topPlayers[0]?.wevLite !== null && topPlayers[0]?.wevLite !== undefined ? `${topPlayers[0].player} leads the board at ${formatNumber(topPlayers[0].wevLite)} WEV-lite.` : null,
    players.length ? `Roster table contains ${players.length} value records.` : null
  ].filter(Boolean);
  const weaknessSignals = [
    summary?.defensiveRating !== null && summary?.defensiveRating !== undefined ? `Defensive rating input is ${formatNumber(summary.defensiveRating)}; compare against league context before committing assets.` : null,
    topPlayers.length < 5 ? 'Fewer than five player value rows are available for this team.' : null,
    players.some((player) => player.availability !== null && player.availability < 0.7) ? 'At least one rotation value row carries an availability signal under 0.70.' : null
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-300">Team Dashboard</p>
          <h1 className="mt-2 text-4xl font-black text-white">{summary?.teamName ?? team} <span className="text-slate-500">({team})</span></h1>
          <p className="mt-2 text-slate-400">Latest available season summary: {summary?.season ?? 'not available'}</p>
        </div>
        <Link className="rounded-2xl border border-white/10 px-4 py-3 font-bold hover:border-cyan-300/60" href="/trade-lab">Open Trade Lab</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Wins" value={formatInt(summary?.wins)} />
        <StatCard label="Losses" value={formatInt(summary?.losses)} />
        <StatCard label="Point differential" value={formatNumber(summary?.pointDifferential)} />
        <StatCard label="Net rating" value={formatNumber(summary?.netRating)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Top 5 by WEV-lite">
          <div className="space-y-3">
            {topPlayers.map((player, index) => <div key={player.id} className="flex items-center justify-between rounded-2xl bg-white/[0.04] p-3"><span className="font-bold"><span className="text-slate-500">#{index + 1}</span> {player.player}</span><span className="text-cyan-200">{formatNumber(player.wevLite)}</span></div>)}
            {topPlayers.length === 0 && <p className="text-slate-400">No player value rows available.</p>}
          </div>
        </Card>
        <Card title="Strengths / weaknesses from available stats">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-3 font-black text-emerald-200">Strengths</h3>
              <ul className="space-y-2 text-sm">{positiveSignals.map((value) => insight('Signal', String(value)))}</ul>
            </div>
            <div>
              <h3 className="mb-3 font-black text-amber-200">Watch items</h3>
              <ul className="space-y-2 text-sm">{weaknessSignals.length ? weaknessSignals.map((value) => insight('Risk', String(value))) : insight('Risk', 'No obvious weakness flags in the mapped fields.')}</ul>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Roster / value table">
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-slate-400"><tr>{['Player', 'Season', 'Age', 'WEV-lite', 'Trade value seed', 'Availability', 'Offense', 'Defense'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/10">
              {players.map((player) => <tr key={player.id} className="hover:bg-white/[0.03]"><td className="px-4 py-3 font-bold text-white">{player.player}</td><td className="px-4 py-3">{player.season}</td><td className="px-4 py-3">{formatInt(player.age)}</td><td className="px-4 py-3">{formatNumber(player.wevLite)}</td><td className="px-4 py-3">{formatNumber(player.tradeValueSeed)}</td><td className="px-4 py-3">{formatNumber(player.availability, 2)}</td><td className="px-4 py-3">{formatNumber(player.offensiveValue)}</td><td className="px-4 py-3">{formatNumber(player.defensiveValue)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
