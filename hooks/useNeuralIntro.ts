'use client';

import { useEffect, useState } from 'react';
import type { MeshPhase } from '@/components/MorphingNeuralMesh';
import {
  MESH_GATHER_MS,
  MESH_SPLIT_MS,
  MESH_TRANSIT_MS,
} from '@/components/MorphingNeuralMesh';

/**
 * Secuencia intro de fases neuronales (transit → split → gather → ready) al activarse.
 */
export function useNeuralIntro(shouldAnimate: boolean): MeshPhase {
  const [phase, setPhase] = useState<MeshPhase>('idle-left');

  useEffect(() => {
    if (!shouldAnimate) {
      setPhase('idle-left');
      return;
    }

    setPhase('transit');
    const t1 = setTimeout(() => setPhase('split'), MESH_TRANSIT_MS + 60);
    const t2 = setTimeout(
      () => setPhase('gather'),
      MESH_TRANSIT_MS + MESH_SPLIT_MS + 80,
    );
    const t3 = setTimeout(
      () => setPhase('ready'),
      MESH_TRANSIT_MS + MESH_SPLIT_MS + MESH_GATHER_MS + 100,
    );

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [shouldAnimate]);

  return phase;
}
