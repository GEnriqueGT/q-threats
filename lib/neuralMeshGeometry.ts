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

/** Crea un disco plano con red neural dentro */
export function createFlatDiscMesh(
  radius = 3.5,
  pointCount = 280,
  maxLinksPerNode = 3,
  linkDistanceRatio = 0.28,
): NeuralMeshData {
  const points: THREE.Vector3[] = [];
  const spherePositions = new Float32Array(pointCount * 3);
  const localOffsets = new Float32Array(pointCount * 3);
  const microNetId = new Uint8Array(pointCount);

  // Distribuir puntos en un disco usando espiral de Fermat
  for (let i = 0; i < pointCount; i++) {
    const angle = i * 2.399963; // Golden angle
    const r = radius * Math.sqrt(i / pointCount) * 0.95;
    
    // Agregar jitter para aspecto mas organico
    const jitterR = (seeded(i * 7) - 0.5) * 0.15;
    const jitterAngle = (seeded(i * 11) - 0.5) * 0.2;
    
    const finalR = r + jitterR;
    const finalAngle = angle + jitterAngle;
    
    const x = finalR * Math.cos(finalAngle);
    const y = finalR * Math.sin(finalAngle);
    const z = (seeded(i * 13) - 0.5) * 0.08; // Ligera variacion en Z para profundidad

    const vec = new THREE.Vector3(x, y, z);
    points.push(vec);

    spherePositions[i * 3] = x;
    spherePositions[i * 3 + 1] = y;
    spherePositions[i * 3 + 2] = z;

    // Offset radial para animaciones
    const dir = new THREE.Vector3(x, y, 0).normalize();
    const localScale = 0.08 + seeded(i * 5) * 0.12;
    localOffsets[i * 3] = dir.x * localScale;
    localOffsets[i * 3 + 1] = dir.y * localScale;
    localOffsets[i * 3 + 2] = 0;

    microNetId[i] = i % 8;
  }

  // Crear conexiones tipo red neural
  const lineIndices: number[] = [];
  const maxDist = radius * linkDistanceRatio;
  
  for (let i = 0; i < pointCount; i++) {
    let connections = 0;
    const candidates: { idx: number; dist: number }[] = [];
    
    for (let j = i + 1; j < pointCount; j++) {
      const dist = points[i].distanceTo(points[j]);
      if (dist < maxDist) {
        candidates.push({ idx: j, dist });
      }
    }
    
    // Ordenar por distancia y tomar los mas cercanos
    candidates.sort((a, b) => a.dist - b.dist);
    
    for (const c of candidates) {
      if (connections >= maxLinksPerNode) break;
      // Probabilidad de conexion basada en distancia
      const prob = 1 - (c.dist / maxDist) * 0.5;
      if (seeded(i * 100 + c.idx) < prob) {
        lineIndices.push(i, c.idx);
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

export interface CircleNetworkData {
  /** Posiciones de todos los puntos (nodos de anclaje en el borde + puntos internos de la red) */
  positions: Float32Array;
  /** Indices de lineas para dibujar la red */
  lineIndices: Uint16Array;
  /** Numero total de puntos */
  pointCount: number;
  /** Numero de puntos de anclaje (nodos en el borde) */
  anchorCount: number;
  /** Indices de los puntos de anclaje */
  anchorIndices: number[];
  /** Radio base del circulo */
  radius: number;
}

/** 
 * Crea una red circular donde los nodos de entidad estan en la circunferencia
 * y la red neural llena el interior conectando los nodos
 */
export function createCircleNetworkMesh(
  nodeCount: number,
  radius = 3.0,
  internalPointCount = 150,
): CircleNetworkData {
  const totalPoints = nodeCount + internalPointCount;
  const positions = new Float32Array(totalPoints * 3);
  const anchorIndices: number[] = [];
  const points: THREE.Vector3[] = [];

  // 1. Posicionar nodos de anclaje en la circunferencia
  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * Math.PI * 2 - Math.PI / 2; // Empezar desde arriba
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    const z = 0;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    
    anchorIndices.push(i);
    points.push(new THREE.Vector3(x, y, z));
  }

  // 2. Llenar el interior con puntos de la red neural
  for (let i = 0; i < internalPointCount; i++) {
    const idx = nodeCount + i;
    
    // Distribucion usando espiral de Fermat pero sin llegar al borde
    const angle = i * 2.399963; // Golden angle
    const r = radius * Math.sqrt(i / internalPointCount) * 0.85; // 85% del radio para no llegar al borde
    
    // Jitter para aspecto organico
    const jitterR = (seeded(i * 7) - 0.5) * 0.12;
    const jitterAngle = (seeded(i * 11) - 0.5) * 0.15;
    
    const finalR = Math.max(0.1, r + jitterR);
    const finalAngle = angle + jitterAngle;
    
    const x = finalR * Math.cos(finalAngle);
    const y = finalR * Math.sin(finalAngle);
    const z = (seeded(i * 13) - 0.5) * 0.05;

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    
    points.push(new THREE.Vector3(x, y, z));
  }

  // 3. Crear conexiones de la red neural
  const lineIndices: number[] = [];
  const maxDist = radius * 0.45;
  
  // Conectar nodos de anclaje entre si a traves del interior
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      // Conectar nodos adyacentes en el borde
      if (j === i + 1 || (i === 0 && j === nodeCount - 1)) {
        lineIndices.push(i, j);
      }
    }
  }
  
  // Conectar nodos de anclaje con puntos internos cercanos
  for (let i = 0; i < nodeCount; i++) {
    let connections = 0;
    for (let j = nodeCount; j < totalPoints && connections < 4; j++) {
      const dist = points[i].distanceTo(points[j]);
      if (dist < maxDist * 0.7) {
        lineIndices.push(i, j);
        connections++;
      }
    }
  }
  
  // Conectar puntos internos entre si
  for (let i = nodeCount; i < totalPoints; i++) {
    let connections = 0;
    for (let j = i + 1; j < totalPoints && connections < 3; j++) {
      const dist = points[i].distanceTo(points[j]);
      if (dist < maxDist * 0.5 && seeded(i * 100 + j) > 0.3) {
        lineIndices.push(i, j);
        connections++;
      }
    }
  }

  return {
    positions,
    lineIndices: new Uint16Array(lineIndices),
    pointCount: totalPoints,
    anchorCount: nodeCount,
    anchorIndices,
    radius,
  };
}

/**
 * Actualiza las posiciones de la red basado en las posiciones de los nodos de anclaje
 * Aplica deformacion elastica al interior
 */
export function updateCircleNetworkPositions(
  data: CircleNetworkData,
  anchorPositions: { x: number; y: number }[],
  centerX: number,
  centerY: number,
  outPositions: Float32Array,
): void {
  const { anchorCount, pointCount, radius } = data;
  
  // Copiar posiciones originales
  outPositions.set(data.positions);
  
  // Calcular desplazamientos de los anclajes respecto a sus posiciones originales
  const displacements: { dx: number; dy: number }[] = [];
  for (let i = 0; i < anchorCount; i++) {
    const origX = data.positions[i * 3];
    const origY = data.positions[i * 3 + 1];
    
    // Posicion del ancla en coordenadas locales (relativas al centro)
    const anchorX = (anchorPositions[i]?.x ?? centerX) - centerX;
    const anchorY = (anchorPositions[i]?.y ?? centerY) - centerY;
    
    // Normalizar a escala de la malla (el radio de la malla vs el radio en pixeles)
    const scale = radius / 200; // Asumiendo ~200px de radio en pantalla
    const targetX = anchorX * scale;
    const targetY = anchorY * scale;
    
    displacements.push({
      dx: targetX - origX,
      dy: targetY - origY,
    });
    
    // Actualizar posicion del anclaje
    outPositions[i * 3] = targetX;
    outPositions[i * 3 + 1] = targetY;
  }
  
  // Deformar puntos internos basado en la influencia de los anclajes cercanos
  for (let i = anchorCount; i < pointCount; i++) {
    const px = data.positions[i * 3];
    const py = data.positions[i * 3 + 1];
    
    let totalWeight = 0;
    let dx = 0;
    let dy = 0;
    
    // Calcular influencia ponderada de cada anclaje
    for (let j = 0; j < anchorCount; j++) {
      const ax = data.positions[j * 3];
      const ay = data.positions[j * 3 + 1];
      
      const dist = Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
      // Peso inversamente proporcional a la distancia (con suavizado)
      const weight = 1 / (1 + dist * dist * 0.5);
      
      dx += displacements[j].dx * weight;
      dy += displacements[j].dy * weight;
      totalWeight += weight;
    }
    
    if (totalWeight > 0) {
      outPositions[i * 3] = px + dx / totalWeight;
      outPositions[i * 3 + 1] = py + dy / totalWeight;
    }
  }
}
