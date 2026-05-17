# Q Threats

> Plataforma web para **gobernanza transparente** en Guatemala: conecta **compras públicas**, **actores políticos** y **redes de relaciones** en una sola experiencia visual.

**Contexto:** proyecto pensado para **hackathon** — prioriza claridad de propuesta, demo reproducible y documentación lista para generar una landing (o pitch deck) automáticamente a partir de este README.

---

## Pitch en 30 segundos

Analizamos **iniciativas de ley y contrataciones** para contrastar **intenciones declaradas** con **efectos probables** sobre los **sectores** afectados, y ponemos en contexto **quién las propone** y **con quién se relaciona** ese proponente. La herramienta combina vistas de tablero, análisis por caso y un **grafo de relaciones** (Neo4j) que hace legible el entramado de poder e intereses.

---

## Problema que aborda

- La información sobre **adquisiciones** y **procesos normativos** está dispersa y es difícil de enlazar con **personas**, **instituciones** y **contactos de confianza**.
- Ciudadanía y medios necesitan **contexto**, no solo un listado de montos o títulos de ley.

## Enfoque (cómo lo resuelve)

1. **Sectores** — entender hacia dónde apunta una medida o contrato.
2. **Proponentes y actores** — quién impulsa o se beneficia.
3. **Relaciones** — mapa de vínculos entre personas y entidades (grafo explorable).
4. **Riesgos y fuentes** — resúmenes enriquecidos con advertencias y enlaces cuando el dato lo permite.

---

## Qué incluye la aplicación (producto)

| Área | Descripción |
|------|-------------|
| **Threats (inicio)** | Mapa de Guatemala por departamento y listado de actividades / amenazas de interés (demo con datos en `lib/data.ts`). |
| **Análisis de una amenaza** | Vista tipo “red neuronal” 3D con nodos (entidades, proveedores, adquisición) y panel de detalle con riesgos y fuentes. |
| **Relations** | Grafo interactivo (**Neo4j**): zoom/pan, selección de nodo, panel con propiedades, colores por tipo (p. ej. diputado / entidad), búsqueda con **expansión a vecinos** para no perder contexto, resaltado de vecinos y navegación por teclado. |
| **Docs** | Guía rápida de API local, variables de entorno y navegación (`/docs`). |

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | **Next.js 15** (App Router), **React 19**, **TypeScript** |
| Estilo | **Tailwind CSS 4**, utilidades “glass / liquid glass” (`app/globals.css`) |
| 3D | **Three.js**, **@react-three/fiber**, **@react-three/drei** |
| Grafo | **d3-force**, **d3-zoom**, **d3-selection** (SVG imperativo) |
| Datos relacionales | **Neo4j** vía `neo4j-driver` (grafo completo en `/api/graph`) |
| Datos demo | TypeScript en `lib/data.ts` (amenazas y análisis de muestra) |

---

## Requisitos

- **Node.js** LTS recomendado (compatible con Next 15).
- **npm** para dependencias y scripts.

---

## Puesta en marcha (demo local)

```bash
npm install
npm run dev
```

Abre **http://localhost:3000**.

- **Threats** y flujo de **análisis** funcionan con datos de muestra **sin base de datos**.
- **Relations** (`/relations`) necesita **Neo4j** configurado; sin ello la API devuelve error controlado (`503`).

### Variables de entorno (Neo4j)

Copia `.env.example` a `.env.local` y completa al menos:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=tu_contraseña
```

Opcionales (ver comentarios en **`.env.example`**):

- `NEO4J_DATABASE` — base de datos Aura/Enterprise.
- `NEO4J_REL_LIMIT` — tope de aristas en la consulta (protección en bases muy grandes).
- `NEO4J_CYPHER` — Cypher personalizado si aplica.
- Metadatos opcionales de “adquisición” sintéticos para el JSON del grafo.

---

## Scripts npm

| Script | Uso |
|--------|-----|
| `npm run dev` | Servidor de desarrollo (puerto 3000). |
| `npm run build` / `npm start` | Producción. |
| `npm run lint` | Typecheck (`tsc --noEmit`). |
| `npm run generate:departments` | Regenera SVG de departamentos desde TopoJSON → `public/departments/`. |

---

## API (Route Handlers)

Base: `app/api/*/route.ts`. Respuestas JSON habituales: `{ data: ... }` o `{ error: string }`.

| Método y ruta | Rol |
|---------------|-----|
| `GET /api/threats` | Lista de amenazas para el dashboard. |
| `GET /api/departments` | Departamentos de Guatemala. |
| `GET /api/analysis/[threatId]` | Análisis detallado de una amenaza (datos demo). |
| `GET /api/nodes` | Detalle de nodos (query `ids`, uso según integración). |
| `GET /api/graph` | **Grafo completo desde Neo4j** — requiere env; sin Neo4j, 503. |

---

## Estructura útil del repositorio

```text
app/           # Pages (/, /relations, /docs) y layout global (nav + footer)
app/api/       # Endpoints REST
components/    # UI: HomePage, RelationsForceGraph, AnalysisNetworkView, MainNav, MainFooter…
lib/           # Tipos, datos demo, cliente Neo4j, utilidades de grafo y formato
public/        # Activos estáticos (logos, departamentos SVG)
```

Diseño visual ampliado en **`DESIGN.md`** (tipografía Fredoka, cristal líquido).

---

## Demo y presentación (hackathon)

Añade aquí cuando los tengas (la plantilla ayuda a herramientas de landing):

- **Video demo (2–3 min):** _URL pendiente_
- **Slides / Figma:** _URL pendiente_
- **Deploy público:** _URL pendiente_ (Vercel, etc.)

**Idea de guión corto:** pantalla inicial → clic en amenaza → vista de análisis 3D → `/relations` con búsqueda y vecinos resaltados.

---

## Próximos pasos (roadmap sugerido)

- Integración persistente de iniciativas de ley y metadatos sectoriales.
- Autenticación y roles (periodista / ciudadanía).
- Exportación de reportes (PDF) desde un análisis o subgrafo.

---

## Licencia

Por definir (recomendación hackathon: **MIT** si el código es abierto; si no, aclarar uso y datos personales).

---

## Créditos

Equipo / hackathon: _completar nombre del evento y miembros del equipo._
