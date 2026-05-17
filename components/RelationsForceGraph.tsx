'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from 'd3-force';
import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom';
import type { ZoomBehavior } from 'd3-zoom';
import type { AnalysisNode, ThreatAnalysis } from '@/lib/types';

const NS = 'http://www.w3.org/2000/svg';

/** Colores por etiqueta Neo4j (tema oscuro). Diputado + Entidad → prioridad Diputado. */
const FILL_DIPUTADO = 'rgba(139, 92, 246, 0.92)';
const FILL_ENTIDAD = 'rgba(34, 197, 94, 0.88)';
const FILL_DEFAULT = 'rgba(45, 212, 191, 0.85)';

function fillForNode(n: AnalysisNode): string {
  const labs = n.neo4jLabels ?? [];
  const hasDip = labs.some((l) => l === 'Diputado');
  const hasEnt = labs.some((l) => l === 'Entidad');
  if (hasDip) return FILL_DIPUTADO;
  if (hasEnt) return FILL_ENTIDAD;
  return FILL_DEFAULT;
}

/** Highlight: borde rojizo; selección: borde/teal más fuerte (no pisa el fill por etiqueta). */
function strokeForNode(n: AnalysisNode, selected: boolean): { stroke: string; width: string } {
  if (selected) {
    return { stroke: 'rgba(94, 234, 212, 0.98)', width: '3' };
  }
  if (n.highlight) {
    return { stroke: 'rgba(254, 202, 202, 0.95)', width: '2.5' };
  }
  return { stroke: 'rgba(255, 255, 255, 0.35)', width: '1' };
}

type SimNode = AnalysisNode & { x: number; y: number; vx?: number; vy?: number };

interface LinkDatum {
  source: string;
  target: string;
}

export function RelationsForceGraph({ analysis }: { analysis: ThreatAnalysis }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const lastTransformRef = useRef(zoomIdentity);
  const pickRef = useRef<(id: string) => void>(() => {});
  const selectedIdRef = useRef<string | null>(null);

  const [selectedNode, setSelectedNode] = useState<AnalysisNode | null>(null);
  selectedIdRef.current = selectedNode?.id ?? null;

  const handlePick = useCallback(
    (id: string) => {
      const n = analysis.nodes.find((x) => x.id === id) ?? null;
      if (!n || n.role === 'acquisition') {
        setSelectedNode(null);
        return;
      }
      setSelectedNode((prev) => (prev?.id === id ? null : n));
    },
    [analysis.nodes],
  );

  pickRef.current = handlePick;

  const runLayout = useCallback(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg) return;

    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w < 20 || h < 20) return;

    const idSet = new Set(analysis.nodes.map((n) => n.id));
    const rawNodes = analysis.nodes.filter((n) => n.role !== 'acquisition');
    const links: LinkDatum[] = [];
    const edgeKey = new Set<string>();
    for (const e of analysis.edges) {
      if (!idSet.has(e.from) || !idSet.has(e.to)) continue;
      const k = `${e.from}\0${e.to}`;
      if (edgeKey.has(k)) continue;
      edgeKey.add(k);
      links.push({ source: e.from, target: e.to });
    }

    simRef.current?.stop();

    if (rawNodes.length === 0) {
      svg.innerHTML = '';
      const tg = document.createElementNS(NS, 'text');
      tg.setAttribute('x', String(w / 2));
      tg.setAttribute('y', String(h / 2));
      tg.setAttribute('text-anchor', 'middle');
      tg.setAttribute('fill', 'rgba(255,255,255,0.45)');
      tg.setAttribute('font-size', '14');
      tg.textContent = 'No hay nodos en el grafo.';
      svg.appendChild(tg);
      return;
    }

    const nodes: SimNode[] = rawNodes.map((n, i) => {
      const angle = (i / rawNodes.length) * Math.PI * 2;
      const r = Math.min(w, h) * 0.35;
      return {
        ...n,
        x: w / 2 + r * Math.cos(angle),
        y: h / 2 + r * Math.sin(angle),
      };
    });

    const sim = forceSimulation<SimNode>(nodes);
    if (links.length > 0) {
      sim.force(
        'link',
        forceLink<SimNode, LinkDatum>(links)
          .id((d) => d.id)
          .distance(90)
          .strength(0.35),
      );
    }
    sim
      .force('charge', forceManyBody<SimNode>().strength(-220))
      .force('center', forceCenter(w / 2, h / 2))
      .force('collide', forceCollide<SimNode>().radius(42))
      .alphaDecay(0.022)
      .velocityDecay(0.35);

    simRef.current = sim;

    const gZoom = document.createElementNS(NS, 'g');
    gZoom.setAttribute('class', 'graph-zoom-layer');

    const gRoot = document.createElementNS(NS, 'g');
    gRoot.setAttribute('class', 'relations-force-root');

    svg.innerHTML = '';
    svg.appendChild(gZoom);
    gZoom.appendChild(gRoot);

    gZoom.setAttribute('transform', lastTransformRef.current.toString());

    const lineSel = document.createElementNS(NS, 'g');
    lineSel.setAttribute('class', 'links');
    const nodeSel = document.createElementNS(NS, 'g');
    nodeSel.setAttribute('class', 'nodes');
    gRoot.appendChild(lineSel);
    gRoot.appendChild(nodeSel);

    const lineEls: SVGLineElement[] = links.map(() => {
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('stroke', 'rgba(56,189,172,0.45)');
      line.setAttribute('stroke-width', '1.5');
      lineSel.appendChild(line);
      return line;
    });

    const selId = selectedIdRef.current;

    const nodeEls = nodes.map((n) => {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'graph-node cursor-pointer');
      g.setAttribute('data-node-id', n.id);

      const circle = document.createElementNS(NS, 'circle');
      const nr = n.highlight ? 12 : 10;
      circle.setAttribute('r', String(nr));
      circle.setAttribute('fill', fillForNode(n));
      const st = strokeForNode(n, selId === n.id);
      circle.setAttribute('stroke', st.stroke);
      circle.setAttribute('stroke-width', st.width);

      const text = document.createElementNS(NS, 'text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dy', '28');
      text.setAttribute('fill', 'rgba(255,255,255,0.75)');
      text.setAttribute('font-size', '10');
      text.setAttribute('pointer-events', 'none');
      text.textContent =
        n.title.length > 22 ? `${n.title.slice(0, 20)}…` : n.title;

      let downX = 0;
      let downY = 0;
      let downT = 0;

      const onPointerDown = (e: PointerEvent) => {
        downX = e.clientX;
        downY = e.clientY;
        downT = performance.now();
        try {
          (e.target as Element).setPointerCapture?.(e.pointerId);
        } catch {
          /* noop */
        }
      };

      /** Clic corto con poco movimiento: evita confundir con pan del zoom. */
      const onPointerUp = (e: PointerEvent) => {
        const dx = e.clientX - downX;
        const dy = e.clientY - downY;
        const dist = Math.hypot(dx, dy);
        const dt = performance.now() - downT;
        if (dist < 9 && dt < 600) {
          e.stopPropagation();
          e.preventDefault();
          pickRef.current(n.id);
        }
      };

      g.addEventListener('pointerdown', onPointerDown);
      g.addEventListener('pointerup', onPointerUp);
      g.addEventListener(
        'click',
        (e) => {
          e.stopPropagation();
        },
        true,
      );

      g.appendChild(circle);
      g.appendChild(text);
      nodeSel.appendChild(g);
      return { g, circle, text };
    });

    sim.on('tick', () => {
      links.forEach((l, i) => {
        const s = l.source as unknown as SimNode;
        const t = l.target as unknown as SimNode;
        if (s.x == null || t.x == null || s.y == null || t.y == null) return;
        const line = lineEls[i];
        line.setAttribute('x1', String(s.x));
        line.setAttribute('y1', String(s.y));
        line.setAttribute('x2', String(t.x));
        line.setAttribute('y2', String(t.y));
      });

      nodes.forEach((n, i) => {
        const { g } = nodeEls[i];
        g.setAttribute('transform', `translate(${n.x ?? 0},${n.y ?? 0})`);
      });
    });

    const zb = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.12, 14])
      .filter((event) => {
        if (event.type === 'wheel') {
          event.preventDefault();
        }
        const t = event.target as Element | null;
        if (
          (event.type === 'mousedown' || event.type === 'touchstart') &&
          t?.closest?.('.graph-node')
        ) {
          return false;
        }
        return !event.button;
      })
      .on('zoom', (event) => {
        lastTransformRef.current = event.transform;
        gZoom.setAttribute('transform', event.transform.toString());
      });

    zoomBehaviorRef.current = zb;
    const svgSel = select(svg);
    svgSel.call(zb);
    svgSel.call(zb.transform as never, lastTransformRef.current);

    sim.restart();
  }, [analysis]);

  useEffect(() => {
    runLayout();
    return () => {
      simRef.current?.stop();
      simRef.current = null;
      const svg = svgRef.current;
      if (svg) {
        select(svg).on('.zoom', null);
      }
      zoomBehaviorRef.current = null;
    };
  }, [runLayout]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => runLayout());
    ro.observe(el);
    return () => ro.disconnect();
  }, [runLayout]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const id = selectedNode?.id ?? null;
    svg.querySelectorAll<SVGGElement>('.graph-node').forEach((gEl) => {
      const nid = gEl.getAttribute('data-node-id');
      const c = gEl.querySelector('circle');
      if (!c || !nid) return;
      const nodeMeta = analysis.nodes.find((x) => x.id === nid);
      if (!nodeMeta) return;
      const selected = id === nid;
      const st = strokeForNode(nodeMeta, selected);
      c.setAttribute('stroke', st.stroke);
      c.setAttribute('stroke-width', st.width);
    });
  }, [selectedNode, analysis.nodes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedNode(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 md:flex-row">
      <div className="glass-panel relative min-h-0 flex-1 min-w-0 overflow-hidden rounded-2xl">
        <div ref={wrapRef} className="relative h-full min-h-[240px] w-full">
          <svg
            ref={svgRef}
            role="img"
            aria-label="Grafo de relaciones. Clic en un nodo para ver detalle."
            className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
          />
        </div>
        <p className="pointer-events-none absolute bottom-2 left-3 right-3 text-center text-[11px] text-white/40 md:left-4 md:right-4">
          Rueda: zoom · Arrastrar: mover · Clic: detalle
        </p>
      </div>

      {selectedNode && (
        <aside className="glass-panel flex w-full max-w-full shrink-0 flex-col overflow-hidden rounded-2xl md:max-w-sm md:min-w-[min(100%,20rem)]">
          <div className="flex items-start justify-between border-b border-white/10 px-4 py-3">
            <h3 className="pr-2 text-lg font-semibold leading-tight text-white">
              {selectedNode.title}
            </h3>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="shrink-0 rounded-lg p-1.5 text-white/55 hover:bg-white/10 hover:text-white"
              aria-label="Cerrar panel"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 text-sm">
            {selectedNode.neo4jLabels && selectedNode.neo4jLabels.length > 0 && (
              <p className="mb-3 text-xs text-white/50">
                Etiquetas:{' '}
                <span className="text-teal-300/90">{selectedNode.neo4jLabels.join(', ')}</span>
              </p>
            )}
            {selectedNode.description ? (
              <p className="mb-4 text-white/75 leading-relaxed">{selectedNode.description}</p>
            ) : null}
            {selectedNode.risks.length > 0 && (
              <div className="mb-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                  Riesgos
                </h4>
                <ul className="space-y-1.5 text-white/80">
                  {selectedNode.risks.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-red-400">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedNode.sources.length > 0 && (
              <div className="mb-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                  Fuentes
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedNode.sources.map((s, si) => (
                    <span
                      key={`${s.label}-${si}`}
                      className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white/80"
                    >
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-300 underline-offset-2 hover:underline"
                        >
                          {s.label}
                        </a>
                      ) : (
                        s.label
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {selectedNode.detailProps && Object.keys(selectedNode.detailProps).length > 0 ? (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                  Datos en Neo4j
                </h4>
                <dl className="space-y-2 text-xs">
                  {Object.entries(selectedNode.detailProps).map(([key, val]) => (
                    <div
                      key={key}
                      className="border-b border-white/5 pb-2 last:border-0 last:pb-0"
                    >
                      <dt className="font-medium text-teal-400/90">{key}</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap break-words text-white/70">
                        {val || '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <p className="mt-1 text-xs text-white/45">
                Sin propiedades adicionales serializadas en{' '}
                <code className="text-white/60">detailProps</code>.
              </p>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
