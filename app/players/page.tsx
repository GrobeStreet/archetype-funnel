import { Card } from '@/components/Card';
import { PlayerBoard } from '@/components/PlayerBoard';
import { getPlayers, getTeams } from '@/lib/data';

export default function PlayersPage() {
  const players = getPlayers();
  const seasons = Array.from(new Set(players.map((player) => player.season))).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  return (
    <Card eyebrow="Rankings" title="Player Value Board">
      <PlayerBoard players={players} teams={getTeams()} seasons={seasons} />
    </Card>
  );
}
