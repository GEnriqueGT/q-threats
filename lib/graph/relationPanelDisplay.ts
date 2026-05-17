const REL_PROP_PRIORITY = [
  'tipo',
  'confianza',
  'evidencia',
  'fuente_url',
  'updatedat',
  'createdat',
];

function relPropPriorityIndex(key: string): number {
  const i = REL_PROP_PRIORITY.indexOf(key.toLowerCase());
  return i === -1 ? 999 : i;
}

/** Orden de filas para props de relación en el panel (prioridad + alfabético). */
export function orderedRelationshipPropEntries(
  props: Record<string, string> | undefined,
): [string, string][] {
  if (!props || Object.keys(props).length === 0) return [];
  const keys = Object.keys(props);
  return keys
    .slice()
    .sort((a, b) => {
      const pa = relPropPriorityIndex(a);
      const pb = relPropPriorityIndex(b);
      if (pa !== pb) return pa - pb;
      return a.localeCompare(b, 'es', { sensitivity: 'base' });
    })
    .map((k) => [k, props[k] ?? '']);
}

/**
 * Orden alfabético estable de propiedades de nodo; parte en `updatedAt` (case-insensitive) si existe.
 * Sin `updatedAt`: before = todas, updatedAtEntry = null, after = [] (vecinos al final en la UI).
 */
export function splitDetailPropsAtUpdatedAt(detailProps: Record<string, string> | undefined): {
  before: [string, string][];
  updatedAtEntry: [string, string] | null;
  after: [string, string][];
} {
  if (!detailProps || Object.keys(detailProps).length === 0) {
    return { before: [], updatedAtEntry: null, after: [] };
  }
  const entries = Object.entries(detailProps).sort(([a], [b]) =>
    a.localeCompare(b, 'es', { sensitivity: 'base' }),
  );
  const idx = entries.findIndex(([k]) => k.toLowerCase() === 'updatedat');
  if (idx === -1) {
    return { before: entries, updatedAtEntry: null, after: [] };
  }
  return {
    before: entries.slice(0, idx),
    updatedAtEntry: entries[idx] ?? null,
    after: entries.slice(idx + 1),
  };
}

export function isUrlPropKey(key: string): boolean {
  return key.toLowerCase() === 'fuente_url' || key.toLowerCase().endsWith('_url');
}
