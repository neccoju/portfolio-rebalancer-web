import { Plus, Trash2 } from 'lucide-react';
import type { CurrentPosition, PriceQuote } from '../types/portfolio';
import { formatMoney } from '../lib/currency';
import { getSymbolKey, inferMarket, isValidSymbol, marketCurrency, normalizeUserSymbol } from '../lib/symbol';

interface Props {
  rows: CurrentPosition[];
  quotes: Record<string, PriceQuote>;
  duplicateKeys: Set<string>;
  priceErrors: Record<string, string>;
  onChange: (rows: CurrentPosition[]) => void;
}

export function PortfolioInput({ rows, quotes, duplicateKeys, priceErrors, onChange }: Props) {
  const updateRow = (id: string, patch: Partial<CurrentPosition>) => onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-soft dark:border-zinc-800 dark:bg-zinc-950">
      <Header title="Mevcut Portföy" subtitle="Lot/adet ve gerekirse manuel fiyat girin." onAdd={() => onChange([...rows, createCurrentRow()])} />
      <div className="overflow-x-auto">
        <table className="min-w-[920px] w-full border-separate border-spacing-0 text-left text-sm">
          <thead><tr className="text-xs uppercase text-zinc-500">{['Sembol', 'Piyasa', 'Lot/adet', 'Otomatik fiyat', 'Manuel fiyat', 'Piyasa değeri', ''].map((h) => <th className="border-b border-zinc-200 pb-2 pr-3 dark:border-zinc-800" key={h}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((row) => {
            const symbol = normalizeUserSymbol(row.symbol);
            const key = getSymbolKey(symbol, row.market);
            const quote = quotes[key];
            const price = row.manualPrice && row.manualPrice > 0 ? row.manualPrice : quote?.price;
            const invalid = row.symbol.length > 0 && !isValidSymbol(row.symbol);
            const duplicate = duplicateKeys.has(key);
            return (
              <tr key={row.id} className={invalid ? 'bg-rose-50 dark:bg-rose-950/20' : ''}>
                <td className="border-b border-zinc-100 py-3 pr-3 align-top dark:border-zinc-900"><input className={`w-full rounded-md border px-3 py-2 uppercase dark:bg-zinc-900 ${invalid || duplicate ? 'border-rose-400' : 'border-zinc-300 dark:border-zinc-700'}`} value={row.symbol} onChange={(event) => { const nextSymbol = normalizeUserSymbol(event.target.value); const previousMarket = inferMarket(row.symbol); const nextMarket = row.symbol === '' || row.market === previousMarket ? inferMarket(nextSymbol) : row.market; updateRow(row.id, { symbol: nextSymbol, market: nextMarket }); }} placeholder="THYAO" />{duplicate ? <p className="mt-1 text-xs text-rose-600">Tekrar eden sembol; hesapta birleştirilir.</p> : null}{priceErrors[key] ? <p className="mt-1 text-xs text-amber-600">{priceErrors[key]}</p> : null}</td>
                <td className="border-b border-zinc-100 py-3 pr-3 dark:border-zinc-900"><MarketSelect value={row.market} onChange={(market) => updateRow(row.id, { market })} /></td>
                <td className="border-b border-zinc-100 py-3 pr-3 dark:border-zinc-900"><input className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" type="number" min="0" step="0.0001" value={row.quantity || ''} onChange={(event) => updateRow(row.id, { quantity: Number(event.target.value) })} /></td>
                <td className="border-b border-zinc-100 py-3 pr-3 dark:border-zinc-900">{quote ? <span>{formatMoney(quote.price, quote.currency)}<small className="block text-zinc-500">{quote.source}</small></span> : <span className="text-zinc-400">Yok</span>}</td>
                <td className="border-b border-zinc-100 py-3 pr-3 dark:border-zinc-900"><input className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" type="number" min="0" step="0.0001" value={row.manualPrice || ''} onChange={(event) => updateRow(row.id, { manualPrice: Number(event.target.value) || undefined })} placeholder={marketCurrency(row.market)} /></td>
                <td className="border-b border-zinc-100 py-3 pr-3 font-medium dark:border-zinc-900">{price && row.quantity > 0 ? formatMoney(price * row.quantity, marketCurrency(row.market)) : '-'}</td>
                <td className="border-b border-zinc-100 py-3 dark:border-zinc-900"><DeleteButton onClick={() => onChange(rows.length > 1 ? rows.filter((item) => item.id !== row.id) : [createCurrentRow()])} /></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </section>
  );
}

function Header({ title, subtitle, onAdd }: { title: string; subtitle: string; onAdd: () => void }) {
  return <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{title}</h2><p className="text-sm text-zinc-500">{subtitle}</p></div><button className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950" type="button" onClick={onAdd}><Plus className="h-4 w-4" />Satır ekle</button></div>;
}

function MarketSelect({ value, onChange }: { value: CurrentPosition['market']; onChange: (market: CurrentPosition['market']) => void }) {
  return <select className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" value={value} onChange={(event) => onChange(event.target.value as CurrentPosition['market'])}><option value="BIST">BIST</option><option value="US">US</option></select>;
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-500 hover:text-rose-600 dark:border-zinc-700" type="button" onClick={onClick} aria-label="Satırı sil"><Trash2 className="h-4 w-4" /></button>;
}

export function createCurrentRow(symbol = '', quantity = 0): CurrentPosition {
  return { id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, symbol, market: inferMarket(symbol), quantity };
}
