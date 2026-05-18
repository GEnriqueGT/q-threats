'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Threats', match: (p: string) => p === '/' },
  { href: '/relations', label: 'Relations', match: (p: string) => p.startsWith('/relations') },
  { href: '/api-reference', label: 'API', match: (p: string) => p.startsWith('/api-reference') },
  { href: '/chat', label: 'Chat', match: (p: string) => p.startsWith('/chat') },
  { href: '/mcp', label: 'MCP', match: (p: string) => p.startsWith('/mcp') },
  { href: '/docs', label: 'Docs', match: (p: string) => p.startsWith('/docs') },
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="pointer-events-none fixed left-0 right-0 top-4 z-[60] px-12 sm:top-5 lg:px-16"
    >
      <div className="liquid-glass-shell pointer-events-auto mx-auto min-w-0 w-full max-w-[90rem] px-4 py-2 pr-5 sm:px-5 sm:py-2.5 sm:pr-7">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-8">
          <Link
          href="/"
          className="flex flex-col shrink-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1512] rounded-xl"
        >
          <span className="text-lg font-bold tracking-[0.16em] uppercase text-white/95 whitespace-nowrap">
            Q Threats
          </span>
          <span className="hidden sm:block text-xs text-white/60 font-normal tracking-wide">
            Amenazas a la vista pública
          </span>
        </Link>

        <div
          role="presentation"
          className="hidden sm:block h-10 w-px shrink-0 bg-white/18"
          aria-hidden
        />

        <div className="flex flex-wrap gap-1">
          {ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'rounded-full px-4 py-2 text-sm font-medium tracking-wide transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(16,32,29,0.9)]',
                  active
                    ? 'bg-teal-500/25 text-white border border-teal-400/35'
                    : 'text-white/75 hover:bg-white/10 hover:text-white border border-transparent',
                ].join(' ')}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
      </div>
    </nav>
  );
}
