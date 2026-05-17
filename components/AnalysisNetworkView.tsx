'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { AnalysisNode, ThreatAnalysis } from '@/lib/types';
import { layoutNodesInRow } from '@/lib/analysisLayout';
import type { MeshAnchor, MeshPhase } from './MorphingNeuralMesh';
import { MESH_GATHER_MS } from './MorphingNeuralMesh';

type SimNode = AnalysisNode & {
  x: number;
  y: number;
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

  const [size, setSize] = useState({ w: 1000, h: 600 });
  const [nodes, setNodes] = useState<SimNode[]>([]);

  // Filtrar nodos (excluir acquisition)
  const graphNodes = useMemo(
    () => analysis.nodes.filter((n) => n.role !== 'acquisition'),
    [analysis.nodes],
  );
  
  // Seleccionar el primer nodo por defecto
  const [selectedId, setSelectedId] = useState<string>(graphNodes[0]?.id ?? '');

  // Layout en fila horizontal
  const rowLayout = useMemo(
    () => layoutNodesInRow(graphNodes, size),
    [graphNodes, size],
  );

  const hubPos = useMemo(() => {
    const keys = Object.keys(rowLayout);
    if (keys.length === 0) return { x: size.w * 0.5, y: size.h * 0.42 };
    const avgX = keys.reduce((sum, k) => sum + rowLayout[k].x, 0) / keys.length;
    const avgY = keys.reduce((sum, k) => sum + rowLayout[k].y, 0) / keys.length;
    return { x: avgX, y: avgY };
  }, [rowLayout, size]);

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

  useEffect(() => {
    if (neuralPhase !== 'gather' && neuralPhase !== 'ready') return;
    if (size.w < 200) return;

    const initial: SimNode[] = graphNodes.map((n) => ({
      ...n,
      x: rowLayout[n.id]?.x ?? size.w * 0.5,
      y: rowLayout[n.id]?.y ?? size.h * 0.42,
    }));

    setNodes(initial);
  }, [neuralPhase, size, graphNodes, rowLayout]);

  const meshAnchors = useMemo((): MeshAnchor[] => {
    const list: MeshAnchor[] = [];
    for (const n of nodes) {
      list.push({
        id: n.id,
        x: n.x,
        y: n.y,
        weight: 1.5,
      });
    }
    return list;
  }, [nodes]);

  useEffect(() => {
    onAnchorsChange(meshAnchors);
  }, [meshAnchors, onAnchorsChange]);

  // Drag handlers
  const handleDragStart = useCallback((id: string, clientX: number, clientY: number) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragIdRef.current = id;
    dragOffsetRef.current = {
      x: clientX - rect.left - node.x,
      y: clientY - rect.top - node.y,
    };
  }, [nodes]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragIdRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pad = 60;
    const newX = Math.max(pad, Math.min(size.w - pad, clientX - rect.left - dragOffsetRef.current.x));
    const newY = Math.max(pad, Math.min(size.h - pad, clientY - rect.top - dragOffsetRef.current.y));
    
    setNodes((prev) => {
      const draggedNode = prev.find((n) => n.id === dragIdRef.current);
      if (!draggedNode) return prev;
      
      const deltaX = newX - draggedNode.x;
      const deltaY = newY - draggedNode.y;
      
      // Elasticidad: los nodos conectados se mueven un poco
      return prev.map((n) => {
        if (n.id === dragIdRef.current) {
          return { ...n, x: newX, y: newY };
        }
        // Calcular distancia al nodo arrastrado
        const dist = Math.sqrt(
          Math.pow(n.x - draggedNode.x, 2) + Math.pow(n.y - draggedNode.y, 2)
        );
        // Factor de elasticidad basado en la distancia (mas cerca = mas efecto)
        const elasticity = Math.max(0, 1 - dist / 600) * 0.25;
        const elasticX = Math.max(pad, Math.min(size.w - pad, n.x + deltaX * elasticity));
        const elasticY = Math.max(pad, Math.min(size.h - pad, n.y + deltaY * elasticity));
        return { ...n, x: elasticX, y: elasticY };
      });
    });
  }, [size]);

  const handleDragEnd = useCallback(() => {
    dragIdRef.current = null;
  }, []);

  // Mouse events
  const onMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(id, e.clientX, e.clientY);
  }, [handleDragStart]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragIdRef.current) {
      handleDragMove(e.clientX, e.clientY);
    }
  }, [handleDragMove]);

  const onMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Touch events
  const onTouchStart = useCallback((id: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(id, touch.clientX, touch.clientY);
  }, [handleDragStart]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragIdRef.current) {
      const touch = e.touches[0];
      handleDragMove(touch.clientX, touch.clientY);
    }
  }, [handleDragMove]);

  const onTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const selectedNode = graphNodes.find((n) => n.id === selectedId);
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
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="absolute top-20 left-8 z-20 pointer-events-none">
        <h2 className="text-3xl font-bold tracking-wider text-white">Analisis</h2>
      </div>

      {showNodes &&
        nodes.map((node) => {
          const active = selectedId === node.id;
          const sizePx = node.role === 'institution' ? 112 : 96;
          return (
            <div
              key={node.id}
              className="absolute z-10 select-none"
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
                cursor: 'grab',
              }}
              onMouseDown={(e) => onMouseDown(node.id, e)}
              onTouchStart={(e) => onTouchStart(node.id, e)}
            >
              <button
                type="button"
                className={`w-full h-full rounded-xl overflow-hidden border-2 transition-shadow cursor-pointer ${
                  node.highlight
                    ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)]'
                    : 'border-white/25'
                } ${active ? 'ring-2 ring-teal-400/70' : ''}`}
                onClick={() => setSelectedId(node.id)}
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
              </button>
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
