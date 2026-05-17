'use client';

import type { LegislativeMeta, ThreatLevel } from '@/lib/types';

function riskLabel(level: ThreatLevel): string {
  switch (level) {
    case 'high':
      return 'Alto';
    case 'medium':
      return 'Medio';
    case 'low':
      return 'Bajo';
    default:
      return '—';
  }
}

function riskClass(level: ThreatLevel): string {
  switch (level) {
    case 'high':
      return 'border-red-500/50 bg-red-950/30 text-red-200';
    case 'medium':
      return 'border-amber-500/50 bg-amber-950/30 text-amber-100';
    case 'low':
      return 'border-teal-500/40 bg-teal-950/25 text-teal-100';
    default:
      return 'border-white/20 bg-white/5 text-white/70';
  }
}

interface AnalysisCenterHubProps {
  x: number;
  y: number;
  diameter: number;
  title: string;
  subtitle?: string;
  legislative?: LegislativeMeta;
  active: boolean;
  visible: boolean;
  onClick: () => void;
}

export function AnalysisCenterHub({
  x,
  y,
  diameter,
  title,
  subtitle,
  legislative,
  active,
  visible,
  onClick,
}: AnalysisCenterHubProps) {
  if (!visible || diameter < 40) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute z-[15] flex flex-col items-center justify-center rounded-full border-2 text-center transition-all cursor-pointer pointer-events-auto backdrop-blur-md ${
        active
          ? 'border-teal-400/80 bg-teal-500/15 shadow-[0_0_32px_rgba(45,212,191,0.25)] scale-105'
          : 'border-white/25 bg-black/40 hover:border-teal-500/50 hover:bg-teal-500/10'
      }`}
      style={{
        left: x,
        top: y,
        width: diameter,
        height: diameter,
        marginLeft: -diameter / 2,
        marginTop: -diameter / 2,
        opacity: visible ? 1 : 0,
      }}
      aria-label={`Iniciativa: ${title}. Ver resumen`}
    >
      <span className="text-[10px] uppercase tracking-wider text-teal-400/90 font-semibold px-2">
        Iniciativa
      </span>
      <p className="text-white font-semibold text-xs leading-tight px-3 line-clamp-2 mt-0.5">
        {title}
      </p>
      {subtitle && (
        <p className="text-white/50 text-[10px] mt-1 px-2 truncate max-w-full">{subtitle}</p>
      )}
      {legislative && (
        <div className="flex flex-wrap items-center justify-center gap-1 mt-2 px-2">
          {legislative.iniciativaId && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">
              #{legislative.iniciativaId}
            </span>
          )}
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${riskClass(legislative.riskLevel)}`}
          >
            Riesgo {riskLabel(legislative.riskLevel)}
          </span>
        </div>
      )}
      <span className="text-[9px] text-teal-300/80 mt-2 font-medium">Ver resumen →</span>
    </button>
  );
}
