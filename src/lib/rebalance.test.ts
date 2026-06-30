import { describe, expect, it } from 'vitest';
import type { CurrentPosition, Market, PriceQuote, RebalanceSettings, TargetPosition } from '../types/portfolio';
import { calculateRebalance, calculateTargetWeights } from './rebalance';
import { getSymbolKey } from './symbol';

const baseSettings: RebalanceSettings = { baseCurrency: 'USD', usdTryRate: 30, fractionalShares: false, weightMode: 'equal' };

describe('calculateTargetWeights', () => {
  it('sets each target to 25% when there are 4 target symbols', () => {
    Object.values(calculateTargetWeights(targets(['AAPL', 'MSFT', 'NVDA', 'VOO'], 'US'))).forEach((weight) => expect(weight).toBeCloseTo(0.25));
  });
  it('sets each target to 20% when there are 5 target symbols', () => {
    Object.values(calculateTargetWeights(targets(['AAPL', 'MSFT', 'NVDA', 'VOO', 'QQQM'], 'US'))).forEach((weight) => expect(weight).toBeCloseTo(0.2));
  });
  it('sets each target to 10% when there are 10 target symbols', () => {
    Object.values(calculateTargetWeights(targets(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'], 'US'))).forEach((weight) => expect(weight).toBeCloseTo(0.1));
  });
});

describe('calculateRebalance', () => {
  it('sells all shares when a current symbol is not in the target portfolio', () => {
    const result = calculateRebalance({ current: positions([{ symbol: 'AAPL', quantity: 10, market: 'US' }]), target: targets(['MSFT'], 'US'), prices: priceMap([quote('AAPL', 'US', 10), quote('MSFT', 'US', 5)]), settings: baseSettings });
    expect(result.trades.find((trade) => trade.symbol === 'AAPL')?.action).toBe('SELL_ALL');
  });
  it('marks target-only symbols as new buys', () => {
    const result = calculateRebalance({ current: positions([{ symbol: 'AAPL', quantity: 10, market: 'US' }]), target: targets(['MSFT'], 'US'), prices: priceMap([quote('AAPL', 'US', 10), quote('MSFT', 'US', 5)]), settings: baseSettings });
    expect(result.trades.find((trade) => trade.symbol === 'MSFT')?.action).toBe('BUY_NEW');
  });
  it('calculates a partial buy for a shared symbol below target weight', () => {
    const result = calculateRebalance({ current: positions([{ symbol: 'AAPL', quantity: 5, market: 'US' }, { symbol: 'MSFT', quantity: 10, market: 'US' }]), target: targets(['AAPL'], 'US'), prices: priceMap([quote('AAPL', 'US', 10), quote('MSFT', 'US', 5)]), settings: baseSettings });
    expect(result.trades.find((trade) => trade.symbol === 'AAPL')?.quantityDiff).toBe(5);
  });
  it('calculates a partial sell for a shared symbol above target weight', () => {
    const result = calculateRebalance({ current: positions([{ symbol: 'AAPL', quantity: 20, market: 'US' }]), target: targets(['AAPL', 'MSFT'], 'US'), prices: priceMap([quote('AAPL', 'US', 10), quote('MSFT', 'US', 10)]), settings: baseSettings });
    expect(result.trades.find((trade) => trade.symbol === 'AAPL')?.quantityDiff).toBe(-10);
  });
  it('accounts for whole-share rounding and remaining cash', () => {
    const result = calculateRebalance({ current: positions([{ symbol: 'AAPL', quantity: 1, market: 'US' }]), target: targets(['MSFT'], 'US'), prices: priceMap([quote('AAPL', 'US', 1000), quote('MSFT', 'US', 333)]), settings: baseSettings });
    expect(result.trades.find((trade) => trade.symbol === 'MSFT')?.targetQuantity).toBe(3);
    expect(result.remainingCash).toBe(1);
  });
  it('allows fractional US shares when fractional shares are enabled', () => {
    const result = calculateRebalance({ current: positions([{ symbol: 'AAPL', quantity: 1, market: 'US' }]), target: targets(['MSFT'], 'US'), prices: priceMap([quote('AAPL', 'US', 1000), quote('MSFT', 'US', 333)]), settings: { ...baseSettings, fractionalShares: true } });
    expect(result.trades.find((trade) => trade.symbol === 'MSFT')?.targetQuantity).toBeCloseTo(3.003, 4);
  });
});

function positions(rows: Array<{ symbol: string; quantity: number; market: Market }>): CurrentPosition[] {
  return rows.map((row, index) => ({ id: `current-${index}`, symbol: row.symbol, market: row.market, quantity: row.quantity }));
}
function targets(symbols: string[], market: Market): TargetPosition[] {
  return symbols.map((symbol, index) => ({ id: `target-${index}`, symbol, market }));
}
function quote(symbol: string, market: Market, price: number): PriceQuote {
  return { symbol, market, price, currency: market === 'BIST' ? 'TRY' : 'USD', source: 'cache' };
}
function priceMap(quotes: PriceQuote[]): Record<string, PriceQuote> {
  return Object.fromEntries(quotes.map((item) => [getSymbolKey(item.symbol, item.market), item]));
}
