'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createNeuralMeshGeometry, easeInOutCubic } from '@/lib/neuralMeshGeometry';
import {
  BridgeMeshSimulator,
  buildSplitToBridges,
  createBridgeAnalysisData,
} from '@/lib/bridgeMesh';
import type { ConnectorEdge } from '@/lib/neuralConnectors';
import { SPHERE_POINT_COUNT, SPHERE_RADIUS } from '@/lib/neuralConstants';
import { getNeuralPointTexture } from '@/lib/neuralPointTexture';

export type MeshPhase = 'idle-left' | 'transit' | 'split' | 'gather' | 'ready';

export interface MeshAnchor {
  id: string;
  x: number;
  y: number;
  weight: number;
}

interface MorphingNeuralMeshProps {
  phase: MeshPhase;
  size: { w: number; h: number };
  anchors: MeshAnchor[];
  sphereFocus?: { x: number; y: number } | null;
  connectorEdges?: ConnectorEdge[];
}

export const MESH_TRANSIT_MS = 850;
export const MESH_SPLIT_MS = 1200;
export const MESH_GATHER_MS = 2100;

const _ndc = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _focusWorld = new THREE.Vector3();
const _centerWorld = new THREE.Vector3();
const _groupPos = new THREE.Vector3();

function screenToWorld(
  x: number,
  y: number,
  w: number,
  h: number,
  camera: THREE.Camera,
): THREE.Vector3 {
  const ndcX = (x / w) * 2 - 1;
  const ndcY = -((y / h) * 2 - 1);
  _ndc.set(ndcX, ndcY, 0.35);
  _ndc.unproject(camera);
  _dir.copy(_ndc).sub(camera.position).normalize();
  const dist = -camera.position.z / _dir.z;
  return camera.position.clone().add(_dir.multiplyScalar(dist));
}

function lerp3(
  out: Float32Array,
  a: Float32Array,
  b: Float32Array,
  t: number,
  count: number,
) {
  for (let i = 0; i < count * 3; i++) {
    out[i] = a[i] + (b[i] - a[i]) * t;
  }
}

export function MorphingNeuralMesh({
  phase,
  size,
  anchors,
  sphereFocus,
  connectorEdges = [],
}: MorphingNeuralMeshProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  const dashboardMesh = useMemo(
    () =>
      createNeuralMeshGeometry(SPHERE_RADIUS, SPHERE_POINT_COUNT, 10, 3, 0.38),
    [],
  );

  const analysisMesh = useMemo(
    () => createBridgeAnalysisData(Math.max(connectorEdges.length, 1)),
    [connectorEdges.length],
  );

  const bridgeSim = useRef<BridgeMeshSimulator | null>(null);
  const simReady = useRef(false);

  useEffect(() => {
    bridgeSim.current = new BridgeMeshSimulator(analysisMesh);
    simReady.current = false;
  }, [analysisMesh]);

  const isDashboard = phase === 'idle-left' || phase === 'transit';
  const pointCount = isDashboard ? dashboardMesh.pointCount : analysisMesh.pointCount;

  const positions = useMemo(() => {
    const buf = new Float32Array(
      isDashboard ? dashboardMesh.spherePositions : analysisMesh.sphereLayout,
    );
    return buf;
  }, [isDashboard, dashboardMesh, analysisMesh]);

  const linePositions = useMemo(() => new Float32Array(positions), [positions]);

  const pointTexture = useMemo(() => getNeuralPointTexture(), []);

  const pointsGeoRef = useRef<THREE.BufferGeometry>(null);
  const linesGeoRef = useRef<THREE.BufferGeometry>(null);
  const pointsMaterialRef = useRef<THREE.PointsMaterial>(null);
  const phaseStart = useRef(performance.now());
  const prevPhase = useRef<MeshPhase>(phase);
  const splitScratch = useRef<Float32Array | null>(null);
  const stretchedScratch = useRef<Float32Array | null>(null);
  
  // Arrays para animacion de parpadeo de vertices
  const vertexOffsets = useMemo(() => {
    const offsets = new Float32Array(SPHERE_POINT_COUNT * 3);
    for (let i = 0; i < SPHERE_POINT_COUNT; i++) {
      // Valores aleatorios para offset de fase de cada vertice
      offsets[i * 3] = Math.random() * Math.PI * 2; // fase
      offsets[i * 3 + 1] = 0.3 + Math.random() * 0.7; // velocidad
      offsets[i * 3 + 2] = Math.random(); // intensidad de parpadeo
    }
    return offsets;
  }, []);

  useEffect(() => {
    if (prevPhase.current !== phase) {
      phaseStart.current = performance.now();
      prevPhase.current = phase;
      if (phase === 'split' || phase === 'gather') {
        splitScratch.current = null;
        stretchedScratch.current = null;
        simReady.current = false;
      }
      if (phase === 'idle-left' || phase === 'transit') {
        positions.set(dashboardMesh.spherePositions);
        linePositions.set(dashboardMesh.spherePositions);
      }
    }
  }, [phase, dashboardMesh, positions, linePositions]);

  useFrame((state, delta) => {
    const w = size.w || 1000;
    const h = size.h || 600;
    const elapsed = performance.now() - phaseStart.current;

    const project = (x: number, y: number) => screenToWorld(x, y, w, h, camera);
    const screenAnchors = anchors.map((a) => ({ id: a.id, x: a.x, y: a.y }));

    let lineIndices: Uint16Array = dashboardMesh.lineIndices;

    if (isDashboard) {
      positions.set(dashboardMesh.spherePositions);
      lineIndices = dashboardMesh.lineIndices;
    } else {
      lineIndices = analysisMesh.lineIndices;
      const sim = bridgeSim.current;

      if (phase === 'split') {
        const posT = easeInOutCubic(Math.min(1, elapsed / MESH_SPLIT_MS));
        if (!splitScratch.current) {
          splitScratch.current = new Float32Array(analysisMesh.pointCount * 3);
        }
        buildSplitToBridges(
          analysisMesh,
          posT,
          screenAnchors,
          connectorEdges,
          project,
          splitScratch.current,
        );
        positions.set(splitScratch.current);
      } else if (phase === 'gather') {
        const posT = easeInOutCubic(Math.min(1, elapsed / MESH_GATHER_MS));
        if (!splitScratch.current) {
          splitScratch.current = new Float32Array(analysisMesh.pointCount * 3);
          buildSplitToBridges(
            analysisMesh,
            1,
            screenAnchors,
            connectorEdges,
            project,
            splitScratch.current,
          );
        }
        if (!stretchedScratch.current) {
          stretchedScratch.current = new Float32Array(analysisMesh.pointCount * 3);
        }
        if (sim) {
          sim.snapToAnchors(screenAnchors, connectorEdges, project);
          stretchedScratch.current.set(sim.positions);
        }
        lerp3(
          positions,
          splitScratch.current,
          stretchedScratch.current,
          posT,
          analysisMesh.pointCount,
        );
        if (posT > 0.92 && sim && !simReady.current) {
          sim.snapToAnchors(screenAnchors, connectorEdges, project);
          simReady.current = true;
        }
      } else if (phase === 'ready' && sim) {
        if (!simReady.current) {
          sim.snapToAnchors(screenAnchors, connectorEdges, project);
          simReady.current = true;
        }
        sim.step(screenAnchors, connectorEdges, project, delta, true);
        positions.set(sim.positions);
        
        // Animacion de ondulacion organica de la malla
        const time = performance.now() * 0.001;
        for (let i = 0; i < analysisMesh.pointCount; i++) {
          const phase1 = vertexOffsets[i % vertexOffsets.length];
          const speed = vertexOffsets[(i * 3 + 1) % vertexOffsets.length];
          
          // Ondulacion suave en X e Y
          const waveX = Math.sin(time * speed * 0.8 + phase1 + i * 0.1) * 0.008;
          const waveY = Math.cos(time * speed * 0.6 + phase1 * 1.3 + i * 0.15) * 0.006;
          const waveZ = Math.sin(time * speed * 0.5 + phase1 * 0.7) * 0.01;
          
          positions[i * 3] += waveX;
          positions[i * 3 + 1] += waveY;
          positions[i * 3 + 2] += waveZ;
        }
      }
    }

    const focusPx = sphereFocus ?? { x: size.w * 0.25, y: size.h * 0.46 };
    _focusWorld.copy(screenToWorld(focusPx.x, focusPx.y, w, h, camera));
    _centerWorld.set(0, 0, 0);

    if (groupRef.current) {
      if (phase === 'idle-left') {
        _groupPos.copy(_focusWorld);
      } else if (phase === 'transit') {
        const t = easeInOutCubic(Math.min(1, elapsed / MESH_TRANSIT_MS));
        _groupPos.lerpVectors(_focusWorld, _centerWorld, t);
      } else {
        _groupPos.copy(_centerWorld);
      }
      groupRef.current.position.copy(_groupPos);

      if (isDashboard) {
        groupRef.current.rotation.y += 0.0008;
        groupRef.current.rotation.x += 0.0003;
        // Enhanced mouse interaction - more responsive to hover
        const targetRotY = state.pointer.x * Math.PI * 0.25;
        const targetRotX = state.pointer.y * Math.PI * 0.15;
        groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.03;
        groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.03;
      }
    }

    linePositions.set(positions.subarray(0, pointCount * 3));

    // Animacion de parpadeo de vertices (solo en modo ready/analisis)
    const pm = pointsMaterialRef.current;
    if (pm && !isDashboard) {
      const time = performance.now() * 0.002;
      const basePulse = 0.55 + Math.sin(time * 0.5) * 0.15;
      pm.opacity = basePulse;
    }
    
    // Parpadeo individual de vertices
    if (!isDashboard) {
      const time = performance.now() * 0.001;
      for (let i = 0; i < Math.min(pointCount, vertexColors.length / 3); i++) {
        const phase = vertexOffsets[(i * 3) % vertexOffsets.length];
        const speed = vertexOffsets[(i * 3 + 1) % vertexOffsets.length];
        const intensity = vertexOffsets[(i * 3 + 2) % vertexOffsets.length];
        
        // Algunos vertices parpadean mas que otros
        const pulse = 0.6 + Math.sin(time * speed * 2 + phase) * 0.4 * intensity;
        vertexColors[i * 3] = pulse;
        vertexColors[i * 3 + 1] = pulse;
        vertexColors[i * 3 + 2] = pulse;
      }
    }

    const pg = pointsGeoRef.current;
    const lg = linesGeoRef.current;
    if (pg?.attributes.position) {
      const attr = pg.attributes.position as THREE.BufferAttribute;
      attr.array.set(positions.subarray(0, pointCount * 3));
      attr.needsUpdate = true;
      
      // Actualizar colores para parpadeo individual
      if (!isDashboard && pg.attributes.color) {
        const colorAttr = pg.attributes.color as THREE.BufferAttribute;
        colorAttr.array.set(vertexColors.subarray(0, pointCount * 3));
        colorAttr.needsUpdate = true;
      }
    }
    if (lg?.attributes.position) {
      const attr = lg.attributes.position as THREE.BufferAttribute;
      attr.array.set(linePositions.subarray(0, pointCount * 3));
      attr.needsUpdate = true;
      lg.setIndex(new THREE.BufferAttribute(lineIndices, 1));
    }
  });

  // Colores para parpadeo individual de vertices
  const vertexColors = useMemo(() => {
    const count = Math.max(SPHERE_POINT_COUNT, 500);
    return new Float32Array(count * 3).fill(1);
  }, []);
  
  const initialIndices = dashboardMesh.lineIndices;

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry ref={pointsGeoRef}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[vertexColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={pointsMaterialRef}
          map={pointTexture}
          size={isDashboard ? 0.052 : 0.048}
          color="#9eb8ae"
          vertexColors={!isDashboard}
          transparent
          opacity={isDashboard ? 0.72 : 0.68}
          sizeAttenuation
          depthWrite={false}
          alphaTest={0.08}
        />
      </points>

      <lineSegments>
        <bufferGeometry ref={linesGeoRef}>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
          <bufferAttribute attach="index" args={[initialIndices, 1]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#8fb5a8"
          transparent
          opacity={isDashboard ? 0.34 : 0.38}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
