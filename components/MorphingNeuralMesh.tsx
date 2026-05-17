'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createNeuralMeshGeometry, createCircleNetworkMesh, updateCircleNetworkPositions, easeInOutCubic } from '@/lib/neuralMeshGeometry';
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

export function MorphingNeuralMesh({
  phase,
  size,
  anchors,
  sphereFocus,
}: MorphingNeuralMeshProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  const dashboardMesh = useMemo(
    () => createNeuralMeshGeometry(SPHERE_RADIUS, SPHERE_POINT_COUNT, 10, 3, 0.38),
    [],
  );

  // Red circular con nodos en la circunferencia
  // El numero de nodos se actualiza segun los anchors (excluyendo 'acquisition')
  const nodeCount = Math.max(3, anchors.filter(a => a.id !== 'acquisition').length);
  
  const circleNetwork = useMemo(
    () => createCircleNetworkMesh(nodeCount, 2.8, 180),
    [nodeCount],
  );

  const isDashboard = phase === 'idle-left' || phase === 'transit';
  const pointCount = isDashboard ? dashboardMesh.pointCount : circleNetwork.pointCount;

  const positions = useMemo(() => {
    const buf = new Float32Array(
      isDashboard ? dashboardMesh.spherePositions : circleNetwork.positions,
    );
    return buf;
  }, [isDashboard, dashboardMesh, circleNetwork]);

  const linePositions = useMemo(() => new Float32Array(positions), [positions]);

  // Buffer para posiciones deformadas de la red circular
  const deformedPositions = useMemo(
    () => new Float32Array(circleNetwork.positions.length),
    [circleNetwork],
  );

  const pointTexture = useMemo(() => getNeuralPointTexture(), []);

  const pointsGeoRef = useRef<THREE.BufferGeometry>(null);
  const linesGeoRef = useRef<THREE.BufferGeometry>(null);
  const phaseStart = useRef(performance.now());
  const prevPhase = useRef<MeshPhase>(phase);

  useEffect(() => {
    if (prevPhase.current !== phase) {
      phaseStart.current = performance.now();
      prevPhase.current = phase;
      if (phase === 'idle-left' || phase === 'transit') {
        positions.set(dashboardMesh.spherePositions);
        linePositions.set(dashboardMesh.spherePositions);
      }
    }
  }, [phase, dashboardMesh, positions, linePositions]);

  useFrame((state) => {
    const w = size.w || 1000;
    const h = size.h || 600;
    const elapsed = performance.now() - phaseStart.current;

    let lineIndices: Uint16Array = dashboardMesh.lineIndices;

    if (isDashboard) {
      positions.set(dashboardMesh.spherePositions);
      lineIndices = dashboardMesh.lineIndices;
    } else {
      // Modo analisis: usar red circular con nodos en la circunferencia
      lineIndices = circleNetwork.lineIndices;
      
      // Centro de la pantalla
      const centerX = w / 2;
      const centerY = h * 0.45;
      
      // Obtener posiciones de los nodos de anclaje (excluyendo acquisition)
      const nodeAnchors = anchors.filter(a => a.id !== 'acquisition');
      const anchorPositions = nodeAnchors.map(a => ({ x: a.x, y: a.y }));

      if (phase === 'split') {
        // Transicion de esfera a red circular
        const posT = easeInOutCubic(Math.min(1, elapsed / MESH_SPLIT_MS));
        
        // Primero calcular las posiciones deformadas de la red
        updateCircleNetworkPositions(circleNetwork, anchorPositions, centerX, centerY, deformedPositions);
        
        for (let i = 0; i < circleNetwork.pointCount; i++) {
          const sphereIdx = i % dashboardMesh.pointCount;
          const sx = dashboardMesh.spherePositions[sphereIdx * 3];
          const sy = dashboardMesh.spherePositions[sphereIdx * 3 + 1];
          const sz = dashboardMesh.spherePositions[sphereIdx * 3 + 2];
          
          const dx = deformedPositions[i * 3];
          const dy = deformedPositions[i * 3 + 1];
          const dz = deformedPositions[i * 3 + 2];
          
          positions[i * 3] = sx + (dx - sx) * posT;
          positions[i * 3 + 1] = sy + (dy - sy) * posT;
          positions[i * 3 + 2] = sz + (dz - sz) * posT;
        }
      } else if (phase === 'gather' || phase === 'ready') {
        // Red circular establecida - deformacion basada en posicion de nodos
        updateCircleNetworkPositions(circleNetwork, anchorPositions, centerX, centerY, deformedPositions);
        
        const time = performance.now() * 0.001;
        
        for (let i = 0; i < circleNetwork.pointCount; i++) {
          const baseX = deformedPositions[i * 3];
          const baseY = deformedPositions[i * 3 + 1];
          const baseZ = deformedPositions[i * 3 + 2];
          
          // Efecto de ondulacion sutil
          const dist = Math.sqrt(baseX * baseX + baseY * baseY);
          const wave = Math.sin(time * 1.2 + dist * 1.5) * 0.04;
          const wave2 = Math.cos(time * 0.7 + i * 0.04) * 0.02;
          
          positions[i * 3] = baseX + Math.sin(time * 0.4 + i * 0.08) * 0.01;
          positions[i * 3 + 1] = baseY + Math.cos(time * 0.35 + i * 0.06) * 0.01;
          positions[i * 3 + 2] = baseZ + wave + wave2;
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
        const targetRotY = state.pointer.x * Math.PI * 0.25;
        const targetRotX = state.pointer.y * Math.PI * 0.15;
        groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.03;
        groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.03;
      } else {
        // Red circular: rotacion muy sutil para dar profundidad
        const time = performance.now() * 0.001;
        groupRef.current.rotation.z = Math.sin(time * 0.2) * 0.03;
        groupRef.current.rotation.x = Math.PI * 0.1 + Math.sin(time * 0.3) * 0.02;
        groupRef.current.rotation.y = Math.cos(time * 0.2) * 0.03;
      }
    }

    linePositions.set(positions.subarray(0, pointCount * 3));

    const pg = pointsGeoRef.current;
    const lg = linesGeoRef.current;
    if (pg?.attributes.position) {
      const attr = pg.attributes.position as THREE.BufferAttribute;
      attr.array.set(positions.subarray(0, pointCount * 3));
      attr.needsUpdate = true;
    }
    if (lg?.attributes.position) {
      const attr = lg.attributes.position as THREE.BufferAttribute;
      attr.array.set(linePositions.subarray(0, pointCount * 3));
      attr.needsUpdate = true;
      lg.setIndex(new THREE.BufferAttribute(lineIndices, 1));
    }
  });

  const initialIndices = dashboardMesh.lineIndices;

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry ref={pointsGeoRef}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={pointTexture}
          size={isDashboard ? 0.052 : 0.055}
          color="#9eb8ae"
          transparent
          opacity={isDashboard ? 0.72 : 0.75}
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
          opacity={isDashboard ? 0.34 : 0.42}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
