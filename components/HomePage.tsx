'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { MapGuatemala } from './MapGuatemala';
import { ThreatItem } from './ThreatItem';
import { LegislationSearch } from './LegislationSearch';
import { AnalysisNetworkView } from './AnalysisNetworkView';
import { NeuralWorldCanvas } from './NeuralWorldCanvas';
import { useNeuralIntro } from '@/hooks/useNeuralIntro';
import {
  analysisUrlFromThreatAnalysis,
  buildAnalysisShareUrl,
  parseAnalysisUrlParams,
} from '@/lib/analysisUrl';
import {
  consumeLegislationSearch,
  legislationSearchKey,
  markLegislationSearchHandled,
} from '@/lib/legislationSearchGuard';
import type { Threat, ThreatAnalysis } from '@/lib/types';

type ViewState = 'dashboard' | 'analysis';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Error al cargar ${url}`);
  return json.data as T;
}

export function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mainRef = useRef<HTMLDivElement>(null);
  const mapStageRef = useRef<HTMLDivElement>(null);
  const skipUrlDeepLinkRef = useRef(false);
  const legislationRequestId = useRef(0);

  const [sphereFocus, setSphereFocus] = useState<{ x: number; y: number } | null>(null);
  const [view, setView] = useState<ViewState>('dashboard');
  const [threats, setThreats] = useState<Threat[]>([]);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ThreatAnalysis | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [legislationSearchLoading, setLegislationSearchLoading] = useState(false);
  const [legislationSearchError, setLegislationSearchError] = useState<string | null>(null);
  const neuralPhase = useNeuralIntro(view === 'analysis');
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [analysisPanelOpen, setAnalysisPanelOpen] = useState(true);
  const [analysisSphereCenter, setAnalysisSphereCenter] = useState<{ x: number; y: number } | null>(
    null,
  );

  const syncAnalysisUrl = useCallback(
    (params: ReturnType<typeof parseAnalysisUrlParams>) => {
      const next = new URLSearchParams();
      if (params?.type === 'iniciativa') next.set('iniciativa', params.id);
      if (params?.type === 'amenaza') next.set('amenaza', params.id);
      const q = next.toString();
      router.replace(q ? `/?${q}` : '/', { scroll: false });
    },
    [router],
  );

  const updateSphereFocus = useCallback(() => {
    const root = mainRef.current;
    const stage = mapStageRef.current;
    if (!root || !stage) return;
    const rr = root.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    setSphereFocus({
      x: sr.left + sr.width / 2 - rr.left,
      y: sr.top + sr.height / 2 - rr.top,
    });
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize({ w: width, h: height });
        updateSphereFocus();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateSphereFocus]);

  useEffect(() => {
    if (view !== 'dashboard') return;
    updateSphereFocus();
    window.addEventListener('resize', updateSphereFocus);
    return () => window.removeEventListener('resize', updateSphereFocus);
  }, [view, updateSphereFocus]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/recent-reports');
        const json = (await res.json()) as { data?: Threat[]; error?: string };
        if (res.ok && json.data) {
          setThreats(json.data);
          setReportsError(null);
          return;
        }
        if (res.status === 503) {
          const fallback = await fetchJson<Threat[]>('/api/threats');
          setThreats(fallback);
          setReportsError(null);
          return;
        }
        setReportsError(json.error ?? 'No se pudieron cargar las actividades.');
        setThreats([]);
      } catch (err) {
        console.error(err);
        setReportsError('Error al cargar actividades recientes.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openAnalysis = useCallback(
    async (threatId: string, options?: { skipUrl?: boolean }) => {
      if (!options?.skipUrl) {
        markLegislationSearchHandled(legislationSearchKey('amenaza', threatId));
        skipUrlDeepLinkRef.current = true;
        syncAnalysisUrl({ type: 'amenaza', id: threatId });
      }
      setLegislationSearchError(null);
      setView('analysis');
      setAnalysis(null);
      setShareUrl(null);
      setAnalysisLoading(true);
      try {
        const data = await fetchJson<ThreatAnalysis>(`/api/analysis/${threatId}`);
        setAnalysis(data);
        setShareUrl(buildAnalysisShareUrl(analysisUrlFromThreatAnalysis(data)));
      } catch (err) {
        console.error(err);
      } finally {
        setAnalysisLoading(false);
      }
    },
    [syncAnalysisUrl],
  );

  const searchLegislation = useCallback(
    async (referenceId: string, options?: { skipUrl?: boolean }) => {
      const trimmed = referenceId.trim();
      if (!trimmed) return;

      if (!options?.skipUrl) {
        markLegislationSearchHandled(legislationSearchKey('iniciativa', trimmed));
        skipUrlDeepLinkRef.current = true;
        syncAnalysisUrl({ type: 'iniciativa', id: trimmed });
      }

      const requestId = ++legislationRequestId.current;
      setLegislationSearchError(null);
      setView('analysis');
      setAnalysis(null);
      setShareUrl(null);
      setLegislationSearchLoading(true);
      setAnalysisLoading(true);
      try {
        const encoded = encodeURIComponent(trimmed);
        const res = await fetch(`/api/legislation/${encoded}`);
        const json = (await res.json()) as { data?: ThreatAnalysis; error?: string };
        if (requestId !== legislationRequestId.current) return;
        if (!res.ok || !json.data) {
          setLegislationSearchError(json.error ?? 'No se pudo cargar el análisis.');
          setView('dashboard');
          syncAnalysisUrl(null);
          return;
        }
        setAnalysis(json.data);
        setShareUrl(buildAnalysisShareUrl(analysisUrlFromThreatAnalysis(json.data)));
      } catch (err) {
        if (requestId !== legislationRequestId.current) return;
        console.error(err);
        setLegislationSearchError('Error de conexión al buscar la iniciativa.');
        setView('dashboard');
        syncAnalysisUrl(null);
      } finally {
        if (requestId === legislationRequestId.current) {
          setLegislationSearchLoading(false);
          setAnalysisLoading(false);
        }
      }
    },
    [syncAnalysisUrl],
  );

  const openThreatItem = useCallback(
    (threat: Threat) => {
      const ref = threat.iniciativaId ?? threat.decretoId;
      if (ref) {
        searchLegislation(ref);
        return;
      }
      openAnalysis(threat.id);
    },
    [searchLegislation, openAnalysis],
  );

  const backToDashboard = useCallback(() => {
    setView('dashboard');
    setAnalysis(null);
    setShareUrl(null);
    setAnalysisPanelOpen(true);
    setAnalysisSphereCenter(null);
    setLegislationSearchError(null);
    syncAnalysisUrl(null);
  }, [syncAnalysisUrl]);

  useEffect(() => {
    if (skipUrlDeepLinkRef.current) {
      skipUrlDeepLinkRef.current = false;
      return;
    }
    const parsed = parseAnalysisUrlParams(searchParams);
    if (!parsed) return;

    const key = legislationSearchKey(
      parsed.type === 'iniciativa' ? 'iniciativa' : 'amenaza',
      parsed.id,
    );
    if (!consumeLegislationSearch(key)) return;

    if (parsed.type === 'iniciativa') {
      searchLegislation(parsed.id, { skipUrl: true });
    } else {
      openAnalysis(parsed.id, { skipUrl: true });
    }
  }, [searchParams, searchLegislation, openAnalysis]);

  return (
    <div
      ref={mainRef}
      className="w-screen h-screen relative bg-gradient-to-br from-[#030603] via-[#0a1512] to-[#173330] overflow-hidden text-white font-sans"
    >
      <NeuralWorldCanvas
        phase={neuralPhase}
        size={size}
        sphereFocus={view === 'analysis' ? analysisSphereCenter : sphereFocus}
        analysisPanelOpen={analysisPanelOpen}
        visible={view === 'dashboard' || view === 'analysis'}
        meshScale={view === 'analysis' ? 0.96 : 1}
      />

      <main className="absolute inset-0 z-10 flex items-stretch px-12 pb-[max(6rem,calc(env(safe-area-inset-bottom,0px)+5rem))] pt-24 pointer-events-none lg:px-16">
        <AnimatePresence mode="popLayout">
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 1 }}
              className="w-full max-w-[90rem] mx-auto flex items-stretch justify-between gap-8 lg:gap-12 pointer-events-none min-h-[calc(100vh-9rem)]"
            >
              <motion.div className="flex-1 flex justify-center items-center min-h-0 pointer-events-auto py-4">
                <MapGuatemala mapStageRef={mapStageRef} />
              </motion.div>

              <motion.div
                initial={{ opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.35 }}
                className="flex-1 flex flex-col justify-center gap-6 items-end pointer-events-auto py-4"
              >
                <motion.div className="w-full max-w-md">
                  <LegislationSearch
                    onSearch={searchLegislation}
                    loading={legislationSearchLoading}
                    error={legislationSearchError}
                  />
                  <h3 className="text-xl font-medium mb-6 text-white/90">
                    Ultimas actividades sospechosas
                  </h3>
                  {loading ? (
                    <p className="text-white/60">Cargando actividades...</p>
                  ) : reportsError ? (
                    <p className="text-amber-400/90 text-sm">{reportsError}</p>
                  ) : threats.length === 0 ? (
                    <p className="text-white/50 text-sm">No hay reportes recientes.</p>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {threats.map((threat) => (
                        <ThreatItem
                          key={threat.id}
                          threat={threat}
                          onClick={() => openThreatItem(threat)}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {view === 'analysis' && (
            <motion.div
              key="analysis"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 1 }}
              className="absolute inset-0 pointer-events-none"
            >
              {analysisLoading || !analysis ? (
                <div className="absolute top-24 left-8 z-20 pointer-events-none">
                  <p className="text-white/50 text-sm">Cargando datos...</p>
                </div>
              ) : (
                <AnalysisNetworkView
                  analysis={analysis}
                  onBack={backToDashboard}
                  neuralPhase={neuralPhase}
                  onPanelToggle={setAnalysisPanelOpen}
                  onSphereCenterChange={setAnalysisSphereCenter}
                  shareUrl={shareUrl ?? undefined}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

    </div>
  );
}
