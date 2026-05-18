# API REST (resumen)

Guía interactiva en la app desplegada: **[https://q-threats.vercel.app/api-reference](https://q-threats.vercel.app/api-reference)**

Las rutas bajo `/api/*` incluyen cabeceras **CORS** y responden a **OPTIONS** (`middleware.ts`).

## Patrones de respuesta

- `{ data: ... }`, `{ error: string }`
- `/api/mcp/context-pack` → `{ text }`
- `/api/chat` → `{ reply }` o error

## Tabla rápida

| Método | Ruta | Notas |
|--------|------|--------|
| GET | `/api/threats` | `q`, `level`, `limit` |
| GET | `/api/nodes` | `?ids=` opcional |
| GET | `/api/departments` | Departamentos GT |
| GET | `/api/analysis/[threatId]` | Demo |
| GET | `/api/legislation/[id]` | Make |
| GET | `/api/recent-reports` | Supabase |
| GET | `/api/graph` | Solo Neo4j; `?check=1` diagnóstico |
| GET | `/api/mcp/graph-snapshot` | Neo4j o fallback demo |
| GET | `/api/mcp/context-pack` | Texto para modelos |
| POST | `/api/chat` | `{ messages: [{ role, content }] }` |

**Diferencia clave:** `GET /api/graph` **no** tiene fallback estático; `GET /api/mcp/graph-snapshot` sí, para clientes sin Neo4j en su máquina.
