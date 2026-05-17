'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapGuatemala } from './MapGuatemala';
import { ThreatItem } from './ThreatItem';
import { AnalysisNetworkView } from './AnalysisNetworkView';
import { DepartmentModal } from './DepartmentModal';
import { NeuralWorldCanvas } from './NeuralWorldCanvas';
import { useNeuralIntro } from '@/hooks/useNeuralIntro';
import type { Threat, ThreatAnalysis } from '@/lib/types';

type ViewState = 'dashboard' | 'analysis';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error al cargar ${url}`);
  const json = await res.json();
  return json.data as T;
}

export function HomePage() {
  const mainRef = useRef<HTMLDivElement>(null);
  const mapStageRef = useRef<HTMLDivElement>(null);
  const [sphereFocus, setSphereFocus] = useState<{ x: number; y: number } | null>(null);
  const [view, setView] = useState<ViewState>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [department, setDepartment] = useState('Guatemala');
  const [threats, setThreats] = useState<Threat[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<ThreatAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const neuralPhase = useNeuralIntro(view === 'analysis');
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [analysisPanelOpen, setAnalysisPanelOpen] = useState(true);

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
    Promise.all([fetchJson<Threat[]>('/api/threats'), fetchJson<string[]>('/api/departments')])
      .then(([threatsData, departmentsData]) => {
        setThreats(threatsData);
        setDepartments(departmentsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openAnalysis = useCallback(async (threatId: string) => {
    setView('analysis');
    setAnalysis(null);
    setAnalysisLoading(true);
    try {
      const data = await fetchJson<ThreatAnalysis>(`/api/analysis/${threatId}`);
      setAnalysis(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  const backToDashboard = useCallback(() => {
    setView('dashboard');
    setAnalysis(null);
    setAnalysisPanelOpen(true);
  }, []);

  return (
    <div
      ref={mainRef}
      className="w-screen h-screen relative bg-gradient-to-br from-[#030603] via-[#0a1512] to-[#173330] overflow-hidden text-white font-sans"
    >
      <NeuralWorldCanvas
        phase={neuralPhase}
        size={size}
        sphereFocus={sphereFocus}
        analysisPanelOpen={analysisPanelOpen}
        visible={view === 'dashboard' || view === 'analysis'}
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
                <MapGuatemala
                  department={department}
                  mapStageRef={mapStageRef}
                  onClick={() => setIsModalOpen(true)}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.35 }}
                className="flex-1 flex flex-col justify-center gap-6 items-end pointer-events-auto py-4"
              >
                <div className="w-full max-w-md">
                  <h3 className="text-xl font-medium mb-6 text-white/90">
                    Ultimas actividades sospechosas
                  </h3>
                  {loading ? (
                    <p className="text-white/60">Cargando amenazas...</p>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {threats.map((threat) => (
                        <ThreatItem
                          key={threat.id}
                          threat={threat}
                          onClick={() => openAnalysis(threat.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
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
                <motion.div className="absolute top-24 left-8 z-20 pointer-events-none">
                  <h2 className="text-3xl font-bold tracking-wider text-white">Analisis</h2>
                  <p className="text-white/50 text-sm mt-2">Cargando datos...</p>
                </motion.div>
              ) : (
                <AnalysisNetworkView
                  analysis={analysis}
                  onBack={backToDashboard}
                  neuralPhase={neuralPhase}
                  onPanelToggle={setAnalysisPanelOpen}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <DepartmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={setDepartment}
        departments={departments}
      />
    </div>
  );
}
