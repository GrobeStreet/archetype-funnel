import { Card } from '@/components/Card';
import { TradeLab } from '@/components/TradeLab';
import { getPlayers, getTeams } from '@/lib/data';

export default function TradeLabPage() {
  return (
    <Card eyebrow="Scenario tool" title="Trade Lab v0.1">
      <TradeLab players={getPlayers()} teams={getTeams()} />
    </Card>
  );
}
