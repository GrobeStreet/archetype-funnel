import type { CsvRow } from '@/lib/csv';
import { StatusBadge } from './StatusBadge';
import type { SourceRecord } from '@/lib/data';

export function RawTable({ rows, emptyLabel = 'No rows available.' }: { rows: CsvRow[]; emptyLabel?: string }) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  if (rows.length === 0) return <p className="rounded-2xl border border-dashed border-white/15 p-6 text-slate-400">{emptyLabel}</p>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-full divide-y divide-white/10 text-sm">
        <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-slate-400">
          <tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header.replaceAll('_', ' ')}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-white/[0.03]">
              {headers.map((header) => <td key={header} className="max-w-xs px-4 py-3 text-slate-200">{row[header] || '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SourceTable({ rows, emptyLabel }: { rows: SourceRecord[]; emptyLabel: string }) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row.raw))));
  if (rows.length === 0) return <p className="rounded-2xl border border-dashed border-white/15 p-6 text-slate-400">{emptyLabel}</p>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-full divide-y divide-white/10 text-sm">
        <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-4 py-3">badge</th>
            {headers.map((header) => <th key={header} className="px-4 py-3">{header.replaceAll('_', ' ')}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-white/[0.03]">
              <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
              {headers.map((header) => <td key={header} className="max-w-xs px-4 py-3 text-slate-200">{row.raw[header] || '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
