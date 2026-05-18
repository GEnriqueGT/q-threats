import { NextResponse } from 'next/server';
import { loadThreatAnalysisSnapshot } from '@/lib/mcp/loadThreatAnalysisSnapshot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Grafo para clientes HTTP (p. ej. servidor MCP): Neo4j en servidor o fallback demo. Sin credenciales en el cliente. */
export async function GET() {
  try {
    const { analysis, sourceLabel } = await loadThreatAnalysisSnapshot();
    return NextResponse.json({ source: sourceLabel, data: analysis });
  } catch (e) {
    console.error('[api/mcp/graph-snapshot]', e);
    const message = e instanceof Error ? e.message : 'Error al cargar snapshot del grafo';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
