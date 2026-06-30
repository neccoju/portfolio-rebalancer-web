import { Moon, RefreshCw, Sun } from 'lucide-react';
import type { RebalanceSettings } from '../types/portfolio';

interface Props {
  settings: RebalanceSettings;
  darkMode: boolean;
  requiresFx: boolean;
  isRefreshing: boolean;
  onSettingsChange: (settings: RebalanceSettings) => void;
  onDarkModeChange: (enabled: boolean) => void;
  onRefreshPrices: () => void;
  onRefreshFx: () => void;
}

export function SettingsPanel({ settings, darkMode, requiresFx, isRefreshing, onSettingsChange, onDarkModeChange, onRefreshPrices, onRefreshFx }: Props) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-soft dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-200">Ana para birimi</span>
          <select className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" value={settings.baseCurrency} onChange={(event) => onSettingsChange({ ...settings, baseCurrency: event.target.value as 'TRY' | 'USD' })}>
            <option value="TRY">TRY</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-200">USD/TRY kuru {requiresFx ? '' : '(opsiyonel)'}</span>
          <div className="flex gap-2">
            <input className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" type="number" min="0" step="0.0001" value={settings.usdTryRate || ''} onChange={(event) => onSettingsChange({ ...settings, usdTryRate: Number(event.target.value) })} placeholder="örn. 32.5000" />
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-700" type="button" onClick={onRefreshFx} title="USD/TRY kurunu yenile" aria-label="USD/TRY kurunu yenile">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </label>
        <label className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
          <span><span className="block font-medium">Fractional shares</span><span className="text-xs text-zinc-500">Sadece US hisseleri</span></span>
          <input className="h-5 w-5 accent-teal-600" type="checkbox" checked={settings.fractionalShares} onChange={(event) => onSettingsChange({ ...settings, fractionalShares: event.target.checked })} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-200">Hedef ağırlık modu</span>
          <select className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" value={settings.weightMode} onChange={(event) => onSettingsChange({ ...settings, weightMode: event.target.value as 'equal' | 'custom' })}>
            <option value="equal">Eşit Ağırlık</option>
            <option value="custom">Özel Ağırlık</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-wait" type="button" onClick={onRefreshPrices} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />Fiyatları yenile
          </button>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-700" type="button" onClick={() => onDarkModeChange(!darkMode)} aria-label="Tema değiştir">
            {darkMode ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </section>
  );
}
