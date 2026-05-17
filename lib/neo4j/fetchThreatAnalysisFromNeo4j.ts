import neo4j from 'neo4j-driver';
import type { ThreatAnalysis } from '@/lib/types';
import { getNeo4jDatabase, getNeo4jRelationshipLimit } from './config';
import { getNeo4jDriver } from './driver';
import { mapNeo4jNodeToAnalysisNode } from './mapNeo4jNode';

const DEFAULT_RELS_NO_LIMIT = `
MATCH (n)-[r]->(m)
RETURN n AS source, m AS target, type(r) AS relType
`;

const DEFAULT_RELS_WITH_LIMIT = `
MATCH (n)-[r]->(m)
RETURN n AS source, m AS target, type(r) AS relType
LIMIT toInteger($limit)
`;

const ORPHANS_NO_LIMIT = `
MATCH (o)
WHERE NOT (o)-[]-()
RETURN o AS orphan
`;

const ORPHANS_WITH_LIMIT = `
MATCH (o)
WHERE NOT (o)-[]-()
RETURN o AS orphan
LIMIT toInteger($limit)
`;

/**
 * Lee relaciones y nodos aislados desde Neo4j → ThreatAnalysis (solo datos de la base; sin nodo raíz sintético).
 * `NEO4J_CYPHER` puede reemplazar la query de relaciones; debe devolver source, target, relType. Si usas $limit, incluye LIMIT.
 */
export async function fetchThreatAnalysisFromNeo4j(): Promise<ThreatAnalysis | null> {
  const driver = getNeo4jDriver();
  if (!driver) {
    return null;
  }

  const limit = getNeo4jRelationshipLimit();
  const custom = process.env.NEO4J_CYPHER?.trim();
  const relCypher = custom || (limit === null ? DEFAULT_RELS_NO_LIMIT : DEFAULT_RELS_WITH_LIMIT);
  const orphanCypher = limit === null ? ORPHANS_NO_LIMIT : ORPHANS_WITH_LIMIT;
  const database = getNeo4jDatabase();

  const session = database
    ? driver.session({ database, defaultAccessMode: neo4j.session.READ })
    : driver.session({ defaultAccessMode: neo4j.session.READ });

  const params: Record<string, unknown> = {};
  if (limit !== null) {
    params.limit = neo4j.int(limit);
  }

  try {
    const nodesMap = new Map<string, ReturnType<typeof mapNeo4jNodeToAnalysisNode>>();
    const edgeKey = new Set<string>();
    const edges: { from: string; to: string }[] = [];

    const relResult = await session.executeRead((tx) => tx.run(relCypher, params));
    for (const record of relResult.records) {
      const source = record.get('source');
      const target = record.get('target');
      if (!neo4j.isNode(source) || !neo4j.isNode(target)) {
        continue;
      }
      const sNode = mapNeo4jNodeToAnalysisNode(source);
      const tNode = mapNeo4jNodeToAnalysisNode(target);
      nodesMap.set(sNode.id, sNode);
      nodesMap.set(tNode.id, tNode);

      const from = sNode.id;
      const to = tNode.id;
      const ek = `${from}\0${to}`;
      if (!edgeKey.has(ek)) {
        edgeKey.add(ek);
        edges.push({ from, to });
      }
    }

    const orphanResult = await session.executeRead((tx) => tx.run(orphanCypher, params));
    for (const record of orphanResult.records) {
      const orphan = record.get('orphan');
      if (!neo4j.isNode(orphan)) continue;
      const node = mapNeo4jNodeToAnalysisNode(orphan);
      if (!nodesMap.has(node.id)) {
        nodesMap.set(node.id, node);
      }
    }

    const entityCount = nodesMap.size;
    const acquisitionTitle =
      process.env.NEO4J_ACQUISITION_TITLE?.trim() || 'Grafo Neo4j';
    const acquisitionSummary =
      process.env.NEO4J_ACQUISITION_SUMMARY?.trim() ||
      `Nodos: ${entityCount}. Relaciones dirigidas: ${edges.length}.`;

    return {
      threatId: 'neo4j-global',
      acquisition: {
        title: acquisitionTitle,
        summary: acquisitionSummary,
        guatecomprasUrl:
          process.env.NEO4J_ACQUISITION_LINK?.trim() || 'https://www.guatecompras.gt',
        institution: process.env.NEO4J_ACQUISITION_INSTITUTION?.trim() || 'Q Threats',
        amount: process.env.NEO4J_ACQUISITION_AMOUNT?.trim() || '—',
        date: process.env.NEO4J_ACQUISITION_DATE?.trim() || 'Neo4j',
      },
      nodes: [...nodesMap.values()],
      edges,
    };
  } finally {
    await session.close();
  }
}
