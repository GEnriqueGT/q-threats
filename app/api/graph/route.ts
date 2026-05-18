import { NextResponse } from 'next/server';
import {
  getInvalidNeo4jUriKeys,
  getMissingNeo4jEnvVars,
  getNeo4jUri,
  getNeo4jUser,
  getNeo4jPassword,
  isNeo4jConfigured,
} from '@/lib/neo4j/config';
import { fetchThreatAnalysisFromNeo4j } from '@/lib/neo4j/fetchThreatAnalysisFromNeo4j';

/** Siempre leer env en runtime (Vercel inyecta vars al desplegar, no en build). */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Grafo completo desde Neo4j únicamente (sin fallback estático).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('check') === '1') {
    return NextResponse.json({
      configured: isNeo4jConfigured(),
      missing: getMissingNeo4jEnvVars(),
      invalidUriKeys: getInvalidNeo4jUriKeys(),
      hasUri: Boolean(getNeo4jUri()),
      hasUser: Boolean(getNeo4jUser()),
      hasPassword: Boolean(getNeo4jPassword()?.length),
    });
  }

  if (!isNeo4jConfigured()) {
    const missing = getMissingNeo4jEnvVars();
    return NextResponse.json(
      {
        error: `Neo4j no está configurado en este despliegue. Faltan: ${missing.join(', ')}. En Vercel: revisa Environment Variables, elimina NEO4J_URL si tiene https://, y haz Redeploy.`,
        missing,
      },
      { status: 503 },
    );
  }

  try {
    const data = await fetchThreatAnalysisFromNeo4j();
    if (!data) {
      return NextResponse.json(
        { error: 'No se pudo abrir sesión con Neo4j.' },
        { status: 502 },
      );
    }
    return NextResponse.json({ data });
  } catch (e) {
    console.error('[api/graph] Neo4j error:', e);
    const message = e instanceof Error ? e.message : 'Error al leer Neo4j';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
