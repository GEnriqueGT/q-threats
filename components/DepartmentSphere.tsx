'use client';

import { Canvas } from '@react-three/fiber';
import { SPHERE_POINT_COUNT, SPHERE_RADIUS } from '@/lib/neuralConstants';
import { NetworkBackground } from './NetworkBackground';

/**
 * Esfera dimensionada para caber dentro del contenedor cuadrado (sin recortes).
 * radio 3D ≈ 1.95 + cámara z=5.8 + fov 50 → diámetro visible ~85% del canvas.
 */
export function DepartmentSphere() {
  return (
    <Canvas
      className="!absolute inset-0"
      camera={{ position: [0, 0, 5.5], fov: 48 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 1.5]}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <NetworkBackground interactive radius={SPHERE_RADIUS} pointCount={SPHERE_POINT_COUNT} />
    </Canvas>
  );
}
