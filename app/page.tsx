import Link from 'next/link';
import { Card } from '@/components/Card';
import { TeamSelect } from '@/components/TeamSelect';
import { dataStatus, getPlayers, getTeams } from '@/lib/data';

export default function HomePage() {
  const teams = getTeams();
  const players = getPlayers();
  const status = dataStatus();

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <Card className="min-h-[28rem]" eyebrow="NBA Warehouse v0.1" title="Local-first front office simulation">
        <div className="space-y-6">
          <p className="max-w-3xl text-lg leading-8 text-slate-300">
            Explore roster value, team context, trade balance, and source reliability from local CSV exports. No logos, no official league branding, and no external database required.
          </p>
          <div>
            <label className="text-sm font-semibold text-slate-300" htmlFor="team-select">Choose a team</label>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
              <TeamSelect teams={teams} />
              <Link href={teams[0] ? `/teams/${encodeURIComponent(teams[0])}` : '/players'} className="rounded-2xl bg-cyan-300 px-5 py-3 text-center font-black text-slate-950 transition hover:bg-cyan-200">
                Open first team
              </Link>
            </div>
            <p className="mt-2 text-xs text-slate-500">Tip: use the team list below if your browser does not navigate from the select menu.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.slice(0, 12).map((team) => <Link key={team} href={`/teams/${encodeURIComponent(team)}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 font-bold text-slate-100 hover:border-cyan-300/60">{team}</Link>)}
          </div>
        </div>
      </Card>
      <div className="space-y-6">
        <Card title="Quick links">
          <div className="grid gap-3">
            <Link href="/players" className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 font-bold hover:border-cyan-300/60">Player rankings →</Link>
            <Link href="/trade-lab" className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 font-bold hover:border-cyan-300/60">Trade Lab v0.1 →</Link>
            <Link href="/source-health" className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 font-bold hover:border-cyan-300/60">Source health →</Link>
          </div>
        </Card>
        <Card title="Data readiness">
          <div className="space-y-3">
            {status.map((file) => <div key={file.fileName} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] p-3 text-sm"><span>{file.fileName}</span><span className={file.present ? 'text-emerald-300' : 'text-amber-300'}>{file.present ? 'loaded' : 'missing'}</span></div>)}
          </div>
          <p className="mt-4 text-sm text-slate-400">Loaded {players.length.toLocaleString()} player value rows across {teams.length.toLocaleString()} teams.</p>
        </Card>
      </div>
    </div>
  );
}
