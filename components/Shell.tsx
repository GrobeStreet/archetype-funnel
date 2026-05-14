import Link from 'next/link';
import type { ReactNode } from 'react';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/players', label: 'Player Value Board' },
  { href: '/trade-lab', label: 'Trade Lab' },
  { href: '/source-health', label: 'Source Health' }
];

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur md:flex-row md:items-center md:justify-between">
        <Link href="/" className="group">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">Local-first simulator</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white md:text-3xl">Front Office Control Room</h1>
        </Link>
        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full border border-white/10 bg-slate-950/40 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/60 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
