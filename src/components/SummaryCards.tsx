import { ArrowDownToLine, ArrowUpFromLine, Banknote, CircleDollarSign, ListChecks, Target } from 'lucide-react';
import type { Currency, RebalanceResult } from '../types/portfolio';
import { formatMoney, formatNumber } from '../lib/currency';

interface Props {
  result: RebalanceResult;
  currency: Currency;
}

export function SummaryCards({ result, currency }: Props) {
  const cards = [
    ['Toplam portföy değeri', formatMoney(result.totalValue, currency), CircleDollarSign],
    ['Mevcut hisse sayısı', formatNumber(result.currentCount, 0), ListChecks],
    ['Hedef hisse sayısı', formatNumber(result.targetCount, 0), Target],
    ['Satış toplamı', formatMoney(result.saleTotal, currency), ArrowUpFromLine],
    ['Alış toplamı', formatMoney(result.buyTotal, currency), ArrowDownToLine],
    ['Tahmini kalan nakit', formatMoney(result.remainingCash, currency), Banknote],
  ] as const;
  return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{cards.map(([label, value, Icon]) => <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-soft dark:border-zinc-800 dark:bg-zinc-950" key={label}><div className="flex items-start justify-between gap-3"><span className="text-sm text-zinc-500">{label}</span><Icon className="h-5 w-5 text-teal-600" /></div><p className="mt-3 text-xl font-semibold">{value}</p></article>)}</section>;
}
