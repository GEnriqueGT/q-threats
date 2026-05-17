'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { AnalysisNode, ThreatAnalysis } from '@/lib/types';
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
}

export function AnalysisNetworkView({
  analysis,
  onBack,
  neuralPhase,
  onPanelToggle,
}: AnalysisNetworkViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);

  const [size, setSize] = useState({ w: 1000, h: 600 });
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const nodesRef = useRef<SimNode[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);

  const [selectedId, setSelectedId] = useState<string>('');

  const graphNodes = useMemo(
    () => analysis.nodes.filter((n) => n.role !== 'acquisition'),
    [analysis.nodes],
  );

  // Centro de la esfera - a la izquierda cuando el panel esta abierto, centrado cuando esta cerrado
  const sphereCenterX = useMemo(() => {
    if (panelOpen) {
      return size.w * 0.32;
    }
    return size.w * 0.5;
  }, [size.w, panelOpen]);
  
  const sphereCenterY = useMemo(() => size.h * 0.48, [size.h]);
  
  // Radio del circulo donde van los nodos
  const circleRadius = useMemo(() => Math.min(size.w * 0.28, size.h * 0.36), [size]);

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
    if (initial.length > 0 && !selectedId) {
      setSelectedId(initial[0].id);
    }
  }, [neuralPhase, size, graphNodes, circleRadius, sphereCenterX, sphereCenterY, selectedId]);

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

  const selectedNode = nodes.find((n) => n.id === selectedId);
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
      {/* Header */}
      <div className="absolute top-20 left-8 z-20 pointer-events-none">
        <h2 className="text-3xl font-bold tracking-wider text-white">Analisis</h2>
      </div>

      {/* Nodos alrededor de la esfera */}
      {showNodes &&
        nodes.map((node) => {
          const active = selectedId === node.id;
          const sizePx = node.role === 'institution' ? 90 : 78;
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
                  <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/70 text-xs text-center p-1">
                    {node.title}
                  </div>
                )}
              </div>
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/70 whitespace-nowrap max-w-[100px] truncate">
                {node.title}
              </span>
            </div>
          );
        })}

      {/* Panel lateral derecho - glassmorphism scrolleable */}
      <AnimatePresence>
        {panelOpen && nodeRevealClamped > 0.5 && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 bottom-0 w-[420px] max-w-[45%] z-30 pointer-events-auto"
          >
            <div className="h-full flex flex-col bg-white/5 backdrop-blur-xl border-l border-white/10">
              {/* Header del panel */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Detalles del Analisis</h3>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition text-white/60 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Contenido scrolleable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Info de la compra */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-400 text-xs font-semibold uppercase tracking-wider">Adquisicion</span>
                  </div>
                  <h4 className="text-xl font-bold text-white">{analysis.acquisition.title}</h4>
                  <p className="text-white/60 text-sm">{analysis.acquisition.summary}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-teal-300 font-semibold">
                      Q{analysis.acquisition.amount?.toLocaleString() || '2,000,000'}
                    </span>
                    <span className="text-white/40">|</span>
                    <span className="text-white/50">{analysis.acquisition.date || '15 Feb 2026'}</span>
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                {/* Entidad seleccionada */}
                {selectedNode && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      {selectedNode.imageUrl && (
                        <div className={`w-12 h-12 rounded-lg overflow-hidden border ${selectedNode.highlight ? 'border-red-500' : 'border-white/20'}`}>
                          <img
                            src={selectedNode.imageUrl}
                            alt={selectedNode.title}
                            className={`w-full h-full object-cover ${selectedNode.role === 'institution' ? 'bg-white p-1 object-contain' : ''}`}
                          />
                        </div>
                      )}
                      <div>
                        <h5 className="text-white font-semibold">{selectedNode.title}</h5>
                        <span className={`text-xs ${selectedNode.highlight ? 'text-red-400' : 'text-teal-400/80'}`}>
                          {selectedNode.role === 'institution' ? 'Entidad' : selectedNode.role === 'supplier' ? 'Proveedor' : 'Producto'}
                        </span>
                      </div>
                    </div>

                    <p className="text-white/70 text-sm leading-relaxed">{selectedNode.description}</p>

                    {selectedNode.risks.length > 0 && (
                      <div className="space-y-2">
                        <h6 className="text-white font-semibold text-sm">Riesgos identificados:</h6>
                        <ul className="space-y-2">
                          {selectedNode.risks.map((risk, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                              <span className="text-red-400 mt-1">•</span>
                              <span>{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedNode.sources.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs text-white/50 font-semibold">Fuentes:</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedNode.sources.map((s) =>
                            s.url ? (
                              <a
                                key={s.label}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/80 hover:bg-white/10 transition"
                              >
                                {s.label}
                              </a>
                            ) : (
                              <span
                                key={s.label}
                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/80"
                              >
                                {s.label}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="h-px bg-white/10" />

                {/* Lista de todas las entidades */}
                <div className="space-y-3">
                  <h6 className="text-white/50 text-xs font-semibold uppercase tracking-wider">Entidades involucradas</h6>
                  <div className="space-y-2">
                    {graphNodes.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => setSelectedId(node.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition text-left ${
                          selectedId === node.id ? 'bg-teal-500/20 border border-teal-500/30' : 'bg-white/5 border border-transparent hover:bg-white/10'
                        }`}
                      >
                        {node.imageUrl && (
                          <div className={`w-10 h-10 rounded-lg overflow-hidden border ${node.highlight ? 'border-red-500' : 'border-white/20'}`}>
                            <img
                              src={node.imageUrl}
                              alt={node.title}
                              className={`w-full h-full object-cover ${node.role === 'institution' ? 'bg-white p-1 object-contain' : ''}`}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{node.title}</p>
                          <p className="text-white/50 text-xs truncate">{node.role === 'institution' ? 'Entidad' : node.role === 'supplier' ? 'Proveedor' : 'Producto'}</p>
                        </div>
                        {node.highlight && (
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boton para abrir panel cuando esta cerrado */}
      {!panelOpen && nodeRevealClamped > 0.5 && (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          type="button"
          onClick={() => setPanelOpen(true)}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20 transition pointer-events-auto"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>
      )}

      {/* Boton Volver */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
        <button
          type="button"
          onClick={onBack}
          className="px-8 py-2.5 rounded-full bg-white/5 backdrop-blur-lg border border-white/20 text-white hover:bg-white/10 transition pointer-events-auto"
        >
          Volver
        </button>
      </div>
    </motion.div>
  );
}
