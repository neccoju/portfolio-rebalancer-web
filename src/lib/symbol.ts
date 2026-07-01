import type { Market } from '../types/portfolio';

const KNOWN_BIST_SYMBOLS = new Set([
  'AEFES', 'AKBNK', 'ASELS', 'BIMAS', 'EREGL', 'ESCOM', 'FROTO', 'GARAN',
  'ISCTR', 'ISGSY', 'KCHOL', 'PETKM', 'PGSUS', 'SAHOL', 'SISE', 'TAVHL',
  'TCELL', 'THYAO', 'TOASO', 'TUPRS', 'YKBNK',
]);

export function normalizeUserSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.IS$/u, '');
}

export function displaySymbol(symbol: string): string {
  return normalizeUserSymbol(symbol);
}

export function isValidSymbol(symbol: string): boolean {
  return /^[A-Z0-9.-]{1,12}$/u.test(normalizeUserSymbol(symbol));
}

export function inferMarket(symbol: string): Market {
  return KNOWN_BIST_SYMBOLS.has(normalizeUserSymbol(symbol)) ? 'BIST' : 'US';
}

export function getSymbolKey(symbol: string, market: Market): string {
  return `${market}:${normalizeUserSymbol(symbol)}`;
}

export function toYahooSymbol(symbol: string, market: Market): string {
  const normalized = normalizeUserSymbol(symbol);
  return market === 'BIST' ? `${normalized}.IS` : normalized;
}

export function marketCurrency(market: Market): 'TRY' | 'USD' {
  return market === 'BIST' ? 'TRY' : 'USD';
}
