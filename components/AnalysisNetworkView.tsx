'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
} from 'd3-force';
import type { AnalysisNode, ThreatAnalysis } from '@/lib/types';
import { layoutNodesAroundCompra } from '@/lib/analysisLayout';
import type { MeshAnchor, MeshPhase } from './MorphingNeuralMesh';
import { MESH_GATHER_MS } from './MorphingNeuralMesh';

type SimNode = AnalysisNode & {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

interface AnalysisNetworkViewProps {
  analysis: ThreatAnalysis;
  onBack: () => void;
  neuralPhase: MeshPhase;
  onAnchorsChange: (anchors: MeshAnchor[]) => void;
}

function collideRadius(node: SimNode): number {
  if (node.id === 'acquisition') return 150;
  if (node.role === 'institution') return 62;
  return 54;
}

export function AnalysisNetworkView({
  analysis,
  onBack,
  neuralPhase,
  onAnchorsChange,
}: AnalysisNetworkViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null);
  const dragIdRef = useRef<string | null>(null);

  const [size, setSize] = useState({ w: 1000, h: 600 });
  const [nodes, setNodes] = useState<SimNode[]>([]);

  const [selectedId, setSelectedId] = useState<string>('acquisition');

  const graphNodes = useMemo(
    () => analysis.nodes.filter((n) => n.role !== 'acquisition'),
    [analysis.nodes],
  );

  const hubPos = useMemo(() => {
    const acq = nodes.find((n) => n.id === 'acquisition');
    if (acq) return { x: acq.x, y: acq.y };
    return { x: size.w * 0.5, y: size.h * 0.48 };
  }, [nodes, size]);

  const layoutTargets = useMemo(
    () => layoutNodesAroundCompra(hubPos, graphNodes, size),
    [hubPos, graphNodes, size],
  );

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

    const pad = 88;
    const cx = size.w * 0.5;
    const cy = size.h * 0.48;

    const acquisition: SimNode = {
      id: 'acquisition',
      title: 'Adquisición',
      description: analysis.acquisition.summary,
      risks: [],
      imageUrl: '',
      sources: [],
      role: 'acquisition',
      x: cx,
      y: cy,
    };

    const initial: SimNode[] = [
      acquisition,
      ...graphNodes.map((n) => ({
        ...n,
        x: layoutNodesAroundCompra({ x: cx, y: cy }, graphNodes, size)[n.id]?.x ?? cx,
        y: layoutNodesAroundCompra({ x: cx, y: cy }, graphNodes, size)[n.id]?.y ?? cy,
      })),
    ];

    const links: SimulationLinkDatum<SimNode>[] = analysis.edges.map((e) => ({
      source: e.from,
      target: e.to,
    }));

    const sim = forceSimulation<SimNode>(initial)
      .force(
        'link',
        forceLink<SimNode, SimulationLinkDatum<SimNode>>(links)
          .id((d) => d.id)
          .distance((l) => {
            const s = l.source as SimNode;
            const t = l.target as SimNode;
            if (s.id === 'acquisition' || t.id === 'acquisition') return 210;
            return 175;
          })
          .strength(0.38),
      )
      .force('charge', forceManyBody<SimNode>().strength(-240).distanceMax(520))
      .force('collide', forceCollide<SimNode>().radius(collideRadius).strength(0.85))
      .velocityDecay(0.65)
      .alphaDecay(0.022)
      .alphaMin(0.001)
      .on('tick', () => {
        for (const node of initial) {
          const r = collideRadius(node);
          node.x = Math.max(pad + r, Math.min(size.w - pad - r, node.x));
          node.y = Math.max(pad + r + 50, Math.min(size.h - pad - r - 36, node.y));
        }
        setNodes([...initial]);
      });

    simRef.current = sim;
    return () => {
      sim.stop();
    };
  }, [neuralPhase, size, analysis.edges, analysis.acquisition.summary, graphNodes]);

  const meshAnchors = useMemo((): MeshAnchor[] => {
    const list: MeshAnchor[] = [{ id: 'acquisition', x: hubPos.x, y: hubPos.y, weight: 3.5 }];
    for (const n of graphNodes) {
      const p = nodes.find((x) => x.id === n.id);
      list.push({
        id: n.id,
        x: p?.x ?? layoutTargets[n.id]?.x ?? hubPos.x,
        y: p?.y ?? layoutTargets[n.id]?.y ?? hubPos.y,
        weight: 1.2,
      });
    }
    return list;
  }, [hubPos, graphNodes, nodes, layoutTargets]);

  useEffect(() => {
    onAnchorsChange(meshAnchors);
  }, [meshAnchors, onAnchorsChange]);

  const onPointerDown = useCallback((id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    dragIdRef.current = id;
    setSelectedId(id);
    const node = simRef.current?.nodes().find((n) => n.id === id);
    if (node) {
      node.fx = node.x;
      node.fy = node.y;
      node.vx = 0;
      node.vy = 0;
    }
    simRef.current?.alphaTarget(0.12).restart();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragIdRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const node = simRef.current?.nodes().find((n) => n.id === dragIdRef.current);
    if (node) {
      node.fx = e.clientX - rect.left;
      node.fy = e.clientY - rect.top;
    }
  }, []);

  const onPointerUp = useCallback(() => {
    const id = dragIdRef.current;
    if (id) {
      const node = simRef.current?.nodes().find((n) => n.id === id);
      if (node) {
        node.fx = null;
        node.fy = null;
      }
    }
    dragIdRef.current = null;
    simRef.current?.alphaTarget(0);
  }, []);

  const selectedNode = graphNodes.find((n) => n.id === selectedId);
  const isAcquisition = selectedId === 'acquisition';
  const showNodes = neuralPhase === 'gather' || neuralPhase === 'ready';
  const showHub = neuralPhase !== 'idle-left';

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
  const hubReveal = showHub ? Math.max(nodeRevealClamped, neuralPhase === 'transit' ? 0.85 : 1) : 0;

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

      {(showHub || showNodes) && (
        <div
          className="absolute z-20 max-w-md touch-none"
          style={{
            left: hubPos.x,
            top: hubPos.y,
            transform: 'translate(-50%, -50%)',
            opacity: hubReveal,
            pointerEvents: hubReveal > 0.4 ? 'auto' : 'none',
          }}
          onPointerDown={(e) => onPointerDown('acquisition', e)}
        >
          <button
            type="button"
            onClick={() => setSelectedId('acquisition')}
            className={`text-left w-72 rounded-2xl border p-4 transition-colors glass-panel cursor-grab active:cursor-grabbing ${
              isAcquisition
                ? 'border-teal-400/60 shadow-[0_0_24px_rgba(94,234,212,0.2)]'
                : 'border-white/15 hover:border-white/30'
            }`}
          >
            <p className="text-xs uppercase tracking-widest text-teal-300/80 mb-1">Adquisición</p>
            <p className="text-sm font-semibold text-white leading-snug">{analysis.acquisition.title}</p>
            <p className="text-xs text-white/60 mt-1">{analysis.acquisition.amount}</p>
          </button>
        </div>
      )}

      {showNodes &&
        nodes
          .filter((n) => n.id !== 'acquisition')
          .map((node) => {
            const active = selectedId === node.id;
            const sizePx = node.role === 'institution' ? 112 : 96;
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
                  transition: 'opacity 0.35s ease-out',
                }}
                onPointerDown={(e) => onPointerDown(node.id, e)}
              >
                <div
                  className={`w-full h-full rounded-xl overflow-hidden cursor-grab active:cursor-grabbing border-2 transition-shadow ${
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
                </div>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/70 whitespace-nowrap">
                  {node.title}
                </span>
              </div>
            );
          })}

      <AnimatePresence mode="wait">
        {nodeRevealClamped > 0.65 && (
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 w-full max-w-3xl px-8 pointer-events-auto"
          >
            {isAcquisition ? (
              <motion.div className="glass-panel rounded-2xl p-6 border border-white/10 text-center">
                <p className="text-lg leading-relaxed text-white/90">{analysis.acquisition.summary}</p>
                <a
                  href={analysis.acquisition.guatecomprasUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex mt-5 px-6 py-2.5 rounded-full bg-teal-800/50 border border-teal-500/40 text-teal-100 text-sm font-medium hover:bg-teal-700/50 transition"
                >
                  Ver en Guatecompras →
                </a>
              </motion.div>
            ) : selectedNode ? (
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
            ) : null}
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

