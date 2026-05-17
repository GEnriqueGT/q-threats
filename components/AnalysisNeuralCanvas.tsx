'use client';

import { Canvas } from '@react-three/fiber';
import dynamic from 'next/dynamic';
import type { MeshPhase } from './MorphingNeuralMesh';

const MorphingNeuralMesh = dynamic(
  () => import('./MorphingNeuralMesh').then((m) => m.MorphingNeuralMesh),
  { ssr: false },
);

interface AnalysisNeuralCanvasProps {
  phase: MeshPhase;
  size: { w: number; h: number };
  analysisPanelOpen?: boolean;
}

/** Canvas 3D de análisis (legacy; la app usa NeuralWorldCanvas) */
export function AnalysisNeuralCanvas({
  phase,
  size,
  analysisPanelOpen = true,
}: AnalysisNeuralCanvasProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-[4]">
      <Canvas
        className="!w-full !h-full"
        camera={{ position: [0, 0, 5.5], fov: 48 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <MorphingNeuralMesh
          phase={phase}
          size={size}
          analysisPanelOpen={analysisPanelOpen}
        />
      </Canvas>
    </div>
  );
}
