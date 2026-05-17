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

/** Mismo borde útil que `MainNav`: padding horizontal + `max-w-[90rem]`. */
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
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-screen flex-col overflow-hidden bg-gradient-to-br from-[#030603] via-[#0a1512] to-[#173330] font-sans text-white">
      <div className="flex min-h-0 flex-1 flex-col px-12 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-28 lg:px-16 lg:pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]">
        <div className="mx-auto flex min-h-0 w-full max-w-[90rem] flex-1 flex-col">
          <header className="mb-2 shrink-0 pt-2 md:mb-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-wider text-white sm:text-3xl">Relations</h1>
              <button
                type="button"
                onClick={handleBack}
                className="rounded-full border border-white/20 px-4 py-2 text-base text-white/90 transition hover:bg-white/10"
              >
                Volver
              </button>
            </div>
          </header>

          <div className="relative flex min-h-0 w-full flex-1 flex-col">
            {loading ? (
              <p className="text-base text-white/55">Cargando grafo Neo4j…</p>
            ) : error ? (
              <div className="max-w-lg">
                <p className="text-base leading-relaxed text-white/75">{error}</p>
                <button
                  type="button"
                  onClick={handleBack}
                  className="mt-6 rounded-full border border-white/20 px-6 py-2.5 text-base text-white transition hover:bg-white/10"
                >
                  Volver a Threats
                </button>
              </div>
            ) : analysis ? (
              <RelationsForceGraph analysis={analysis} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
