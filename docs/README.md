# Q Threats — documentación

Documentación estática generada con [Docsify](https://docsify.js.org/). Para verla en local:

```bash
npm run docs:dev
```

Abre el puerto indicado en consola (por defecto **3001**; Next usa **3000**).

## Enlaces rápidos desplegados

| Recurso | URL |
|---------|-----|
| Aplicación | [q-threats.vercel.app](https://q-threats.vercel.app) |
| Referencia API (UI) | [/api-reference](https://q-threats.vercel.app/api-reference) |
| Documentación (Docsify) | [genriquegt.github.io/q-threats](https://genriquegt.github.io/q-threats/#/) |

## Qué es

Plataforma web para **gobernanza transparente** en Guatemala: **compras públicas**, **actores**, **iniciativas normativas** y **redes de relaciones** en vistas de mapa, análisis 3D y grafo 2D (Neo4j).

**Contexto:** hackathon (transparencia / anticorrupción), **deploy público**, código **open source**.

## Pitch breve

La herramienta usa **grafos** para conectar nodos (p. ej. diputados, entidades, relaciones de tipo `RELACION` u homólogas) y **vínculos** entre actores y hechos públicos, como apoyo a periodistas y ciudadanía — **no** como veredicto legal.

En producción el flujo puede incluir **Make** → **Neo4j** (p. ej. Aura). Esta app **lee** el grafo por API. El repositorio trae **datos demo** en `lib/data.ts`; sin Neo4j ni Make, la mayor parte de la UI sigue funcionando con ese demo.

## Diagrama Make → Neo4j

Coloca tu captura del flujo en el repo como `make-flow.png` (esta carpeta `docs/`):

![Flujo Make → Neo4j](./make-flow.png)

> Si aún no hay imagen, el visor mostrará un enlace roto hasta que añadas `docs/make-flow.png`.

## Más detalle

- **Producto y rutas** → [Producto](producto.md)
- **Arquitectura** → [Arquitectura](arquitectura.md)
- **Cómo ejecutar y estructura del repo** → [Desarrollo](desarrollo.md)
- **`.env`** → [Variables de entorno](variables-de-entorno.md)
- **Endpoints** → [API REST](api.md)
- **Cursor / MCP** → [MCP](mcp-integracion.md)

El **README completo** del monorepo está en la raíz: `README.md` (útil para GitHub y clones).
