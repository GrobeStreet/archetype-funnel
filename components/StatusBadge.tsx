import type { SourceRecord } from '@/lib/data';

const styles: Record<SourceRecord['status'], string> = {
  pass: 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200',
  warn: 'border-amber-300/30 bg-amber-300/15 text-amber-100',
  fail: 'border-rose-400/30 bg-rose-400/15 text-rose-100',
  unknown: 'border-slate-400/30 bg-slate-400/15 text-slate-200'
};

export function StatusBadge({ status }: { status: SourceRecord['status'] }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${styles[status]}`}>{status}</span>;
}
