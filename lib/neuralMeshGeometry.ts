import * as THREE from 'three';

function seeded(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export interface NeuralMeshData {
  pointCount: number;
  spherePositions: Float32Array;
  lineIndices: Uint16Array;
  /** Offsets locales por vértice (dirección unitaria * escala) */
  localOffsets: Float32Array;
  /** Índice de micro-red (0..microNetCount-1) */
  microNetId: Uint8Array;
}

export function createNeuralMeshGeometry(
  radius = 2.05,
  pointCount = 200,
  microNetCount = 10,
  maxLinksPerNode = 2,
  linkDistanceRatio = 0.36,
): NeuralMeshData {
  const points: THREE.Vector3[] = [];
  const spherePositions = new Float32Array(pointCount * 3);
  const localOffsets = new Float32Array(pointCount * 3);
  const microNetId = new Uint8Array(pointCount);

  for (let i = 0; i < pointCount; i++) {
    const phi = Math.acos(-1 + (2 * i) / pointCount);
    const theta = Math.sqrt(pointCount * Math.PI) * phi;
    const jitter = (seeded(i * 3) - 0.5) * 0.22;

    const x = radius * Math.cos(theta) * Math.sin(phi) + jitter * 0.1;
    const y = radius * Math.sin(theta) * Math.sin(phi) + jitter * 0.1;
    const z = radius * Math.cos(phi) + jitter * 0.1;

    const vec = new THREE.Vector3(x, y, z);
    points.push(vec);

    spherePositions[i * 3] = x;
    spherePositions[i * 3 + 1] = y;
    spherePositions[i * 3 + 2] = z;

    const dir = vec.clone().normalize();
    const localScale = 0.12 + seeded(i * 5) * 0.22;
    localOffsets[i * 3] = dir.x * localScale;
    localOffsets[i * 3 + 1] = dir.y * localScale;
    localOffsets[i * 3 + 2] = dir.z * localScale;

    microNetId[i] = i % microNetCount;
  }

  const lineIndices: number[] = [];
  const maxDist = radius * linkDistanceRatio;
  for (let i = 0; i < pointCount; i++) {
    let connections = 0;
    for (let j = i + 1; j < pointCount; j++) {
      if (points[i].distanceTo(points[j]) < maxDist && connections < maxLinksPerNode) {
        lineIndices.push(i, j);
        connections++;
      }
    }
  }

  return {
    pointCount,
    spherePositions,
    lineIndices: new Uint16Array(lineIndices),
    localOffsets,
    microNetId,
  };
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
