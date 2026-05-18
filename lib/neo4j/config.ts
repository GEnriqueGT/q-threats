/** Variables de entorno del servidor para Neo4j (ver `.env.example`). */

function firstEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return undefined;
}

export function getNeo4jUri(): string | undefined {
  return firstEnv('NEO4J_URI', 'NEO4J_URL', 'NEO4J_CONNECTION_URI');
}

export function getNeo4jUser(): string | undefined {
  return firstEnv('NEO4J_USER', 'NEO4J_USERNAME');
}

export function getNeo4jPassword(): string | undefined {
  const v = process.env.NEO4J_PASSWORD ?? process.env.NEO4J_SECRET;
  if (v === undefined) return undefined;
  return v;
}

/** Lista qué variables faltan (para mensajes de error en Vercel/local). */
export function getMissingNeo4jEnvVars(): string[] {
  const missing: string[] = [];
  if (!getNeo4jUri()) missing.push('NEO4J_URI');
  if (!getNeo4jUser()) missing.push('NEO4J_USER (o NEO4J_USERNAME)');
  const pwd = getNeo4jPassword();
  if (pwd === undefined || pwd.length === 0) missing.push('NEO4J_PASSWORD');
  return missing;
}

export function isNeo4jConfigured(): boolean {
  return getMissingNeo4jEnvVars().length === 0;
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
