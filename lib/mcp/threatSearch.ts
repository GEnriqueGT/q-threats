import { threatAnalyses } from '@/lib/data';
import type { Threat } from '@/lib/types';

/** Filtro por texto para GET /api/threats (?q=). */
export function matchesThreatQuery(t: Threat, rawQuery: string): boolean {
  const needle = rawQuery.trim().toLowerCase();
  if (!needle) return true;
  const fields = [t.id, t.title, t.institution, t.amount, t.date, t.level].map((x) => String(x).toLowerCase());
  if (fields.some((f) => f.includes(needle))) return true;
  const summary = threatAnalyses[t.id]?.acquisition?.summary?.toLowerCase() ?? '';
  return summary.includes(needle);
}
