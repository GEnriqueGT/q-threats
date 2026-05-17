'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createNeuralMeshGeometry, easeInOutCubic } from '@/lib/neuralMeshGeometry';
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
  sphereFocus?: { x: number; y: number } | null;
  analysisPanelOpen?: boolean;
  /** Escala visual en vista de análisis (esfera más compacta). */
  meshScale?: number;
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
  sphereFocus,
  analysisPanelOpen = true,
  meshScale = 1,
}: MorphingNeuralMeshProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  const dashboardMesh = useMemo(
    () => createNeuralMeshGeometry(SPHERE_RADIUS, SPHERE_POINT_COUNT, 10, 3, 0.38),
    [],
  );

  const isDashboard = phase === 'idle-left' || phase === 'transit';
  // Siempre usar la esfera - misma geometria en dashboard y analisis
  const pointCount = dashboardMesh.pointCount;

  const positions = useMemo(() => {
    const buf = new Float32Array(dashboardMesh.spherePositions);
    return buf;
  }, [dashboardMesh]);

  const linePositions = useMemo(() => new Float32Array(positions), [positions]);

  const pointTexture = useMemo(() => getNeuralPointTexture(), []);

  const pointsGeoRef = useRef<THREE.BufferGeometry>(null);
  const linesGeoRef = useRef<THREE.BufferGeometry>(null);
  const phaseStart = useRef(performance.now());
  const prevPhase = useRef<MeshPhase>(phase);
  const scaleTarget = useRef(new THREE.Vector3(1, 1, 1));

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

    // Siempre usar la esfera con su geometria original
    positions.set(dashboardMesh.spherePositions);
    lineIndices = dashboardMesh.lineIndices;
    
    // Agregar ondulacion sutil en modo analisis
    if (!isDashboard) {
      const time = performance.now() * 0.001;
      for (let i = 0; i < dashboardMesh.pointCount; i++) {
        const wave = Math.sin(time * 0.8 + i * 0.05) * 0.015;
        const wave2 = Math.cos(time * 0.6 + i * 0.03) * 0.01;
        positions[i * 3 + 2] += wave + wave2;
      }
    }

    const focusPx = sphereFocus ?? { x: size.w * 0.25, y: size.h * 0.46 };
    _focusWorld.copy(screenToWorld(focusPx.x, focusPx.y, w, h, camera));

    // En análisis: mismo centro que reporta AnalysisNetworkView (coords de viewport)
    _centerWorld.copy(
      sphereFocus
        ? screenToWorld(sphereFocus.x, sphereFocus.y, w, h, camera)
        : screenToWorld(
            analysisPanelOpen ? size.w * 0.4 : size.w * 0.5,
            size.h * 0.5,
            w,
            h,
            camera,
          ),
    );

    if (groupRef.current) {
      if (phase === 'idle-left') {
        _groupPos.copy(_focusWorld);
      } else if (phase === 'transit') {
        const t = easeInOutCubic(Math.min(1, elapsed / MESH_TRANSIT_MS));
        _groupPos.lerpVectors(_focusWorld, _centerWorld, t);
      } else {
        // Modo analisis: interpolar hacia la posicion de analisis
        const lerpFactor = 0.08;
        _groupPos.lerp(_centerWorld, lerpFactor);
      }
      groupRef.current.position.copy(_groupPos);

      const targetScale = isDashboard ? 1 : meshScale;
      scaleTarget.current.set(targetScale, targetScale, targetScale);
      groupRef.current.scale.lerp(scaleTarget.current, isDashboard ? 1 : 0.06);

      if (isDashboard) {
        groupRef.current.rotation.y += 0.0008;
        groupRef.current.rotation.x += 0.0003;
        const targetRotY = state.pointer.x * Math.PI * 0.25;
        const targetRotX = state.pointer.y * Math.PI * 0.15;
        groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.03;
        groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.03;
      } else {
        // Modo analisis: rotacion lenta continua
        groupRef.current.rotation.y += 0.0012;
        groupRef.current.rotation.x += 0.0004;
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
          size={isDashboard ? 0.052 : 0.048 * meshScale}
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
