import type { AnalysisNode, ThreatAnalysis } from '@/lib/types';
import { buildUndirectedNeighborMap } from '@/lib/graph/neighbors';

export function matchesRelationsGraphSearch(n: AnalysisNode, queryLower: string): boolean {
  if (!queryLower) return true;
  if (n.title.toLowerCase().includes(queryLower)) return true;
  if (n.id.toLowerCase().includes(queryLower)) return true;
  if (n.description?.toLowerCase().includes(queryLower)) return true;
  if (n.neo4jLabels?.some((l) => l.toLowerCase().includes(queryLower))) return true;
  return false;
}

/**
 * Filtra nodos del grafo (no adquisiciones) por texto y añade **todos los vecinos de 1 salto**
 * para que siga viendo el contexto y las aristas entre coincidencias y relacionados.
 */
export function filterAnalysisForRelationsSearch(
  analysis: ThreatAnalysis,
  queryRaw: string,
): ThreatAnalysis {
  const q = queryRaw.trim().toLowerCase();
  if (!q) return analysis;

  const acquisitions = analysis.nodes.filter((n) => n.role === 'acquisition');
  const graphNodes = analysis.nodes.filter((n) => n.role !== 'acquisition');
  const graphIds = new Set(graphNodes.map((n) => n.id));
  const neighborMap = buildUndirectedNeighborMap(graphIds, analysis.edges);

  const seedIds = new Set(
    graphNodes.filter((n) => matchesRelationsGraphSearch(n, q)).map((n) => n.id),
  );

  const expandedIds = new Set<string>();
  for (const sid of seedIds) {
    expandedIds.add(sid);
    const nbrs = neighborMap.get(sid);
    if (nbrs) {
      for (const nid of nbrs) {
        if (graphIds.has(nid)) expandedIds.add(nid);
      }
    }
  }

  const expandedGraphNodes = graphNodes.filter((n) => expandedIds.has(n.id));
  const keptNodes = [...acquisitions, ...expandedGraphNodes];

  const edges = analysis.edges.filter(
    (e) => expandedIds.has(e.from) && expandedIds.has(e.to) && graphIds.has(e.from) && graphIds.has(e.to),
  );

  return {
    ...analysis,
    nodes: keptNodes,
    edges,
  };
}
