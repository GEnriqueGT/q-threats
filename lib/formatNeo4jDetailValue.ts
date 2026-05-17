import {
  isTemporalDetailPropKey,
  tryParseDetailTemporalStringToLocalDate,
} from '@/lib/neo4j/neo4jTemporalToDateOnly';

/** Muestra legible para una fila del panel Neo4j (fecha corta cuando aplica). */
export function formatNeo4jDetailValue(key: string, value: string): string {
  if (!value.trim()) return '';
  if (!isTemporalDetailPropKey(key)) return value;

  const parsed = tryParseDetailTemporalStringToLocalDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString('es-GT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
