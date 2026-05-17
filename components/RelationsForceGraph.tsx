'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { formatNeo4jDetailValue } from '@/lib/formatNeo4jDetailValue';
import { buildUndirectedNeighborMap, orderedNeighborIds } from '@/lib/graph/neighbors';
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

/** Highlight: borde rojizo; selección: teal; vecino enfocado en foco grafo: ámbar. */
function strokeForNode(n: AnalysisNode, selected: boolean): { stroke: string; width: string } {
  if (selected) {
    return { stroke: 'rgba(94, 234, 212, 0.98)', width: '3' };
  }
  if (n.highlight) {
    return { stroke: 'rgba(254, 202, 202, 0.95)', width: '2.5' };
  }
  return { stroke: 'rgba(255, 255, 255, 0.35)', width: '1' };
}

function isEditableTarget(t: EventTarget | null): boolean {
  if (!t || !(t instanceof Element)) return false;
  const el = t.closest('input, textarea, select, [contenteditable="true"]');
  return el != null;
}

function applyGraphFocusStyles(
  svg: SVGSVGElement,
  selectedId: string | null,
  neighborIds: Set<string>,
  nodesById: Map<string, AnalysisNode>,
) {
  const hasFocus = selectedId != null;

  svg.querySelectorAll<SVGLineElement>('.graph-link').forEach((line) => {
    if (!hasFocus) {
      line.setAttribute('stroke', 'rgba(56,189,172,0.45)');
      line.setAttribute('stroke-width', '1.5');
      line.removeAttribute('opacity');
      return;
    }
    const from = line.getAttribute('data-from-id');
    const to = line.getAttribute('data-to-id');
    if (!from || !to) return;
    const incident = from === selectedId || to === selectedId;
    if (incident) {
      line.setAttribute('stroke', 'rgba(94,234,212,0.95)');
      line.setAttribute('stroke-width', '2.75');
      line.setAttribute('opacity', '1');
    } else {
      line.setAttribute('stroke', 'rgba(56,189,172,0.4)');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('opacity', '0.12');
    }
  });

  svg.querySelectorAll<SVGGElement>('.graph-node').forEach((gEl) => {
    const nid = gEl.getAttribute('data-node-id');
    const c = gEl.querySelector('circle');
    const te = gEl.querySelector('text');
    if (!c || !nid) return;
    const nodeMeta = nodesById.get(nid);
    if (!nodeMeta) return;

    if (!hasFocus) {
      c.setAttribute('fill', fillForNode(nodeMeta));
      c.removeAttribute('opacity');
      const st = strokeForNode(nodeMeta, false);
      c.setAttribute('stroke', st.stroke);
      c.setAttribute('stroke-width', st.width);
      if (te) {
        te.setAttribute('fill', 'rgba(255,255,255,0.75)');
        te.removeAttribute('opacity');
      }
      return;
    }

    const isSel = nid === selectedId;
    const isNbr = neighborIds.has(nid) && !isSel;
    const isDim = !isSel && !isNbr;

    c.setAttribute('fill', fillForNode(nodeMeta));
    if (isDim) {
      c.setAttribute('opacity', '0.28');
      c.setAttribute('stroke', 'rgba(255,255,255,0.14)');
      c.setAttribute('stroke-width', '1');
    } else if (isNbr) {
      c.setAttribute('opacity', '1');
      c.setAttribute('stroke', 'rgba(250, 204, 21, 0.95)');
      c.setAttribute('stroke-width', '2.5');
    } else {
      c.setAttribute('opacity', '1');
      const st = strokeForNode(nodeMeta, true);
      c.setAttribute('stroke', st.stroke);
      c.setAttribute('stroke-width', st.width);
    }
    if (te) {
      te.setAttribute('fill', isDim ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.88)');
      te.setAttribute('opacity', isDim ? '0.42' : '1');
    }
  });
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
  const neighborCycleIndexRef = useRef(-1);

  const [selectedNode, setSelectedNode] = useState<AnalysisNode | null>(null);
  const [neighborCycleIndex, setNeighborCycleIndex] = useState(-1);

  selectedIdRef.current = selectedNode?.id ?? null;

  const { neighborMap, nodesById } = useMemo(() => {
    const raw = analysis.nodes.filter((n) => n.role !== 'acquisition');
    const graphIds = new Set(raw.map((n) => n.id));
    const map = buildUndirectedNeighborMap(graphIds, analysis.edges);
    const idMap = new Map(analysis.nodes.map((n) => [n.id, n]));
    return { neighborMap: map, nodesById: idMap };
  }, [analysis.nodes, analysis.edges]);

  const orderedNeighbors = useMemo(() => {
    if (!selectedNode) return [] as string[];
    return orderedNeighborIds(selectedNode.id, neighborMap, nodesById);
  }, [selectedNode, neighborMap, nodesById]);

  const neighborIdSet = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    return new Set(neighborMap.get(selectedNode.id) ?? []);
  }, [selectedNode, neighborMap]);

  const handlePick = useCallback(
    (id: string) => {
      neighborCycleIndexRef.current = -1;
      setNeighborCycleIndex(-1);
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

  const clearSelection = useCallback(() => {
    neighborCycleIndexRef.current = -1;
    setNeighborCycleIndex(-1);
    setSelectedNode(null);
  }, []);

  const clearSelectionRef = useRef(clearSelection);
  clearSelectionRef.current = clearSelection;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    let fromBg = false;
    let downX = 0;
    let downY = 0;
    let downT = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const t = e.target as Element | null;
      if (t?.closest('.graph-node')) {
        fromBg = false;
        return;
      }
      fromBg = true;
      downX = e.clientX;
      downY = e.clientY;
      downT = performance.now();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!fromBg) return;
      fromBg = false;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const t = e.target as Element | null;
      if (t?.closest('.graph-node')) return;
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      const dt = performance.now() - downT;
      if (dist < 9 && dt < 600) {
        clearSelectionRef.current();
      }
    };

    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointerup', onPointerUp);
    return () => {
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const advanceNeighbor = useCallback(
    (delta: 1 | -1) => {
      const current = selectedNode;
      if (!current) return;
      const nbrs = orderedNeighborIds(current.id, neighborMap, nodesById);
      const n = nbrs.length;
      if (n === 0) return;
      const idx = neighborCycleIndexRef.current;
      const nextIdx = idx < 0 ? (delta === 1 ? 0 : n - 1) : (idx + delta + n) % n;
      const nextId = nbrs[nextIdx];
      const nextNode = analysis.nodes.find((x) => x.id === nextId);
      if (!nextNode || nextNode.role === 'acquisition') return;
      neighborCycleIndexRef.current = nextIdx;
      setNeighborCycleIndex(nextIdx);
      setSelectedNode(nextNode);
    },
    [selectedNode, neighborMap, nodesById, analysis.nodes],
  );

  const runLayout = useCallback(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg) return;

    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w < 20 || h < 20) return;

    const idSet = new Set(analysis.nodes.map((n) => n.id));
    const rawNodes = analysis.nodes.filter((n) => n.role !== 'acquisition');
    const graphIds = new Set(rawNodes.map((n) => n.id));
    const localNeighborMap = buildUndirectedNeighborMap(graphIds, analysis.edges);
    const idToNode = new Map(analysis.nodes.map((n) => [n.id, n]));

    const links: LinkDatum[] = [];
    const edgeKey = new Set<string>();
    for (const e of analysis.edges) {
      if (!idSet.has(e.from) || !idSet.has(e.to)) continue;
      const k = `${e.from}\0${e.to}`;
      if (edgeKey.has(k)) continue;
      edgeKey.add(k);
      links.push({ source: e.from, target: e.to });
    }

    const linkIdPairs = links.map((l) => ({
      from: l.source as string,
      to: l.target as string,
    }));

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

    const lineEls: SVGLineElement[] = linkIdPairs.map((pair) => {
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('class', 'graph-link');
      line.setAttribute('data-from-id', pair.from);
      line.setAttribute('data-to-id', pair.to);
      line.setAttribute('stroke', 'rgba(56,189,172,0.45)');
      line.setAttribute('stroke-width', '1.5');
      lineSel.appendChild(line);
      return line;
    });

    const selId = selectedIdRef.current;
    const nbrForFocus = selId ? localNeighborMap.get(selId) ?? new Set<string>() : new Set<string>();

    const nodeEls = nodes.map((n) => {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'graph-node cursor-pointer');
      g.setAttribute('data-node-id', n.id);

      const circle = document.createElementNS(NS, 'circle');
      const nr = n.highlight ? 12 : 10;
      circle.setAttribute('r', String(nr));
      circle.setAttribute('fill', fillForNode(n));
      const isSel = selId === n.id;
      const isNbr = selId != null && nbrForFocus.has(n.id) && !isSel;
      const isDim = selId != null && !isSel && !isNbr;
      if (!selId) {
        const st = strokeForNode(n, false);
        circle.setAttribute('stroke', st.stroke);
        circle.setAttribute('stroke-width', st.width);
      } else if (isDim) {
        circle.setAttribute('opacity', '0.28');
        circle.setAttribute('stroke', 'rgba(255,255,255,0.14)');
        circle.setAttribute('stroke-width', '1');
      } else if (isNbr) {
        circle.setAttribute('opacity', '1');
        circle.setAttribute('stroke', 'rgba(250, 204, 21, 0.95)');
        circle.setAttribute('stroke-width', '2.5');
      } else {
        const st = strokeForNode(n, true);
        circle.setAttribute('opacity', '1');
        circle.setAttribute('stroke', st.stroke);
        circle.setAttribute('stroke-width', st.width);
      }

      const text = document.createElementNS(NS, 'text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dy', '28');
      text.setAttribute(
        'fill',
        isDim ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.75)',
      );
      if (isDim) text.setAttribute('opacity', '0.42');
      text.setAttribute('font-size', '13');
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

    applyGraphFocusStyles(
      svg,
      selectedIdRef.current,
      selId ? nbrForFocus : new Set(),
      idToNode,
    );
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
    if (!svg?.querySelector('.graph-node')) return;
    const sel = selectedNode?.id ?? null;
    applyGraphFocusStyles(svg, sel, sel ? neighborIdSet : new Set(), nodesById);
  }, [selectedNode, neighborIdSet, nodesById, analysis.nodes, analysis.edges]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
        return;
      }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (!selectedNode) return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      advanceNeighbor(e.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedNode, advanceNeighbor, clearSelection]);

  const navLabel =
    orderedNeighbors.length === 0
      ? 'Sin vecinos'
      : neighborCycleIndex >= 0
        ? `Vecino ${neighborCycleIndex + 1} / ${orderedNeighbors.length}`
        : `${orderedNeighbors.length} vecino${orderedNeighbors.length === 1 ? '' : 's'} · ← →`;

  const hintBottom = selectedNode
    ? 'Rueda: zoom · Arrastrar: mover · Clic: detalle · ← → : vecinos'
    : 'Rueda: zoom · Arrastrar: mover · Clic: detalle';

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-stretch">
      <div className="glass-panel relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
        <div ref={wrapRef} className="relative w-full flex-1 min-h-[38vh] md:min-h-0">
          {selectedNode && (
            <div className="pointer-events-none absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
              <div className="rounded-xl border border-white/15 bg-black/35 px-3 py-1.5 text-xs text-white/70 backdrop-blur-md sm:text-sm">
                {orderedNeighbors.length === 0 ? 'Sin vecinos enlazados' : navLabel}
              </div>
            </div>
          )}
          <svg
            ref={svgRef}
            role="img"
            aria-label="Grafo de relaciones. Clic en un nodo para ver detalle."
            className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
          />
        </div>
        <p className="pointer-events-none absolute bottom-2 left-3 right-3 text-center text-sm text-white/50 md:left-4 md:right-4">
          {hintBottom}
        </p>
      </div>

      {selectedNode && (
        <aside className="glass-panel flex max-h-[min(50vh,28rem)] w-full max-w-full shrink-0 flex-col overflow-hidden rounded-2xl md:max-h-none md:max-w-md md:min-h-0 md:grow-0 md:shrink-0 md:basis-[min(26rem,36%)]">
          <div className="flex items-start justify-between border-b border-white/10 px-3 py-3 md:px-5 md:py-4">
            <h3 className="pr-2 text-xl font-semibold leading-snug text-white md:text-2xl">
              {selectedNode.title}
            </h3>
            <button
              type="button"
              onClick={() => {
                clearSelection();
              }}
              className="shrink-0 rounded-lg p-2 text-white/55 hover:bg-white/10 hover:text-white"
              aria-label="Cerrar panel"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 text-base leading-relaxed md:px-5 md:py-5">
            {selectedNode.neo4jLabels && selectedNode.neo4jLabels.length > 0 && (
              <p className="mb-3 text-base leading-snug text-white/55">
                Etiquetas:{' '}
                <span className="font-medium text-teal-300/90">{selectedNode.neo4jLabels.join(', ')}</span>
              </p>
            )}
            {selectedNode.description ? (
              <p className="mb-4 text-base text-white/80">{selectedNode.description}</p>
            ) : null}
            {selectedNode.risks.length > 0 && (
              <div className="mb-5">
                <h4 className="mb-2 text-base font-semibold uppercase tracking-wide text-white/60">
                  Riesgos
                </h4>
                <ul className="space-y-2 text-base text-white/85">
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
              <div className="mb-5">
                <h4 className="mb-2 text-base font-semibold uppercase tracking-wide text-white/60">
                  Fuentes
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedNode.sources.map((s, si) => (
                    <span
                      key={`${s.label}-${si}`}
                      className="rounded-lg bg-white/5 px-3 py-1.5 text-base text-white/85"
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
                <h4 className="mb-2 text-base font-semibold uppercase tracking-wide text-white/60">
                  Datos en Neo4j
                </h4>
                <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-2 text-base [word-break:break-word] leading-snug">
                  {Object.entries(selectedNode.detailProps).map(([key, val]) => {
                    const formatted = formatNeo4jDetailValue(key, val);
                    const shown = formatted || val;
                    return (
                      <Fragment key={key}>
                        <dt className="font-medium text-teal-400/90">{key}</dt>
                        <dd className="text-white/85">{shown.trim() ? shown : '—'}</dd>
                      </Fragment>
                    );
                  })}
                </dl>
              </div>
            ) : (
              <p className="mt-2 text-base text-white/55">
                Sin propiedades adicionales serializadas en{' '}
                <code className="rounded bg-white/10 px-1 py-0.5 text-[0.9em] text-white/75">
                  detailProps
                </code>
                .
              </p>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
