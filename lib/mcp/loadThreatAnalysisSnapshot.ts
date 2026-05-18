import { buildGlobalRelationsThreatAnalysis } from '@/lib/globalGraph';
import { isNeo4jConfigured } from '@/lib/neo4j/config';
import { fetchThreatAnalysisFromNeo4j } from '@/lib/neo4j/fetchThreatAnalysisFromNeo4j';
import type { ThreatAnalysis } from '@/lib/types';

/**
 * Misma prioridad que el chat MCP / herramientas: Neo4j si está configurado y responde; si no, grafo demo consolidado.
 */
export async function loadThreatAnalysisSnapshot(): Promise<{ analysis: ThreatAnalysis; sourceLabel: string }> {
  if (isNeo4jConfigured()) {
    try {
      const neo = await fetchThreatAnalysisFromNeo4j();
      if (neo) {
        return {
          analysis: neo,
          sourceLabel: 'Neo4j (misma fuente que GET /api/graph)',
        };
      }
    } catch {
      /* fallback */
    }
  }
  return {
    analysis: buildGlobalRelationsThreatAnalysis(),
    sourceLabel: 'Datos demo consolidados (lib/data.ts + grafo global sintético)',
  };
}
