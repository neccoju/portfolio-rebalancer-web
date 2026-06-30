import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, Download, FileJson, RotateCcw, Upload } from 'lucide-react';
import { AllocationCharts } from './components/AllocationCharts';
import { Disclaimer } from './components/Disclaimer';
import { PortfolioInput, createCurrentRow } from './components/PortfolioInput';
import { SettingsPanel } from './components/SettingsPanel';
import { SummaryCards } from './components/SummaryCards';
import { TargetPortfolioInput, createTargetRow } from './components/TargetPortfolioInput';
import { TradeTable } from './components/TradeTable';
import { downloadTextFile, tradesToCsv } from './lib/csv';
import { fetchLiveQuote, fetchUsdTryRate, getQuoteFromCache, loadCachedPrices, quoteKey } from './lib/priceService';
import { calculateRebalance, calculateTargetWeights } from './lib/rebalance';
import { clearStoredState, loadStoredState, saveStoredState } from './lib/storage';
import { getSymbolKey, isValidSymbol, marketCurrency, normalizeUserSymbol } from './lib/symbol';
import type { CurrentPosition, Market, PersistedAppState, PriceCacheFile, PriceQuote, RebalanceSettings, TargetPosition } from './types/portfolio';

const DEFAULT_SETTINGS: RebalanceSettings = { baseCurrency: 'TRY', usdTryRate: 0, fractionalShares: false, weightMode: 'equal' };

export default function App() {
  const stored = useMemo(() => loadStoredState(), []);
  const [current, setCurrent] = useState<CurrentPosition[]>(stored?.current ?? [createCurrentRow()]);
  const [target, setTarget] = useState<TargetPosition[]>(stored?.target ?? [createTargetRow()]);
  const [settings, setSettings] = useState<RebalanceSettings>(stored?.settings ?? DEFAULT_SETTINGS);
  const [darkMode, setDarkMode] = useState(stored?.darkMode ?? false);
  const [priceCache, setPriceCache] = useState<PriceCacheFile | null>(null);
  const [autoQuotes, setAutoQuotes] = useState<Record<string, PriceQuote>>({});
  const [priceErrors, setPriceErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const attemptedLiveKeys = useRef(new Set<string>());

  const allSymbols = useMemo(() => collectSymbols(current, target), [current, target]);
  const manualQuotes = useMemo(() => buildManualQuotes(current, target), [current, target]);
  const prices = useMemo(() => ({ ...autoQuotes, ...manualQuotes }), [autoQuotes, manualQuotes]);
  const result = useMemo(() => calculateRebalance({ current, target, prices, settings }), [current, target, prices, settings]);
  const equalWeight = useMemo(() => Object.values(calculateTargetWeights(target, settings.weightMode))[0] ?? 0, [target, settings.weightMode]);
  const currentDuplicateKeys = useMemo(() => findDuplicateKeys(current), [current]);
  const targetDuplicateKeys = useMemo(() => findDuplicateKeys(target), [target]);
  const requiresFx = useMemo(() => new Set(allSymbols.map((item) => item.market)).size > 1, [allSymbols]);

  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); }, [darkMode]);
  useEffect(() => { saveStoredState({ current, target, settings, darkMode }); }, [current, target, settings, darkMode]);

  useEffect(() => {
    let active = true;
    loadCachedPrices().then((cache) => {
      if (!active) return;
      setPriceCache(cache);
      if (cache.fx?.USDTRY?.rate && cache.fx.USDTRY.rate > 0) setSettings((previous) => previous.usdTryRate > 0 ? previous : { ...previous, usdTryRate: cache.fx?.USDTRY?.rate ?? previous.usdTryRate });
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!priceCache) return;
    setAutoQuotes((previous) => {
      let changed = false;
      const next = { ...previous };
      allSymbols.forEach((item) => {
        const cached = getQuoteFromCache(priceCache, item.symbol, item.market);
        if (cached && (!next[item.key] || next[item.key].source === 'cache')) { next[item.key] = cached; changed = true; }
      });
      return changed ? next : previous;
    });
  }, [allSymbols, priceCache]);

  const refreshPrices = useCallback(async (symbols = allSymbols, showNotice = true) => {
    const validSymbols = symbols.filter((item) => isValidSymbol(item.symbol));
    if (validSymbols.length === 0) { setNotice('Fiyat yenilemek için geçerli sembol girin.'); return; }
    setIsRefreshing(true);
    const nextErrors: Record<string, string> = {};
    for (const item of validSymbols) {
      try {
        const quote = await fetchLiveQuote(item.symbol, item.market);
        setAutoQuotes((previous) => ({ ...previous, [quoteKey(quote)]: quote }));
      } catch (error) {
        nextErrors[item.key] = error instanceof Error ? error.message : 'Canlı fiyat alınamadı.';
      }
    }
    setPriceErrors((previous) => ({ ...previous, ...nextErrors }));
    setIsRefreshing(false);
    if (showNotice) setNotice(Object.keys(nextErrors).length > 0 ? 'Bazı canlı fiyatlar alınamadı; manuel fiyat fallback kullanılabilir.' : 'Fiyatlar güncellendi.');
  }, [allSymbols]);

  useEffect(() => {
    if (!priceCache) return;
    const missing = allSymbols.filter((item) => !manualQuotes[item.key] && !autoQuotes[item.key] && !attemptedLiveKeys.current.has(item.key));
    if (missing.length === 0) return;
    const timer = window.setTimeout(() => {
      missing.forEach((item) => attemptedLiveKeys.current.add(item.key));
      void refreshPrices(missing, false);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [allSymbols, autoQuotes, manualQuotes, priceCache, refreshPrices]);

  const refreshFx = async () => {
    try {
      const rate = await fetchUsdTryRate();
      setSettings((previous) => ({ ...previous, usdTryRate: rate }));
      setNotice('USD/TRY kuru güncellendi.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'USD/TRY kuru alınamadı. Manuel kur girebilirsiniz.');
    }
  };

  const loadSample = () => {
    setCurrent([
      { ...createCurrentRow('THYAO', 100), manualPrice: 300 }, { ...createCurrentRow('BIMAS', 20), manualPrice: 500 }, { ...createCurrentRow('KCHOL', 50), manualPrice: 200 },
      { ...createCurrentRow('AAPL', 10), market: 'US', manualPrice: 200 }, { ...createCurrentRow('NVDA', 5), market: 'US', manualPrice: 120 },
    ]);
    setTarget([
      { ...createTargetRow('THYAO'), manualPrice: 300 }, { ...createTargetRow('ASELS'), manualPrice: 80 }, { ...createTargetRow('TUPRS'), manualPrice: 180 },
      { ...createTargetRow('AAPL'), market: 'US', manualPrice: 200 }, { ...createTargetRow('MSFT'), market: 'US', manualPrice: 430 }, { ...createTargetRow('NVDA'), market: 'US', manualPrice: 120 },
    ]);
    setSettings({ ...DEFAULT_SETTINGS, usdTryRate: 32.5 });
    setNotice('Örnek portföy temsili manuel fiyatlarla yüklendi.');
  };

  const clearAll = () => { setCurrent([createCurrentRow()]); setTarget([createTargetRow()]); setSettings(DEFAULT_SETTINGS); setNotice(null); setPriceErrors({}); clearStoredState(); };
  const exportJson = () => downloadTextFile('portfolio-rebalancer-state.json', JSON.stringify({ current, target, settings, darkMode }, null, 2), 'application/json');
  const importJson = (file: File) => { const reader = new FileReader(); reader.onload = () => { try { const parsed = JSON.parse(String(reader.result)) as PersistedAppState; setCurrent(Array.isArray(parsed.current) ? parsed.current : [createCurrentRow()]); setTarget(Array.isArray(parsed.target) ? parsed.target : [createTargetRow()]); setSettings(parsed.settings ?? DEFAULT_SETTINGS); setDarkMode(Boolean(parsed.darkMode)); setNotice('JSON içe aktarıldı.'); } catch { setNotice('JSON dosyası okunamadı.'); } }; reader.readAsText(file); };

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-semibold uppercase text-teal-700 dark:text-teal-300">Matematiksel rebalancing hesaplayıcısı</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Portfolio Rebalancer</h1><p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">Mevcut portföyünüzü ve hedef sembolleri girin; uygulama eşit ağırlıklı hedefe göre alınacak ve satılacak lotları hesaplar.</p></div><div className="flex flex-wrap gap-2"><ToolbarButton onClick={loadSample} icon={<RotateCcw className="h-4 w-4" />}>Örnek portföy</ToolbarButton><ToolbarButton onClick={exportJson} icon={<Download className="h-4 w-4" />}>JSON dışa aktar</ToolbarButton><ToolbarButton onClick={() => importInputRef.current?.click()} icon={<Upload className="h-4 w-4" />}>JSON içe aktar</ToolbarButton><ToolbarButton onClick={clearAll} icon={<FileJson className="h-4 w-4" />}>Temizle</ToolbarButton><button className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white" type="button" onClick={() => setNotice(result.issues[0] ?? 'Hesaplama güncel.')}><Calculator className="h-4 w-4" />Hesapla</button><input ref={importInputRef} className="hidden" type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) importJson(file); event.currentTarget.value = ''; }} /></div></div><Disclaimer /></div></div>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">{notice ? <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-100">{notice}</div> : null}{result.issues[0] ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">{result.issues[0]}</div> : null}<SettingsPanel settings={settings} darkMode={darkMode} requiresFx={requiresFx} isRefreshing={isRefreshing} onSettingsChange={setSettings} onDarkModeChange={setDarkMode} onRefreshPrices={() => void refreshPrices(allSymbols, true)} onRefreshFx={() => void refreshFx()} /><div className="grid gap-5 2xl:grid-cols-2"><PortfolioInput rows={current} quotes={autoQuotes} duplicateKeys={currentDuplicateKeys} priceErrors={priceErrors} onChange={setCurrent} /><TargetPortfolioInput rows={target} quotes={autoQuotes} duplicateKeys={targetDuplicateKeys} priceErrors={priceErrors} weightMode={settings.weightMode} equalWeight={equalWeight} onChange={setTarget} /></div><SummaryCards result={result} currency={settings.baseCurrency} /><AllocationCharts result={result} currency={settings.baseCurrency} /><TradeTable trades={result.trades} currency={settings.baseCurrency} onDownloadCsv={() => downloadTextFile('rebalance-trades.csv', tradesToCsv(result.trades), 'text/csv;charset=utf-8')} /><Disclaimer /></div>
    </main>
  );
}

function ToolbarButton({ children, icon, onClick }: { children: string; icon: JSX.Element; onClick: () => void }) {
  return <button className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800" type="button" onClick={onClick}>{icon}{children}</button>;
}

interface SymbolItem { key: string; symbol: string; market: Market }
function collectSymbols(current: CurrentPosition[], target: TargetPosition[]): SymbolItem[] { const map = new Map<string, SymbolItem>(); [...current, ...target].forEach((row) => { const symbol = normalizeUserSymbol(row.symbol); if (!isValidSymbol(symbol)) return; const key = getSymbolKey(symbol, row.market); map.set(key, { key, symbol, market: row.market }); }); return Array.from(map.values()); }
function findDuplicateKeys(rows: Array<CurrentPosition | TargetPosition>): Set<string> { const counts = new Map<string, number>(); rows.forEach((row) => { const symbol = normalizeUserSymbol(row.symbol); if (!isValidSymbol(symbol)) return; const key = getSymbolKey(symbol, row.market); counts.set(key, (counts.get(key) ?? 0) + 1); }); return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([key]) => key)); }
function buildManualQuotes(current: CurrentPosition[], target: TargetPosition[]): Record<string, PriceQuote> { const quotes: Record<string, PriceQuote> = {}; [...current, ...target].forEach((row) => { const symbol = normalizeUserSymbol(row.symbol); if (!isValidSymbol(symbol) || !row.manualPrice || row.manualPrice <= 0) return; quotes[getSymbolKey(symbol, row.market)] = { symbol, market: row.market, price: row.manualPrice, currency: marketCurrency(row.market), source: 'manual', provider: 'manual' }; }); return quotes; }
