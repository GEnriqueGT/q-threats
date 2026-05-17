'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AxonLink } from '@/lib/neuralAxons';
import {
  buildAxonFibers,
  buildNucleusMesh,
  buildScatterFibers,
  type Point,
} from '@/lib/neuralAxons';

export type AxonPhase = 'sphere' | 'scatter' | 'gather' | 'ready';

interface NeuralAxonLayerProps {
  phase: AxonPhase;
  size: { w: number; h: number };
  center: Point;
  hub: Point;
  meshCenter: Point;
  anchorPoints: Point[];
  links: AxonLink[];
  gatherProgress: number;
}

export function NeuralAxonLayer({
  phase,
  size,
  center,
  hub,
  meshCenter,
  anchorPoints,
  links,
  gatherProgress,
}: NeuralAxonLayerProps) {
  const scatterRadius = Math.min(size.w, size.h) * 0.42;
  const [scatterExpand, setScatterExpand] = useState(0);

  useEffect(() => {
    if (phase !== 'scatter') {
      if (phase === 'sphere') setScatterExpand(0);
      return;
    }
    const start = performance.now();
    const duration = 700;
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setScatterExpand(t);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const linkProgress = phase === 'scatter' ? 0 : phase === 'ready' ? 1 : gatherProgress;

  const fibers = useMemo(() => {
    if (phase === 'sphere') return [];

    if (phase === 'scatter') {
      return buildScatterFibers(center, scatterRadius, scatterExpand, 200);
    }

    const linkFibers = links.flatMap((link) => {
      const count = link.id.startsWith('hub-') ? 16 : 10;
      return buildAxonFibers(link, center, meshCenter, scatterRadius, linkProgress, count);
    });

    const nucleus =
      linkProgress > 0.05
        ? buildNucleusMesh(
            meshCenter,
            center,
            anchorPoints,
            scatterRadius,
            linkProgress,
            56,
          )
        : [];

    return [...linkFibers, ...nucleus];
  }, [
    phase,
    links,
    center,
    meshCenter,
    anchorPoints,
    scatterRadius,
    linkProgress,
    scatterExpand,
  ]);

  const showScatterCloud =
    phase === 'scatter' || (phase === 'gather' && gatherProgress < 0.35);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]" aria-hidden>
      {showScatterCloud && (
        <g
          opacity={
            phase === 'scatter'
              ? 0.35 + scatterExpand * 0.25
              : 0.2 * (1 - gatherProgress / 0.35)
          }
        >
          {Array.from({ length: 140 }).map((_, i) => {
            const a = (i / 140) * Math.PI * 2 + i * 0.13;
            const r =
              scatterRadius *
              (0.15 + (i % 9) * 0.09) *
              (phase === 'scatter' ? scatterExpand : 1 - gatherProgress * 0.6);
            const cx = center.x + Math.cos(a) * r;
            const cy = center.y + Math.sin(a) * r;
            return (
              <circle
                key={`dust-${i}`}
                cx={cx}
                cy={cy}
                r={0.7 + (i % 4) * 0.35}
                fill="rgba(160,210,195,0.5)"
              />
            );
          })}
        </g>
      )}

      {fibers.map((f) => (
        <g key={f.id}>
          <path
            d={f.path}
            fill="none"
            stroke="rgba(150,200,185,0.92)"
            strokeWidth={f.width}
            strokeLinecap="round"
            opacity={f.opacity}
          />
          {f.synapses.map((s, j) => (
            <circle
              key={`${f.id}-s${j}`}
              cx={s.x}
              cy={s.y}
              r={1.1 + (j % 3) * 0.45}
              fill="rgba(200,230,220,0.75)"
              opacity={Math.min(1, f.opacity + 0.2)}
            />
          ))}
        </g>
      ))}

      {(phase === 'gather' || phase === 'ready') && gatherProgress > 0.2 && (
        <>
          <circle
            cx={meshCenter.x}
            cy={meshCenter.y}
            r={12 + gatherProgress * 28}
            fill="none"
            stroke="rgba(130,190,170,0.1)"
            strokeWidth={1}
          />
          <circle
            cx={hub.x}
            cy={hub.y}
            r={6 + gatherProgress * 14}
            fill="none"
            stroke="rgba(130,190,170,0.14)"
            strokeWidth={0.8}
          />
        </>
      )}
    </svg>
  );
}

/** Anima gatherProgress de 0 a 1 */
export function useGatherAnimation(active: boolean, durationMs = 2200) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setProgress(t);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, durationMs]);

  return progress;
}
