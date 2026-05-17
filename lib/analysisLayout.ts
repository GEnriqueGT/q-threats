import type { AnalysisNode } from './types';

export interface LayoutPoint {
  x: number;
  y: number;
}

/** Posiciona entidades en una fila horizontal centrada */
export function layoutNodesInRow(
  nodes: AnalysisNode[],
  size: { w: number; h: number },
): Record<string, LayoutPoint> {
  const out: Record<string, LayoutPoint> = {};
  const count = nodes.length;
  if (count === 0) return out;

  // Centro vertical de la pantalla
  const cy = size.h * 0.42;
  
  // Calcular espaciado horizontal
  const nodeWidth = 120; // Ancho aproximado de cada nodo
  const gap = Math.min(180, (size.w - 200) / (count + 1)); // Gap entre nodos
  const totalWidth = (count - 1) * gap;
  const startX = (size.w - totalWidth) / 2;

  nodes.forEach((node, index) => {
    out[node.id] = {
      x: startX + index * gap,
      y: cy,
    };
  });

  return out;
}

/** @deprecated usar layoutNodesInRow en su lugar */
export function layoutNodesAroundCompra(
  hub: LayoutPoint,
  nodes: AnalysisNode[],
  size: { w: number; h: number },
): Record<string, LayoutPoint> {
  return layoutNodesInRow(nodes, size);
}
