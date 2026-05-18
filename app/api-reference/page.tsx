import Link from 'next/link';

export const metadata = {
  title: 'API HTTP — Q Threats',
  description: 'Base URL, CORS y rutas JSON para integrar Q Threats desde curl, scripts o apps.',
};

/** Mismo despliegue público que en /mcp (solo documentación; no hardcodea secretos). */
const PRODUCTION_EXAMPLE = 'https://q-threats.vercel.app';

const ENDPOINT_ROWS: [string, string, string][] = [
  ['GET', '/api/threats', 'Lista de amenazas. Query opcional: q, level (high|medium|low|possible), limit (≥1, máx. 500). Respuesta: { data, truncated? }.'],
  ['GET', '/api/nodes', 'Nodos del demo. Query opcional: ids=id1,id2 (si falta, devuelve el conjunto por defecto). Respuesta: { data }.'],
  ['GET', '/api/departments', 'Departamentos (Guatemala). Respuesta: { data }.'],
  ['GET', '/api/analysis/[threatId]', 'Análisis por id de amenaza (ej. t1). Respuesta: { data } o 404.'],
  ['GET', '/api/legislation/[id]', 'Análisis vía identificador de iniciativa (Make). URL-encode el id. Respuesta: { data } o error.'],
  ['GET', '/api/recent-reports', 'Últimos reportes (Supabase law_risk_reports). 503 si no hay env. Respuesta: { data }.'],
  ['GET', '/api/graph', 'Grafo completo desde Neo4j únicamente. 503 sin variables de entorno. Query ?check=1 devuelve estado de configuración.'],
  ['GET', '/api/mcp/graph-snapshot', 'Snapshot de análisis/grafo: Neo4j en servidor o fallback demo. Respuesta: { source, data }.'],
  ['GET', '/api/mcp/context-pack', 'Texto consolidado (amenazas + grafo) para contexto de modelo. Respuesta: { text }.'],
  ['POST', '/api/chat', 'Chat con MiniMax (clave en servidor). Cuerpo: { messages: [{ role, content }] }. Respuesta: { reply } o { error }.'],
];

const CURL_THREATS = `curl -sS \\
  -H "Accept: application/json" \\
  "${PRODUCTION_EXAMPLE}/api/threats?q=sanidad&limit=5"`;

const CURL_ANALYSIS = `curl -sS \\
  -H "Accept: application/json" \\
  "${PRODUCTION_EXAMPLE}/api/analysis/t1"`;

const CURL_CHAT = `curl -sS -X POST \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -d '{\"messages\":[{\"role\":\"user\",\"content\":\"Resume las amenazas listadas.\"}]}' \\
  "${PRODUCTION_EXAMPLE}/api/chat"`;

export default function ApiReferencePage() {
  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-[#030603] via-[#0a1512] to-[#173330] font-sans text-white">
      <div className="mx-auto max-w-3xl px-6 pb-32 pt-24 lg:max-w-4xl lg:px-8">
        <header className="liquid-glass-card mb-10 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300/90">Integración</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">API HTTP</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/72 md:text-base">
            Todas las rutas bajo{' '}
            <code className="rounded bg-black/35 px-1.5 py-0.5 text-[0.9em]">/api/…</code> devuelven JSON (salvo errores). No
            se expone autenticación de Neo4j, Supabase ni MiniMax al cliente: solo las respuestas ya resueltas en el servidor.
          </p>
        </header>

        <div className="space-y-6">
          <section className="glass rounded-2xl p-6 md:p-8">
            <h2 className="mb-4 text-xl font-semibold text-white">URL base</h2>
            <p className="mb-4 text-sm leading-relaxed text-white/75">
              En local, con <code className="rounded bg-black/35 px-1 py-0.5">npm run dev</code>, la base suele ser{' '}
              <code className="rounded bg-black/35 px-1 py-0.5">http://127.0.0.1:3000</code>. En producción, usa el origen de tu
              despliegue; ejemplo público actual:
            </p>
            <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-teal-100/95">
              {PRODUCTION_EXAMPLE}
            </p>
            <p className="mt-4 text-sm text-white/65">
              Sustituye en los ejemplos si tu instancia vive en otro host.
            </p>
          </section>

          <section className="glass rounded-2xl p-6 md:p-8">
            <h2 className="mb-4 text-xl font-semibold text-white">CORS y métodos</h2>
            <p className="text-sm leading-relaxed text-white/75">
              Las respuestas de <code className="rounded bg-black/35 px-1 py-0.5">/api/*</code> incluyen cabeceras{' '}
              <code className="rounded bg-black/35 px-1 py-0.5">Access-Control-Allow-Origin: *</code> y permiten{' '}
              <code className="rounded bg-black/35 px-1 py-0.5">GET</code>,{' '}
              <code className="rounded bg-black/35 px-1 py-0.5">POST</code> y preflight{' '}
              <code className="rounded bg-black/35 px-1 py-0.5">OPTIONS</code>, para poder consumir la API desde el navegador en
              otro origen o desde herramientas habituales.
            </p>
          </section>

          <section className="glass rounded-2xl p-6 md:p-8">
            <h2 className="mb-4 text-xl font-semibold text-white">Rutas</h2>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/25">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="text-white/50 uppercase text-xs tracking-wide">
                  <tr>
                    <th className="border-b border-white/10 px-3 py-3 font-medium">Método</th>
                    <th className="border-b border-white/10 px-3 py-3 font-medium">Ruta</th>
                    <th className="border-b border-white/10 px-3 py-3 font-medium">Notas</th>
                  </tr>
                </thead>
                <tbody className="text-white/80">
                  {ENDPOINT_ROWS.map(([method, path, note]) => (
                    <tr key={`${method}${path}`} className="border-b border-white/5 align-top">
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-amber-200/90">{method}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-teal-200/90">{path}</td>
                      <td className="px-3 py-3 text-white/78">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="glass rounded-2xl p-6 md:p-8">
            <h2 className="mb-4 text-xl font-semibold text-white">Ejemplos con curl</h2>
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-sm font-medium text-white/88">Amenazas filtradas</p>
                <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 text-xs leading-relaxed text-teal-100/95">
                  {CURL_THREATS}
                </pre>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-white/88">Análisis de una amenaza</p>
                <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 text-xs leading-relaxed text-teal-100/95">
                  {CURL_ANALYSIS}
                </pre>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-white/88">Chat (requiere MiniMax en el servidor del despliegue)</p>
                <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 text-xs leading-relaxed text-teal-100/95">
                  {CURL_CHAT}
                </pre>
              </div>
            </div>
          </section>

          <section className="liquid-glass-card flex flex-wrap gap-3 p-6 md:p-8">
            <Link
              href="/docs"
              className="inline-flex rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
            >
              Guía técnica (Docs)
            </Link>
            <Link
              href="/mcp"
              className="inline-flex rounded-full border border-teal-400/40 px-5 py-2 text-sm font-medium text-teal-100 transition hover:bg-teal-500/15"
            >
              MCP (Cursor)
            </Link>
            <Link
              href="/"
              className="inline-flex rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
            >
              Inicio
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
