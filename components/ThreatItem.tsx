'use client';

import { Threat } from '@/lib/types';
import { motion } from 'motion/react';

interface ThreatItemProps {
  threat: Threat;
  onClick: () => void;
}

export function ThreatItem({ threat, onClick }: ThreatItemProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-amber-500';
      case 'possible':
        return 'text-white/60';
      default:
        return 'text-white/60';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'high':
        return 'Riesgo Alto';
      case 'medium':
        return 'Riesgo Medio';
      case 'possible':
        return 'Posible Riesgo';
      default:
        return '';
    }
  };

  const getDateBadgeClass = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-950/70 border-red-800/50 text-red-100';
      case 'medium':
        return 'bg-amber-950/70 border-amber-900/50 text-amber-100';
      case 'possible':
        return 'bg-zinc-800/60 border-zinc-600/40 text-white/80';
      default:
        return 'bg-zinc-800/60 border-zinc-600/40 text-white/80';
    }
  };

  return (
    <motion.button
      type="button"
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="w-full flex items-center justify-between gap-8 py-3 text-left cursor-pointer group"
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <h3 className="text-xl font-medium text-white group-hover:text-white">{threat.title}</h3>
        <div className="text-lg font-bold text-white">{threat.institution}</div>
        <div className="text-sm text-white/75">{threat.amount}</div>
        <div className={`text-sm font-semibold ${getRiskColor(threat.level)}`}>
          {getRiskLabel(threat.level)}
        </div>
      </div>
      <div
        className={`shrink-0 flex flex-col items-center justify-center px-4 py-2.5 rounded-lg border min-w-[76px] ${getDateBadgeClass(threat.level)}`}
      >
        <span className="text-lg font-bold leading-none">{threat.date.split(' ')[0]}</span>
        <span className="text-xs font-semibold uppercase tracking-wide mt-0.5">
          {threat.date.split(' ')[1]}
        </span>
      </div>
    </motion.button>
  );
}
