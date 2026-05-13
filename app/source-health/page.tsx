import { Card } from '@/components/Card';
import { SourceTable } from '@/components/DataTable';
import { getSourceHealth, getSourceReconciliation } from '@/lib/data';

export default function SourceHealthPage() {
  const health = getSourceHealth();
  const reconciliation = getSourceReconciliation();
  return (
    <div className="space-y-6">
      <Card eyebrow="Reliability" title="source_health.csv">
        <SourceTable rows={health} emptyLabel="No source_health.csv rows found. Add the NBA Warehouse v0.1 CSV to the data directory." />
      </Card>
      <Card title="source_reconciliation.csv">
        <SourceTable rows={reconciliation} emptyLabel="No source_reconciliation.csv rows found. Add the NBA Warehouse v0.1 CSV to the data directory." />
      </Card>
    </div>
  );
}
