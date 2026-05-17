import Link from 'next/link';

export const metadata = {
  title: 'Docs — Q Threats',
  description: 'Referencias de producto, API local y desarrollo.',
};

export default function DocsPage() {
  return (
    <div className="min-h-[100dvh] w-full text-white font-sans bg-gradient-to-br from-[#030603] via-[#0a1512] to-[#173330]">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-24 lg:max-w-4xl">
        <header className="liquid-glass-card mb-10 p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-teal-300/90 font-semibold">Documentacion</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Guia tecnica rapida — Q Threats
          </h1>
          <p className="mt-4 text-white/65 leading-relaxed text-sm md:text-base">
            Esta pagina resume como funciona la app demo: datos locales, rutas de API de Next y convenciones
            pensadas hasta que llegue persistencia externa de grafos.
          </p>
        </header>

        <div className="space-y-6">
          <section className="glass rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-semibold text-white mb-4">Ejecutar localmente</h2>
            <ul className="list-disc space-y-2 ps-6 text-white/75 text-sm">
              <li>
                Dependencias con <code className="rounded bg-black/35 px-1.5 py-0.5">npm install</code>
              </li>
              <li>
                Servidor dev: <code className="rounded bg-black/35 px-1.5 py-0.5">npm run dev</code> (puerto 3000)
              </li>
              <li>
                Typecheck como lint:{' '}
                <code className="rounded bg-black/35 px-1.5 py-0.5">npm run lint</code>
              </li>
              <li>
                Mapas desde TopoJSON (SVG departamentos):{' '}
                <code className="rounded bg-black/35 px-1.5 py-0.5">npm run generate:departments</code>
              </li>
            </ul>
          </section>

          <section className="glass rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-semibold text-white mb-4">API (Route Handlers)</h2>
            <p className="text-white/65 text-sm mb-6 leading-relaxed">
              Todas sirven datos estáticos desde <code className="rounded bg-black/35 px-1.5 py-0.5">lib/data.ts</code> y
              modulos relacionados. La ruta <code className="rounded bg-black/35 px-1.5 py-0.5">GET /api/graph</code> expone el
              grafo completo desde Neo4j cuando NEO4J_URI, NEO4J_USER y NEO4J_PASSWORD estan definidos (sin fallback estático).
            </p>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/25">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="text-white/50 uppercase text-xs tracking-wide">
                  <tr>
                    <th className="border-b border-white/10 px-4 py-3 font-medium">Ruta</th>
                    <th className="border-b border-white/10 px-4 py-3 font-medium">Descripcion</th>
                  </tr>
                </thead>
                <tbody className="text-white/80">
                  {[
                    ['GET /api/threats', 'Ultimas amenazas de muestra'],
                    ['GET /api/nodes ?ids=', 'Detalle de nodos para la red'],
                    ['GET /api/departments', 'Lista de departamentos (Guatemala)'],
                    ['GET /api/analysis/[threatId]', 'Detalle por amenaza'],
                    ['GET /api/graph', 'Grafo Neo4j completo (requiere env)'],
                  ].map(([path, desc]) => (
                    <tr key={path} className="border-b border-white/5">
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-teal-200/90">{path}</td>
                      <td className="px-4 py-3">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="glass rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-semibold text-white mb-4">Navegacion de producto</h2>
            <ul className="space-y-3 text-white/75 text-sm">
              <li>
                <span className="font-semibold text-white">Threats</span>: mapa territorial y lista de amenazas.
              </li>
              <li>
                <span className="font-semibold text-white">Relations</span>: grafos combinados mediante el endpoint oficial
                de grafo provisional.
              </li>
              <li>
                <span className="font-semibold text-white">Docs</span>: sintesis operativa visible en navegadores (esta misma vista).
              </li>
            </ul>
          </section>

          <section className="liquid-glass-card p-6 md:p-8">
            <h2 className="text-xl font-semibold text-white mb-3">Diseno visual</h2>
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              Los foundations viven junto al repo (<code className="rounded bg-black/35 px-1.5 py-0.5">DESIGN.md</code>),
              enfocados en tipografia Fredoka y liquid glass escalable desde las utilidades de{' '}
              <code className="rounded bg-black/35 px-1.5 py-0.5">app/globals.css</code>.
            </p>
            <Link
              href="/relations"
              className="mr-4 inline-flex items-center rounded-full border border-teal-400/40 px-5 py-2 text-sm font-medium text-teal-100 hover:bg-teal-500/15 transition"
            >
              Ir a Relations
            </Link>
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition"
            >
              Volver a Threats
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
