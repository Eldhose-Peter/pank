'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';

interface ThemeToggleProps {
  className?: string;
  showDropdown?: boolean;
}

export function ThemeToggle({ className = '', showDropdown = false }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme, mounted } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  // Avoid hydration mismatch by rendering a stable placeholder until mounted
  if (!mounted) {
    return (
      <div
        className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-2xs ${className}`}
        aria-hidden="true"
      >
        <span className="h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      <button
        type="button"
        onClick={toggleTheme}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuOpen((prev) => !prev);
        }}
        className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white active:scale-[0.96] transition-all cursor-pointer shadow-2xs ${className}`}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Switch to light mode (Right-click for options)' : 'Switch to dark mode (Right-click for options)'}
      >
        {isDark ? (
          <Sun className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-amber-400 transition-transform duration-300 hover:rotate-45" />
        ) : (
          <Moon className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-zinc-700 transition-transform duration-300 hover:-rotate-12" />
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-36 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 z-50 animate-scale-check text-xs">
          <button
            type="button"
            onClick={() => {
              setTheme('light');
              setMenuOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 font-medium transition-colors cursor-pointer ${
              theme === 'light'
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-semibold'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span>Light</span>
            </span>
            {theme === 'light' && <Check className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              setMenuOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 font-medium transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-semibold'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <Moon className="h-3.5 w-3.5 text-indigo-400" />
              <span>Dark</span>
            </span>
            {theme === 'dark' && <Check className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('system');
              setMenuOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 font-medium transition-colors cursor-pointer ${
              theme === 'system'
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-semibold'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <Laptop className="h-3.5 w-3.5 text-zinc-500" />
              <span>System</span>
            </span>
            {theme === 'system' && <Check className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
