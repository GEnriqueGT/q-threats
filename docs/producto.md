# Producto y rutas

| Ruta | Descripción |
|------|-------------|
| **`/`** (Threats) | Mapa de Guatemala, listado de amenazas **demo** (`lib/data.ts`). Análisis 3D por amenaza. Búsqueda de **iniciativa** vía Make si `MAKE_*` está configurado. |
| **`/relations`** | Grafo 2D desde `GET /api/graph` (**solo Neo4j**). Sin credenciales → `503`. Búsqueda, vecinos, panel. |
| **`/chat`** | Asistente con contexto del servidor; requiere **MiniMax** (`MINIMAX_API_KEY`). |
| **`/api-reference`** | Guía HTTP, CORS, ejemplos `curl`. |
| **`/docs`** | Guía técnica corta dentro de la app Next. |
| **`/mcp`** | Instrucciones para cliente MCP + `npm run mcp:stdio`. |

## Deep links (compartir)

En la página principal (`lib/analysisUrl.ts`):

- `?amenaza=<threatId>` — análisis demo (ej. `t1`).
- `?iniciativa=<id>` — búsqueda legislativa (**Make**).

## Recolección (resumen)

| Paso | Rol |
|------|-----|
| Entrada | Webhooks / orígenes en **Make** |
| Procesamiento | Limpieza, JSON, servicios externos |
| Persistencia | **Neo4j** (p. ej. Aura) |

Opcional: **Supabase** (`law_risk_reports`) para `GET /api/recent-reports`.
