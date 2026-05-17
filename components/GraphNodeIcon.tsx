'use client';

import {
  AlertTriangle,
  Building2,
  Briefcase,
  Flag,
  Landmark,
  Scale,
  User,
  Users,
} from 'lucide-react';
import type { GraphEntityKind } from '@/lib/types';

const ICON_CLASS = 'w-5 h-5';

export function GraphNodeIcon({
  kind,
  highlight,
  compact,
}: {
  kind?: GraphEntityKind;
  highlight?: boolean;
  compact?: boolean;
}) {
  const color = highlight ? 'text-red-300' : 'text-white/55';
  const size = compact ? 'w-4 h-4' : ICON_CLASS;

  switch (kind) {
    case 'person':
      return <User className={`${size} ${color}`} aria-hidden />;
    case 'institution':
      return <Building2 className={`${size} ${color}`} aria-hidden />;
    case 'case':
      return <Scale className={`${size} ${color}`} aria-hidden />;
    case 'party':
      return <Flag className={`${size} ${color}`} aria-hidden />;
    case 'group':
      return <Users className={`${size} ${color}`} aria-hidden />;
    case 'beneficiary':
      return <Briefcase className={`${size} ${color}`} aria-hidden />;
    case 'other':
      return <Landmark className={`${size} ${color}`} aria-hidden />;
    default:
      return <AlertTriangle className={`${size} ${color}`} aria-hidden />;
  }
}

export function entityKindLabel(kind?: GraphEntityKind): string {
  switch (kind) {
    case 'person':
      return 'Persona';
    case 'institution':
      return 'Institución';
    case 'case':
      return 'Caso / antecedente';
    case 'party':
      return 'Partido político';
    case 'group':
      return 'Grupo';
    case 'beneficiary':
      return 'Beneficiarios';
    default:
      return 'Entidad';
  }
}
