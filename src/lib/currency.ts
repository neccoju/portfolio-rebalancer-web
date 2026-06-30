import type { Currency } from '../types/portfolio';

export function toMinorUnits(value: number): number {
  return Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 100) : 0;
}

export function fromMinorUnits(value: number): number {
  return Math.round(value) / 100;
}

export function convertAmount(amount: number, from: Currency, to: Currency, usdTryRate: number): number | null {
  if (!Number.isFinite(amount)) return null;
  if (from === to) return amount;
  if (!Number.isFinite(usdTryRate) || usdTryRate <= 0) return null;
  return from === 'USD' && to === 'TRY' ? amount * usdTryRate : amount / usdTryRate;
}

export function formatMoney(value: number, currency: Currency): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(
    Number.isFinite(value) ? value : 0,
  );
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits }).format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('tr-TR', { style: 'percent', maximumFractionDigits }).format(
    Number.isFinite(value) ? value : 0,
  );
}
