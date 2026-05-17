# Q Threats

Dashboard de amenazas y análisis de compras públicas (Guatemala).

## Ejecutar localmente

1. Instalar dependencias:

```bash
npm install
```

2. Iniciar el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## API (datos quemados en backend)

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/threats` | Últimas actividades sospechosas |
| `GET /api/nodes` | Nodos del análisis (opcional: `?ids=odebrecht,inacif,bloque`) |
| `GET /api/departments` | Lista de departamentos de Guatemala |

Los datos viven en `lib/data.ts` y se sirven desde Route Handlers en `app/api/`.

## Mapas de departamentos

Cada departamento es un SVG en `public/departments/` (centrado y mismo tamaño visual). Para regenerarlos desde el TopoJSON:

```bash
npm run generate:departments
```
