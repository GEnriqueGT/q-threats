import {
  isTemporalDetailPropKey,
  temporalNeo4jObjectToIsoDateOnly,
} from '@/lib/neo4j/neo4jTemporalToDateOnly';

/** Serializa propiedades de nodo o relación Neo4j a strings (fechas temporales → ISO corto). */
export function serializeNeo4jPropertyMap(props: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined) {
      out[k] = '';
    } else if (typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      const dateOnlyIso = isTemporalDetailPropKey(k) ? temporalNeo4jObjectToIsoDateOnly(obj) : null;
      if (dateOnlyIso) {
        out[k] = dateOnlyIso;
      } else {
        try {
          const s = JSON.stringify(v);
          out[k] = s.length > 400 ? `${s.slice(0, 397)}…` : s;
        } catch {
          out[k] = String(v);
        }
      }
    } else {
      out[k] = String(v);
    }
  }
  return out;
}
