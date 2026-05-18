# Arquitectura

## Flujo de datos (alto nivel)

```
Make (webhook)  →  Neo4j (Bolt)  ←  Next.js API (neo4j-driver)
                       ↑
              Supabase (opcional, reportes recientes)
```

- **UI (React)** llama a **Route Handlers** bajo `/api/*`.
- **`/api/graph`** devuelve el grafo **solo** desde Neo4j (sin fallback).
- **`/api/mcp/graph-snapshot`** usa Neo4j en servidor **o** grafo demo consolidado (útil para MCP e integraciones sin Neo4j en cliente).
- **Make** no lo ejecuta Next: tu escenario envía datos al grafo; la app **consulta** Neo4j o llama al **webhook** para legislación (`/api/legislation/...`).

## Componentes principales

| Pieza | Rol |
|-------|-----|
| `lib/data.ts` | Amenazas y análisis **demo** |
| `lib/neo4j/` | Config y lectura del grafo |
| `lib/make/` | Cliente webhook → `ThreatAnalysis` |
| `lib/chat/buildChatContextPack.ts` | Texto de contexto (amenazas + snapshot de grafo) |
| `mcp/server.ts` | MCP stdio → HTTP al backend (`Q_THREATS_BACKEND_URL`) |
| `middleware.ts` | CORS + `OPTIONS` para `/api/*` |

## Limitaciones

- Los datos demo **no** sustituyen auditoría sobre fuentes reales.
- Chat y modelos LLM: **asistencia** acotada al contexto inyectado, no conclusión legal.
