import type { AnalysisEdge, AnalysisNode, ThreatAnalysis } from './types';
import { threatAnalyses } from './data';

/** Nodo raíz sintético (role acquisition); no se muestra en el anillo del grafo. */
export const GLOBAL_RELATIONS_ROOT_ID = 'relations-root';

/**
 * Consolida nodos y aristas desde `threatAnalyses` hasta que exista una graph DB externa.
 * El consumidor habitual es `GET /api/graph`.
 */
export function buildGlobalRelationsThreatAnalysis(): ThreatAnalysis {
  const nodesMap = new Map<string, AnalysisNode>();

  nodesMap.set(GLOBAL_RELATIONS_ROOT_ID, {
    id: GLOBAL_RELATIONS_ROOT_ID,
    title: 'Red de relaciones',
    description:
      'Vista consolidada de entidades vinculadas en los análisis de demostración. Este origen será reemplazado por la base de datos de grafos.',
    risks: [],
    imageUrl: '',
    sources: [],
    role: 'acquisition',
  });

  for (const analysis of Object.values(threatAnalyses)) {
    for (const n of analysis.nodes) {
      if (n.role === 'acquisition') continue;
      if (!nodesMap.has(n.id)) nodesMap.set(n.id, { ...n });
    }
  }

  const edges: AnalysisEdge[] = [];
  const edgeKey = new Set<string>();

  const edgeFingerprint = (e: AnalysisEdge): string => {
    const p = e.relationshipProps ?? {};
    const keys = Object.keys(p).sort();
    return keys.map((k) => `${k}=${p[k] ?? ''}`).join('\u001e');
  };

  for (const analysis of Object.values(threatAnalyses)) {
    for (const e of analysis.edges) {
      const from = e.from === 'acquisition' ? GLOBAL_RELATIONS_ROOT_ID : e.from;
      const to = e.to === 'acquisition' ? GLOBAL_RELATIONS_ROOT_ID : e.to;
      const k = `${from}\0${to}\0${e.relType}\0${edgeFingerprint(e)}`;
      if (edgeKey.has(k)) continue;
      edgeKey.add(k);
      edges.push({
        from,
        to,
        relType: e.relType,
        relationshipProps: e.relationshipProps,
      });
    }
  }

  return {
    threatId: 'global-relations',
    acquisition: {
      title: 'Red global de relaciones',
      summary:
        'Unión de nodos y vínculos de las amenazas actuales. Los datos siguen siendo locales al repositorio; este contrato existe para cuando el backend exponga grafos persistentes.',
      guatecomprasUrl: 'https://www.guatecompras.gt',
      institution: 'Q Threats',
      amount: '—',
      date: 'Consolidado',
    },
    nodes: [...nodesMap.values()],
    edges,
  };
}
