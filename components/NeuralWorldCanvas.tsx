'use client';

import { Canvas } from '@react-three/fiber';
import dynamic from 'next/dynamic';
import type { MeshPhase } from './MorphingNeuralMesh';

const MorphingNeuralMesh = dynamic(
  () => import('./MorphingNeuralMesh').then((m) => m.MorphingNeuralMesh),
  { ssr: false },
);

interface NeuralWorldCanvasProps {
  phase: MeshPhase;
  size: { w: number; h: number };
  visible: boolean;
  sphereFocus?: { x: number; y: number } | null;
  analysisPanelOpen?: boolean;
}

export function NeuralWorldCanvas({
  phase,
  size,
  visible,
  sphereFocus,
  analysisPanelOpen = true,
}: NeuralWorldCanvasProps) {
  if (!visible) return null;

  const isDashboard = phase === 'idle-left';

  return (
    <div className="absolute inset-0 z-[2] pointer-events-auto" style={{ pointerEvents: isDashboard ? 'auto' : 'none' }}>
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
          sphereFocus={sphereFocus}
          analysisPanelOpen={analysisPanelOpen}
        />
      </Canvas>
    </div>
  );
}
