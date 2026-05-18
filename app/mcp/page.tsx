import Link from 'next/link';

export default function McpPage() {
  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-[#030603] via-[#0a1512] to-[#173330] font-sans text-white">
      <div className="mx-auto max-w-3xl px-6 pb-32 pt-28 lg:max-w-4xl lg:px-8">
        <header className="liquid-glass-card mb-10 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300/90">Integracion</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Model Context Protocol (MCP)
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/65 md:text-base">
            MCP es un estándar para que aplicaciones de IA (por ejemplo Cursor) hablen con{' '}
            <strong className="font-semibold text-white/85">servidores MCP</strong>: procesos que exponen{' '}
            <strong className="font-semibold text-white/85">herramientas</strong>,{' '}
            <strong className="font-semibold text-white/85">recursos</strong> y{' '}
            <strong className="font-semibold text-white/85">prompts</strong> de forma uniforme. El modelo no ejecuta código al azar:
            llama a herramientas que el servidor define con nombre, argumentos validados y respuesta tipada.
          </p>
        </header>

        <div className="space-y-6">
          <section className="glass rounded-2xl p-6 md:p-8">
            <h2 className="mb-4 text-xl font-semibold text-white">Transportes habituales</h2>
            <ul className="list-disc space-y-3 ps-6 text-sm leading-relaxed text-white/75 md:text-base">
              <li>
                <strong className="text-white/90">stdio</strong>: Cursor u otro cliente lanza un comando local (
                <code className="rounded bg-black/35 px-1.5 py-0.5 text-[0.85em]">node servidor.js</code>) y habla por
                entrada/salida estándar. Es el modo más común para desarrollo.
              </li>
              <li>
                <strong className="text-white/90">HTTP / SSE</strong>: el servidor escucha en una URL; el cliente se conecta en red.
                Útil para servicios remotos o varios usuarios; exige más cuidado con auth y HTTPS.
              </li>
            </ul>
          </section>

          <section className="glass rounded-2xl p-6 md:p-8">
            <h2 className="mb-4 text-xl font-semibold text-white">Conectar MCP en Cursor</h2>
            <ol className="list-decimal space-y-3 ps-6 text-sm leading-relaxed text-white/75 md:text-base">
              <li>
                Abre la configuración de MCP en Cursor (según tu versión:{' '}
                <strong className="text-white/85">Settings → MCP</strong> o archivo de proyecto{' '}
                <code className="rounded bg-black/35 px-1.5 py-0.5 text-[0.85em]">.cursor/mcp.json</code>). La UI puede rotular los campos como{' '}
                <em>Command</em>, <em>Args</em>, <em>Environment</em>.
              </li>
              <li>
                Registra un servidor apuntando al ejecutable que arranca tu proceso MCP (Node, Python, binario compilado,
                etc.).
              </li>
              <li>
                Reinicia el agente / ventana si Cursor lo pide; comprueba que el servidor aparece como conectado y que las tools
                listadas coinciden con tu código.
              </li>
            </ol>
            <p className="mt-6 text-sm leading-relaxed text-white/60">
              Ejemplo esquemático (placeholders — ajústalos a tu máquina):
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 text-xs leading-relaxed text-teal-100/95 md:text-sm">
{`{
  "mcpServers": {
    "ejemplo-q-threats": {
      "command": "node",
      "args": ["/ruta/a/tu/mcp-server/dist/index.js"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "NO_COMMIT_EN_REPO"
      }
    }
  }
}`}
            </pre>
            <p className="mt-4 text-xs leading-relaxed text-amber-200/85 md:text-sm">
              No guardes secretos en el repositorio: usa variables de entorno del sistema o{' '}
              <code className="rounded bg-black/35 px-1 py-0.5">.env.local</code> fuera del commit.
            </p>
          </section>

          <section className="glass rounded-2xl p-6 md:p-8">
            <h2 className="mb-4 text-xl font-semibold text-white">Crear tu propio servidor MCP</h2>
            <ol className="list-decimal space-y-3 ps-6 text-sm leading-relaxed text-white/75 md:text-base">
              <li>
                Instala el SDK oficial en Node: paquete{' '}
                <code className="rounded bg-black/35 px-1.5 py-0.5 text-[0.85em]">@modelcontextprotocol/sdk</code> y crea un
                proceso que implemente{' '}
                <code className="rounded bg-black/35 px-1.5 py-0.5 text-[0.85em]">Server</code> con transporte{' '}
                <code className="rounded bg-black/35 px-1.5 py-0.5 text-[0.85em]">stdio</code>.
              </li>
              <li>
                Define <strong className="text-white/85">tools</strong> con nombre, descripción JSON Schema para los argumentos,
                y un manejador que ejecute solo lecturas seguras (por ejemplo consultas Neo4j parametrizadas o llamadas a tus APIs
                internas).
              </li>
              <li>
                Opcional: expón <strong className="text-white/85">resources</strong> (URI legibles por el modelo) o{' '}
                <strong className="text-white/85">prompts</strong> reutilizables.
              </li>
              <li>
                Ejecuta localmente y registra el comando en Cursor como en la sección anterior.
              </li>
            </ol>
            <p className="mt-6 text-sm text-white/65">
              Documentación oficial y especificación:{' '}
              <a
                href="https://modelcontextprotocol.io"
                className="text-teal-300 underline-offset-2 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                modelcontextprotocol.io
              </a>
              .
            </p>
          </section>

          <section className="liquid-glass-card p-6 md:p-8">
            <h2 className="mb-3 text-xl font-semibold text-white">Relación con esta app</h2>
            <p className="text-sm leading-relaxed text-white/70 md:text-base">
              La web Q Threats ya expone datos por rutas como{' '}
              <code className="rounded bg-black/35 px-1.5 py-0.5 text-[0.85em]">GET /api/graph</code> y{' '}
              <code className="rounded bg-black/35 px-1.5 py-0.5 text-[0.85em]">POST /api/chat</code>. Un MCP puede encapsular esas
              llamadas como herramientas nombradas para que Cursor consulte el grafo sin copiar tokens en el chat del modelo.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/chat"
                className="inline-flex rounded-full border border-teal-400/40 px-5 py-2 text-sm font-medium text-teal-100 transition hover:bg-teal-500/15"
              >
                Ir a Chat
              </Link>
              <Link
                href="/docs"
                className="inline-flex rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
              >
                Docs API
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
