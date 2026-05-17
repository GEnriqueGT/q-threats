export interface Point {
  x: number;
  y: number;
}

export interface AxonLink {
  id: string;
  from: Point;
  to: Point;
}

export interface AxonFiber {
  id: string;
  path: string;
  opacity: number;
  width: number;
  synapses: Point[];
}

function seeded(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function quadraticPoint(
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  t: number,
): Point {
  const u = 1 - t;
  return {
    x: u * u * x1 + 2 * u * t * cx + t * t * x2,
    y: u * u * y1 + 2 * u * t * cy + t * t * y2,
  };
}

function buildPath(x1: number, y1: number, x2: number, y2: number, bend: number, seed: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const w = (seeded(seed) - 0.5) * bend * len;
  const cx = mx + nx * w;
  const cy = my + ny * w;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

function synapsesOnPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bend: number,
  seed: number,
  count: number,
): Point[] {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const w = (seeded(seed) - 0.5) * bend * len;
  const cx = mx + nx * w;
  const cy = my + ny * w;

  const pts: Point[] = [];
  for (let i = 0; i < count; i++) {
    const t = 0.12 + seeded(seed + i * 3) * 0.76;
    pts.push(quadraticPoint(x1, y1, cx, cy, x2, y2, t));
  }
  return pts;
}

/** easeOutCubic */
export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

/** Posiciones objetivo de nodos antes de que arranque la simulación */
export function buildNodeLayout(
  count: number,
  size: { w: number; h: number },
  ids: string[],
): Record<string, Point> {
  const cx = size.w / 2;
  const cy = size.h / 2;
  const spread = Math.min(size.w, size.h) * 0.26;
  const out: Record<string, Point> = {};
  ids.forEach((id, i) => {
    const angle = (i / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
    out[id] = {
      x: cx + Math.cos(angle) * spread,
      y: cy + Math.sin(angle) * spread,
    };
  });
  return out;
}

/** Axones radiales al “explotar” la esfera */
export function buildScatterFibers(
  center: Point,
  scatterRadius: number,
  expand: number,
  count: number,
): AxonFiber[] {
  const fibers: AxonFiber[] = [];
  const reach = scatterRadius * expand;

  for (let i = 0; i < count; i++) {
    const seed = i * 13 + 7;
    const angle = seeded(seed) * Math.PI * 2;
    const r = reach * (0.25 + seeded(seed + 1) * 0.75);
    const x2 = center.x + Math.cos(angle) * r;
    const y2 = center.y + Math.sin(angle) * r;
    const x1 = center.x + Math.cos(angle) * r * 0.08;
    const y1 = center.y + Math.sin(angle) * r * 0.08;
    const bend = 0.18 + seeded(seed + 2) * 0.35;

    fibers.push({
      id: `scatter-${i}`,
      path: buildPath(x1, y1, x2, y2, bend, seed),
      opacity: 0.12 + seeded(seed + 3) * 0.4,
      width: 0.35 + seeded(seed + 4) * 0.75,
      synapses:
        expand > 0.45
          ? [quadraticPoint(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2, x2, y2, 0.35 + seeded(seed + 5) * 0.3)]
          : [],
    });
  }

  return fibers;
}

/** Malla densa en el núcleo (estilo red neuronal del mockup) */
export function buildNucleusMesh(
  meshCenter: Point,
  center: Point,
  anchors: Point[],
  scatterRadius: number,
  progress: number,
  strandCount: number,
): AxonFiber[] {
  const eased = easeOut(Math.min(1, Math.max(0, progress)));
  const fibers: AxonFiber[] = [];
  if (anchors.length < 2) return fibers;

  for (let i = 0; i < strandCount; i++) {
    const seed = i * 29 + 11;
    const ai = Math.floor(seeded(seed) * anchors.length);
    let bi = Math.floor(seeded(seed + 1) * anchors.length);
    if (bi === ai) bi = (bi + 1) % anchors.length;
    const a = anchors[ai];
    const b = anchors[bi];

    const angle1 = seeded(seed + 2) * Math.PI * 2;
    const angle2 = seeded(seed + 3) * Math.PI * 2;
    const r1 = scatterRadius * (0.08 + seeded(seed + 4) * 0.35) * (1 - eased * 0.9);
    const r2 = scatterRadius * (0.1 + seeded(seed + 5) * 0.4) * (1 - eased * 0.85);

    const sx1 = center.x + Math.cos(angle1) * r1;
    const sy1 = center.y + Math.sin(angle1) * r1;
    const sx2 = center.x + Math.cos(angle2) * r2;
    const sy2 = center.y + Math.sin(angle2) * r2;

    const via = meshCenter;
    const tx1 = lerpPoint(a, via, 0.35 + seeded(seed + 6) * 0.25).x;
    const ty1 = lerpPoint(a, via, 0.35 + seeded(seed + 6) * 0.25).y;
    const tx2 = lerpPoint(b, via, 0.35 + seeded(seed + 7) * 0.25).x;
    const ty2 = lerpPoint(b, via, 0.35 + seeded(seed + 7) * 0.25).y;

    const x1 = lerp(sx1, tx1, eased);
    const y1 = lerp(sy1, ty1, eased);
    const x2 = lerp(sx2, tx2, eased);
    const y2 = lerp(sy2, ty2, eased);

    const bend = 0.2 + seeded(seed + 8) * 0.45;
    fibers.push({
      id: `nucleus-${i}`,
      path: buildPath(x1, y1, x2, y2, bend, seed),
      opacity: 0.06 + seeded(seed + 9) * 0.28,
      width: 0.35 + seeded(seed + 10) * 0.65,
      synapses: eased > 0.4 ? synapsesOnPath(x1, y1, x2, y2, bend, seed + 11, 1) : [],
    });
  }

  return fibers;
}

export function buildAxonFibers(
  link: AxonLink,
  center: Point,
  meshCenter: Point,
  scatterRadius: number,
  progress: number,
  fibersPerLink: number,
): AxonFiber[] {
  const eased = easeOut(Math.min(1, Math.max(0, progress)));
  const fibers: AxonFiber[] = [];
  const routeViaMesh = link.id.startsWith('hub-') || link.id.includes('acquisition');

  for (let i = 0; i < fibersPerLink; i++) {
    const seed = link.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + i * 17;

    const angle1 = seeded(seed) * Math.PI * 2;
    const angle2 = seeded(seed + 1) * Math.PI * 2;
    const r1 = scatterRadius * (0.15 + seeded(seed + 2) * 0.85);
    const r2 = scatterRadius * (0.2 + seeded(seed + 3) * 0.9);

    const sx1 = center.x + Math.cos(angle1) * r1 * (1 - eased * 0.88);
    const sy1 = center.y + Math.sin(angle1) * r1 * (1 - eased * 0.88);
    const sx2 = center.x + Math.cos(angle2) * r2 * (1 - eased * 0.82);
    const sy2 = center.y + Math.sin(angle2) * r2 * (1 - eased * 0.82);

    let tx1 = link.from.x;
    let ty1 = link.from.y;
    let tx2 = link.to.x;
    let ty2 = link.to.y;

    if (routeViaMesh && eased > 0.08) {
      const w = 0.42 + seeded(seed + 12) * 0.35;
      const mid = lerpPoint(
        lerpPoint(link.from, meshCenter, w),
        lerpPoint(meshCenter, link.to, w),
        0.5 + (seeded(seed + 13) - 0.5) * 0.2,
      );
      const tMid = eased * 0.55;
      tx1 = lerp(link.from.x, mid.x, tMid);
      ty1 = lerp(link.from.y, mid.y, tMid);
      tx2 = lerp(mid.x, link.to.x, eased);
      ty2 = lerp(mid.y, link.to.y, eased);
    }

    const x1 = sx1 + (tx1 - sx1) * eased;
    const y1 = sy1 + (ty1 - sy1) * eased;
    const x2 = sx2 + (tx2 - sx2) * eased;
    const y2 = sy2 + (ty2 - sy2) * eased;

    const bend = 0.14 + seeded(seed + 4) * 0.32;
    const path = buildPath(x1, y1, x2, y2, bend, seed);
    const synapseCount = eased > 0.5 ? (routeViaMesh ? 3 : 2) : 0;
    const synapses =
      synapseCount > 0 ? synapsesOnPath(x1, y1, x2, y2, bend, seed + 5, synapseCount) : [];

    fibers.push({
      id: `${link.id}-${i}`,
      path,
      opacity: 0.1 + seeded(seed + 6) * 0.38,
      width: 0.45 + seeded(seed + 7) * 1.05,
      synapses,
    });
  }

  return fibers;
}
