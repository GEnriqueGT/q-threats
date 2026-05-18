import { threats, threatAnalyses } from '@/lib/data';
import { buildGlobalRelationsThreatAnalysis } from '@/lib/globalGraph';
import { isNeo4jConfigured } from '@/lib/neo4j/config';
import { fetchThreatAnalysisFromNeo4j } from '@/lib/neo4j/fetchThreatAnalysisFromNeo4j';
import type { ThreatAnalysis } from '@/lib/types';

const MAX_NODE_LINES = 55;
const MAX_EDGE_LINES = 70;
const MAX_SUMMARY_CHARS = 280;

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function loadThreatAnalysisForChat(): Promise<{ analysis: ThreatAnalysis; sourceLabel: string }> {
  if (isNeo4jConfigured()) {
    try {
      const neo = await fetchThreatAnalysisFromNeo4j();
      if (neo) {
        return { analysis: neo, sourceLabel: 'Neo4j (misma fuente que GET /api/graph)' };
      }
    } catch {
      /* fallback below */
    }
  }
  return {
    analysis: buildGlobalRelationsThreatAnalysis(),
    sourceLabel: 'Datos demo consolidados (lib/data.ts + grafo global sintético)',
  };
}

/** Quita bloques de razonamiento que algunos modelos MiniMax incluyen en `content`. */
export function stripMiniMaxThinkingBlocks(text: string): string {
  const openTag = ['<', 'redacted_thinking', '>'].join('');
  const closeTag = ['<', '/', 'redacted_thinking', '>'].join('');
  const escapedOpen = openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedClose = closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${escapedOpen}[\\s\\S]*?${escapedClose}`, 'gi');
  return text.replace(re, '').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Texto compacto para system prompt: amenazas demo + grafo actual (Neo4j o consolidado).
 */
export async function buildChatContextPack(): Promise<string> {
  const lines: string[] = [];

  lines.push('## Amenazas (dashboard)');
  for (const t of threats) {
    lines.push(
      `- **${t.id}**: ${t.title} · ${t.institution} · nivel ${t.level} · ${t.amount} (${t.date})`,
    );
    const ana = threatAnalyses[t.id];
    if (ana?.acquisition?.summary) {
      lines.push(`  Resumen: ${clip(ana.acquisition.summary, MAX_SUMMARY_CHARS)}`);
    }
  }

  const { analysis, sourceLabel } = await loadThreatAnalysisForChat();
  lines.push('');
  lines.push(`## Grafo de relaciones · fuente: ${sourceLabel}`);
  lines.push(`Resumen meta: ${clip(analysis.acquisition.summary, MAX_SUMMARY_CHARS)}`);

  const idToTitle = new Map(analysis.nodes.map((n) => [n.id, n.title]));
  const graphNodes = analysis.nodes.filter((n) => n.role !== 'acquisition');

  lines.push('');
  lines.push(`### Nodos (${graphNodes.length} total; muestra hasta ${MAX_NODE_LINES})`);
  for (const n of graphNodes.slice(0, MAX_NODE_LINES)) {
    const labels = n.neo4jLabels?.length ? ` · etiquetas ${n.neo4jLabels.join('/')}` : '';
    const desc = n.description ? clip(n.description, 120) : '';
    lines.push(`- **${n.id}** (${n.role}) ${n.title}${labels}${desc ? ` — ${desc}` : ''}`);
  }
  if (graphNodes.length > MAX_NODE_LINES) {
    lines.push(`- … y ${graphNodes.length - MAX_NODE_LINES} nodos más no listados aquí por tamaño.`);
  }

  lines.push('');
  lines.push(`### Aristas (${analysis.edges.length} total; muestra hasta ${MAX_EDGE_LINES})`);
  for (const e of analysis.edges.slice(0, MAX_EDGE_LINES)) {
    const a = idToTitle.get(e.from) ?? e.from;
    const b = idToTitle.get(e.to) ?? e.to;
    lines.push(`- ${a} → ${b} · tipo **${e.relType}**`);
  }
  if (analysis.edges.length > MAX_EDGE_LINES) {
    lines.push(`- … y ${analysis.edges.length - MAX_EDGE_LINES} aristas más omitidas por tamaño.`);
  }

  const body = lines.join('\n');
  const HARD_CAP = 28_000;
  return body.length > HARD_CAP ? `${body.slice(0, HARD_CAP)}\n\n[Contexto truncado por límite de tamaño]` : body;
}
