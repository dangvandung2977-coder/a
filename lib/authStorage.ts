// Preserve existing sessions by default; unchecked sign-ins last for this tab.
const preferenceKey = 'gym-progression:remember-session';
const memory = new Map<string, string>();

export function getRememberSession(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(preferenceKey) !== 'false';
  } catch {
    return false;
  }
}

export function setRememberSession(remember: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(preferenceKey, String(remember));
  } catch {
    // The storage adapter falls back to memory when browser storage is blocked.
  }
}

export const authStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    if (memory.has(key)) return memory.get(key) ?? null;
    for (const store of ['sessionStorage', 'localStorage'] as const) {
      try {
        const value = window[store].getItem(key);
        if (value !== null) return value;
      } catch {
        // The other storage location may still be available.
      }
    }
    return null;
  },
  setItem(key: string, value: string) {
    if (typeof window === 'undefined') return;
    const remember = getRememberSession();
    const target = remember ? 'localStorage' : 'sessionStorage';
    const other = remember ? 'sessionStorage' : 'localStorage';
    memory.set(key, value);
    try {
      window[target].setItem(key, value);
      memory.delete(key);
    } catch {
      // Keep the new session in memory if its destination is blocked.
    }
    try {
      window[other].removeItem(key);
    } catch {
      // A blocked store must not prevent using the selected destination.
    }
  },
  removeItem(key: string) {
    memory.delete(key);
    if (typeof window === 'undefined') return;
    for (const store of ['localStorage', 'sessionStorage'] as const) {
      try {
        window[store].removeItem(key);
      } catch {
        // Always attempt both stores so sign-out clears every accessible token.
      }
    }
  },
};
