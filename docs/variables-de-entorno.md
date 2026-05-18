# Variables de entorno

Copia **`.env.example`** (raíz del repo) a **`.env.local`** y completa según lo que uses. No subas `.env.local`.

| Área | Variables | Notas |
|------|-----------|--------|
| **Neo4j** | `NEO4J_URI`, `NEO4J_USER` o `NEO4J_USERNAME`, `NEO4J_PASSWORD` o `NEO4J_SECRET` | Necesarias para `/api/graph` y grafo en vivo en snapshot/chat |
| | `NEO4J_DATABASE`, `NEO4J_REL_LIMIT`, `NEO4J_CYPHER` | Opcionales |
| | `NEO4J_ACQUISITION_*` | Metadatos sintéticos del nodo adquisición en la proyección |
| **Make** | `MAKE_WEBHOOK_URL`, `MAKE_API_KEY` | Webhook con cuerpo `{ iniciativa_id }` |
| **Supabase** | `SUPABASE_URL` + una clave (`SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY` / `SUPABASE_ANON_KEY`) | Para `GET /api/recent-reports` |
| **MiniMax** | `MINIMAX_API_KEY`, opcionales `MINIMAX_BASE_URL`, `MINIMAX_MODEL` | Para `POST /api/chat` |
| **MCP (local)** | `Q_THREATS_BACKEND_URL` | Base del backend (default `http://127.0.0.1:3000`) |

Detalle y comentarios: archivo **`.env.example`** en la raíz del repositorio.
