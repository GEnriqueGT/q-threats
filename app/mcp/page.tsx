import Link from 'next/link';

/** Backend Next en producción (Vercel). */
const PRODUCTION_BACKEND_URL = 'https://q-threats.vercel.app';

const MCP_CONFIG_LOCAL = `{
  "mcpServers": {
    "q-threats": {
      "command": "npm",
      "args": ["run", "mcp:stdio"],
      "cwd": "\${workspaceFolder}",
      "env": {
        "Q_THREATS_BACKEND_URL": "http://127.0.0.1:3000"
      }
    }
  }
}`;

const MCP_CONFIG_REMOTE = `{
  "mcpServers": {
    "q-threats": {
      "command": "npm",
      "args": ["run", "mcp:stdio"],
      "cwd": "\${workspaceFolder}",
      "env": {
        "Q_THREATS_BACKEND_URL": "${PRODUCTION_BACKEND_URL}"
      }
    }
  }
}`;

export default function McpPage() {
  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-[#030603] via-[#0a1512] to-[#173330] font-sans text-white">
      <div className="mx-auto max-w-2xl px-6 pb-28 pt-28 lg:px-8">
        <header className="liquid-glass-card mb-8 p-8">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">MCP — Q Threats</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/72">
            En Cursor el servidor MCP llama por HTTP al backend Next. Despliegue público actual:{' '}
            <a
              href={PRODUCTION_BACKEND_URL}
              className="text-teal-300 underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {PRODUCTION_BACKEND_URL}
            </a>
            . Define la URL base en{' '}
            <code className="rounded bg-black/35 px-1.5 py-0.5 text-[0.85em]">Q_THREATS_BACKEND_URL</code> (si no la pones, se usa{' '}
            <code className="rounded bg-black/35 px-1 py-0.5 text-[0.85em]">http://127.0.0.1:3000</code>). El host debe ser accesible
            desde tu máquina.
          </p>
        </header>

        <div className="space-y-6">
          <section className="glass rounded-2xl p-6 md:p-8">
            <h2 className="mb-4 text-lg font-semibold text-white">Configuración</h2>
            <ol className="list-decimal space-y-3 ps-5 text-sm leading-relaxed text-white/76">
              <li>
                En la raíz del repo: <code className="rounded bg-black/35 px-1.5 py-0.5 text-[0.85em]">npm install</code>
              </li>
              <li>
                Arranca la app (<code className="rounded bg-black/35 px-1 py-0.5 text-[0.85em]">npm run dev</code>) o usa una URL ya
                publicada.
              </li>
              <li>
                En Cursor: <strong className="text-white/90">Settings → MCP</strong>, o edita{' '}
                <code className="rounded bg-black/35 px-1.5 py-0.5 text-[0.85em]">.cursor/mcp.json</code>. Ajusta{' '}
                <code className="rounded bg-black/35 px-1 py-0.5 text-[0.85em]">cwd</code> si{' '}
                <code className="rounded bg-black/35 px-1 py-0.5 text-[0.85em]">{'${workspaceFolder}'}</code> no te funciona.
              </li>
              <li>
                Reinicia MCP / Cursor si no ves el servidor <code className="rounded bg-black/35 px-1 py-0.5 text-[0.85em]">q-threats</code>.
              </li>
            </ol>

            <p className="mt-6 text-sm font-medium text-white/88">Ejemplo — local</p>
            <pre className="mt-2 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 text-xs leading-relaxed text-teal-100/95">
              {MCP_CONFIG_LOCAL}
            </pre>

            <p className="mt-5 text-sm font-medium text-white/88">Ejemplo — producción (Vercel)</p>
            <pre className="mt-2 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 text-xs leading-relaxed text-teal-100/95">
              {MCP_CONFIG_REMOTE}
            </pre>
          </section>

          <section className="glass rounded-2xl p-6 md:p-8">
            <h2 className="mb-4 text-lg font-semibold text-white">Herramientas</h2>
            <ul className="space-y-2 text-sm text-white/76">
              <li>
                <code className="text-teal-100/95">list_threats</code> — Lista amenazas (filtros opcionales).
              </li>
              <li>
                <code className="text-teal-100/95">search_threats</code> — Busca amenazas por texto.
              </li>
              <li>
                <code className="text-teal-100/95">get_threat_analysis</code> — Análisis de una amenaza por id.
              </li>
              <li>
                <code className="text-teal-100/95">get_relation_graph</code> — Fragmento del grafo de relaciones.
              </li>
              <li>
                <code className="text-teal-100/95">search_graph_nodes</code> — Busca nodos en el grafo.
              </li>
              <li>
                <code className="text-teal-100/95">get_node_neighborhood</code> — Vecinos de un nodo (1–2 saltos).
              </li>
              <li>
                <code className="text-teal-100/95">get_context_pack</code> — Resumen compacto global para el modelo.
              </li>
            </ul>
          </section>

          <section className="glass rounded-2xl p-6 md:p-8">
            <h2 className="mb-3 text-lg font-semibold text-white">Implementación</h2>
            <p className="text-sm leading-relaxed text-white/76">
              Entrada del proceso:{' '}
              <code className="rounded bg-black/35 px-1.5 py-0.5 text-[0.85em]">npm run mcp:stdio</code> → archivo{' '}
              <code className="rounded bg-black/35 px-1 py-0.5 text-[0.85em]">mcp/server.ts</code>. Para añadir capacidades: expón una
              ruta en la API Next y registra una herramienta nueva ahí llamando a esa URL.
            </p>
          </section>

          <section className="liquid-glass-card flex flex-wrap gap-3 p-6 md:p-8">
            <Link
              href="/docs"
              className="inline-flex rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
            >
              Docs API
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
