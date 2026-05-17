/** Propiedades que mostramos como solo fecha de calendario (sin JSON ni hora). */
export function isTemporalDetailPropKey(key: string): boolean {
  const k = key.replace(/_/g, '').toLowerCase();
  return (
    k === 'updatedat' ||
    k === 'createdat' ||
    k === 'modifiedat' ||
    k === 'lastmodified' ||
    k === 'fechaactualizacion' ||
    k === 'fechacreacion'
  );
}

/** Entero neo4j-driver (`Integer`) o número simple. */
export function pickNeo4jInt(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return Math.trunc(val);
  if (val !== null && typeof val === 'object' && 'low' in val) {
    const low = (val as { low: unknown }).low;
    if (typeof low !== 'number' || !Number.isFinite(low)) return null;
    const highRaw = 'high' in val ? (val as { high: unknown }).high : 0;
    const high = typeof highRaw === 'number' ? highRaw : 0;
    if (high !== 0) return null;
    return low;
  }
  return null;
}

export function tryCalendarPartsFromNeo4jTemporalLike(
  o: Record<string, unknown>,
): { y: number; m: number; d: number } | null {
  const y = pickNeo4jInt(o.year);
  const m = pickNeo4jInt(o.month);
  const d = pickNeo4jInt(o.day);
  if (y === null || m === null || d === null) return null;
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

export function ymdPartsToIsoDate(parts: { y: number; m: number; d: number }): string {
  return `${parts.y}-${String(parts.m).padStart(2, '0')}-${String(parts.d).padStart(2, '0')}`;
}

export function localDateFromYmd(parts: { y: number; m: number; d: number }): Date {
  return new Date(parts.y, parts.m - 1, parts.d);
}

/** Si es un objeto DateTime típico de Neo4j, devuelve `YYYY-MM-DD`. */
export function temporalNeo4jObjectToIsoDateOnly(v: Record<string, unknown>): string | null {
  const parts = tryCalendarPartsFromNeo4jTemporalLike(v);
  return parts ? ymdPartsToIsoDate(parts) : null;
}

/**
 * Convierte el valor textual de una propiedad temporal a `Date` en calendario local
 * (evita desfases de zona horaria en fechas `YYYY-MM-DD`).
 * Acepta JSON con `{ year:{low}, month:{low}, ... }` o ISO/strings parseables por `Date`.
 */
export function tryParseDetailTemporalStringToLocalDate(value: string): Date | null {
  const t = value.trim();
  if (!t) return null;
  if (t.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(t);
      if (!parsed || typeof parsed !== 'object') return null;
      const parts = tryCalendarPartsFromNeo4jTemporalLike(parsed as Record<string, unknown>);
      return parts ? localDateFromYmd(parts) : null;
    } catch {
      return null;
    }
  }

  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const parts =
      Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(d)
        ? ({ y, m: mo, d } as const)
        : null;
    if (
      parts &&
      parts.m >= 1 &&
      parts.m <= 12 &&
      parts.d >= 1 &&
      parts.d <= 31 &&
      parts.y >= 1
    ) {
      return localDateFromYmd(parts);
    }
  }

  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}
