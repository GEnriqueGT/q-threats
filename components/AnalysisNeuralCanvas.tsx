'use client';

import { Canvas } from '@react-three/fiber';
import dynamic from 'next/dynamic';
import type { MeshAnchor, MeshPhase } from './MorphingNeuralMesh';

const MorphingNeuralMesh = dynamic(
  () => import('./MorphingNeuralMesh').then((m) => m.MorphingNeuralMesh),
  { ssr: false },
);

interface AnalysisNeuralCanvasProps {
  phase: MeshPhase;
  size: { w: number; h: number };
  anchors: MeshAnchor[];
}

export function AnalysisNeuralCanvas({ phase, size, anchors }: AnalysisNeuralCanvasProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-[4]">
      <Canvas
        className="!w-full !h-full"
        camera={{ position: [0, 0, 5.5], fov: 48 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <MorphingNeuralMesh phase={phase} size={size} anchors={anchors} />
      </Canvas>
    </div>
  );
}
