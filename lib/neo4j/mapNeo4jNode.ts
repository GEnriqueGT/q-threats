import type { Node as NeoNode } from 'neo4j-driver';
import type { AnalysisNode } from '@/lib/types';
import { serializeNeo4jPropertyMap } from '@/lib/neo4j/serializeNeo4jPropertyMap';

function asStringProp(props: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = props[k];
    if (v !== undefined && v !== null && v !== '') {
      return typeof v === 'string' || typeof v === 'number' ? String(v) : '';
    }
  }
  return '';
}

/** Id estable para deduplicar y para aristas. */
export function keyForNeoNode(node: NeoNode): string {
  const p = node.properties as Record<string, unknown>;
  const direct = p.id ?? p.uuid ?? p.slug;
  if (direct !== undefined && direct !== null) {
    return String(direct);
  }
  const elementId = (node as unknown as { elementId?: string }).elementId;
  if (typeof elementId === 'string') {
    return elementId;
  }
  return node.identity.toString();
}

function inferRole(
  labels: string[],
  props: Record<string, unknown>,
): AnalysisNode['role'] {
  const raw = props.qtRole ?? props.role;
  if (raw === 'institution' || raw === 'supplier' || raw === 'product' || raw === 'acquisition') {
    return raw;
  }
  const L = labels.join(' ').toLowerCase();
  const p = JSON.stringify(props).toLowerCase();
  if (/person|proveedor|supplier|contractor|empresa|company|odebrecht/.test(L + p)) {
    return 'supplier';
  }
  if (/product|material|materials|bloque|item|insumo/.test(L + p)) {
    return 'product';
  }
  return 'institution';
}

function mapSources(props: Record<string, unknown>): import('@/lib/types').ThreatSource[] {
  const s = props.sources;
  if (!Array.isArray(s)) {
    return [];
  }
  const out: import('@/lib/types').ThreatSource[] = [];
  for (const item of s) {
    if (item && typeof item === 'object' && 'label' in item) {
      const o = item as { label: string; url?: string };
      out.push({ label: String(o.label), url: o.url });
    }
  }
  return out;
}

export function mapNeo4jNodeToAnalysisNode(node: NeoNode): AnalysisNode {
  const labels = node.labels.length > 0 ? node.labels : ['Entidad'];
  const props = node.properties as Record<string, unknown>;
  const title =
    asStringProp(props, ['name', 'title', 'label', 'nombre']) ||
    labels[0] ||
    'Sin nombre';

  const risksRaw = props.risks;
  const risks = Array.isArray(risksRaw)
    ? risksRaw.map((r) => String(r))
    : typeof risksRaw === 'string'
      ? [risksRaw]
      : [];

  const highlight =
    props.highlight === true ||
    props.alert === true ||
    props.alert === 'true' ||
    props.highlight === 'true';

  return {
    id: keyForNeoNode(node),
    title,
    description: asStringProp(props, ['description', 'summary', 'bio', 'descripcion']),
    risks,
    imageUrl: asStringProp(props, ['imageUrl', 'image_url', 'image']),
    sources: mapSources(props),
    highlight,
    role: inferRole(labels, props),
    neo4jLabels: [...labels],
    detailProps: serializeNeo4jPropertyMap(props),
  };
}
