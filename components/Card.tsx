import type { ReactNode } from 'react';

export function Card({ title, eyebrow, children, className = '' }: { title?: string; eyebrow?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-white/10 bg-slate-950/55 p-5 shadow-xl shadow-black/20 ${className}`}>
      {(title || eyebrow) && (
        <div className="mb-4">
          {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">{eyebrow}</p>}
          {title && <h2 className="mt-1 text-xl font-bold text-white">{title}</h2>}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}
