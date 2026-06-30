import type {
  AllocationItem,
  CurrentPosition,
  Market,
  PriceQuote,
  RebalanceResult,
  RebalanceSettings,
  TargetPosition,
  TradeAction,
  TradeRow,
} from '../types/portfolio';
import { convertAmount, fromMinorUnits, toMinorUnits } from './currency';
import { getSymbolKey, isValidSymbol, marketCurrency, normalizeUserSymbol } from './symbol';

export interface RebalanceInput {
  current: CurrentPosition[];
  target: TargetPosition[];
  prices: Record<string, PriceQuote>;
  settings: RebalanceSettings;
}

interface PositionBase {
  key: string;
  symbol: string;
  market: Market;
}

interface CurrentAggregate extends PositionBase {
  quantity: number;
}

interface TargetAggregate extends PositionBase {
  customWeight?: number;
}

const EPSILON = 0.000001;

export function calculateTargetWeights(target: TargetPosition[], mode: RebalanceSettings['weightMode'] = 'equal'): Record<string, number> {
  const uniqueTargets = aggregateTargets(target);
  const weights: Record<string, number> = {};
  if (uniqueTargets.length === 0) return weights;

  if (mode === 'custom') {
    const customTotal = uniqueTargets.reduce((sum, item) => sum + Math.max(item.customWeight ?? 0, 0), 0);
    if (customTotal > 0) {
      uniqueTargets.forEach((item) => {
        weights[item.key] = Math.max(item.customWeight ?? 0, 0) / customTotal;
      });
      return weights;
    }
  }

  const equalWeight = 1 / uniqueTargets.length;
  uniqueTargets.forEach((item) => {
    weights[item.key] = equalWeight;
  });
  return weights;
}

export function calculateRebalance(input: RebalanceInput): RebalanceResult {
  const issues: string[] = [];
  const current = aggregateCurrent(input.current);
  const target = aggregateTargets(input.target);
  const targetWeights = calculateTargetWeights(input.target, input.settings.weightMode);

  if (current.length === 0) issues.push('Mevcut portföy boş.');
  if (target.length === 0) issues.push('Hedef portföy boş.');

  const markets = new Set<Market>([...current.map((item) => item.market), ...target.map((item) => item.market)]);
  if (markets.size > 1 && input.settings.usdTryRate <= 0) {
    issues.push('BIST ve US birlikte kullanıldığında USD/TRY kuru gereklidir.');
  }

  const valueByKey = new Map<string, number>();
  const priceByKey = new Map<string, { convertedPrice: number; quote: PriceQuote }>();
  let totalValueMinor = 0;

  current.forEach((item) => {
    const priceInfo = resolvePrice(item.key, input.prices, input.settings);
    if (!priceInfo) {
      issues.push(`${item.symbol} için fiyat veya kur eksik.`);
      return;
    }
    const valueMinor = Math.round(toMinorUnits(priceInfo.convertedPrice) * item.quantity);
    totalValueMinor += valueMinor;
    valueByKey.set(item.key, valueMinor);
    priceByKey.set(item.key, priceInfo);
  });

  target.forEach((item) => {
    if (priceByKey.has(item.key)) return;
    const priceInfo = resolvePrice(item.key, input.prices, input.settings);
    if (!priceInfo) {
      issues.push(`${item.symbol} hedef hissesi için fiyat veya kur eksik.`);
      return;
    }
    priceByKey.set(item.key, priceInfo);
  });

  const currentByKey = new Map(current.map((item) => [item.key, item]));
  const targetByKey = new Map(target.map((item) => [item.key, item]));
  const keys = Array.from(new Set([...currentByKey.keys(), ...targetByKey.keys()])).sort();
  const trades: TradeRow[] = [];
  let saleTotalMinor = 0;
  let buyTotalMinor = 0;
  let postTotalMinor = 0;

  keys.forEach((key) => {
    const currentItem = currentByKey.get(key);
    const targetItem = targetByKey.get(key);
    const symbol = currentItem?.symbol ?? targetItem?.symbol ?? key.split(':')[1];
    const market = currentItem?.market ?? targetItem?.market ?? 'US';
    const currentQuantity = currentItem?.quantity ?? 0;
    const priceInfo = priceByKey.get(key);
    const priceMinor = priceInfo ? toMinorUnits(priceInfo.convertedPrice) : 0;
    const currentValueMinor = valueByKey.get(key) ?? 0;
    const targetWeight = targetItem ? targetWeights[key] ?? 0 : 0;
    const targetValueMinor = targetItem ? Math.round(totalValueMinor * targetWeight) : 0;
    const targetQuantity = getTargetQuantity(targetValueMinor, priceInfo?.convertedPrice, market, input.settings, Boolean(targetItem));
    const quantityDiff = targetQuantity - currentQuantity;
    const estimatedAmountMinor = priceMinor > 0 ? Math.round(Math.abs(quantityDiff) * priceMinor) : 0;
    const postValueMinor = priceMinor > 0 ? Math.round(targetQuantity * priceMinor) : 0;
    const action = getTradeAction(currentQuantity, targetQuantity, quantityDiff, Boolean(targetItem), Boolean(priceInfo));

    if (quantityDiff < -EPSILON) saleTotalMinor += estimatedAmountMinor;
    if (quantityDiff > EPSILON) buyTotalMinor += estimatedAmountMinor;
    postTotalMinor += postValueMinor;

    trades.push({
      key,
      symbol,
      market,
      currentQuantity,
      targetQuantity,
      quantityDiff,
      action,
      price: priceInfo?.convertedPrice,
      displayPrice: priceInfo?.quote.price,
      priceCurrency: priceInfo?.quote.currency ?? marketCurrency(market),
      estimatedAmount: fromMinorUnits(estimatedAmountMinor),
      currentValue: fromMinorUnits(currentValueMinor),
      targetValue: fromMinorUnits(targetValueMinor),
      postValue: fromMinorUnits(postValueMinor),
      currentWeight: totalValueMinor > 0 ? currentValueMinor / totalValueMinor : 0,
      targetWeight,
      postWeight: totalValueMinor > 0 ? postValueMinor / totalValueMinor : 0,
      weightDiff: targetWeight - (totalValueMinor > 0 ? currentValueMinor / totalValueMinor : 0),
      note: buildNote(action, Boolean(priceInfo)),
    });
  });

  const totalValue = fromMinorUnits(totalValueMinor);
  const remainingCash = fromMinorUnits(Math.max(totalValueMinor - postTotalMinor, 0));
  const postAllocations = trades
    .filter((item) => item.postValue > 0)
    .map((item) => allocation(item.key, item.symbol, item.market, item.postValue, totalValue));
  if (remainingCash > 0) postAllocations.push(allocation('CASH', 'Nakit', 'BIST', remainingCash, totalValue));

  return {
    isComplete: issues.length === 0,
    issues,
    totalValue,
    currentCount: current.length,
    targetCount: target.length,
    saleTotal: fromMinorUnits(saleTotalMinor),
    buyTotal: fromMinorUnits(buyTotalMinor),
    remainingCash,
    currentAllocations: current.map((item) => allocation(item.key, item.symbol, item.market, fromMinorUnits(valueByKey.get(item.key) ?? 0), totalValue)),
    targetAllocations: target.map((item) => allocation(item.key, item.symbol, item.market, fromMinorUnits(Math.round(totalValueMinor * (targetWeights[item.key] ?? 0))), totalValue)),
    postAllocations,
    trades,
  };
}

function resolvePrice(key: string, prices: Record<string, PriceQuote>, settings: RebalanceSettings) {
  const quote = prices[key];
  if (!quote || quote.price <= 0) return null;
  const convertedPrice = convertAmount(quote.price, quote.currency, settings.baseCurrency, settings.usdTryRate);
  if (!convertedPrice || convertedPrice <= 0) return null;
  return { convertedPrice, quote };
}

function aggregateCurrent(rows: CurrentPosition[]): CurrentAggregate[] {
  const map = new Map<string, CurrentAggregate>();
  rows.forEach((row) => {
    const symbol = normalizeUserSymbol(row.symbol);
    if (!isValidSymbol(symbol) || row.quantity <= 0) return;
    const key = getSymbolKey(symbol, row.market);
    const existing = map.get(key);
    if (existing) existing.quantity += row.quantity;
    else map.set(key, { key, symbol, market: row.market, quantity: row.quantity });
  });
  return Array.from(map.values());
}

function aggregateTargets(rows: TargetPosition[]): TargetAggregate[] {
  const map = new Map<string, TargetAggregate>();
  rows.forEach((row) => {
    const symbol = normalizeUserSymbol(row.symbol);
    if (!isValidSymbol(symbol)) return;
    const key = getSymbolKey(symbol, row.market);
    if (!map.has(key)) map.set(key, { key, symbol, market: row.market, customWeight: row.customWeight });
  });
  return Array.from(map.values());
}

function getTargetQuantity(targetValueMinor: number, convertedPrice: number | undefined, market: Market, settings: RebalanceSettings, hasTarget: boolean): number {
  if (!hasTarget || !convertedPrice || convertedPrice <= 0) return 0;
  const exactQuantity = fromMinorUnits(targetValueMinor) / convertedPrice;
  if (settings.fractionalShares && market === 'US') return Math.floor(exactQuantity * 10_000) / 10_000;
  return Math.floor(exactQuantity + EPSILON);
}

function getTradeAction(currentQuantity: number, targetQuantity: number, quantityDiff: number, hasTarget: boolean, hasPrice: boolean): TradeAction {
  if (!hasTarget && currentQuantity > 0) return 'SELL_ALL';
  if (!hasPrice) return 'MISSING_PRICE';
  if (Math.abs(quantityDiff) <= EPSILON) return 'HOLD';
  if (currentQuantity === 0 && quantityDiff > EPSILON) return 'BUY_NEW';
  return quantityDiff > 0 ? 'BUY' : 'SELL';
}

function buildNote(action: TradeAction, hasPrice: boolean): string {
  if (!hasPrice && action !== 'SELL_ALL') return 'Fiyat eksik; manuel fiyat girin';
  if (action === 'SELL_ALL') return 'Hedef portföyde yok, tamamen satılacak';
  if (action === 'BUY_NEW') return 'Yeni hedef hisse, alım yapılacak';
  if (action === 'BUY') return 'Hedef ağırlığa ulaşmak için ek alım';
  if (action === 'SELL') return 'Hedef ağırlığı aşmış, kısmi satış';
  return 'İşlem gerekmiyor';
}

function allocation(key: string, symbol: string, market: Market, value: number, total: number): AllocationItem {
  return { key, symbol, market, value, weight: total > 0 ? value / total : 0 };
}
