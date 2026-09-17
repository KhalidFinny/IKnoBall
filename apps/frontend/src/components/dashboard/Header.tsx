import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Bell, LogOut, User, UserRound } from 'lucide-react';

export type NavKey = 'dashboard' | 'predict' | 'profile' | 'game' | undefined;

const NAV_ITEMS: { key: NavKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'predict', label: 'Predictions' },
];

function navClass(on: boolean): string {
  return `rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-widest transition-colors ${
    on ? 'bg-brand-navyDark text-white' : 'text-stone-500 hover:bg-stone-100 hover:text-brand-ink'
  }`;
}

export function DashboardHeader({
  userName,
  accentColor,
  onSignOut,
  active,
}: {
  userName?: string;
  accentColor?: string;
  onSignOut: () => void;
  active?: NavKey;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const activeColor = accentColor ?? '#1C4188';

  return (
    <header className="sticky top-0 z-40 border-b border-brand-line bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1920px] items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-8">
          <Link
            to="/dashboard"
            search={{ tab: 'team' }}
            className="font-heading text-2xl font-semibold uppercase tracking-wide text-brand-red"
          >
            IKnoBall
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) =>
              item.key === 'predict' ? (
                <Link
                  key={item.key}
                  to="/predict"
                  className={navClass(active === item.key)}
                  aria-current={active === item.key ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ) : (
                <Link
                  key={item.key}
                  to="/dashboard"
                  search={{ tab: 'team' }}
                  className={navClass(active === item.key)}
                  aria-current={active === item.key ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        </div>

        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-brand-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label={userName ? `Account: ${userName}` : 'Account'}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
              style={{ backgroundColor: activeColor }}
            >
              {userName ? (
                userName.charAt(0).toUpperCase()
              ) : (
                <User className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-label="Account menu"
                className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-brand-line bg-white shadow-lg"
              >
                <div className="border-b border-brand-line px-4 py-3">
                  <p className="truncate text-sm font-semibold text-brand-ink">
                    {userName ?? 'Guest'}
                  </p>
                </div>
                <Link
                  to="/profile"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-base font-medium text-brand-ink transition-colors hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
                >
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  Profile
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                  className="flex w-full items-center gap-2.5 border-t border-brand-line px-4 py-3 text-left text-base font-medium text-brand-ink transition-colors hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <nav
        aria-label="Primary mobile"
        className="flex items-center gap-1 border-t border-brand-line px-4 py-2 sm:hidden"
      >
        {NAV_ITEMS.map((item) =>
          item.key === 'predict' ? (
            <Link
              key={item.key}
              to="/predict"
              className="flex-1 rounded-lg px-3 py-2 text-center text-sm font-bold uppercase tracking-widest"
              style={{ backgroundColor: active === item.key ? '#0A2250' : undefined, color: active === item.key ? '#fff' : '#78716c' }}
              aria-current={active === item.key ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ) : (
            <Link
              key={item.key}
              to="/dashboard"
              search={{ tab: 'team' }}
              className="flex-1 rounded-lg px-3 py-2 text-center text-sm font-bold uppercase tracking-widest"
              style={{ backgroundColor: active === item.key ? '#0A2250' : undefined, color: active === item.key ? '#fff' : '#78716c' }}
              aria-current={active === item.key ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ),
        )}
      </nav>
    </header>
  );
}