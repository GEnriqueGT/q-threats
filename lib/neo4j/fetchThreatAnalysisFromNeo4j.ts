import neo4j, { type Record as Neo4jRecord } from 'neo4j-driver';
import type { AnalysisEdge, ThreatAnalysis } from '@/lib/types';
import { getNeo4jDatabase, getNeo4jRelationshipLimit } from './config';
import { getNeo4jDriver } from './driver';
import { mapNeo4jNodeToAnalysisNode } from './mapNeo4jNode';
import { serializeNeo4jPropertyMap } from '@/lib/neo4j/serializeNeo4jPropertyMap';

const DEFAULT_RELS_NO_LIMIT = `
MATCH (n)-[r]->(m)
RETURN n AS source, m AS target, type(r) AS relType, r AS rel
`;

const DEFAULT_RELS_WITH_LIMIT = `
MATCH (n)-[r]->(m)
RETURN n AS source, m AS target, type(r) AS relType, r AS rel
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

function fingerprintRelProps(props: Record<string, string>): string {
  const keys = Object.keys(props).sort();
  return keys.map((k) => `${k}=${props[k] ?? ''}`).join('\u001e');
}

/** Dedupe estable: `elementId` de la relación si existe; si no, huella de extremos + tipo + props. */
function edgeDedupeKey(
  from: string,
  to: string,
  relType: string,
  props: Record<string, string>,
  relationshipElementId?: string,
): string {
  if (relationshipElementId && relationshipElementId.length > 0) {
    return `id:${relationshipElementId}`;
  }
  return `fp:${from}\0${to}\0${relType}\0${fingerprintRelProps(props)}`;
}

/**
 * Interpreta columnas de fila Cypher: preferir `rel` (relationship); si falta, `relType` + mapa `relProps`.
 * Contrato ampliado para `NEO4J_CYPHER`: source, target obligatorios; rel opcional; relType + relProps opcionales.
 */
function parseRelationshipColumns(record: Neo4jRecord): {
  relType: string;
  relationshipProps: Record<string, string>;
  relationshipElementId?: string;
} {
  const keys = record.keys;
  const relVal = keys.includes('rel') ? record.get('rel') : undefined;

  if (relVal !== undefined && relVal !== null && neo4j.isRelationship(relVal)) {
    const rawProps = relVal.properties as Record<string, unknown>;
    const relationshipProps = serializeNeo4jPropertyMap(rawProps);
    const relType =
      typeof relVal.type === 'string' && relVal.type.length > 0 ? relVal.type : 'RELATED';
    const elementId = (relVal as unknown as { elementId?: string }).elementId;
    const relationshipElementId =
      typeof elementId === 'string' && elementId.length > 0 ? elementId : undefined;
    return { relType, relationshipProps, relationshipElementId };
  }

  const rtRaw = keys.includes('relType') ? record.get('relType') : undefined;
  const relType =
    typeof rtRaw === 'string' && rtRaw.trim().length > 0 ? rtRaw.trim() : 'RELATED';

  let relationshipProps: Record<string, string> = {};
  if (keys.includes('relProps')) {
    const rp = record.get('relProps');
    if (rp && typeof rp === 'object' && !neo4j.isNode(rp) && !neo4j.isRelationship(rp)) {
      relationshipProps = serializeNeo4jPropertyMap(rp as Record<string, unknown>);
    }
  }

  return {
    relType,
    relationshipProps,
    relationshipElementId: undefined,
  };
}

/**
 * Lee relaciones y nodos aislados desde Neo4j → ThreatAnalysis (solo datos de la base; sin nodo raíz sintético).
 * `NEO4J_CYPHER` puede reemplazar la query de relaciones; debe devolver source, target y
 * rel opcional (relationship) o bien relType + relProps (mapa).
 * Si usas $limit, incluye LIMIT toInteger($limit) o el parámetro que definas.
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
    const edgeSeen = new Set<string>();
    const edges: AnalysisEdge[] = [];

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
      const {
        relType,
        relationshipProps,
        relationshipElementId,
      } = parseRelationshipColumns(record);

      const dedupeKey = edgeDedupeKey(
        from,
        to,
        relType,
        relationshipProps,
        relationshipElementId,
      );
      if (edgeSeen.has(dedupeKey)) continue;
      edgeSeen.add(dedupeKey);

      const props =
        Object.keys(relationshipProps).length > 0 ? relationshipProps : undefined;
      edges.push({ from, to, relType, relationshipProps: props });
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
