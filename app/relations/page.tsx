'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RelationsForceGraph } from '@/components/RelationsForceGraph';
import { filterAnalysisForRelationsSearch } from '@/lib/graph/filterAnalysisForRelationsSearch';
import type { ThreatAnalysis } from '@/lib/types';

async function fetchGraph(): Promise<ThreatAnalysis> {
  const res = await fetch('/api/graph');
  const json = (await res.json()) as { data?: ThreatAnalysis; error?: string };
  if (!res.ok || !json.data) {
    throw new Error(json.error || `Error ${res.status}`);
  }
  return json.data;
}

/** Mismo borde útil que `MainNav`: padding horizontal + `max-w-[90rem]`. */
export default function RelationsPage() {
  const [analysis, setAnalysis] = useState<ThreatAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphSearch, setGraphSearch] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    fetchGraph()
      .then((data) => {
        if (mounted.current) {
          setAnalysis(data);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (mounted.current) {
          setError(e instanceof Error ? e.message : 'Error al cargar el grafo.');
        }
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
    };
  }, []);

  const filteredAnalysis = useMemo(
    () => (analysis ? filterAnalysisForRelationsSearch(analysis, graphSearch) : null),
    [analysis, graphSearch],
  );

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-screen flex-col overflow-hidden bg-gradient-to-br from-[#030603] via-[#0a1512] to-[#173330] font-sans text-white">
      <div className="flex min-h-0 flex-1 flex-col px-12 pb-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] pt-28 lg:px-16 lg:pb-[calc(env(safe-area-inset-bottom,0px)+5rem)]">
        <div className="mx-auto flex min-h-0 w-full max-w-[90rem] flex-1 flex-col">
          <header className="mb-2 shrink-0 pt-2 md:mb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <h1 className="shrink-0 text-2xl font-bold tracking-wider text-white sm:text-3xl">
                Relations
              </h1>
              <div className="relative min-h-10 min-w-0 flex-1">
                <label htmlFor="relations-graph-search" className="sr-only">
                  Buscar en el grafo
                </label>
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" aria-hidden>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  id="relations-graph-search"
                  type="search"
                  value={graphSearch}
                  onChange={(e) => setGraphSearch(e.target.value)}
                  placeholder="Buscar nodos por nombre, etiquetas, descripción…"
                  autoComplete="off"
                  className="w-full rounded-xl border border-white/18 bg-black/35 py-2.5 pr-10 pl-12 text-base text-white shadow-inner shadow-black/20 outline-none ring-teal-500/35 backdrop-blur-md placeholder:text-white/40 focus:border-teal-400/40 focus:ring-2"
                  spellCheck={false}
                />
                {graphSearch.trim() !== '' && (
                  <button
                    type="button"
                    onClick={() => setGraphSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
                    aria-label="Limpiar búsqueda"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </header>

          <div className="relative flex min-h-0 w-full flex-1 flex-col">
            {loading ? (
              <p className="text-base text-white/55">Cargando grafo Neo4j…</p>
            ) : error ? (
              <div className="max-w-lg">
                <p className="text-base leading-relaxed text-white/75">{error}</p>
                <Link
                  href="/"
                  className="mt-6 inline-flex rounded-full border border-white/20 px-6 py-2.5 text-base text-white transition hover:bg-white/10"
                >
                  Volver a Threats
                </Link>
              </div>
            ) : filteredAnalysis ? (
              <RelationsForceGraph analysis={filteredAnalysis} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
