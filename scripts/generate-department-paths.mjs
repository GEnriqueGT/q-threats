import fs from 'fs';
import { feature } from 'topojson-client';
import { geoPath, geoMercator } from 'd3-geo';

/** GADM order for Guatemala ADM1 (ids 0–21) */
const DEPARTMENTS_BY_ID = [
  'Alta Verapaz',
  'Baja Verapaz',
  'Chimaltenango',
  'Chiquimula',
  'El Progreso',
  'Escuintla',
  'Guatemala',
  'Huehuetenango',
  'Izabal',
  'Jalapa',
  'Jutiapa',
  'Petén',
  'Quetzaltenango',
  'Quiché',
  'Retalhuleu',
  'Sacatepéquez',
  'San Marcos',
  'Santa Rosa',
  'Sololá',
  'Suchitepéquez',
  'Totonicapán',
  'Zacapa',
];

const PADDING = 24;
const SIZE = 400;
const EXTENT = [
  [PADDING, PADDING],
  [SIZE - PADDING, SIZE - PADDING],
];

function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

const topo = JSON.parse(fs.readFileSync('public/guatemala.topojson', 'utf8'));
const collection = feature(topo, topo.objects.guatemala1);

fs.mkdirSync('public/departments', { recursive: true });

const slugs = {};

for (const f of collection.features) {
  const id = f.id ?? f.properties?.id;
  const name = DEPARTMENTS_BY_ID[id];
  if (!name) continue;

  const projection = geoMercator().fitExtent(EXTENT, f);
  const d = geoPath(projection)(f);
  if (!d) continue;

  const slug = slugify(name);
  slugs[name] = slug;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${name}">
  <defs>
    <clipPath id="c"><path d="${d}"/></clipPath>
    <pattern id="mesh" width="14" height="14" patternUnits="userSpaceOnUse">
      <path d="M0 14 L14 0 M-2 2 L2 -2 M12 16 L16 12" stroke="rgba(255,255,255,0.2)" stroke-width="0.6" fill="none"/>
    </pattern>
  </defs>
  <g clip-path="url(#c)">
    <rect width="${SIZE}" height="${SIZE}" fill="url(#mesh)"/>
    <path d="${d}" fill="rgba(180,200,195,0.35)"/>
  </g>
  <path d="${d}" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
</svg>`;

  fs.writeFileSync(`public/departments/${slug}.svg`, svg);
}

const manifest = `/** Auto-generated — run: npm run generate:departments */
export const departmentSlugs: Record<string, string> = ${JSON.stringify(slugs, null, 2)};

export const defaultDepartmentSlug = 'guatemala';

export function getDepartmentSlug(name: string): string {
  return departmentSlugs[name] ?? defaultDepartmentSlug;
}
`;

fs.writeFileSync('lib/departmentManifest.ts', manifest);

const countryProjection = geoMercator().fitExtent(EXTENT, collection);
const countryPath = geoPath(countryProjection)(collection);
if (countryPath) {
  const countrySvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Guatemala">
  <defs>
    <clipPath id="c"><path d="${countryPath}"/></clipPath>
    <pattern id="mesh" width="14" height="14" patternUnits="userSpaceOnUse">
      <path d="M0 14 L14 0 M-2 2 L2 -2 M12 16 L16 12" stroke="rgba(255,255,255,0.2)" stroke-width="0.6" fill="none"/>
    </pattern>
  </defs>
  <g clip-path="url(#c)">
    <rect width="${SIZE}" height="${SIZE}" fill="url(#mesh)"/>
    <path d="${countryPath}" fill="rgba(180,200,195,0.35)"/>
  </g>
  <path d="${countryPath}" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
</svg>`;
  fs.writeFileSync('public/guatemala-country.svg', countrySvg);
}

console.log('SVG generados:', Object.keys(slugs).length, '→ public/departments/');
if (countryPath) console.log('País → public/guatemala-country.svg');
