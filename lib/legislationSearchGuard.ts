/** Evita doble fetch: búsqueda manual + efecto de URL, o React Strict Mode en mount. */
let lastHandledKey: string | null = null;

export function legislationSearchKey(type: 'iniciativa' | 'amenaza', id: string): string {
  return `${type}:${id.trim()}`;
}

/** Marca que esta búsqueda ya se disparó (p. ej. clic en Analizar). */
export function markLegislationSearchHandled(key: string): void {
  lastHandledKey = key;
}

/**
 * Devuelve false si esta clave ya se procesó en esta sesión de página
 * (evita segundo fetch por deep link o Strict Mode).
 */
export function consumeLegislationSearch(key: string): boolean {
  if (lastHandledKey === key) return false;
  lastHandledKey = key;
  return true;
}
