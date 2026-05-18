# Desarrollo

## Requisitos

- Node.js LTS
- npm

## Arranque

```bash
npm install
npm run dev
```

La app Next corre en **http://localhost:3000**.

## Scripts útiles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Next en puerto 3000 |
| `npm run dev:clean` | Limpia caché y arranca dev |
| `npm run build` / `npm start` | Producción |
| `npm run lint` | `tsc --noEmit` |
| `npm run mcp:stdio` | Servidor MCP (stdio) |
| `npm run docs:dev` | Docsify en puerto 3001 |
| `npm run generate:departments` | Regenera SVG departamentos |

## Documentación estática (Docsify)

```bash
npm run docs:dev
```

Sirve la carpeta `docs/` (este sitio). No compite con Next salvo por el puerto: usa **3001** por defecto.

## Estructura del monorepo (resumen)

```text
app/              # Rutas Next (/, /relations, /chat, /api-reference, /mcp; /docs redirige fuera)
app/api/          # REST
components/       # UI
lib/              # Datos demo, Neo4j, Make, Supabase, chat, tipos
mcp/server.ts     # MCP
middleware.ts     # CORS /api
docs/             # Docsify (index.html + *.md)
public/           # Estáticos
scripts/          # Utilidades Node
```

Más convenciones: **`AGENTS.md`**. Diseño UI: **`DESIGN.md`**.
