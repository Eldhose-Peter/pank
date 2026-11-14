import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('Theme Logic & FOUC Prevention Script', () => {
  // Simulates the inline FOUC prevention script embedded in RootLayout
  function runFoucScript(storedTheme: string | null, prefersDark: boolean): boolean {
    let hasDarkClass = false;
    const documentMock = {
      documentElement: {
        classList: {
          add: (cls: string) => {
            if (cls === 'dark') hasDarkClass = true;
          },
          remove: (cls: string) => {
            if (cls === 'dark') hasDarkClass = false;
          },
        },
      },
    };

    const localStorageMock = {
      getItem: (key: string) => (key === 'theme' ? storedTheme : null),
    };

    const matchMediaMock = (query: string) => ({
      matches: query.includes('dark') ? prefersDark : !prefersDark,
    });

    // Execute the exact algorithm from RootLayout's themeScript
    try {
      const stored = localStorageMock.getItem('theme');
      let isDark = false;
      if (stored === 'dark') {
        isDark = true;
      } else if (stored === 'light') {
        isDark = false;
      } else {
        isDark = matchMediaMock('(prefers-color-scheme: dark)').matches;
      }
      if (isDark) {
        documentMock.documentElement.classList.add('dark');
      } else {
        documentMock.documentElement.classList.remove('dark');
      }
    } catch {}

    return hasDarkClass;
  }

  it('activates dark mode if stored theme is "dark" regardless of OS preference', () => {
    expect(runFoucScript('dark', false)).toBe(true);
    expect(runFoucScript('dark', true)).toBe(true);
  });

  it('deactivates dark mode if stored theme is "light" even if OS prefers dark', () => {
    expect(runFoucScript('light', true)).toBe(false);
    expect(runFoucScript('light', false)).toBe(false);
  });

  it('respects OS preference if stored theme is "system" or unset', () => {
    expect(runFoucScript('system', true)).toBe(true);
    expect(runFoucScript('system', false)).toBe(false);
    expect(runFoucScript(null, true)).toBe(true);
    expect(runFoucScript(null, false)).toBe(false);
  });
});

describe('Theme Toggle Logic & State Transitions', () => {
  function computeNextTheme(currentTheme: 'light' | 'dark' | 'system', osPrefersDark: boolean): 'light' | 'dark' {
    const resolved: 'light' | 'dark' =
      currentTheme === 'system'
        ? osPrefersDark
          ? 'dark'
          : 'light'
        : currentTheme;

    return resolved === 'dark' ? 'light' : 'dark';
  }

  it('toggles from light to dark', () => {
    expect(computeNextTheme('light', false)).toBe('dark');
    expect(computeNextTheme('light', true)).toBe('dark');
  });

  it('toggles from dark to light', () => {
    expect(computeNextTheme('dark', true)).toBe('light');
    expect(computeNextTheme('dark', false)).toBe('light');
  });

  it('toggles from system (dark OS) to light', () => {
    expect(computeNextTheme('system', true)).toBe('light');
  });

  it('toggles from system (light OS) to dark', () => {
    expect(computeNextTheme('system', false)).toBe('dark');
  });
});
