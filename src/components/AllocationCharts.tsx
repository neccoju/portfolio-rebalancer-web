import type { AllocationItem, Currency, RebalanceResult } from '../types/portfolio';
import { formatMoney, formatPercent } from '../lib/currency';

const COLORS = ['#0d9488', '#4f46e5', '#f59e0b', '#e11d48', '#16a34a', '#7c3aed', '#0891b2', '#ea580c', '#52525b', '#84cc16'];

export function AllocationCharts({ result, currency }: { result: RebalanceResult; currency: Currency }) {
  return <section className="grid gap-4 xl:grid-cols-4"><DonutPanel title="Mevcut dağılım" items={result.currentAllocations} currency={currency} /><DonutPanel title="Hedef dağılım" items={result.targetAllocations} currency={currency} /><DonutPanel title="Rebalance sonrası" items={result.postAllocations} currency={currency} /><DifferencePanel result={result} /></section>;
}

function DonutPanel({ title, items, currency }: { title: string; items: AllocationItem[]; currency: Currency }) {
  return <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-soft dark:border-zinc-800 dark:bg-zinc-950"><h3 className="text-sm font-semibold">{title}</h3><div className="mt-4 flex items-center gap-4"><div className="relative h-28 w-28 flex-none rounded-full" style={{ background: buildConicGradient(items) }}><div className="absolute inset-6 rounded-full bg-white dark:bg-zinc-950" /></div><div className="max-h-36 flex-1 overflow-y-auto pr-1">{items.length === 0 ? <p className="text-sm text-zinc-500">Veri bekleniyor.</p> : <ul className="space-y-2">{items.map((item, index) => <li className="flex items-center justify-between gap-3 text-sm" key={item.key}><span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 flex-none rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span className="truncate">{item.symbol}</span></span><span className="text-right text-zinc-500">{formatPercent(item.weight, 2)}<span className="block text-xs">{formatMoney(item.value, currency)}</span></span></li>)}</ul>}</div></div></article>;
}

function DifferencePanel({ result }: { result: RebalanceResult }) {
  return <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-soft dark:border-zinc-800 dark:bg-zinc-950"><h3 className="text-sm font-semibold">Mevcut/hedef farkı</h3><div className="mt-4 max-h-48 space-y-3 overflow-y-auto pr-1">{result.trades.length === 0 ? <p className="text-sm text-zinc-500">Hesaplama bekleniyor.</p> : result.trades.map((trade) => { const diff = Math.max(Math.min(trade.weightDiff, 1), -1); return <div key={trade.key}><div className="mb-1 flex justify-between text-xs text-zinc-500"><span>{trade.symbol}</span><span>{formatPercent(trade.weightDiff, 2)}</span></div><div className="h-2 overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800"><div className={diff >= 0 ? 'h-full bg-emerald-500' : 'h-full bg-rose-500'} style={{ width: `${Math.abs(diff) * 100}%` }} /></div></div>; })}</div></article>;
}

function buildConicGradient(items: AllocationItem[]): string {
  if (items.length === 0) return 'conic-gradient(#e4e4e7 0deg 360deg)';
  let cursor = 0;
  return `conic-gradient(${items.map((item, index) => { const start = cursor; const end = cursor + item.weight * 360; cursor = end; return `${COLORS[index % COLORS.length]} ${start}deg ${end}deg`; }).join(', ')})`;
}
