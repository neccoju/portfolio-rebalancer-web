import type { TradeRow } from '../types/portfolio';

const HEADERS = ['Sembol', 'Piyasa', 'Mevcut lot', 'Hedef lot', 'Islem', 'Lot farki', 'Fiyat', 'Tahmini tutar', 'Mevcut agirlik', 'Hedef agirlik', 'Fark', 'Not'];

export function tradesToCsv(trades: TradeRow[]): string {
  const rows = trades.map((trade) => [
    trade.symbol,
    trade.market,
    trade.currentQuantity,
    trade.targetQuantity,
    trade.action,
    trade.quantityDiff,
    trade.displayPrice ?? '',
    trade.estimatedAmount,
    trade.currentWeight,
    trade.targetWeight,
    trade.weightDiff,
    trade.note,
  ]);
  return [HEADERS, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
}
