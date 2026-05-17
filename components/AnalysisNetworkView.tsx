'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { AnalysisNode, ThreatAnalysis } from '@/lib/types';
import type { MeshAnchor, MeshPhase } from './MorphingNeuralMesh';
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
  onAnchorsChange: (anchors: MeshAnchor[]) => void;
}

export function AnalysisNetworkView({
  analysis,
  onBack,
  neuralPhase,
  onAnchorsChange,
}: AnalysisNetworkViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);

  const [size, setSize] = useState({ w: 1000, h: 600 });
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const nodesRef = useRef<SimNode[]>([]);

  const [selectedId, setSelectedId] = useState<string>('');

  const graphNodes = useMemo(
    () => analysis.nodes.filter((n) => n.role !== 'acquisition'),
    [analysis.nodes],
  );

  // Radio y centro del circulo
  const circleRadius = useMemo(() => Math.min(size.w, size.h) * 0.28, [size]);
  const centerX = useMemo(() => size.w * 0.5, [size.w]);
  const centerY = useMemo(() => size.h * 0.42, [size.h]);

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

  // Inicializar nodos en la circunferencia
  useEffect(() => {
    if (neuralPhase !== 'gather' && neuralPhase !== 'ready') return;
    if (size.w < 200) return;

    const count = graphNodes.length;
    const initial: SimNode[] = graphNodes.map((n, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + circleRadius * Math.cos(angle);
      const y = centerY + circleRadius * Math.sin(angle);
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
  }, [neuralPhase, size, graphNodes, circleRadius, centerX, centerY, selectedId]);

  // Simulacion de fisica con spring y amortiguamiento (tipo agua)
  useEffect(() => {
    const SPRING = 0.035;
    const DAMPING = 0.88;
    const CHAIN_SPRING = 0.025;

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

        // Posicion objetivo en la circunferencia
        const targetX = centerX + circleRadius * Math.cos(node.targetAngle);
        const targetY = centerY + circleRadius * Math.sin(node.targetAngle);

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
  }, [circleRadius, centerX, centerY]);

  // Mesh anchors para la red neural
  const meshAnchors = useMemo((): MeshAnchor[] => {
    return nodes.map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
      weight: 1.5,
    }));
  }, [nodes]);

  useEffect(() => {
    onAnchorsChange(meshAnchors);
  }, [meshAnchors, onAnchorsChange]);

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

    // Calcular el nuevo angulo basado en la posicion del mouse
    const dx = newX - centerX;
    const dy = newY - centerY;
    const newAngle = Math.atan2(dy, dx);

    const currentNodes = nodesRef.current;
    const draggedIdx = currentNodes.findIndex((n) => n.id === dragIdRef.current);
    if (draggedIdx === -1) return;

    const draggedNode = currentNodes[draggedIdx];
    const angleDelta = newAngle - draggedNode.angle;

    const updated = currentNodes.map((node, idx) => {
      if (node.id === dragIdRef.current) {
        // Nodo arrastrado: se mueve libremente
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

      // Cadena elastica: los vecinos se mueven con resistencia
      const distance = Math.abs(idx - draggedIdx);
      const chainDistance = Math.min(distance, currentNodes.length - distance);

      // Factor de elasticidad: vecino directo tiene resistencia, los demas siguen mas
      let elasticity: number;
      if (chainDistance === 1) {
        elasticity = 0.3; // Vecino directo: resistencia
      } else if (chainDistance === 2) {
        elasticity = 0.5;
      } else {
        elasticity = 0.7; // Nodos lejanos: siguen mas
      }

      const newTargetAngle = node.targetAngle + angleDelta * elasticity;
      return { ...node, targetAngle: newTargetAngle };
    });

    nodesRef.current = updated;
  }, [centerX, centerY]);

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
      <div className="absolute top-20 left-8 z-20 pointer-events-none">
        <h2 className="text-3xl font-bold tracking-wider text-white">Analisis</h2>
      </div>

      {showNodes &&
        nodes.map((node) => {
          const active = selectedId === node.id;
          const sizePx = node.role === 'institution' ? 100 : 88;
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
                className={`w-full h-full rounded-xl overflow-hidden cursor-grab active:cursor-grabbing border-2 transition-shadow ${
                  node.highlight
                    ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)]'
                    : 'border-white/25'
                } ${active ? 'ring-2 ring-teal-400/70' : ''}`}
              >
                {node.imageUrl ? (
                  <img
                    src={node.imageUrl}
                    alt={node.title}
                    className={`w-full h-full object-cover ${node.role === 'institution' ? 'bg-white p-2 object-contain' : ''}`}
                    draggable={false}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/70 text-sm">
                    {node.title}
                  </div>
                )}
              </div>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/70 whitespace-nowrap">
                {node.title}
              </span>
            </div>
          );
        })}

      <AnimatePresence mode="wait">
        {nodeRevealClamped > 0.65 && selectedNode && (
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 w-full max-w-3xl px-8 pointer-events-auto"
          >
            <motion.div className="glass-panel rounded-2xl p-6 border border-white/10">
              <p className="text-white/80 mb-4">{selectedNode.description}</p>
              {selectedNode.risks.length > 0 && (
                <>
                  <h4 className="text-lg font-semibold text-white mb-3">
                    Esta compra presenta riesgos debido a:
                  </h4>
                  <ul className="list-disc pl-5 space-y-2 text-white/85 mb-4">
                    {selectedNode.risks.map((risk) => (
                      <li key={risk}>{risk}</li>
                    ))}
                  </ul>
                </>
              )}
              {selectedNode.sources.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-semibold text-white/60">Fuentes:</span>
                  {selectedNode.sources.map((s) =>
                    s.url ? (
                      <a
                        key={s.label}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg glass text-sm text-white/90 hover:bg-white/15"
                      >
                        {s.label}
                      </a>
                    ) : (
                      <span
                        key={s.label}
                        className="px-3 py-1.5 rounded-lg glass text-sm text-white/90"
                      >
                        {s.label}
                      </span>
                    ),
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
        <button
          type="button"
          onClick={onBack}
          className="px-8 py-2.5 rounded-full glass border border-white/20 text-white hover:bg-white/10 transition"
        >
          Volver
        </button>
      </div>
    </motion.div>
  );
}
