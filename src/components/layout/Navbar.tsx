'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Receipt, 
  User, 
  LogOut, 
  LogIn, 
  UserPlus, 
  LayoutDashboard 
} from 'lucide-react';
import { ShadowPulseDot } from '@/components/ui/ShadowLoader';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  defaultCurrency: string;
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [pathname]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/90 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link 
            href="/" 
            className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-zinc-900 dark:text-white group transition-all"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              <Receipt className="h-5 w-5" />
            </div>
            <span className="flex items-center">
              Pank 
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-900/50 px-2 py-0.5 rounded-md ml-1.5 shadow-2xs">
                Ledger
              </span>
            </span>
          </Link>

          {user && (
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  pathname === '/'
                    ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Groups
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-24 rounded-xl skeleton-shimmer shadow-xs" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200/60 bg-zinc-50/60 px-2.5 py-1 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs dark:bg-indigo-950 dark:text-indigo-300">
                  {user.fullName ? user.fullName.slice(0, 2).toUpperCase() : <User className="h-3.5 w-3.5" />}
                </div>
                <div className="hidden md:block text-left text-xs">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{user.fullName}</div>
                  <div className="text-[11px] text-zinc-400 truncate max-w-[140px] leading-tight">{user.email}</div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className={`flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white active:scale-[0.98] transition-all cursor-pointer shadow-2xs ${
                  signingOut ? 'animate-shadow-pulse' : ''
                }`}
                title="Sign out"
              >
                {signingOut ? (
                  <>
                    <ShadowPulseDot variant="primary" />
                    <span className="hidden sm:inline">Signing Out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-900 transition-colors"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 active:scale-[0.98] transition-all"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Sign Up</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
