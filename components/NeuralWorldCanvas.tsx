'use client';

import { Canvas } from '@react-three/fiber';
import dynamic from 'next/dynamic';
import type { ConnectorEdge } from '@/lib/neuralConnectors';
import type { MeshAnchor, MeshPhase } from './MorphingNeuralMesh';

const MorphingNeuralMesh = dynamic(
  () => import('./MorphingNeuralMesh').then((m) => m.MorphingNeuralMesh),
  { ssr: false },
);

interface NeuralWorldCanvasProps {
  phase: MeshPhase;
  size: { w: number; h: number };
  anchors: MeshAnchor[];
  visible: boolean;
  sphereFocus?: { x: number; y: number } | null;
  connectorEdges?: ConnectorEdge[];
}

export function NeuralWorldCanvas({
  phase,
  size,
  anchors,
  visible,
  sphereFocus,
  connectorEdges = [],
}: NeuralWorldCanvasProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-[2] pointer-events-none">
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
          anchors={anchors}
          sphereFocus={sphereFocus}
          connectorEdges={connectorEdges}
        />
      </Canvas>
    </div>
  );
}
