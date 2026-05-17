import { NextResponse } from 'next/server';
import { isNeo4jConfigured } from '@/lib/neo4j/config';
import { fetchThreatAnalysisFromNeo4j } from '@/lib/neo4j/fetchThreatAnalysisFromNeo4j';

/**
 * Grafo completo desde Neo4j únicamente (sin fallback estático).
 */
export async function GET() {
  if (!isNeo4jConfigured()) {
    return NextResponse.json(
      {
        error:
          'Neo4j no está configurado. Define NEO4J_URI, NEO4J_USER y NEO4J_PASSWORD en .env.local.',
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
