'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createNeuralMeshGeometry } from '@/lib/neuralMeshGeometry';
import { getNeuralPointTexture } from '@/lib/neuralPointTexture';

interface NetworkBackgroundProps {
  interactive?: boolean;
  radius?: number;
  pointCount?: number;
}

export function NetworkBackground({
  interactive = true,
  radius = 2,
  pointCount = 200,
}: NetworkBackgroundProps) {
  const groupRef = useRef<THREE.Group>(null);

  const { positions, lines } = useMemo(() => {
    const mesh = createNeuralMeshGeometry(radius, pointCount, 10);
    return { positions: mesh.spherePositions, lines: mesh.lineIndices };
  }, [radius, pointCount]);

  const pointTexture = useMemo(() => getNeuralPointTexture(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += 0.001;
    groupRef.current.rotation.x += 0.0005;

    if (interactive) {
      const targetX = (state.pointer.x * Math.PI) / 10;
      const targetY = (state.pointer.y * Math.PI) / 10;
      groupRef.current.rotation.y += (targetX - groupRef.current.rotation.y) * 0.02;
      groupRef.current.rotation.x += (targetY - groupRef.current.rotation.x) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={pointTexture}
          size={0.055}
          color="#8ca59b"
          transparent
          opacity={0.58}
          sizeAttenuation
          depthWrite={false}
          alphaTest={0.08}
        />
      </points>

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="index" args={[lines, 1]} />
        </bufferGeometry>
        <lineBasicMaterial color="#5a8a7e" transparent opacity={0.22} />
      </lineSegments>
    </group>
  );
}
