import Link from 'next/link';

const LINKS = [
  { href: '/', label: 'Threats' },
  { href: '/relations', label: 'Relations' },
  { href: '/api-reference', label: 'API' },
  { href: '/docs', label: 'Docs' },
] as const;

export function MainFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      aria-label="Pie de página"
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#070d0c]/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl md:pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pt-3"
    >
      <div className="pointer-events-auto mx-auto flex max-w-[90rem] flex-col items-center justify-center gap-2 px-8 py-1 text-center font-sans sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-1 sm:text-left md:px-12 lg:px-16">
        <p className="order-last text-[11px] text-white/45 sm:order-first sm:flex-1 sm:text-left md:text-xs">
          © {year} Q Threats · Amenazas a la vista pública
        </p>
        <nav aria-label="Pie — enlaces" className="flex flex-wrap justify-center gap-4 md:gap-6">
          {LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs font-medium text-white/70 transition hover:text-teal-300/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070d0c] md:text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
