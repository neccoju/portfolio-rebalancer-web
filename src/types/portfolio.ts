export type Market = 'BIST' | 'US';
export type Currency = 'TRY' | 'USD';
export type PriceSource = 'cache' | 'live' | 'manual' | 'missing';
export type TradeAction = 'BUY' | 'SELL' | 'SELL_ALL' | 'BUY_NEW' | 'HOLD' | 'MISSING_PRICE';
export type WeightMode = 'equal' | 'custom';

export interface CurrentPosition {
  id: string;
  symbol: string;
  market: Market;
  quantity: number;
  manualPrice?: number;
}

export interface TargetPosition {
  id: string;
  symbol: string;
  market: Market;
  manualPrice?: number;
  customWeight?: number;
}

export interface PriceQuote {
  symbol: string;
  market: Market;
  price: number;
  currency: Currency;
  source: PriceSource;
  updatedAt?: string;
  provider?: string;
}

export interface PriceCacheFile {
  generatedAt: string | null;
  source?: string;
  quotes: Record<string, PriceQuote>;
  fx?: {
    USDTRY?: {
      rate: number;
      source: PriceSource;
      updatedAt?: string;
      provider?: string;
    };
  };
}

export interface RebalanceSettings {
  baseCurrency: Currency;
  usdTryRate: number;
  fractionalShares: boolean;
  weightMode: WeightMode;
}

export interface AllocationItem {
  key: string;
  symbol: string;
  market: Market;
  value: number;
  weight: number;
}

export interface TradeRow {
  key: string;
  symbol: string;
  market: Market;
  currentQuantity: number;
  targetQuantity: number;
  quantityDiff: number;
  action: TradeAction;
  price?: number;
  displayPrice?: number;
  priceCurrency: Currency;
  estimatedAmount: number;
  currentValue: number;
  targetValue: number;
  postValue: number;
  currentWeight: number;
  targetWeight: number;
  postWeight: number;
  weightDiff: number;
  note: string;
}

export interface RebalanceResult {
  isComplete: boolean;
  issues: string[];
  totalValue: number;
  currentCount: number;
  targetCount: number;
  saleTotal: number;
  buyTotal: number;
  remainingCash: number;
  currentAllocations: AllocationItem[];
  targetAllocations: AllocationItem[];
  postAllocations: AllocationItem[];
  trades: TradeRow[];
}

export interface PersistedAppState {
  current: CurrentPosition[];
  target: TargetPosition[];
  settings: RebalanceSettings;
  darkMode: boolean;
}
