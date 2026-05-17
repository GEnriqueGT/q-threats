import type { AnalysisNode } from '@/lib/types';

/** Vecindad no dirigida solo entre IDs presentes en el subgrafo. */
export function buildUndirectedNeighborMap(
  graphNodeIds: Set<string>,
  edges: { from: string; to: string }[],
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!graphNodeIds.has(a) || !graphNodeIds.has(b)) return;
    let s = map.get(a);
    if (!s) {
      s = new Set();
      map.set(a, s);
    }
    s.add(b);
  };
  for (const e of edges) {
    link(e.from, e.to);
    link(e.to, e.from);
  }
  return map;
}

export function orderedNeighborIds(
  centerId: string,
  neighborMap: Map<string, Set<string>>,
  idToNode: Map<string, AnalysisNode>,
): string[] {
  const set = neighborMap.get(centerId);
  if (!set || set.size === 0) return [];
  return [...set]
    .map((id) => ({ id, node: idToNode.get(id) }))
    .filter((x): x is { id: string; node: AnalysisNode } => x.node != null)
    .sort((a, b) => {
      const t = a.node.title.localeCompare(b.node.title, 'es', { sensitivity: 'base' });
      return t !== 0 ? t : a.id.localeCompare(b.id);
    })
    .map((x) => x.id);
}
