# Guía para agentes — Q Threats (Q-treat)

## Qué es este proyecto

**Q Threats** es un dashboard web para visualizar amenazas y análisis ligados a compras públicas en Guatemala (UI y metadatos en **español**). Los datos de demostración están **quemados en código** y se exponen vía **Route Handlers** de Next.js; no hay base de datos en este repo.

## Stack

| Área | Tecnología |
|------|------------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS 4 (`app/globals.css`, PostCSS) |
| 3D | Three.js, `@react-three/fiber`, `@react-three/drei` |
| Otros | `motion`, `d3-force`, `lucide-react` |

**Lint del proyecto:** `npm run lint` ejecuta `tsc --noEmit` (no ESLint en `package.json`).

## Comandos útiles

```bash
npm install          # dependencias
npm run dev          # http://localhost:3000
npm run build        # producción
npm run lint         # TypeScript
npm run generate:departments   # regenera paths desde TopoJSON → SVGs en public/departments/
```

## Estructura de carpetas (referencia rápida)

| Ruta | Rol |
|------|-----|
| `app/` | Rutas, `layout.tsx`, estilos globales, API bajo `app/api/` |
| `components/` | Componentes React (mapa, modales, canvases 3D/red) |
| `lib/` | Datos (`data.ts`), tipos (`types.ts`), utilidades de geometría/red/neural |
| `public/departments/` | SVG por departamento (Guatemala) |
| `public/logos/` | Logos locales (ej. `inacif.svg`) |
| `scripts/` | Utilidades Node (`generate-department-paths.mjs`, scripts gist) |

## Fuente de verdad de los datos

1. **`lib/types.ts`** — Contratos TypeScript (`Threat`, `ThreatAnalysis`, `AnalysisNode`, etc.).
2. **`lib/data.ts`** — Arrays y objetos: amenazas (`threats`), análisis por amenaza (`threatAnalyses`), nodos globales si aplica.
3. **`app/api/*/route.ts`** — Solo serializan lo importado desde `lib/data` (u otros `lib/*`), típicamente `NextResponse.json({ data: ... })`.

Al añadir una amenaza o un análisis:

- Actualiza tipos si el modelo cambia.
- Añade entradas en `lib/data.ts`.
- Confirma que los route handlers existentes la incluyan o que las rutas dinámicas (`app/api/analysis/[threatId]/route.ts`) resuelvan el nuevo `threatId`.

## API (resumen)

| Método y ruta | Contenido |
|---------------|-----------|
| `GET /api/threats` | Lista de amenazas |
| `GET /api/nodes` | Nodos; query opcional `?ids=...` |
| `GET /api/departments` | Departamentos |
| `GET /api/analysis/[threatId]` | Análisis para una amenaza |

## Convenciones para cambios de código

- **Idioma:** textos de usuario y metadatos descriptivos en español cuando aplique.
- **Imports:** alias `@/` según `tsconfig.json` (ej. `@/lib/data`).
- **Componentes 3D:** encapsular lógica pesada en `lib/` o subcomponentes; evitar duplicar constantes — revisar `lib/neuralConstants.ts` y afines.
- **Assets:** SVGs de departamentos comparten convención de tamaño/centrado (ver README del repo).
- **Alcance:** cambios acotados al problema; no refactorizar masivo sin necesidad.

## Lo que este repo no incluye

- Persistencia (DB), auth ni despliegue documentado aquí.
- Los scripts en `scripts/` (gist, etc.) son herramientas auxiliares; leer el archivo antes de ejecutarlos.

Para convenciones persistentes adicionales del editor, ver **`.cursor/rules/`** en este repositorio.
