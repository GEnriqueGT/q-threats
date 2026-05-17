'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface LegislationSearchProps {
  onSearch: (id: string) => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export function LegislationSearch({ onSearch, loading = false, error }: LegislationSearchProps) {
  const [value, setValue] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = value.trim();
    if (!id || loading) return;
    await onSearch(id);
  };

  return (
    <div className="w-full max-w-md mb-6 space-y-2">
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none"
            aria-hidden
          />
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ID de iniciativa (ej. 6630)"
            disabled={loading}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/15 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 disabled:opacity-60"
            aria-label="Buscar por ID de iniciativa"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="shrink-0 px-4 py-2.5 rounded-lg bg-teal-600/80 hover:bg-teal-500/90 border border-teal-500/30 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Buscando
            </>
          ) : (
            'Analizar'
          )}
        </button>
      </form>
      {error && (
        <p className="text-sm text-red-400/90" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
