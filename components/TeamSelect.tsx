'use client';

import { useRouter } from 'next/navigation';

export function TeamSelect({ teams }: { teams: string[] }) {
  const router = useRouter();
  return (
    <select
      id="team-select"
      className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
      defaultValue=""
      onChange={(event) => router.push(`/teams/${encodeURIComponent(event.target.value)}`)}
    >
      <option value="" disabled>Select a team dashboard</option>
      {teams.map((team) => <option key={team} value={team}>{team}</option>)}
    </select>
  );
}
