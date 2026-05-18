# Q Threats

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Deploy](https://img.shields.io/badge/deploy-Vercel-000000?logo=vercel)](https://q-threats.vercel.app)
[![Docs](https://img.shields.io/badge/docs-Docsify-green)](https://genriquegt.github.io/q-threats/#/)
[![Demo Video](https://img.shields.io/badge/demo-YouTube-red?logo=youtube)](https://youtu.be/ROHDlXTwD_I)
[![Pitch](https://img.shields.io/badge/pitch-deck-orange)](https://sparrow-geyser-521.faces.site/6ukoe6yx9l4o)

> Plataforma open source de **inteligencia política y anticorrupción** para Guatemala: conecta personas políticamente expuestas, entidades gubernamentales, iniciativas de ley y casos documentados en un grafo interactivo — accesible para periodistas, investigadores y ciudadanos.

| Recurso | URL |
|---------|-----|
| 🌐 Aplicación | [q-threats.vercel.app](https://q-threats.vercel.app) |
| 📖 Documentación | [genriquegt.github.io/q-threats](https://genriquegt.github.io/q-threats/#/) |
| 🎬 Video demo | [youtu.be/ROHDlXTwD_I](https://youtu.be/ROHDlXTwD_I) |
| 🎤 Pitch | [sparrow-geyser-521.faces.site/6ukoe6yx9l4o](https://sparrow-geyser-521.faces.site/6ukoe6yx9l4o) |
| 💻 Repositorio | [github.com/GEnriqueGT/q-threats](https://github.com/GEnriqueGT/q-threats) |

---

## El problema

La información pública en Guatemala existe, pero está fragmentada en decenas de organismos del Estado con formatos incompatibles y sin posibilidad real de cruzar fuentes. Esta opacidad estructural protege entramados de corrupción: figuras que la narrativa mediática presenta como antagonistas pueden colaborar en intereses comunes sin que nadie lo detecte. **La falta de centralización de datos es, en sí misma, un mecanismo de impunidad.**

Q Threats rompe esa barrera convirtiendo datos públicos dispersos en un grafo de relaciones legible por cualquier persona.

---

## Cómo funciona: el pipeline completo

```
Fuentes oficiales del Estado
(Diario de Centroamérica, compras públicas,
registro de empresas, partidos políticos…)
         │
         ▼
┌────────────────────────┐
│   Make  (scraping +    │  Ciclo automatizado de recolección.
│   automatizaciones)    │  Webhooks, limpieza y transformación
│                        │  del dato crudo a JSON estandarizado.
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│       Supabase         │  Almacenamiento estructurado.
│  (base de datos SQL)   │  Tabla law_risk_reports para reportes
│                        │  de riesgo legislativo.
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│        Neo4j           │  Base de datos de grafos.
│   (graph database)     │  Nodos: PEPs, instituciones, casos,
│                        │  partidos, beneficiarios, leyes.
│                        │  Relaciones: TRABAJA_EN, RELACION…
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│    Next.js + LLM       │  La app lee el grafo vía API.
│  (frontend + API +     │  El chat inyecta un context pack
│      chatbot)          │  desde Neo4j para respuestas
│                        │  fundamentadas en datos reales.
└────────────────────────┘
         │
    ┌────┴──────┐
    ▼           ▼
Chatbot      API REST + MCP
(ciudadanos) (periodistas, investigadores,
              integraciones externas)
```

### 1 · Recolección — Make

Un ciclo automatizado en **Make** scrappea periódicamente las páginas oficiales del Estado guatemalteco. Cada escenario actúa como intermediario: recibe vía webhook, limpia y enriquece el dato, y lo escribe como JSON estandarizado hacia el pipeline. Esto permite alimentar tanto Supabase como Neo4j sin intervención manual.

### 2 · Almacenamiento estructurado — Supabase

Los datos normalizados se persisten en **Supabase**. La tabla `law_risk_reports` concentra los reportes de riesgo sobre iniciativas legislativas. Cuando `SUPABASE_*` está configurado, `GET /api/recent-reports` sirve este contenido en tiempo real.

### 3 · Grafo de relaciones — Neo4j

El núcleo del sistema. Los nodos representan:

| Tipo de nodo (`entityKind`) | Ejemplos |
|-----------------------------|----------|
| `person` | Diputados, rectores, funcionarios |
| `institution` | Ministerios, universidades, entidades |
| `case` | Casos legales activos (ej. Odebrecht) |
| `party` | Bancadas y partidos políticos |
| `beneficiary` | Beneficiarios ocultos de contratos |
| `group` | Redes o estructuras detectadas |

Neo4j entrelaza estos nodos con relaciones tipadas (ej. `TRABAJA_EN`, `RELACION`) creando un grafo que revela conexiones imposibles de detectar manualmente. La app lo consulta vía `neo4j-driver` y lo expone en `GET /api/graph`.

### 4 · Inteligencia y acceso — LLM + MCP

El grafo alimenta el **chatbot** (`/chat`) a través de un context pack construido en `lib/chat/buildChatContextPack.ts`: cuando Neo4j está configurado, el modelo recibe un snapshot real del grafo como contexto, permitiendo respuestas en lenguaje natural fundamentadas en datos verificables.

Cada análisis o inferencia incluye el enlace a la fuente oficial original, **atribuyendo la autoría a sus respectivos autores**.

---

## Capacidades del sistema

- **Detección de conflictos legislativos:** identifica iniciativas de ley promovidas por diputados ponentes con procesos legales activos por corrupción.
- **Identificación de beneficiarios ocultos:** análisis de `posiblesBeneficiados` y beneficio privado por iniciativa.
- **Mapeo de redes ocultas:** detecta colaboración entre figuras que la prensa presenta como antagonistas.
- **Conexión con casos internacionales:** ej. vínculo detectado entre el rector de una universidad local y el caso Odebrecht.
- **Análisis de proceso legislativo:** factores de riesgo y flags de proceso por iniciativa, con nivel de riesgo (`high`, `medium`, `low`, `possible`).
- **Acceso universal:** desde el ciudadano promedio usando el chatbot hasta el investigador accediendo vía API o MCP.

---

## Stack tecnológico

| Capa | Tecnología | Rol |
|------|------------|-----|
| Framework | **Next.js 15** (App Router) + **React 19** + **TypeScript** | Frontend y API |
| Estilo | **Tailwind CSS 4** | UI, efectos glass (`app/globals.css`) |
| Visualización 3D | **Three.js**, **@react-three/fiber**, **@react-three/drei** | Análisis orbital 3D por amenaza |
| Grafo 2D | **d3-force**, **d3-zoom**, **d3-selection** | Vista `/relations` interactiva |
| Base de datos de grafos | **Neo4j** vía `neo4j-driver` | Relaciones entre entidades |
| Almacenamiento SQL | **Supabase** | Reportes legislativos (`law_risk_reports`) |
| Automatización / Scraping | **Make** | Recolección y transformación de datos |
| Chatbot | **MiniMax API** + context pack desde Neo4j | Consultas en lenguaje natural |
| Integración | **MCP** (`@modelcontextprotocol/sdk`) | Acceso programático para agentes y editores |

---

## Rutas de la aplicación

| Ruta | Descripción |
|------|-------------|
| **`/`** | Mapa de Guatemala por departamento + listado de amenazas. Abre análisis 3D por amenaza o búsqueda de iniciativa vía Make. |
| **`/relations`** | Grafo 2D interactivo desde Neo4j. Búsqueda, expansión a vecinos, panel de detalle de nodo, accesibilidad por teclado. |
| **`/chat`** | Chatbot con contexto del grafo. Respuestas en lenguaje natural sobre personas, entidades y casos. |
| **`/api-reference`** | Documentación interactiva de la API REST con ejemplos `curl`. |
| **`/mcp`** | Instrucciones para conectar Cursor u otro cliente MCP al servidor stdio. |
| **`/docs`** | Redirección a la [documentación Docsify](https://genriquegt.github.io/q-threats/#/). |

**Deep links:**
- `?amenaza=<threatId>` — abre análisis por id (ej. `?amenaza=t1`).
- `?iniciativa=<id>` — dispara búsqueda legislativa vía Make.

---

## API REST

Documentación interactiva en [`/api-reference`](https://q-threats.vercel.app/api-reference). Todas las rutas bajo `/api/*` exponen cabeceras CORS permisivas vía `middleware.ts`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/threats` | Lista de amenazas. Params: `q`, `level`, `limit`. |
| GET | `/api/nodes` | Nodos del grafo. Param opcional: `ids`. |
| GET | `/api/departments` | Departamentos de Guatemala. |
| GET | `/api/analysis/[threatId]` | Análisis completo por amenaza (nodos + aristas + metadatos). |
| GET | `/api/legislation/[id]` | Análisis legislativo por iniciativa desde Make. |
| GET | `/api/recent-reports` | Reportes recientes desde Supabase. |
| GET | `/api/graph` | Grafo completo desde Neo4j. `?check=1` diagnostica la conexión. |
| GET | `/api/mcp/graph-snapshot` | Snapshot del grafo para integraciones (Neo4j o fallback demo). |
| GET | `/api/mcp/context-pack` | Texto de contexto listo para inyectar en modelos. |
| POST | `/api/chat` | Chat con el LLM. Body: `{ messages: [{ role, content }] }`. |

---

## MCP (Model Context Protocol)

El proceso `npm run mcp:stdio` ejecuta `mcp/server.ts`: un servidor MCP que **solo llama al backend HTTP**, sin exponer credenciales de Neo4j al cliente MCP.

**Herramientas disponibles:**

| Herramienta | Descripción |
|-------------|-------------|
| `list_threats` | Lista amenazas con filtros opcionales de nivel y límite. |
| `get_graph_snapshot` | Snapshot completo del grafo (nodos + aristas con truncamiento configurable). |
| `get_node_neighborhood` | Vecindad de un nodo a profundidad N. |
| `search_threats` | Búsqueda por texto en amenazas. |

**Configuración en Cursor** (`.cursor/mcp.json` ya incluido en el repo):

```json
{
  "mcpServers": {
    "q-threats": {
      "command": "npm",
      "args": ["run", "mcp:stdio"],
      "cwd": "${workspaceFolder}",
      "env": {
        "Q_THREATS_BACKEND_URL": "https://q-threats.vercel.app"
      }
    }
  }
}
```

---

## Puesta en marcha local

```bash
git clone https://github.com/GEnriqueGT/q-threats.git
cd q-threats
npm install
cp .env.example .env.local   # completar variables según integraciones
npm run dev                  # http://localhost:3000
```

- **Threats y análisis demo** funcionan **sin** Neo4j ni Make (datos de demostración en `lib/data.ts`).
- **`/relations`** requiere Neo4j configurado (responde `503` si faltan variables).
- **Chat** requiere `MINIMAX_API_KEY` para respuestas reales del modelo.
- **Iniciativas legislativas** requieren `MAKE_WEBHOOK_URL` y `MAKE_API_KEY`.

### Documentación estática (Docsify)

```bash
npm run docs:dev   # http://localhost:3001
```

---

## Variables de entorno

| Área | Variables clave | Notas |
|------|-----------------|-------|
| **Neo4j** | `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` | Obligatorias para `/api/graph` y el context pack real. |
| **Make** | `MAKE_WEBHOOK_URL`, `MAKE_API_KEY` | Webhook de iniciativas legislativas. |
| **Supabase** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Reportes recientes. |
| **Chat** | `MINIMAX_API_KEY` | Obligatoria para `/api/chat`. |
| **MCP** | `Q_THREATS_BACKEND_URL` | URL base del backend (default: `http://127.0.0.1:3000`). |

Ver `.env.example` para la lista completa con comentarios.

---

## Scripts npm

| Script | Uso |
|--------|-----|
| `npm run dev` | Desarrollo en `http://localhost:3000`. |
| `npm run dev:clean` | Limpia caché y arranca dev. |
| `npm run build` / `npm start` | Producción. |
| `npm run lint` | Typecheck (`tsc --noEmit`). |
| `npm run mcp:stdio` | Servidor MCP stdio para Cursor u otro cliente. |
| `npm run docs:dev` | Docsify en `http://localhost:3001`. |
| `npm run generate:departments` | Regenera SVGs de departamentos → `public/departments/`. |

---

## Estructura del repositorio

```
app/
  api/              # Route Handlers REST (threats, graph, chat, mcp, legislation…)
  chat/             # Ruta /chat (chatbot)
  relations/        # Ruta /relations (grafo 2D Neo4j)
  api-reference/    # Documentación interactiva de la API
  mcp/              # Instrucciones de integración MCP
  page.tsx          # Home: mapa de Guatemala + amenazas
components/         # UI (HomePage, RelationsForceGraph, canvases 3D…)
lib/
  types.ts          # Contratos TypeScript (Threat, ThreatAnalysis, AnalysisNode…)
  data.ts           # Datos de demostración
  neo4j/            # Driver y queries hacia Neo4j
  make/             # Integración webhook Make → ThreatAnalysis
  supabase/         # Cliente servidor para law_risk_reports
  chat/             # buildChatContextPack (contexto para el LLM)
  mcp/              # loadThreatAnalysisSnapshot, threatSearch
mcp/
  server.ts         # Servidor MCP stdio
middleware.ts       # CORS para /api/*
docs/               # Documentación Docsify
public/
  departments/      # SVGs de los 22 departamentos de Guatemala
DESIGN.md           # Tokens de diseño (colores, tipografía, espaciado)
AGENTS.md           # Guía para agentes de IA y contribuidores
```

---

## Fuentes de datos

- Diario de Centroamérica
- Páginas oficiales de organismos del Estado guatemalteco
- Registro de compras públicas (Guatecompras)
- Registro de empresas
- Partidos políticos
- Medios de comunicación verificados

> Q Threats **no almacena información de los usuarios** que utilizan la plataforma. Solo procesa y expone datos de personas políticamente expuestas y entidades gubernamentales, con base exclusivamente en fuentes públicas oficiales. Cada dato incluye enlace a su fuente original.

---

## Para quién

| Perfil | Canal de acceso |
|--------|-----------------|
| **Ciudadanos** | Chatbot en `/chat` — preguntas en lenguaje natural sobre el poder político |
| **Periodistas e investigadores** | API REST + MCP + vista `/relations` para investigación profunda |
| **Desarrolladores y organizaciones** | Integración vía API abierta o servidor MCP local |

> El proyecto cuenta con una carta de declaración de intenciones de un directivo de un medio de comunicación guatemalteco que manifiesta interés formal en adoptarlo como herramienta de investigación.

---

## Escalabilidad

La arquitectura está diseñada para:
- Escalar a nuevos ministerios y organismos del Estado.
- Adaptarse a otros países con estructuras de datos similares.
- Incorporar nuevas fuentes: declaraciones patrimoniales, auditorías de la CGC, etc.
- Integrarse con nuevos modelos de lenguaje (el chat es agnóstico al proveedor).

---

## Licencia

**GNU Affero General Public License v3.0.** Si modificas el código y pones en red un servicio que use esta versión, AGPL exige que los usuarios puedan obtener el código fuente correspondiente. Ver [`LICENSE`](LICENSE).

---

## Créditos

- **Equipo:** _(completar nombres o enlaces)_
- **Evento:** _(completar nombre del hackathon)_
- **Aplicación:** [https://q-threats.vercel.app](https://q-threats.vercel.app)
- **Repositorio:** [https://github.com/GEnriqueGT/q-threats](https://github.com/GEnriqueGT/q-threats)
- **Documentación:** [https://genriquegt.github.io/q-threats/#/](https://genriquegt.github.io/q-threats/#/)
- **Video demo:** [https://youtu.be/ROHDlXTwD_I](https://youtu.be/ROHDlXTwD_I)
- **Pitch:** [https://sparrow-geyser-521.faces.site/6ukoe6yx9l4o](https://sparrow-geyser-521.faces.site/6ukoe6yx9l4o)
- **Carta de interes:** [https://docs.google.com/document/d/1Xc0ZHvPieb9tTpH3FALozaE3QMuCWcaY/edit?usp=sharing&ouid=115141051660330980025&rtpof=true&sd=true)

---

*La información es un derecho. La corrupción prospera en la oscuridad.*
