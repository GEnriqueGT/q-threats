/** Variables de entorno del servidor para Neo4j (ver `.env.example`). */

const URI_ENV_KEYS = ['NEO4J_URI', 'NE04J_URI', 'NEO4J_CONNECTION_URI'] as const;

function cleanEnv(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  let s = value.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s || undefined;
}

function isValidNeo4jUri(uri: string): boolean {
  return /^(neo4j|bolt)(\+s)?:\/\//i.test(uri);
}

/** Primera URI válida entre las claves conocidas (ignora NEO4J_URL con https). */
export function getNeo4jUri(): string | undefined {
  for (const key of URI_ENV_KEYS) {
    const v = cleanEnv(process.env[key]);
    if (v && isValidNeo4jUri(v)) return v;
  }
  return undefined;
}

/** Variables con valor presente pero formato incorrecto (para el mensaje de error). */
export function getInvalidNeo4jUriKeys(): string[] {
  const bad: string[] = [];
  const scan = [...URI_ENV_KEYS, 'NEO4J_URL'] as const;
  for (const key of scan) {
    const v = cleanEnv(process.env[key]);
    if (v && !isValidNeo4jUri(v)) bad.push(key);
  }
  return bad;
}

export function getNeo4jUser(): string | undefined {
  return cleanEnv(process.env.NEO4J_USER) ?? cleanEnv(process.env.NEO4J_USERNAME);
}

export function getNeo4jPassword(): string | undefined {
  const v = process.env.NEO4J_PASSWORD ?? process.env.NEO4J_SECRET;
  if (v === undefined) return undefined;
  return v;
}

/** Lista qué variables faltan (para mensajes de error en Vercel/local). */
export function getMissingNeo4jEnvVars(): string[] {
  const missing: string[] = [];
  if (!getNeo4jUri()) {
    const invalidKeys = getInvalidNeo4jUriKeys();
    if (invalidKeys.length > 0) {
      missing.push(
        `NEO4J_URI válida (tienes ${invalidKeys.join(', ')} con https:// o formato incorrecto; bórralas o corrígelas)`,
      );
    } else {
      missing.push('NEO4J_URI');
    }
  }
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
