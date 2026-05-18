/**
 * Servidor MCP (stdio): solo llama al backend HTTP de Q Threats.
 * Credenciales Neo4j viven en el despliegue Next, no en Cursor.
 *
 * Variable opcional: Q_THREATS_BACKEND_URL (por defecto http://127.0.0.1:3000).
 */
import path from 'node:path';
import { config } from 'dotenv';
import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import type { AnalysisEdge, ThreatAnalysis, ThreatLevel } from '@/lib/types';

config({ path: path.resolve(process.cwd(), '.env.local') });

function backendBaseUrl(): string {
  const raw = process.env.Q_THREATS_BACKEND_URL?.trim() || 'http://127.0.0.1:3000';
  return raw.replace(/\/$/, '');
}

async function backendJson<T>(
  pathname: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; json: T | null; text: string }> {
  const url = `${backendBaseUrl()}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const text = await res.text();
    let json: T | null = null;
    try {
      json = text ? (JSON.parse(text) as T) : null;
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json, text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, json: null, text: msg };
  }
}

function backendUnreachableHint(): string {
  return `No se pudo alcanzar el backend en ${backendBaseUrl()}. Arranca Next (\`npm run dev\`) o define Q_THREATS_BACKEND_URL apuntando al despliegue (p. ej. https://q-threats.vercel.app).`;
}

async function fetchGraphSnapshot(): Promise<{ analysis: ThreatAnalysis; sourceLabel: string } | { error: string }> {
  const r = await backendJson<{ source?: string; data?: ThreatAnalysis; error?: string }>('/api/mcp/graph-snapshot');
  if (!r.ok || !r.json?.data) {
    if (r.status === 0) {
      return { error: backendUnreachableHint() };
    }
    const hint = r.json?.error ?? r.text.slice(0, 500);
    return { error: `GET /api/mcp/graph-snapshot falló (${r.status}). ${hint}` };
  }
  return {
    analysis: r.json.data,
    sourceLabel: r.json.source ?? 'desconocido',
  };
}

function edgeSortKey(e: AnalysisEdge): string {
  const fp =
    e.relationshipProps &&
    Object.keys(e.relationshipProps)
      .sort()
      .map((k) => `${k}=${e.relationshipProps![k] ?? ''}`)
      .join('\u001e');
  return `${e.from}\0${e.to}\0${e.relType}\0${fp ?? ''}`;
}

function truncateAnalysis(
  analysis: ThreatAnalysis,
  maxNodes: number,
  maxEdges: number,
): {
  nodes: ThreatAnalysis['nodes'];
  edges: AnalysisEdge[];
  totals: { graphNodes: number; edges: number };
  truncated: { nodesDropped: number; edgesDropped: number };
} {
  const acquisition = analysis.nodes.filter((n) => n.role === 'acquisition');
  const graphNodesFull = analysis.nodes.filter((n) => n.role !== 'acquisition');

  let edges = [...analysis.edges].sort((a, b) => edgeSortKey(a).localeCompare(edgeSortKey(b))).slice(0, maxEdges);

  const neededIds = new Set<string>();
  for (const e of edges) {
    neededIds.add(e.from);
    neededIds.add(e.to);
  }

  let nodes = analysis.nodes.filter((n) => neededIds.has(n.id));

  const graphInResult = nodes.filter((n) => n.role !== 'acquisition');
  if (graphInResult.length > maxNodes) {
    const sortedGraph = [...graphInResult].sort((a, b) => a.id.localeCompare(b.id));
    const keep = new Set(sortedGraph.slice(0, maxNodes).map((n) => n.id));
    for (const n of acquisition) {
      keep.add(n.id);
    }
    edges = edges.filter((e) => keep.has(e.from) && keep.has(e.to));
    nodes = analysis.nodes.filter((n) => keep.has(n.id));
  }

  return {
    nodes,
    edges,
    totals: { graphNodes: graphNodesFull.length, edges: analysis.edges.length },
    truncated: {
      nodesDropped: Math.max(0, graphNodesFull.length - nodes.filter((n) => n.role !== 'acquisition').length),
      edgesDropped: Math.max(0, analysis.edges.length - edges.length),
    },
  };
}

function normalizeNeedle(q: string): string {
  return q.trim().toLowerCase();
}

function jsonResult(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

function neighborhoodPayload(analysis: ThreatAnalysis, nodeId: string, depth: number) {
  const adj = new Map<string, AnalysisEdge[]>();
  const addUndirected = (a: string, b: string, e: AnalysisEdge) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(e);
    adj.get(b)!.push(e);
  };
  for (const e of analysis.edges) {
    addUndirected(e.from, e.to, e);
  }

  let frontier = new Set<string>([nodeId]);
  const visited = new Set<string>([nodeId]);
  const collectedEdges = new Map<string, AnalysisEdge>();

  for (let d = 0; d < depth; d++) {
    const next = new Set<string>();
    for (const id of frontier) {
      const inc = adj.get(id);
      if (!inc) continue;
      for (const e of inc) {
        collectedEdges.set(edgeSortKey(e), e);
        const other = e.from === id ? e.to : e.from;
        if (!visited.has(other)) {
          visited.add(other);
          next.add(other);
        }
      }
    }
    frontier = next;
    if (frontier.size === 0) break;
  }

  const nodeIds = [...visited];
  const nodes = analysis.nodes.filter((n) => nodeIds.includes(n.id));
  const edges = [...collectedEdges.values()].sort((a, b) => edgeSortKey(a).localeCompare(edgeSortKey(b)));

  return {
    centerNodeId: nodeId,
    depth,
    nodes,
    edges,
    note:
      nodes.length === 0
        ? 'Nodo no encontrado en el snapshot actual (comprueba id contra el backend).'
        : undefined,
  };
}

const threatLevelSchema = z.enum(['high', 'medium', 'low', 'possible']);

const server = new McpServer(
  { name: 'q-threats', version: '0.1.0' },
  {
    instructions: `Todas las herramientas leen datos del backend Q Threats en ${backendBaseUrl()} (sin credenciales de base de datos en este proceso). Si falla la conexión, arranca Next en el puerto configurado o define Q_THREATS_BACKEND_URL.`,
  },
);

server.registerTool(
  'list_threats',
  {
    description:
      'Lista amenazas desde GET /api/threats del backend. Opcional level y limit (el servidor ordena solo si hay filtros).',
    inputSchema: {
      limit: z.number().int().positive().max(500).optional(),
      level: threatLevelSchema.optional(),
    },
  },
  async (args: { limit?: number; level?: ThreatLevel }) => {
    const params = new URLSearchParams();
    if (args.level) params.set('level', args.level);
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    const qs = params.toString();
    const path = qs ? `/api/threats?${qs}` : '/api/threats';
    const r = await backendJson<{ data?: unknown[]; truncated?: boolean; error?: string }>(path);
    if (!r.ok || !Array.isArray(r.json?.data)) {
      if (r.status === 0) return jsonResult({ error: backendUnreachableHint() });
      return jsonResult({
        error: r.json?.error ?? r.text.slice(0, 400),
        httpStatus: r.status,
      });
    }
    return jsonResult({
      backend: backendBaseUrl(),
      count: r.json.data.length,
      threats: r.json.data,
      truncated: r.json.truncated === true,
    });
  },
);

server.registerTool(
  'search_threats',
  {
    description: 'Busca amenazas vía GET /api/threats?q=…&limit=… (filtro en el servidor).',
    inputSchema: {
      query: z.string().min(1).max(500),
      limit: z.number().int().positive().max(100).optional(),
    },
  },
  async (args: { query: string; limit?: number }) => {
    const params = new URLSearchParams({ q: args.query });
    params.set('limit', String(args.limit ?? 40));
    const r = await backendJson<{ data?: unknown[]; truncated?: boolean; error?: string }>(
      `/api/threats?${params.toString()}`,
    );
    if (!r.ok || !Array.isArray(r.json?.data)) {
      if (r.status === 0) return jsonResult({ error: backendUnreachableHint() });
      return jsonResult({ error: r.json?.error ?? r.text.slice(0, 400), httpStatus: r.status });
    }
    return jsonResult({
      backend: backendBaseUrl(),
      query: args.query,
      count: r.json.data.length,
      threats: r.json.data,
      truncated: r.json.truncated === true,
    });
  },
);

server.registerTool(
  'get_threat_analysis',
  {
    description: 'GET /api/analysis/[threatId] en el backend.',
    inputSchema: {
      threatId: z.string().min(1).max(120),
    },
  },
  async (args: { threatId: string }) => {
    const id = encodeURIComponent(args.threatId.trim());
    const r = await backendJson<{ data?: ThreatAnalysis; error?: string }>(`/api/analysis/${id}`);
    if (!r.ok) {
      if (r.status === 0) return jsonResult({ error: backendUnreachableHint() });
      return jsonResult({
        threatId: args.threatId,
        error: r.json?.error ?? r.text.slice(0, 400),
        httpStatus: r.status,
      });
    }
    if (!r.json?.data) {
      return jsonResult({ threatId: args.threatId, error: 'Sin cuerpo data', httpStatus: r.status });
    }
    return jsonResult({ threatId: args.threatId, data: r.json.data });
  },
);

server.registerTool(
  'get_relation_graph',
  {
    description:
      'Snapshot del grafo desde GET /api/mcp/graph-snapshot (Neo4j en servidor o demo consolidado). Recorta en cliente MCP.',
    inputSchema: {
      maxNodes: z.number().int().positive().max(400).optional(),
      maxEdges: z.number().int().positive().max(600).optional(),
    },
  },
  async (args: { maxNodes?: number; maxEdges?: number }) => {
    const maxNodes = args.maxNodes ?? 80;
    const maxEdges = args.maxEdges ?? 120;
    const snap = await fetchGraphSnapshot();
    if ('error' in snap) {
      return jsonResult({ backend: backendBaseUrl(), error: snap.error });
    }
    const { nodes, edges, totals, truncated } = truncateAnalysis(snap.analysis, maxNodes, maxEdges);
    return jsonResult({
      backend: backendBaseUrl(),
      sourceLabel: snap.sourceLabel,
      threatId: snap.analysis.threatId,
      acquisition: snap.analysis.acquisition,
      totals,
      truncated,
      nodes,
      edges,
    });
  },
);

server.registerTool(
  'search_graph_nodes',
  {
    description: 'Filtra nodos sobre el snapshot devuelto por el backend (/api/mcp/graph-snapshot).',
    inputSchema: {
      query: z.string().min(1).max(300),
      limit: z.number().int().positive().max(120).optional(),
    },
  },
  async (args: { query: string; limit?: number }) => {
    const snap = await fetchGraphSnapshot();
    if ('error' in snap) {
      return jsonResult({ backend: backendBaseUrl(), error: snap.error });
    }
    const needle = normalizeNeedle(args.query);
    const limit = args.limit ?? 40;
    const graphNodes = snap.analysis.nodes.filter((n) => n.role !== 'acquisition');
    const matched = graphNodes
      .filter((n) => {
        const hay = `${n.id} ${n.title} ${n.description || ''}`.toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => a.id.localeCompare(b.id));
    return jsonResult({
      backend: backendBaseUrl(),
      sourceLabel: snap.sourceLabel,
      query: args.query,
      count: matched.length,
      nodes: matched.slice(0, limit),
      truncated: matched.length > limit,
    });
  },
);

server.registerTool(
  'get_node_neighborhood',
  {
    description: 'Vecindad sobre el grafo servido por GET /api/mcp/graph-snapshot.',
    inputSchema: {
      nodeId: z.string().min(1).max(400),
      depth: z.number().int().min(1).max(2).optional(),
    },
  },
  async (args: { nodeId: string; depth?: number }) => {
    const depth = args.depth ?? 1;
    const snap = await fetchGraphSnapshot();
    if ('error' in snap) {
      return jsonResult({ backend: backendBaseUrl(), error: snap.error });
    }
    const payload = neighborhoodPayload(snap.analysis, args.nodeId.trim(), depth);
    return jsonResult({ backend: backendBaseUrl(), sourceLabel: snap.sourceLabel, ...payload });
  },
);

server.registerTool(
  'get_context_pack',
  {
    description: 'Texto desde GET /api/mcp/context-pack (mismo paquete que usa el chat MiniMax en el servidor).',
  },
  async () => {
    const r = await backendJson<{ text?: string; error?: string }>('/api/mcp/context-pack');
    if (!r.ok || typeof r.json?.text !== 'string') {
      if (r.status === 0) {
        return jsonResult({ error: backendUnreachableHint() });
      }
      return jsonResult({
        error: r.json?.error ?? r.text.slice(0, 400),
        httpStatus: r.status,
      });
    }
    return {
      content: [{ type: 'text' as const, text: r.json.text }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[q-threats-mcp]', err);
  process.exit(1);
});
