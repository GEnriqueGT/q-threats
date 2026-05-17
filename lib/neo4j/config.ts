/** Variables de entorno del servidor para Neo4j (ver `.env.example`). */

export function isNeo4jConfigured(): boolean {
  const uri = process.env.NEO4J_URI?.trim();
  const user = process.env.NEO4J_USER?.trim();
  const password = process.env.NEO4J_PASSWORD;
  return Boolean(uri && user && password !== undefined && password.length > 0);
}

export function getNeo4jDatabase(): string | undefined {
  const db = process.env.NEO4J_DATABASE?.trim();
  return db || undefined;
}

/**
 * Número máximo de aristas a leer, o `null` = sin LIMIT en la query por defecto (grafo completo).
 * `NEO4J_REL_LIMIT=0` o vacío → sin tope (hasta el límite duro de seguridad interno en el driver).
 * Un entero positivo recorta el resultado (útil si la base es enorme).
 */
export function getNeo4jRelationshipLimit(): number | null {
  const raw = process.env.NEO4J_REL_LIMIT?.trim();
  if (raw === undefined || raw === '') {
    return null;
  }
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n === 0) {
    return null;
  }
  return Math.min(n, 500_000);
}
