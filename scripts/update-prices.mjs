import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cachePath = resolve(rootDir, 'public', 'prices.json');
const symbolsPath = resolve(rootDir, 'scripts', 'symbols.json');
const symbols = await readJson(symbolsPath, []);
const existing = await readJson(cachePath, { generatedAt: null, source: 'empty-cache', quotes: {}, fx: {} });
const next = { generatedAt: existing.generatedAt ?? null, source: 'github-actions-price-cache', quotes: { ...(existing.quotes ?? {}) }, fx: { ...(existing.fx ?? {}) } };
let updated = false;

for (const item of symbols) {
  try {
    const quote = await fetchQuote(item.symbol, item.market);
    next.quotes[`${quote.market}:${quote.symbol}`] = quote;
    updated = true;
    console.log(`Updated ${quote.market}:${quote.symbol}`);
  } catch (error) {
    console.warn(`Could not update ${item.market}:${item.symbol}: ${error.message}`);
  }
}

try {
  const rate = await fetchYahooPrice('TRY=X');
  next.fx.USDTRY = { rate, source: 'live', provider: 'Yahoo Finance', updatedAt: new Date().toISOString() };
  updated = true;
  console.log(`Updated USDTRY = ${rate}`);
} catch (error) {
  console.warn(`Could not update USDTRY: ${error.message}`);
}

if (updated) {
  next.generatedAt = new Date().toISOString();
  await writeFile(cachePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
} else {
  console.warn('No prices were updated. Existing public/prices.json was left unchanged.');
}

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
}

async function fetchQuote(symbol, market) {
  const normalizedSymbol = String(symbol).trim().toUpperCase().replace(/\.IS$/, '');
  const normalizedMarket = market === 'BIST' ? 'BIST' : 'US';
  const yahooSymbol = normalizedMarket === 'BIST' ? `${normalizedSymbol}.IS` : normalizedSymbol;

  try {
    const price = await fetchYahooPrice(yahooSymbol);
    return { symbol: normalizedSymbol, market: normalizedMarket, price, currency: normalizedMarket === 'BIST' ? 'TRY' : 'USD', source: 'cache', provider: 'Yahoo Finance', updatedAt: new Date().toISOString() };
  } catch (error) {
    if (normalizedMarket !== 'BIST') throw error;
    const price = await fetchTradingViewPrice(normalizedSymbol);
    return { symbol: normalizedSymbol, market: 'BIST', price, currency: 'TRY', source: 'cache', provider: 'TradingView Scanner', updatedAt: new Date().toISOString() };
  }
}

async function fetchYahooPrice(yahooSymbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1d`;
  const response = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'portfolio-rebalancer-web price cache' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const json = await response.json();
  const result = json.chart?.result?.[0];
  const price = result?.meta?.regularMarketPrice ?? result?.meta?.previousClose;
  if (!price || price <= 0) throw new Error(json.chart?.error?.description ?? 'price missing');
  return price;
}

async function fetchTradingViewPrice(symbol) {
  const response = await fetch('https://scanner.tradingview.com/turkey/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json', 'user-agent': 'portfolio-rebalancer-web price cache' },
    body: JSON.stringify({
      symbols: { tickers: [`BIST:${symbol}`], query: { types: [] } },
      columns: ['name', 'close', 'currency'],
    }),
  });

  if (!response.ok) throw new Error(`TradingView HTTP ${response.status}`);
  const json = await response.json();
  const price = json.data?.[0]?.d?.[1];
  if (!price || price <= 0) throw new Error('TradingView price missing');
  return price;
}
