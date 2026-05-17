'use client';

import { Canvas } from '@react-three/fiber';
import { NetworkBackground } from './NetworkBackground';

export function Scene3D() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
      <fog attach="fog" args={['#081210', 3, 10]} />
      <NetworkBackground interactive />
    </Canvas>
  );
}
