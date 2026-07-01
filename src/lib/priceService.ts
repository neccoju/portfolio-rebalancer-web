import type { Market, PriceCacheFile, PriceQuote } from '../types/portfolio';
import { getSymbolKey, marketCurrency, normalizeUserSymbol, toYahooSymbol } from './symbol';

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        currency?: string;
      };
    }>;
    error?: { description?: string };
  };
}

interface TradingViewScanResponse {
  data?: Array<{
    s: string;
    d: [string, number | null, string | null];
  }>;
}

const EMPTY_CACHE: PriceCacheFile = { generatedAt: null, source: 'empty-cache', quotes: {}, fx: {} };

export async function loadCachedPrices(): Promise<PriceCacheFile> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}prices.json`, { cache: 'no-cache' });
    if (!response.ok) return EMPTY_CACHE;
    const data = (await response.json()) as PriceCacheFile;
    return { generatedAt: data.generatedAt ?? null, source: data.source, quotes: data.quotes ?? {}, fx: data.fx ?? {} };
  } catch {
    return EMPTY_CACHE;
  }
}

export function getQuoteFromCache(cache: PriceCacheFile, symbol: string, market: Market): PriceQuote | undefined {
  const quote = cache.quotes[getSymbolKey(symbol, market)];
  return quote ? { ...quote, symbol: normalizeUserSymbol(quote.symbol || symbol), market, source: 'cache' } : undefined;
}

export async function fetchLiveQuote(symbol: string, market: Market): Promise<PriceQuote> {
  const normalized = normalizeUserSymbol(symbol);
  try {
    return await fetchYahooQuote(normalized, market);
  } catch (error) {
    if (market === 'BIST') {
      try {
        return await fetchTradingViewQuote(normalized);
      } catch {
        // Keep the original Yahoo error because it is usually clearer for the UI.
      }
    }
    throw error instanceof Error ? error : new Error(`${normalized} için canlı fiyat alınamadı.`);
  }
}

export async function fetchUsdTryRate(): Promise<number> {
  const response = await fetchWithCorsFallback('https://query1.finance.yahoo.com/v8/finance/chart/TRY=X?range=1d&interval=1d');
  const json = (await response.json()) as YahooChartResponse;
  const rate = json.chart?.result?.[0]?.meta?.regularMarketPrice ?? json.chart?.result?.[0]?.meta?.previousClose;
  if (!rate || rate <= 0) throw new Error('USD/TRY kuru alınamadı. Manuel kur girebilirsiniz.');
  return rate;
}

export function quoteKey(quote: Pick<PriceQuote, 'symbol' | 'market'>): string {
  return getSymbolKey(quote.symbol, quote.market);
}

async function fetchYahooQuote(symbol: string, market: Market): Promise<PriceQuote> {
  const yahooSymbol = toYahooSymbol(symbol, market);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1d`;
  const response = await fetchWithCorsFallback(url);
  const json = (await response.json()) as YahooChartResponse;
  const result = json.chart?.result?.[0];
  const price = result?.meta?.regularMarketPrice ?? result?.meta?.previousClose;
  if (!price || price <= 0) throw new Error(json.chart?.error?.description ?? `${symbol} için canlı fiyat alınamadı.`);
  return {
    symbol,
    market,
    price,
    currency: result?.meta?.currency === 'TRY' ? 'TRY' : marketCurrency(market),
    source: 'live',
    provider: 'Yahoo Finance',
    updatedAt: new Date().toISOString(),
  };
}

async function fetchTradingViewQuote(symbol: string): Promise<PriceQuote> {
  const response = await fetch('https://scanner.tradingview.com/turkey/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbols: { tickers: [`BIST:${symbol}`], query: { types: [] } },
      columns: ['name', 'close', 'currency'],
    }),
  });

  if (!response.ok) throw new Error(`${symbol} için TradingView fiyatı alınamadı.`);
  const json = (await response.json()) as TradingViewScanResponse;
  const row = json.data?.[0];
  const price = row?.d?.[1];
  if (!price || price <= 0) throw new Error(`${symbol} için TradingView fiyatı alınamadı.`);

  return {
    symbol,
    market: 'BIST',
    price,
    currency: 'TRY',
    source: 'live',
    provider: 'TradingView Scanner',
    updatedAt: new Date().toISOString(),
  };
}

async function fetchWithCorsFallback(url: string): Promise<Response> {
  try {
    const direct = await fetch(url);
    if (direct.ok) return direct;
  } catch {
    // Browser CORS can block no-key finance endpoints on static hosting.
  }
  const proxied = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
  if (!proxied.ok) throw new Error('Canlı fiyat servisine ulaşılamadı. Manuel fiyat girebilirsiniz.');
  return proxied;
}
