'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { AnalysisDetailPanel } from './AnalysisDetailPanel';
import { AnalysisCenterHub } from './AnalysisCenterHub';
import { GraphNodeIcon } from './GraphNodeIcon';
import { ShareAnalysisButton } from './ShareAnalysisButton';
import type { AnalysisNode, ThreatAnalysis } from '@/lib/types';
import { computeSphereLayout } from '@/lib/analysisLayout';
import type { MeshPhase } from './MorphingNeuralMesh';
import { MESH_GATHER_MS } from './MorphingNeuralMesh';

type SimNode = AnalysisNode & {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  targetAngle: number;
};

interface AnalysisNetworkViewProps {
  analysis: ThreatAnalysis;
  onBack: () => void;
  neuralPhase: MeshPhase;
  onPanelToggle?: (isOpen: boolean) => void;
  /** Centro de la esfera en coordenadas de viewport (para alinear el mesh 3D). */
  onSphereCenterChange?: (center: { x: number; y: number }) => void;
  /** URL absoluta para compartir (deeplink). */
  shareUrl?: string;
}

const PANEL_TOP = '6.5rem';
const PANEL_BOTTOM = '4.5rem';

export function AnalysisNetworkView({
  analysis,
  onBack,
  neuralPhase,
  onPanelToggle,
  onSphereCenterChange,
  shareUrl,
}: AnalysisNetworkViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);

  const [size, setSize] = useState({ w: 1000, h: 600 });
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const nodesRef = useRef<SimNode[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);

  const [selectedId, setSelectedId] = useState<string>(
    () => (analysis.legislative ? 'acquisition' : ''),
  );

  const graphNodes = useMemo(
    () => analysis.nodes.filter((n) => n.role !== 'acquisition'),
    [analysis.nodes],
  );

  const sphereLayout = useMemo(
    () => computeSphereLayout(size.w, size.h, panelOpen),
    [size.w, size.h, panelOpen],
  );
  const sphereCenterX = sphereLayout.centerX;
  const sphereCenterY = sphereLayout.centerY;
  const circleRadius = sphereLayout.circleRadius;

  const leg = analysis.legislative;

  const hubDiameter = useMemo(
    () => Math.min(188, Math.max(132, circleRadius * 1.08)),
    [circleRadius],
  );

  const handleCenterSelect = useCallback(() => {
    setSelectedId('acquisition');
    setPanelOpen(true);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Notificar cambio de panel
  useEffect(() => {
    onPanelToggle?.(panelOpen);
  }, [panelOpen, onPanelToggle]);

  // Sincronizar centro 3D con nodos orbitales (coords de viewport)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onSphereCenterChange) return;
    const report = () => {
      const rect = el.getBoundingClientRect();
      onSphereCenterChange({
        x: rect.left + sphereCenterX,
        y: rect.top + sphereCenterY,
      });
    };
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    window.addEventListener('scroll', report, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', report);
    };
  }, [sphereCenterX, sphereCenterY, onSphereCenterChange]);

  // Inicializar nodos en la circunferencia alrededor de la esfera
  useEffect(() => {
    if (neuralPhase !== 'gather' && neuralPhase !== 'ready') return;
    if (size.w < 200) return;

    const count = graphNodes.length;
    const initial: SimNode[] = graphNodes.map((n, i) => {
      // Distribuir uniformemente, empezando desde arriba
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const x = sphereCenterX + circleRadius * Math.cos(angle);
      const y = sphereCenterY + circleRadius * Math.sin(angle);
      return {
        ...n,
        x,
        y,
        vx: 0,
        vy: 0,
        angle,
        targetAngle: angle,
      };
    });

    setNodes(initial);
    nodesRef.current = initial;
    if (initial.length > 0 && !selectedId && !analysis.legislative) {
      setSelectedId(initial[0].id);
    }
    if (analysis.legislative && !selectedId) {
      setSelectedId('acquisition');
    }
  }, [neuralPhase, size, graphNodes, circleRadius, sphereCenterX, sphereCenterY, selectedId, analysis.legislative]);

  // Actualizar posiciones cuando cambia el centro (panel abre/cierra)
  useEffect(() => {
    if (nodesRef.current.length === 0) return;
    
    const updated = nodesRef.current.map((node) => {
      const x = sphereCenterX + circleRadius * Math.cos(node.targetAngle);
      const y = sphereCenterY + circleRadius * Math.sin(node.targetAngle);
      return {
        ...node,
        x,
        y,
      };
    });
    
    nodesRef.current = updated;
    setNodes(updated);
  }, [sphereCenterX, sphereCenterY, circleRadius]);

  // Simulacion de fisica con spring y amortiguamiento (tipo agua)
  useEffect(() => {
    const SPRING = 0.04;
    const DAMPING = 0.85;
    const CHAIN_SPRING = 0.02;

    const tick = () => {
      const currentNodes = nodesRef.current;
      if (currentNodes.length === 0) {
        animationRef.current = requestAnimationFrame(tick);
        return;
      }

      let needsUpdate = false;
      const updated = currentNodes.map((node, idx) => {
        if (dragIdRef.current === node.id) {
          return node;
        }

        const targetX = sphereCenterX + circleRadius * Math.cos(node.targetAngle);
        const targetY = sphereCenterY + circleRadius * Math.sin(node.targetAngle);

        const dx = targetX - node.x;
        const dy = targetY - node.y;

        let nvx = node.vx + dx * SPRING;
        let nvy = node.vy + dy * SPRING;

        // Fuerza de cadena con vecinos
        const prevNode = currentNodes[(idx - 1 + currentNodes.length) % currentNodes.length];
        const nextNode = currentNodes[(idx + 1) % currentNodes.length];

        if (prevNode && prevNode.id !== dragIdRef.current) {
          const pdx = prevNode.x - node.x;
          const pdy = prevNode.y - node.y;
          const dist = Math.sqrt(pdx * pdx + pdy * pdy);
          const idealDist = 2 * circleRadius * Math.sin(Math.PI / currentNodes.length);
          if (dist > 0) {
            const force = (dist - idealDist) * CHAIN_SPRING / dist;
            nvx += pdx * force;
            nvy += pdy * force;
          }
        }

        if (nextNode && nextNode.id !== dragIdRef.current) {
          const ndx = nextNode.x - node.x;
          const ndy = nextNode.y - node.y;
          const dist = Math.sqrt(ndx * ndx + ndy * ndy);
          const idealDist = 2 * circleRadius * Math.sin(Math.PI / currentNodes.length);
          if (dist > 0) {
            const force = (dist - idealDist) * CHAIN_SPRING / dist;
            nvx += ndx * force;
            nvy += ndy * force;
          }
        }

        nvx *= DAMPING;
        nvy *= DAMPING;

        const nx = node.x + nvx;
        const ny = node.y + nvy;

        if (Math.abs(nvx) > 0.01 || Math.abs(nvy) > 0.01 || Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          needsUpdate = true;
        }

        return { ...node, x: nx, y: ny, vx: nvx, vy: nvy };
      });

      if (needsUpdate) {
        nodesRef.current = updated;
        setNodes(updated);
      }

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [circleRadius, sphereCenterX, sphereCenterY]);

  // Drag handlers
  const handleDragStart = useCallback((id: string, clientX: number, clientY: number) => {
    const node = nodesRef.current.find((n) => n.id === id);
    if (!node) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragIdRef.current = id;
    dragOffsetRef.current = {
      x: clientX - rect.left - node.x,
      y: clientY - rect.top - node.y,
    };
  }, []);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragIdRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const newX = clientX - rect.left - dragOffsetRef.current.x;
    const newY = clientY - rect.top - dragOffsetRef.current.y;

    const dx = newX - sphereCenterX;
    const dy = newY - sphereCenterY;
    const newAngle = Math.atan2(dy, dx);

    const currentNodes = nodesRef.current;
    const draggedIdx = currentNodes.findIndex((n) => n.id === dragIdRef.current);
    if (draggedIdx === -1) return;

    const draggedNode = currentNodes[draggedIdx];
    const angleDelta = newAngle - draggedNode.angle;

    const updated = currentNodes.map((node, idx) => {
      if (node.id === dragIdRef.current) {
        return {
          ...node,
          x: newX,
          y: newY,
          angle: newAngle,
          targetAngle: newAngle,
          vx: 0,
          vy: 0,
        };
      }

      const distance = Math.abs(idx - draggedIdx);
      const chainDistance = Math.min(distance, currentNodes.length - distance);

      let elasticity: number;
      if (chainDistance === 1) {
        elasticity = 0.25;
      } else if (chainDistance === 2) {
        elasticity = 0.45;
      } else {
        elasticity = 0.65;
      }

      const newTargetAngle = node.targetAngle + angleDelta * elasticity;
      return { ...node, targetAngle: newTargetAngle };
    });

    nodesRef.current = updated;
  }, [sphereCenterX, sphereCenterY]);

  const handleDragEnd = useCallback(() => {
    dragIdRef.current = null;
  }, []);

  const onPointerDown = useCallback((id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedId(id);
    handleDragStart(id, e.clientX, e.clientY);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [handleDragStart]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    handleDragMove(e.clientX, e.clientY);
  }, [handleDragMove]);

  const onPointerUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const showNodes = neuralPhase === 'gather' || neuralPhase === 'ready';

  const [reveal, setReveal] = useState(0);
  useEffect(() => {
    if (!showNodes) {
      setReveal(0);
      return;
    }
    if (neuralPhase === 'ready') {
      setReveal(1);
      return;
    }
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / MESH_GATHER_MS);
      setReveal(t);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [showNodes, neuralPhase]);

  const nodeRevealClamped = neuralPhase === 'ready' ? 1 : reveal;

  return (
    <motion.div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-auto"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Acciones: volver + compartir */}
      <div className="absolute top-24 left-8 z-30 flex items-center gap-4 pointer-events-none">
        <button
          type="button"
          onClick={onBack}
          title="Volver al mapa"
          aria-label="Volver al mapa"
          className="w-16 h-16 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/15 hover:border-white/30 shadow-lg transition pointer-events-auto"
        >
          <ArrowLeft className="w-7 h-7" aria-hidden />
        </button>
        {shareUrl && <ShareAnalysisButton url={shareUrl} variant="circle" />}
      </div>

      {/* Nodos alrededor de la esfera */}
      {showNodes &&
        nodes.map((node) => {
          const active = selectedId === node.id;
          const sizePx =
            node.entityKind === 'group' || node.entityKind === 'institution' ? 68 : 58;
          return (
            <div
              key={node.id}
              className="absolute z-10 touch-none"
              style={{
                left: node.x,
                top: node.y,
                width: sizePx,
                height: sizePx,
                marginLeft: -sizePx / 2,
                marginTop: -sizePx / 2,
                opacity: nodeRevealClamped,
                transform: `scale(${0.5 + nodeRevealClamped * 0.5})`,
                transition: dragIdRef.current === node.id ? 'none' : 'opacity 0.35s ease-out',
              }}
              onPointerDown={(e) => onPointerDown(node.id, e)}
            >
              <div
                className={`w-full h-full rounded-xl overflow-hidden cursor-grab active:cursor-grabbing border-2 transition-all ${
                  node.highlight
                    ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)]'
                    : 'border-white/25'
                } ${active ? 'ring-2 ring-teal-400/70 scale-105' : ''}`}
              >
                {node.imageUrl ? (
                  <img
                    src={node.imageUrl}
                    alt={node.title}
                    className={`w-full h-full object-cover ${node.role === 'institution' ? 'bg-white p-1.5 object-contain' : ''}`}
                    draggable={false}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <motion.div className="w-full h-full bg-white/10 flex flex-col items-center justify-center gap-0.5 p-1">
                    <GraphNodeIcon kind={node.entityKind} highlight={node.highlight} />
                    <span className="text-[8px] text-white/60 text-center leading-tight line-clamp-2 px-0.5">
                      {node.title}
                    </span>
                  </motion.div>
                )}
              </div>
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-white/65 whitespace-nowrap max-w-[88px] truncate">
                {node.title}
              </span>
            </div>
          );
        })}

      {/* Hub central: iniciativa → resumen en panel */}
      {showNodes && (
        <AnalysisCenterHub
          x={sphereCenterX}
          y={sphereCenterY}
          diameter={hubDiameter * nodeRevealClamped}
          title={analysis.acquisition.title}
          subtitle={
            leg?.iniciativaId
              ? `Iniciativa ${leg.iniciativaId}${leg.estado ? ` · ${leg.estado}` : ''}`
              : analysis.acquisition.institution
          }
          legislative={leg}
          active={selectedId === 'acquisition'}
          visible={nodeRevealClamped > 0.4}
          onClick={handleCenterSelect}
        />
      )}

      {/* Panel flotante derecho */}
      <AnimatePresence>
        {panelOpen && nodeRevealClamped > 0.5 && (
          <motion.div
            initial={{ x: 32, opacity: 0, scale: 0.97 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 32, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="absolute right-5 z-30 w-[min(400px,40vw)] pointer-events-auto"
            style={{ top: PANEL_TOP, bottom: PANEL_BOTTOM }}
          >
            <div className="h-full flex flex-col rounded-2xl overflow-hidden bg-white/[0.06] backdrop-blur-2xl border border-white/15 shadow-[0_8px_40px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 gap-2 shrink-0">
                <h3 className="text-base font-semibold text-white truncate">Detalles</h3>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  title="Ocultar panel"
                  aria-label="Ocultar panel"
                  className="p-2 rounded-lg hover:bg-white/10 transition text-white/60 hover:text-white shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 min-h-0">
                <AnalysisDetailPanel
                  analysis={analysis}
                  graphNodes={graphNodes}
                  selectedId={selectedId}
                  onSelectId={(id) => {
                    setSelectedId(id);
                    setPanelOpen(true);
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Abrir panel cuando está cerrado */}
      {!panelOpen && nodeRevealClamped > 0.5 && (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          type="button"
          onClick={() => setPanelOpen(true)}
          title="Mostrar detalles"
          aria-label="Mostrar detalles"
          className="absolute right-6 z-30 p-3.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 shadow-lg transition pointer-events-auto top-1/2 -translate-y-1/2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>
      )}
    </motion.div>
  );
}
