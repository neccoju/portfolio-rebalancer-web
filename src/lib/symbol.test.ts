import { describe, expect, it } from 'vitest';
import { displaySymbol, inferMarket, normalizeUserSymbol, toYahooSymbol } from './symbol';

describe('BIST symbol handling', () => {
  it('keeps THYAO visible without .IS in the UI', () => {
    expect(displaySymbol('THYAO')).toBe('THYAO');
    expect(displaySymbol('THYAO.IS')).toBe('THYAO');
  });
  it('normalizes BIST input without requiring the user to type .IS', () => {
    expect(normalizeUserSymbol(' thyao ')).toBe('THYAO');
  });
  it('infers ESCOM and ISGSY as BIST symbols', () => {
    expect(inferMarket('ESCOM')).toBe('BIST');
    expect(inferMarket('ISGSY')).toBe('BIST');
  });
  it('adds .IS only for the background Yahoo Finance API symbol', () => {
    expect(toYahooSymbol('THYAO', 'BIST')).toBe('THYAO.IS');
    expect(toYahooSymbol('ESCOM', 'BIST')).toBe('ESCOM.IS');
    expect(toYahooSymbol('ISGSY', 'BIST')).toBe('ISGSY.IS');
    expect(toYahooSymbol('AAPL', 'US')).toBe('AAPL');
  });
});
