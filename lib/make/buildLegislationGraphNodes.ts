import type { AnalysisEdge, AnalysisNode, ConflictedDeputyInfo, ThreatSource } from '@/lib/types';
import type { MakeLegislationPayload, MakeRelationship } from './types';
import { mapRiskLevel } from './mapLegislationToAnalysis';
import { slugId } from './stringUtils';

const MAX_ORBIT = 16;

function sourceLabelFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host.split('.')[0] ?? host;
  } catch {
    return 'Fuente';
  }
}

function inferEntityKind(tipoEntidad?: string, title?: string): AnalysisNode['entityKind'] {
  const t = (tipoEntidad ?? '').toLowerCase();
  const label = (title ?? '').toLowerCase();
  if (t.includes('persona') || t === 'person' || t === 'diputado') return 'person';
  if (t.includes('partido') || t === 'party') return 'party';
  if (t.includes('caso') || t.includes('judicial') || label.includes('investigación') || label.includes('antejuicio'))
    return 'case';
  if (
    t.includes('institucion') ||
    t.includes('institution') ||
    t.includes('comision') ||
    t.includes('junta') ||
    t.includes('municipalidad') ||
    t.includes('ministerio') ||
    label.includes('comisión') ||
    label.includes('congreso')
  )
    return 'institution';
  return 'other';
}

function relevanciaScore(rel?: MakeRelationship): number {
  const r = (rel?.relevancia_para_la_ley ?? '').toLowerCase();
  if (r === 'alta') return 3;
  if (r === 'media') return 2;
  if (r === 'baja') return 1;
  return 0;
}

function relToNode(rel: MakeRelationship, index: number): AnalysisNode {
  const title = rel.entidad_relacionada?.trim() ?? 'Entidad';
  const kind = inferEntityKind(rel.tipo_entidad, title);
  const relevancia = (rel.relevancia_para_la_ley ?? '').toLowerCase();
  const highlight =
    relevancia === 'alta' ||
    (rel.categoria ?? '').includes('antecedente') ||
    (rel.categoria ?? '').includes('conflicto');

  const risks: string[] = [];
  if (rel.evidencia) risks.push(rel.evidencia);
  if (rel.persona_origen) risks.push(`Persona vinculada: ${rel.persona_origen}`);

  const sources: ThreatSource[] = rel.fuente_url
    ? [{ label: sourceLabelFromUrl(rel.fuente_url), url: rel.fuente_url }]
    : [];

  return {
    id: `rel-${kind}-${slugId(title)}-${index}`,
    title,
    description: [rel.tipo_relacion, rel.sector].filter(Boolean).join(' · ') || rel.categoria || '',
    risks,
    imageUrl: '',
    sources,
    highlight,
    role: kind === 'person' ? 'supplier' : kind === 'institution' ? 'institution' : 'product',
    entityKind: kind,
    relatedPerson: rel.persona_origen,
  };
}

function deputyNode(
  nombre: string,
  description: string,
  risks: string[],
  sources: ThreatSource[],
  highlight: boolean,
  id?: string,
): AnalysisNode {
  return {
    id: id ?? `deputy:${nombre}`,
    title: nombre,
    description,
    risks,
    imageUrl: '',
    sources,
    highlight,
    role: 'supplier',
    entityKind: 'person',
  };
}

export function buildLegislationGraphNodes(
  payload: MakeLegislationPayload,
  conflictedDeputies: ConflictedDeputyInfo[],
  diputados: string[],
  posiblesBeneficiados: string[],
): { nodes: AnalysisNode[]; edges: AnalysisEdge[] } {
  const report = payload.raw?.report_json;
  const relationships = report?.relationships ?? [];
  const nodes: AnalysisNode[] = [];
  const edges: AnalysisEdge[] = [];
  const usedTitles = new Set<string>();

  const addNode = (node: AnalysisNode, relType = 'VINCULA') => {
    const key = node.title.toLowerCase();
    if (usedTitles.has(key) && !node.id.startsWith('deputy:')) return false;
    if (nodes.length >= MAX_ORBIT) return false;
    usedTitles.add(key);
    nodes.push(node);
    edges.push({ from: 'acquisition', to: node.id, relType });
    return true;
  };

  // 1) Diputados con conflicto (uno por persona, riesgos fusionados)
  const byPerson = new Map<string, ConflictedDeputyInfo[]>();
  for (const cd of conflictedDeputies) {
    const k = cd.nombre.toLowerCase();
    if (!byPerson.has(k)) byPerson.set(k, []);
    byPerson.get(k)!.push(cd);
  }

  for (const [nombreKey, items] of byPerson) {
    const nombre = items[0].nombre;
    const risks = items.map((i) =>
      [i.entidadRelacionada, i.conflicto].filter(Boolean).join(': '),
    );
    const sources = items
      .filter((i) => i.fuenteUrl)
      .map((i) => ({ label: sourceLabelFromUrl(i.fuenteUrl!), url: i.fuenteUrl }));
    addNode(
      deputyNode(
        nombre,
        `${items.length} posible${items.length > 1 ? 's' : ''} conflicto de interés`,
        risks,
        sources,
        true,
        `deputy:${nombre}`,
      ),
      'CONFLICTO_INTERES',
    );
  }

  // 2) Grupo de ponentes (resto sin nodo individual en órbita)
  if (diputados.length > 0) {
    const conflictNames = new Set(conflictedDeputies.map((d) => d.nombre.toLowerCase()));
    const otros = diputados.filter((d) => !conflictNames.has(d.toLowerCase()));
    addNode({
      id: 'group-ponentes',
      title: `${diputados.length} diputados ponentes`,
      description:
        otros.length > 0
          ? `Incluye ${otros.slice(0, 3).join(', ')}${otros.length > 3 ? '…' : ''}`
          : 'Lista completa en el panel',
      risks: [],
      imageUrl: '',
      sources: [],
      highlight: false,
      role: 'supplier',
      entityKind: 'group',
    });
  }

  // 3) Relaciones: instituciones, casos, partidos (deduplicadas, prioridad por relevancia)
  const sorted = [...relationships].sort((a, b) => relevanciaScore(b) - relevanciaScore(a));
  const seenRel = new Set<string>();

  for (const [i, rel] of sorted.entries()) {
    if (nodes.length >= MAX_ORBIT) break;
    const title = rel.entidad_relacionada?.trim();
    if (!title) continue;

    const kind = inferEntityKind(rel.tipo_entidad, title);
    if (kind === 'person') continue;

    const dedupeKey = `${kind}:${title.toLowerCase()}`;
    if (seenRel.has(dedupeKey)) continue;

    // No duplicar caso que es solo el nombre de un diputado en conflicto
    if (kind === 'case' && byPerson.has(title.toLowerCase())) continue;

    seenRel.add(dedupeKey);
    const node = relToNode(rel, i);
    addNode(node, 'RELACION');
  }

  // 3b) Personas vinculadas en relaciones (sin conflicto registrado), hasta 4
  const seenPersons = new Set(
    [...byPerson.keys(), ...nodes.filter((n) => n.entityKind === 'person').map((n) => n.title.toLowerCase())],
  );
  let extraPersons = 0;
  for (const rel of sorted) {
    if (nodes.length >= MAX_ORBIT || extraPersons >= 4) break;
    const nombre = rel.persona_origen?.trim();
    if (!nombre) continue;
    const key = nombre.toLowerCase();
    if (seenPersons.has(key)) continue;
    const relevancia = (rel.relevancia_para_la_ley ?? '').toLowerCase();
    if (relevancia !== 'alta' && relevancia !== 'media') continue;
    seenPersons.add(key);
    if (
      addNode(
        deputyNode(
          nombre,
          rel.tipo_relacion ?? 'Vinculado a la iniciativa',
          rel.evidencia ? [rel.evidencia] : [],
          rel.fuente_url ? [{ label: sourceLabelFromUrl(rel.fuente_url), url: rel.fuente_url }] : [],
          false,
          `deputy:${nombre}`,
        ),
        'RELACION',
      )
    ) {
      extraPersons += 1;
    }
  }

  // 4) Beneficiarios externos (agregado)
  if (posiblesBeneficiados.length > 0 && nodes.length < MAX_ORBIT) {
    addNode({
      id: 'group-beneficiarios',
      title: 'Beneficiarios externos',
      description: posiblesBeneficiados.slice(0, 2).join(' · '),
      risks: posiblesBeneficiados,
      imageUrl: '',
      sources: [],
      highlight: mapRiskLevel(payload.risk_level) !== 'low',
      role: 'product',
      entityKind: 'beneficiary',
    });
  }

  // 5) Comisiones / actores desde law_json si aún hay espacio
  const actores = payload.raw?.law_json?.actores_politicos_vinculados ?? [];
  for (const [i, actor] of actores.entries()) {
    if (nodes.length >= MAX_ORBIT || !actor?.trim()) continue;
    const title = actor.trim();
    if (usedTitles.has(title.toLowerCase())) continue;
    addNode({
      id: `actor-${slugId(title)}-${i}`,
      title,
      description: 'Actor político vinculado al trámite',
      risks: [],
      imageUrl: '',
      sources: [],
      highlight: false,
      role: 'institution',
      entityKind: 'institution',
    });
  }

  return { nodes, edges };
}
