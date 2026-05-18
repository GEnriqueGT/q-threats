# MCP (Model Context Protocol)

El servidor MCP es un proceso **stdio** que **solo** llama al backend HTTP de Q Threats: no lleva credenciales Neo4j en el cliente Cursor.

## Cómo ejecutarlo

```bash
npm run mcp:stdio
```

Requiere dependencias instaladas (`npm install`) y revisar **`mcp/server.ts`**.

## Variable de entorno

| Variable | Uso |
|----------|-----|
| `Q_THREATS_BACKEND_URL` | Origen del API Next (ej. `https://q-threats.vercel.app` o `http://127.0.0.1:3000`). Si se omite, default local. |

`.env.local` en la raíz del repo es leído por el script MCP vía `dotenv` (ver código del servidor).

## Instrucciones en la app

Página dedicada en producción: **[https://q-threats.vercel.app/mcp](https://q-threats.vercel.app/mcp)**

Incluye ejemplos de configuración para Cursor (`mcp.json`).
