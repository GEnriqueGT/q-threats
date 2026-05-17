import * as THREE from 'three';
import type { ConnectorEdge } from './neuralConnectors';
import { SPHERE_RADIUS } from './neuralConstants';

function seeded(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export interface BridgeMeshTemplate {
  pointCount: number;
  cols: number;
  rows: number;
  /** u ∈ [0,1] a lo largo del enlace; v perpendicular normalizado */
  restU: Float32Array;
  restV: Float32Array;
  anchorA: number[];
  anchorB: number[];
  lineIndices: Uint16Array;
}

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** Rejilla tipo media: extremos en u=0 y u=1 son los anclajes del enlace */
export function createBridgeMeshTemplate(seed = 0): BridgeMeshTemplate {
  const cols = 12;
  const rows = 7;
  const restU = new Float32Array(cols * rows);
  const restV = new Float32Array(cols * rows);
  const anchorA: number[] = [];
  const anchorB: number[] = [];
  const edges = new Set<string>();

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = cols > 1 ? c / (cols - 1) : 0;
      const vNorm = rows > 1 ? r / (rows - 1) : 0.5;
      const v = (vNorm - 0.5) * 2;
      // More organic neural-like bulge shape
      const bulge = Math.sin(u * Math.PI) * Math.pow(Math.sin(u * Math.PI), 0.3);
      const width = 0.18 + bulge * 0.22 + (seeded(seed + r * 5 + c) - 0.5) * 0.08;
      restU[idx] = u + (seeded(seed + 100 + idx) - 0.5) * 0.04;
      restV[idx] = v * width + (seeded(seed + 80 + idx) - 0.5) * 0.05;
      if (c === 0) anchorA.push(idx);
      if (c === cols - 1) anchorB.push(idx);
      idx++;
    }
  }

  const at = (r: number, c: number) => r * cols + c;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = at(r, c);
      // Horizontal connections (neural axon-like)
      if (c < cols - 1) edges.add(edgeKey(i, at(r, c + 1)));
      // Vertical connections (dendrite-like, sparser)
      if (r < rows - 1 && seeded(seed + r * 17 + c) > 0.35) {
        edges.add(edgeKey(i, at(r + 1, c)));
      }
      // Diagonal connections (synaptic-like, random)
      if (r < rows - 1 && c < cols - 1) {
        if (seeded(seed + r * 11 + c) > 0.42) {
          edges.add(edgeKey(i, at(r + 1, c + 1)));
        }
        if (seeded(seed + r * 13 + c + 7) > 0.48) {
          edges.add(edgeKey(i + 1, at(r + 1, c)));
        }
      }
      // Long-range skip connections (neural shortcuts)
      if (c < cols - 2 && seeded(seed + r * 23 + c) > 0.7) {
        edges.add(edgeKey(i, at(r, c + 2)));
      }
    }
  }

  const lineIndices: number[] = [];
  for (const key of edges) {
    const [a, b] = key.split('-').map(Number);
    lineIndices.push(a, b);
  }

  return {
    pointCount: cols * rows,
    cols,
    rows,
    restU,
    restV,
    anchorA,
    anchorB,
    lineIndices: new Uint16Array(lineIndices),
  };
}

export function createBridgeTemplates(count: number): BridgeMeshTemplate[] {
  const out: BridgeMeshTemplate[] = [];
  for (let i = 0; i < count; i++) out.push(createBridgeMeshTemplate(i * 47 + 13));
  return out;
}

export interface BridgeAnalysisData {
  pointCount: number;
  bridgeCount: number;
  pointsPerBridge: number;
  bridgeTemplates: BridgeMeshTemplate[];
  sphereLayout: Float32Array;
  sphereLineIndices: Uint16Array;
  lineIndices: Uint16Array;
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

function combineLineIndices(templates: BridgeMeshTemplate[]): Uint16Array {
  const all: number[] = [];
  let offset = 0;
  for (const tpl of templates) {
    for (let k = 0; k < tpl.lineIndices.length; k++) {
      all.push(offset + tpl.lineIndices[k]);
    }
    offset += tpl.pointCount;
  }
  return new Uint16Array(all);
}

export function createBridgeAnalysisData(
  bridgeCount: number,
  sphereRadius = SPHERE_RADIUS,
): BridgeAnalysisData {
  const bridgeTemplates = createBridgeTemplates(Math.max(bridgeCount, 1));
  const pointsPerBridge = bridgeTemplates[0].pointCount;
  const pointCount = bridgeCount * pointsPerBridge;
  const sphereLayout = fibonacciSphere(pointCount, sphereRadius);
  const sphereLineIndices = combineLineIndices(
    bridgeTemplates.slice(0, bridgeCount),
  );

  return {
    pointCount,
    bridgeCount,
    pointsPerBridge,
    bridgeTemplates: bridgeTemplates.slice(0, bridgeCount),
    sphereLayout,
    sphereLineIndices,
    lineIndices: sphereLineIndices,
  };
}

type ScreenAnchor = { id: string; x: number; y: number };

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _perp = new THREE.Vector3();
const _target = new THREE.Vector3();
const _delta = new THREE.Vector3();

/** Posición objetivo en el plano del enlace (malla estirada entre A y B) */
export function parametricBridgePosition(
  tpl: BridgeMeshTemplate,
  localIdx: number,
  anchorA: THREE.Vector3,
  anchorB: THREE.Vector3,
  out: THREE.Vector3,
): THREE.Vector3 {
  const u = tpl.restU[localIdx];
  const v = tpl.restV[localIdx];
  _dir.subVectors(anchorB, anchorA);
  const len = _dir.length() || 1;
  _perp.set(-_dir.y, _dir.x, 0);
  if (_perp.lengthSq() < 1e-8) _perp.set(0, 1, 0);
  else _perp.normalize();
  out.copy(anchorA);
  out.x += _dir.x * u + _perp.x * v * len;
  out.y += _dir.y * u + _perp.y * v * len;
  out.z += _dir.z * u + _perp.z * v * len;
  return out;
}

export class BridgeMeshSimulator {
  readonly pointCount: number;
  readonly positions: Float32Array;
  private readonly velocities: Float32Array;
  private readonly restLengths: Float32Array;
  private readonly baseRestLengths: Float32Array;
  private readonly bridgeSpanRest: Float32Array;
  private readonly templates: BridgeMeshTemplate[];
  private readonly pointsPerBridge: number;
  private readonly edgePairs: Array<[number, number]>;
  private readonly edgeBridgeIdx: Uint16Array;

  constructor(data: BridgeAnalysisData) {
    this.templates = data.bridgeTemplates;
    this.pointsPerBridge = data.pointsPerBridge;
    this.pointCount = data.pointCount;
    this.positions = new Float32Array(data.pointCount * 3);
    this.velocities = new Float32Array(data.pointCount * 3);
    const edgeCount = data.lineIndices.length / 2;
    this.restLengths = new Float32Array(edgeCount);
    this.baseRestLengths = new Float32Array(edgeCount);
    this.bridgeSpanRest = new Float32Array(data.bridgeTemplates.length);

    const pairs: Array<[number, number]> = [];
    const bridgeIdx: number[] = [];
    for (let b = 0; b < data.bridgeTemplates.length; b++) {
      const off = b * data.pointsPerBridge;
      const tpl = data.bridgeTemplates[b];
      for (let k = 0; k < tpl.lineIndices.length; k += 2) {
        pairs.push([off + tpl.lineIndices[k], off + tpl.lineIndices[k + 1]]);
        bridgeIdx.push(b);
      }
    }
    this.edgePairs = pairs;
    this.edgeBridgeIdx = new Uint16Array(bridgeIdx);
  }

  /** Coloca la malla estirada entre nodos (sin inercia) */
  snapToAnchors(
    anchors: ScreenAnchor[],
    edges: ConnectorEdge[],
    project: (x: number, y: number) => THREE.Vector3,
  ): void {
    const byId = new Map(anchors.map((a) => [a.id, a]));

    for (let b = 0; b < this.templates.length; b++) {
      const edge = edges[b];
      if (!edge) continue;
      const sa = byId.get(edge.from);
      const sb = byId.get(edge.to);
      if (!sa || !sb) continue;

      _a.copy(project(sa.x, sa.y));
      _b.copy(project(sb.x, sb.y));
      const tpl = this.templates[b];
      const base = b * this.pointsPerBridge;

      for (let p = 0; p < tpl.pointCount; p++) {
        const gi = base + p;
        parametricBridgePosition(tpl, p, _a, _b, _target);
        this.positions[gi * 3] = _target.x;
        this.positions[gi * 3 + 1] = _target.y;
        this.positions[gi * 3 + 2] = _target.z;
        this.velocities[gi * 3] = 0;
        this.velocities[gi * 3 + 1] = 0;
        this.velocities[gi * 3 + 2] = 0;
      }
    }

    this.captureRestState(anchors, edges, project);
  }

  private captureRestState(
    anchors: ScreenAnchor[],
    edges: ConnectorEdge[],
    project: (x: number, y: number) => THREE.Vector3,
  ): void {
    const byId = new Map(anchors.map((a) => [a.id, a]));
    for (let b = 0; b < this.templates.length; b++) {
      const edge = edges[b];
      let span = 1;
      if (edge) {
        const sa = byId.get(edge.from);
        const sb = byId.get(edge.to);
        if (sa && sb) {
          _a.copy(project(sa.x, sa.y));
          _b.copy(project(sb.x, sb.y));
          span = _a.distanceTo(_b) || 1;
        }
      }
      this.bridgeSpanRest[b] = span;
    }

    for (let e = 0; e < this.edgePairs.length; e++) {
      const [i, j] = this.edgePairs[e];
      _delta.set(
        this.positions[j * 3] - this.positions[i * 3],
        this.positions[j * 3 + 1] - this.positions[i * 3 + 1],
        this.positions[j * 3 + 2] - this.positions[i * 3 + 2],
      );
      const len = Math.max(_delta.length(), 0.02);
      this.baseRestLengths[e] = len;
      this.restLengths[e] = len;
    }
  }

  private scaleRestLengthsToSpans(
    anchors: ScreenAnchor[],
    edges: ConnectorEdge[],
    project: (x: number, y: number) => THREE.Vector3,
  ): void {
    const byId = new Map(anchors.map((a) => [a.id, a]));
    for (let b = 0; b < this.templates.length; b++) {
      const edge = edges[b];
      if (!edge) continue;
      const sa = byId.get(edge.from);
      const sb = byId.get(edge.to);
      if (!sa || !sb) continue;
      _a.copy(project(sa.x, sa.y));
      _b.copy(project(sb.x, sb.y));
      const span = _a.distanceTo(_b) || 1;
      const ratio = span / (this.bridgeSpanRest[b] || 1);
      for (let e = 0; e < this.edgePairs.length; e++) {
        if (this.edgeBridgeIdx[e] !== b) continue;
        this.restLengths[e] = this.baseRestLengths[e] * ratio;
      }
      this.bridgeSpanRest[b] = span;
    }
  }

  /** Malla elástica: anclajes en nodos, interior con resortes */
  step(
    anchors: ScreenAnchor[],
    edges: ConnectorEdge[],
    project: (x: number, y: number) => THREE.Vector3,
    dt: number,
    elastic = true,
  ): void {
    const byId = new Map(anchors.map((a) => [a.id, a]));
    // Parametros de fisica mas elasticos para efecto de rebote
    const kTarget = elastic ? 0.12 : 1; // Mas suave = mas rebote
    const kLink = elastic ? 0.55 : 1; // Resortes mas fuertes entre puntos
    const damping = elastic ? 0.88 : 0; // Menos amortiguamiento = mas rebote
    const substeps = elastic ? 3 : 1; // Mas substeps para estabilidad
    const subDt = dt / substeps;

    for (let sub = 0; sub < substeps; sub++) {
      for (let b = 0; b < this.templates.length; b++) {
        const edge = edges[b];
        if (!edge) continue;
        const sa = byId.get(edge.from);
        const sb = byId.get(edge.to);
        if (!sa || !sb) continue;

        _a.copy(project(sa.x, sa.y));
        _b.copy(project(sb.x, sb.y));
        const tpl = this.templates[b];
        const base = b * this.pointsPerBridge;
        const anchorSet = new Set([...tpl.anchorA, ...tpl.anchorB]);

        for (const ai of tpl.anchorA) {
          const gi = base + ai;
          this.positions[gi * 3] = _a.x;
          this.positions[gi * 3 + 1] = _a.y;
          this.positions[gi * 3 + 2] = _a.z;
          this.velocities[gi * 3] = 0;
          this.velocities[gi * 3 + 1] = 0;
          this.velocities[gi * 3 + 2] = 0;
        }
        for (const bi of tpl.anchorB) {
          const gi = base + bi;
          this.positions[gi * 3] = _b.x;
          this.positions[gi * 3 + 1] = _b.y;
          this.positions[gi * 3 + 2] = _b.z;
          this.velocities[gi * 3] = 0;
          this.velocities[gi * 3 + 1] = 0;
          this.velocities[gi * 3 + 2] = 0;
        }

        if (!elastic) continue;

        for (let p = 0; p < tpl.pointCount; p++) {
          if (anchorSet.has(p)) continue;
          const gi = base + p;
          parametricBridgePosition(tpl, p, _a, _b, _target);

          this.velocities[gi * 3] += (_target.x - this.positions[gi * 3]) * kTarget;
          this.velocities[gi * 3 + 1] += (_target.y - this.positions[gi * 3 + 1]) * kTarget;
          this.velocities[gi * 3 + 2] += (_target.z - this.positions[gi * 3 + 2]) * kTarget;
        }
      }

      for (let e = 0; e < this.edgePairs.length; e++) {
        const [i, j] = this.edgePairs[e];
        _delta.set(
          this.positions[j * 3] - this.positions[i * 3],
          this.positions[j * 3 + 1] - this.positions[i * 3 + 1],
          this.positions[j * 3 + 2] - this.positions[i * 3 + 2],
        );
        const dist = _delta.length();
        if (dist < 1e-6) continue;
        const stretch = (dist - this.restLengths[e]) / dist;
        const force = stretch * kLink;
        this.velocities[i * 3] += _delta.x * force;
        this.velocities[i * 3 + 1] += _delta.y * force;
        this.velocities[i * 3 + 2] += _delta.z * force;
        this.velocities[j * 3] -= _delta.x * force;
        this.velocities[j * 3 + 1] -= _delta.y * force;
        this.velocities[j * 3 + 2] -= _delta.z * force;
      }

      for (let i = 0; i < this.pointCount; i++) {
        const isAnchor = this.isAnchorIndex(i);
        if (isAnchor) continue;

        this.velocities[i * 3] *= damping;
        this.velocities[i * 3 + 1] *= damping;
        this.velocities[i * 3 + 2] *= damping;

        this.positions[i * 3] += this.velocities[i * 3] * subDt * 60;
        this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * subDt * 60;
        this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * subDt * 60;
      }
    }

    if (elastic) this.scaleRestLengthsToSpans(anchors, edges, project);
  }

  private isAnchorIndex(globalIdx: number): boolean {
    const bridgeIdx = Math.floor(globalIdx / this.pointsPerBridge);
    const local = globalIdx - bridgeIdx * this.pointsPerBridge;
    const tpl = this.templates[bridgeIdx];
    if (!tpl) return false;
    return tpl.anchorA.includes(local) || tpl.anchorB.includes(local);
  }
}

export function buildSplitToBridges(
  data: BridgeAnalysisData,
  t: number,
  anchors: ScreenAnchor[],
  edges: ConnectorEdge[],
  project: (x: number, y: number) => THREE.Vector3,
  out: Float32Array,
): void {
  const byId = new Map(anchors.map((a) => [a.id, a]));
  const sphere = data.sphereLayout;
  const per = data.pointsPerBridge;

  for (let b = 0; b < data.bridgeTemplates.length; b++) {
    const edge = edges[b];
    const tpl = data.bridgeTemplates[b];
    const base = b * per;

    let sx = 0;
    let sy = 0;
    let sz = 0;
    for (let p = 0; p < per; p++) {
      const i = base + p;
      sx += sphere[i * 3];
      sy += sphere[i * 3 + 1];
      sz += sphere[i * 3 + 2];
    }
    const inv = 1 / per;
    sx *= inv;
    sy *= inv;
    sz *= inv;

    let tx = sx;
    let ty = sy;
    let tz = sz;

    if (edge) {
      const sa = byId.get(edge.from);
      const sb = byId.get(edge.to);
      if (sa && sb) {
        _a.copy(project(sa.x, sa.y));
        _b.copy(project(sb.x, sb.y));
        parametricBridgePosition(tpl, Math.floor(tpl.pointCount / 2), _a, _b, _target);
        tx = _target.x;
        ty = _target.y;
        tz = _target.z;
      }
    }

    const cx = sx + (tx - sx) * t;
    const cy = sy + (ty - sy) * t;
    const cz = sz + (tz - sz) * t;

    for (let p = 0; p < tpl.pointCount; p++) {
      const i = base + p;
      const ox = sphere[i * 3] - sx;
      const oy = sphere[i * 3 + 1] - sy;
      const oz = sphere[i * 3 + 2] - sz;

      let targetX = cx + ox * (1 - t * 0.9);
      let targetY = cy + oy * (1 - t * 0.9);
      let targetZ = cz + oz * (1 - t * 0.9);

      if (edge && t > 0.35) {
        const sa = byId.get(edge.from);
        const sb = byId.get(edge.to);
        if (sa && sb) {
          _a.copy(project(sa.x, sa.y));
          _b.copy(project(sb.x, sb.y));
          const blend = (t - 0.35) / 0.65;
          parametricBridgePosition(tpl, p, _a, _b, _target);
          targetX += (_target.x - targetX) * blend;
          targetY += (_target.y - targetY) * blend;
          targetZ += (_target.z - targetZ) * blend;
        }
      }

      out[i * 3] = targetX;
      out[i * 3 + 1] = targetY;
      out[i * 3 + 2] = targetZ;
    }
  }
}
