'use client';

import { useCallback, useState } from 'react';
import { Link2, Check } from 'lucide-react';

interface ShareAnalysisButtonProps {
  url: string;
  variant?: 'default' | 'circle';
}

export function ShareAnalysisButton({ url, variant = 'default' }: ShareAnalysisButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback silencioso */
    }
  }, [url]);

  if (variant === 'circle') {
    return (
      <button
        type="button"
        onClick={copy}
        title={copied ? 'Enlace copiado' : 'Compartir análisis'}
        aria-label={copied ? 'Enlace copiado' : 'Compartir análisis'}
        className={`w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-xl border shadow-lg transition pointer-events-auto ${
          copied
            ? 'bg-teal-500/20 border-teal-400/50 text-teal-300'
            : 'bg-white/10 border-white/20 text-white hover:bg-white/15 hover:border-white/30'
        }`}
      >
        {copied ? (
          <Check className="w-7 h-7" aria-hidden />
        ) : (
          <Link2 className="w-7 h-7" aria-hidden />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copiar enlace para compartir"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/70 hover:text-white hover:bg-white/10 border border-white/10 transition"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-teal-400" aria-hidden />
          Copiado
        </>
      ) : (
        <>
          <Link2 className="w-3.5 h-3.5" aria-hidden />
          Compartir
        </>
      )}
    </button>
  );
}
