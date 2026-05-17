'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RelationsForceGraph } from '@/components/RelationsForceGraph';
import type { ThreatAnalysis } from '@/lib/types';

async function fetchGraph(): Promise<ThreatAnalysis> {
  const res = await fetch('/api/graph');
  const json = (await res.json()) as { data?: ThreatAnalysis; error?: string };
  if (!res.ok || !json.data) {
    throw new Error(json.error || `Error ${res.status}`);
  }
  return json.data;
}

export default function RelationsPage() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<ThreatAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const handleBack = useCallback(() => {
    router.push('/');
  }, [router]);

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] w-screen flex-col overflow-hidden bg-gradient-to-br from-[#030603] via-[#0a1512] to-[#173330] text-white font-sans">
      <header className="shrink-0 px-4 pb-3 pt-28 md:px-6 md:pb-4 md:pt-28">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-wider text-white sm:text-3xl">Relations</h1>
          <button
            type="button"
            onClick={handleBack}
            className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white/90 hover:bg-white/10 transition"
          >
            Volver
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 px-3 pb-3 md:px-4 md:pb-4">
        {loading ? (
          <p className="text-white/50 text-sm">Cargando grafo Neo4j…</p>
        ) : error ? (
          <div className="max-w-lg">
            <p className="text-white/70 text-sm leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={handleBack}
              className="mt-6 rounded-full border border-white/20 px-6 py-2.5 text-sm text-white hover:bg-white/10 transition"
            >
              Volver a Threats
            </button>
          </div>
        ) : analysis ? (
          <RelationsForceGraph analysis={analysis} />
        ) : null}
      </div>
    </div>
  );
}
