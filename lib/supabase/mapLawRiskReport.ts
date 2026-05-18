import type { Threat, ThreatLevel } from '@/lib/types';

export interface LawRiskReportRow {
  id: string;
  iniciativa_id: string | null;
  decreto_id?: string | null;
  title: string | null;
  summary: string | null;
  estado: string | null;
  risk_level: string | null;
  risk_score: string | number | null;
  created_at: string;
}

function mapRiskLevel(level?: string | null): ThreatLevel {
  const l = (level ?? '').toLowerCase();
  if (l === 'alto' || l === 'high') return 'high';
  if (l === 'medio' || l === 'medium') return 'medium';
  if (l === 'bajo' || l === 'low') return 'low';
  return 'possible';
}

function formatEstado(estado?: string | null): string {
  if (!estado) return 'Legislativo';
  return estado.replace(/_/g, ' ');
}

function formatReportDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = d.getUTCDate();
  const month = d
    .toLocaleDateString('es-GT', { month: 'short', timeZone: 'UTC' })
    .replace('.', '')
    .toUpperCase();
  return `${day} ${month}`;
}

export function mapLawRiskReportToThreat(row: LawRiskReportRow): Threat {
  const reference = row.iniciativa_id || row.decreto_id;
  const institution = reference
    ? row.iniciativa_id
      ? `Iniciativa ${row.iniciativa_id}`
      : `Decreto ${row.decreto_id}`
    : 'Congreso de la República';

  const score =
    row.risk_score != null && row.risk_score !== ''
      ? `Riesgo ${row.risk_score}/100`
      : formatEstado(row.estado);

  return {
    id: row.id,
    title: row.title?.trim() || 'Iniciativa legislativa',
    institution,
    amount: score,
    level: mapRiskLevel(row.risk_level),
    date: formatReportDate(row.created_at),
    iniciativaId: row.iniciativa_id ?? undefined,
    decretoId: row.decreto_id ?? undefined,
  };
}
