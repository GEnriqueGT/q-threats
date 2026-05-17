import * as THREE from 'three';
import { SPHERE_RADIUS } from './neuralConstants';

/** Mismo conteo en todos los clusters para morphing entre fases */
export const CLUSTER_MESH_POINTS = 20;

function seeded(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function addEdge(edges: Set<string>, a: number, b: number) {
  if (a !== b) edges.add(edgeKey(a, b));
}

function getDegrees(n: number, edges: Set<string>): number[] {
  const deg = new Array(n).fill(0);
  for (const key of edges) {
    const [a, b] = key.split('-').map(Number);
    deg[a]++;
    deg[b]++;
  }
  return deg;
}

/** Cierra la malla: ningún vértice suelto (grado mínimo 2) */
function ensureClosedMesh(
  pts: THREE.Vector2[],
  edges: Set<string>,
  maxExtra = 24,
): void {
  const n = pts.length;
  let added = 0;
  while (added < maxExtra) {
    const deg = getDegrees(n, edges);
    let worst = -1;
    for (let i = 0; i < n; i++) {
      if (deg[i] < 2 && (worst < 0 || deg[i] < deg[worst])) worst = i;
    }
    if (worst < 0) break;

    let bestJ = -1;
    let bestD = Infinity;
    for (let j = 0; j < n; j++) {
      if (worst === j) continue;
      const key = edgeKey(worst, j);
      if (edges.has(key)) continue;
      const d = pts[worst].distanceTo(pts[j]);
      if (d < bestD) {
        bestD = d;
        bestJ = j;
      }
    }
    if (bestJ < 0) break;
    addEdge(edges, worst, bestJ);
    added++;
  }
}

function edgesToIndices(edges: Set<string>): Uint16Array {
  const lineIndices: number[] = [];
  for (const key of edges) {
    const [a, b] = key.split('-').map(Number);
    lineIndices.push(a, b);
  }
  return new Uint16Array(lineIndices);
}

function finalizeTemplate(pts: THREE.Vector2[], edges: Set<string>): ClusterTemplate {
  ensureClosedMesh(pts, edges);
  const pointCount = pts.length;
  const positions = new Float32Array(pointCount * 3);
  const deg = getDegrees(pointCount, edges);
  const sizes = new Float32Array(pointCount);

  for (let i = 0; i < pointCount; i++) {
    positions[i * 3] = pts[i].x;
    positions[i * 3 + 1] = pts[i].y;
    positions[i * 3 + 2] = (seeded(i * 17 + pointCount) - 0.5) * 0.06;
    sizes[i] = deg[i] >= 4 ? 0.058 : deg[i] >= 3 ? 0.048 : 0.04;
  }

  return {
    pointCount,
    positions,
    sizes,
    lineIndices: edgesToIndices(edges),
  };
}

/** Rejilla rectangular con diagonales alternas (malla de quads/triángulos) */
function buildQuadLatticeMesh(seed: number): ClusterTemplate {
  const cols = 5;
  const rows = 4;
  const spacing = 0.19;
  const pts: THREE.Vector2[] = [];
  const edges = new Set<string>();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const jx = (seeded(seed + r * cols + c) - 0.5) * 0.1;
      const jy = (seeded(seed + 50 + r * cols + c) - 0.5) * 0.1;
      const x = (c - (cols - 1) / 2) * spacing + jx;
      const y = (r - (rows - 1) / 2) * spacing * 0.92 + jy;
      pts.push(new THREE.Vector2(x, y));
    }
  }

  const idx = (r: number, c: number) => r * cols + c;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = idx(r, c);
      if (c < cols - 1) addEdge(edges, i, idx(r, c + 1));
      if (r < rows - 1) addEdge(edges, i, idx(r + 1, c));
      if (r < rows - 1 && c < cols - 1) {
        const flip = seeded(seed + r * 7 + c * 11) > 0.5;
        if (flip) {
          addEdge(edges, i, idx(r + 1, c + 1));
        } else {
          addEdge(edges, idx(r, c + 1), idx(r + 1, c));
        }
      }
    }
  }

  return finalizeTemplate(pts, edges);
}

/** Dos anillos hexagonales entrelazados (malla cerrada, sin radios al centro) */
function buildHexRingMesh(seed: number): ClusterTemplate {
  const pts: THREE.Vector2[] = [];
  const edges = new Set<string>();
  const inner: number[] = [];
  const outer: number[] = [];

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + seeded(seed + i) * 0.2;
    const ri = 0.28 + seeded(seed + 10 + i) * 0.06;
    const ro = 0.62 + seeded(seed + 20 + i) * 0.1;
    inner.push(pts.length);
    pts.push(new THREE.Vector2(Math.cos(a) * ri, Math.sin(a) * ri * 0.94));
    outer.push(pts.length);
    pts.push(new THREE.Vector2(Math.cos(a + 0.08) * ro, Math.sin(a + 0.08) * ro * 0.9));
  }

  for (let i = 0; i < 6; i++) {
    const n = (i + 1) % 6;
    addEdge(edges, inner[i], inner[n]);
    addEdge(edges, outer[i], outer[n]);
    addEdge(edges, inner[i], outer[i]);
    addEdge(edges, inner[i], outer[n]);
  }

  const fillers = 8;
  for (let f = 0; f < fillers; f++) {
    const a = (f / fillers) * Math.PI * 2 + seeded(seed + 80 + f) * 0.5;
    const r = 0.42 + seeded(seed + 90 + f) * 0.14;
    const fi = pts.length;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r * 0.92));

    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < inner.length + outer.length; i++) {
      const ref = i < 6 ? inner[i] : outer[i - 6];
      const d = pts[fi].distanceTo(pts[ref]);
      if (d < bestD) {
        bestD = d;
        best = ref;
      }
    }
    addEdge(edges, fi, best);
    const second = (best + 3) % 12;
    const ref2 = second < 6 ? inner[second] : outer[second - 6];
    addEdge(edges, fi, ref2);
  }

  return finalizeTemplate(pts, edges);
}

/** Retícula triangular (cada vértice en intersección de 3+ aristas) */
function buildTriLatticeMesh(seed: number): ClusterTemplate {
  const pts: THREE.Vector2[] = [];
  const edges = new Set<string>();
  const rowCounts = [6, 5, 4, 3, 2];
  const step = 0.21;

  for (let r = 0; r < rowCounts.length; r++) {
    const count = rowCounts[r];
    const off = ((Math.max(...rowCounts) - count) * step) / 2;
    for (let c = 0; c < count; c++) {
      const jx = (seeded(seed + r * 10 + c) - 0.5) * 0.09;
      const jy = (seeded(seed + 30 + r * 10 + c) - 0.5) * 0.09;
      const x = off + c * step + jx;
      const y = (r - (rowCounts.length - 1) / 2) * step * 0.86 + jy;
      pts.push(new THREE.Vector2(x, y));
    }
  }

  let cursor = 0;
  for (let r = 0; r < rowCounts.length - 1; r++) {
    const count = rowCounts[r];
    const nextCount = rowCounts[r + 1];
    for (let c = 0; c < count; c++) {
      const i = cursor + c;
      if (c < count - 1) addEdge(edges, i, i + 1);
      if (c < nextCount) addEdge(edges, i, cursor + count + c);
      if (c > 0 && c - 1 < nextCount) addEdge(edges, i, cursor + count + c - 1);
    }
    cursor += count;
  }

  return finalizeTemplate(pts, edges);
}

/** Puntos orgánicos + grafo de Gabriel → malla irregular sin vértices sueltos */
function buildGabrielMesh(seed: number): ClusterTemplate {
  const n = CLUSTER_MESH_POINTS;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + seeded(seed + i * 3) * 0.85;
    const r = 0.22 + seeded(seed + i * 5 + 1) * 0.48;
    const squash = 0.78 + seeded(seed + i * 7) * 0.28;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r * squash));
  }

  const edges = new Set<string>();
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const mx = (pts[i].x + pts[j].x) * 0.5;
      const my = (pts[i].y + pts[j].y) * 0.5;
      const diam = pts[i].distanceTo(pts[j]);
      const radius = diam * 0.5;
      let empty = true;
      for (let k = 0; k < n; k++) {
        if (k === i || k === j) continue;
        if (pts[k].distanceTo(new THREE.Vector2(mx, my)) < radius - 0.02) {
          empty = false;
          break;
        }
      }
      if (empty) addEdge(edges, i, j);
    }
  }

  return finalizeTemplate(pts, edges);
}

/** Diamante: dos cadenas paralelas con travesaños y diagonales */
function buildDiamondMesh(seed: number): ClusterTemplate {
  const pts: THREE.Vector2[] = [];
  const edges = new Set<string>();
  const perChain = 10;

  for (let i = 0; i < perChain; i++) {
    const t = i / (perChain - 1);
    const wave = Math.sin(t * Math.PI * 2 + seeded(seed) * 4) * 0.12;
    pts.push(new THREE.Vector2(-0.55 + t * 1.1, 0.34 + wave + (seeded(seed + i) - 0.5) * 0.08));
    pts.push(new THREE.Vector2(-0.55 + t * 1.1, -0.34 - wave + (seeded(seed + 40 + i) - 0.5) * 0.08));
  }

  for (let i = 0; i < perChain - 1; i++) {
    const topA = i * 2;
    const topB = (i + 1) * 2;
    const botA = i * 2 + 1;
    const botB = (i + 1) * 2 + 1;
    addEdge(edges, topA, topB);
    addEdge(edges, botA, botB);
    addEdge(edges, topA, botA);
    const diag = seeded(seed + i * 13) > 0.5;
    if (diag) {
      addEdge(edges, topA, botB);
      addEdge(edges, topB, botA);
    } else {
      addEdge(edges, topA, botB);
    }
  }

  return finalizeTemplate(pts, edges);
}

export interface ClusterTemplate {
  pointCount: number;
  positions: Float32Array;
  sizes: Float32Array;
  lineIndices: Uint16Array;
}

const MESH_BUILDERS = [
  buildQuadLatticeMesh,
  buildHexRingMesh,
  buildTriLatticeMesh,
  buildGabrielMesh,
  buildDiamondMesh,
] as const;

/** Mini malla/reja cerrada; `seed` define variación de forma */
export function createClusterTemplate(seed = 0): ClusterTemplate {
  const variant = Math.floor(seeded(seed * 0.71) * MESH_BUILDERS.length);
  return MESH_BUILDERS[variant](seed + variant * 97);
}

export function createClusterTemplates(count: number): ClusterTemplate[] {
  const templates: ClusterTemplate[] = [];
  for (let c = 0; c < count; c++) {
    templates.push(createClusterTemplate(c * 31 + 11));
  }
  return templates;
}

export function clusterRotation(seed: number): number {
  return (seeded(seed) - 0.5) * Math.PI * 1.35;
}

export function createCumulusCenters(count: number, spread = 2.05): THREE.Vector3[] {
  const centers: THREE.Vector3[] = [];
  for (let c = 0; c < count; c++) {
    const a = (c / count) * Math.PI * 2 + seeded(c * 17) * 1.1;
    const r = spread * (0.42 + seeded(c * 21) * 0.58);
    centers.push(
      new THREE.Vector3(
        Math.cos(a) * r,
        Math.sin(a) * r * 0.72 + (seeded(c * 27) - 0.5) * 0.35,
        (seeded(c * 31) - 0.5) * 0.22,
      ),
    );
  }
  return centers;
}

export interface SplitMeshData {
  pointCount: number;
  clusterCount: number;
  pointsPerCluster: number;
  clusterTemplates: ClusterTemplate[];
  sphereLayout: Float32Array;
  sphereLineIndices: Uint16Array;
  splitPositions: Float32Array;
  splitSizes: Float32Array;
  splitLineIndices: Uint16Array;
}

function fibonacciSphere(count: number, radius: number): Float32Array {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    out[i * 3] = radius * Math.cos(theta) * Math.sin(phi);
    out[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
    out[i * 3 + 2] = radius * Math.cos(phi);
  }
  return out;
}

function buildSphereLines(positions: Float32Array, count: number, maxDist: number): Uint16Array {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    pts.push(
      new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]),
    );
  }
  const edges = new Set<string>();
  for (let i = 0; i < count; i++) {
    let links = 0;
    for (let j = i + 1; j < count; j++) {
      if (pts[i].distanceTo(pts[j]) < maxDist && links < 4) {
        addEdge(edges, i, j);
        links++;
      }
    }
  }
  return edgesToIndices(edges);
}

export function createSplitMeshData(
  sphereRadius = SPHERE_RADIUS,
  clusterCount = 5,
): SplitMeshData {
  const clusterTemplates = createClusterTemplates(clusterCount);
  const pointsPerCluster = clusterTemplates[0].pointCount;
  const totalPoints = clusterCount * pointsPerCluster;
  const centers = createCumulusCenters(clusterCount, 1.2);
  const clusterScale = 0.5;

  const sphereLayout = fibonacciSphere(totalPoints, sphereRadius);
  const sphereLineIndices = buildSphereLines(sphereLayout, totalPoints, sphereRadius * 0.34);

  const splitPositions = new Float32Array(totalPoints * 3);
  const splitSizes = new Float32Array(totalPoints);
  const splitLineIndices: number[] = [];

  let globalIdx = 0;
  for (let c = 0; c < clusterCount; c++) {
    const template = clusterTemplates[c];
    const center = centers[c];
    const rot = clusterRotation(c * 19 + 5);
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    for (let p = 0; p < pointsPerCluster; p++) {
      const lx = template.positions[p * 3];
      const ly = template.positions[p * 3 + 1];
      const lz = template.positions[p * 3 + 2];
      const base = globalIdx * 3;
      splitPositions[base] = center.x + (lx * cos - ly * sin) * clusterScale;
      splitPositions[base + 1] = center.y + (lx * sin + ly * cos) * clusterScale;
      splitPositions[base + 2] = center.z + lz * clusterScale;
      splitSizes[globalIdx] = template.sizes[p];
      globalIdx++;
    }

    const offset = c * pointsPerCluster;
    for (let k = 0; k < template.lineIndices.length; k++) {
      splitLineIndices.push(offset + template.lineIndices[k]);
    }
  }

  return {
    pointCount: totalPoints,
    clusterCount,
    pointsPerCluster,
    clusterTemplates,
    sphereLayout,
    sphereLineIndices,
    splitPositions,
    splitSizes,
    splitLineIndices: new Uint16Array(splitLineIndices),
  };
}
