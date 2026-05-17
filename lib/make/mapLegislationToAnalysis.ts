import type {
  AnalysisEdge,
  AnalysisNode,
  ConflictedDeputyInfo,
  LegislativeBenefitAnalysis,
  LegislativeMeta,
  LegislativeProcessFlag,
  LegislativeRiskFactor,
  ThreatAnalysis,
  ThreatLevel,
  ThreatSource,
} from '@/lib/types';
import type {
  MakeBenefitAnalysis,
  MakeConflictedDeputy,
  MakeLegislationPayload,
  MakeRiskFactor,
} from './types';
import { buildLegislationGraphNodes } from './buildLegislationGraphNodes';

export function mapRiskLevel(level?: string): ThreatLevel {
  const l = (level ?? '').toLowerCase();
  if (l === 'alto' || l === 'high') return 'high';
  if (l === 'medio' || l === 'medium') return 'medium';
  if (l === 'bajo' || l === 'low') return 'low';
  return 'possible';
}

function formatEstado(estado?: string): string {
  if (!estado) return '—';
  return estado.replace(/_/g, ' ');
}

function formatCategory(category?: string): string {
  if (!category) return 'LEGISLATIVO';
  return category.replace(/_/g, ' ').toUpperCase();
}

function formatDate(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
}

function sourceLabelFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host.split('.')[0] ?? host;
  } catch {
    return 'Fuente';
  }
}

function mapRiskFactors(factors?: MakeRiskFactor[]): LegislativeRiskFactor[] {
  if (!factors?.length) return [];
  return factors.map((f) => ({
    type: f.type ?? 'riesgo',
    riskLevel: f.risk_level ?? 'medio',
    description: f.description ?? '',
    evidence: f.evidence,
    verification: f.verification,
  }));
}

function mapConflicted(deputies?: MakeConflictedDeputy[]): ConflictedDeputyInfo[] {
  if (!deputies?.length) return [];
  const seen = new Set<string>();
  const out: ConflictedDeputyInfo[] = [];
  for (const d of deputies) {
    const nombre = d.nombre?.trim();
    if (!nombre) continue;
    const key = `${nombre}|${d.entidad_relacionada ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      nombre,
      entidadRelacionada: d.entidad_relacionada ?? '—',
      tipoRelacion: d.tipo_relacion,
      sector: d.sector,
      conflicto: d.por_que_representa_conflicto ?? '',
      fuenteUrl: d.fuente_url,
      riskLevel: d.risk_level,
      verification: d.verification,
    });
  }
  return out;
}

function mapProcessFlags(
  flags?: Array<{ flag?: string; risk_level?: string; evidence?: string }>,
): LegislativeProcessFlag[] {
  if (!flags?.length) return [];
  return flags
    .filter((f) => f.flag)
    .map((f) => ({
      flag: f.flag!,
      riskLevel: f.risk_level ?? 'medio',
      evidence: f.evidence ?? '',
    }));
}

function mapBenefit(b?: MakeBenefitAnalysis): LegislativeBenefitAnalysis | undefined {
  if (!b?.public_benefit && !b?.possible_private_or_institutional_benefit) return undefined;
  return {
    publicBenefit: b.public_benefit,
    privateBenefit: b.possible_private_or_institutional_benefit,
    benefitClarity: b.benefit_clarity,
    notes: b.notes,
  };
}

export function mapLegislationToAnalysis(
  payload: MakeLegislationPayload,
  searchId: string,
): ThreatAnalysis {
  const report = payload.raw?.report_json;
  const law = payload.raw?.law_json;
  const legislative = payload.legislative;
  const detail = payload.detail;

  const referenceId =
    payload.iniciativa_id ||
    payload.decreto_id ||
    legislative?.iniciativa_id ||
    legislative?.decreto_id ||
    searchId;

  const riskLevel = mapRiskLevel(
    payload.risk_level ?? detail?.risk_level ?? report?.risk_level ?? payload.risk?.level,
  );

  const riskScore =
    payload.risk_score ??
    detail?.risk_score ??
    report?.risk_score ??
    payload.risk?.score;

  const title = payload.title ?? detail?.headline ?? report?.title ?? 'Iniciativa legislativa';
  const summary =
    payload.summary ??
    detail?.description ??
    report?.summary ??
    payload.risk?.summary ??
    '';

  const reportMarkdown =
    detail?.report_markdown ?? report?.report_markdown ?? payload.risk?.summary ?? summary;

  const conflictedDeputies = mapConflicted(
    report?.conflicted_deputies as MakeConflictedDeputy[] | undefined,
  );

  const sources = [
    ...(report?.sources ?? []),
    ...(law?.sources ?? []),
  ].filter((s, i, arr) => typeof s === 'string' && arr.indexOf(s) === i);

  const primarySource = sources[0] ?? 'https://www.congreso.gob.gt';

  const fecha =
    formatDate(payload.fecha_ultima_accion) ??
    formatDate(law?.fecha_ultima_accion) ??
    formatDate(detail?.date) ??
    formatDate(payload.fecha_aprobacion);

  const acquisition = {
    title,
    summary,
    guatecomprasUrl: primarySource,
    institution: 'Congreso de la República',
    amount:
      detail?.amount != null && detail.amount !== ''
        ? String(detail.amount)
        : `Riesgo ${riskScore ?? '—'}/100`,
    date: fecha,
  };

  const nodes: AnalysisNode[] = [];
  const edges: AnalysisEdge[] = [];

  nodes.push({
    id: 'acquisition',
    title,
    description: summary,
    risks: reportMarkdown ? [reportMarkdown] : [],
    imageUrl: '',
    sources: sources.slice(0, 6).map((url) => ({
      label: sourceLabelFromUrl(url),
      url,
    })),
    role: 'acquisition',
  });

  const diputados =
    legislative?.impulsores?.diputados_ponentes ??
    law?.impulsores?.diputados_ponentes ??
    [];

  const posiblesBeneficiados = law?.posibles_beneficiados_externos ?? [];
  const { nodes: orbitNodes, edges: orbitEdges } = buildLegislationGraphNodes(
    payload,
    conflictedDeputies,
    diputados,
    posiblesBeneficiados,
  );
  nodes.push(...orbitNodes);
  edges.push(...orbitEdges);

  const legislativeMeta: LegislativeMeta = {
    referenceId,
    iniciativaId: payload.iniciativa_id ?? legislative?.iniciativa_id ?? law?.iniciativa_id,
    decretoId: payload.decreto_id ?? legislative?.decreto_id ?? law?.decreto_id,
    tipoReferencia:
      payload.tipo_referencia ?? legislative?.tipo_referencia ?? law?.tipo_referencia,
    estado: formatEstado(payload.estado ?? legislative?.estado ?? law?.estado),
    category: formatCategory(detail?.category ?? payload.tipo_referencia),
    riskLevel,
    riskScore,
    diputadosPonentes: diputados,
    bancadas: legislative?.impulsores?.bancadas ?? law?.impulsores?.bancadas ?? [],
    comisiones: legislative?.impulsores?.comisiones ?? law?.impulsores?.comisiones ?? [],
    entidades: legislative?.impulsores?.entidades ?? law?.impulsores?.entidades ?? [],
    reportMarkdown,
    riskFactors: mapRiskFactors(report?.risk_factors),
    conflictedDeputies,
    processFlags: mapProcessFlags(report?.process_flags),
    benefitAnalysis: mapBenefit(report?.benefit_analysis),
    sources,
    limitations: [...(report?.limitations ?? []), ...(law?.limitations ?? [])],
    posiblesBeneficiados: law?.posibles_beneficiados_externos ?? [],
    actoresPoliticos: law?.actores_politicos_vinculados ?? [],
    voteTotals: legislative?.vote_totals,
  };

  return {
    threatId: payload.id ?? `leg-${referenceId}`,
    acquisition,
    nodes,
    edges,
    legislative: legislativeMeta,
  };
}
