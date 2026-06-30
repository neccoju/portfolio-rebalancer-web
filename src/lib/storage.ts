import type { PersistedAppState } from '../types/portfolio';

const STORAGE_KEY = 'portfolio-rebalancer-state-v1';

export function loadStoredState(): PersistedAppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedAppState) : null;
  } catch {
    return null;
  }
}

export function saveStoredState(state: PersistedAppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearStoredState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
