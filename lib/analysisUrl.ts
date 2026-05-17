export type AnalysisUrlParams =
  | { type: 'iniciativa'; id: string }
  | { type: 'amenaza'; id: string };

export function parseAnalysisUrlParams(
  searchParams: URLSearchParams,
): AnalysisUrlParams | null {
  const iniciativa = searchParams.get('iniciativa')?.trim();
  if (iniciativa) return { type: 'iniciativa', id: iniciativa };

  const amenaza = searchParams.get('amenaza')?.trim();
  if (amenaza) return { type: 'amenaza', id: amenaza };

  return null;
}

export function buildAnalysisShareUrl(params: AnalysisUrlParams): string {
  const base =
    typeof window !== 'undefined'
      ? window.location.origin + window.location.pathname
      : '';
  const q = new URLSearchParams();
  if (params.type === 'iniciativa') q.set('iniciativa', params.id);
  else q.set('amenaza', params.id);
  return `${base}?${q.toString()}`;
}

export function analysisUrlFromThreatAnalysis(
  analysis: { threatId: string; legislative?: { iniciativaId?: string; referenceId?: string } },
): AnalysisUrlParams {
  const ini =
    analysis.legislative?.iniciativaId ?? analysis.legislative?.referenceId;
  if (ini) return { type: 'iniciativa', id: ini };
  return { type: 'amenaza', id: analysis.threatId };
}
