'use client';

import { Canvas } from '@react-three/fiber';
import { motion } from 'motion/react';
import { NetworkBackground } from './NetworkBackground';
import type { AxonPhase } from './NeuralAxonLayer';

interface AnalysisSphereCanvasProps {
  phase: AxonPhase;
}

export function AnalysisSphereCanvas({ phase }: AnalysisSphereCanvasProps) {
  const visible = phase === 'sphere' || phase === 'scatter';
  const opacity = phase === 'sphere' ? 0.72 : phase === 'scatter' ? 0.22 : 0;

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      initial={false}
      animate={{
        opacity,
        scale: phase === 'sphere' ? 1 : phase === 'scatter' ? 1.08 : 0.7,
      }}
      transition={{ duration: phase === 'scatter' ? 0.75 : 0.9, ease: 'easeInOut' }}
      style={{ display: visible ? 'flex' : 'none' }}
    >
      <div className="w-[min(55vh,55vw)] h-[min(55vh,55vw)] max-w-full max-h-full">
        <Canvas
          className="!w-full !h-full"
          camera={{ position: [0, 0, 5.5], fov: 48 }}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 1.5]}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <NetworkBackground interactive={false} radius={2.05} pointCount={220} />
        </Canvas>
      </div>
    </motion.div>
  );
}
