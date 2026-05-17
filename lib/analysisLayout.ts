import type { AnalysisNode } from './types';

export interface LayoutPoint {
  x: number;
  y: number;
}

/** Posiciona entidades alrededor de la tarjeta de compra (mockup) */
export function layoutNodesAroundCompra(
  hub: LayoutPoint,
  nodes: AnalysisNode[],
  size: { w: number; h: number },
): Record<string, LayoutPoint> {
  const spreadX = Math.min(size.w, size.h) * 0.28;
  const spreadY = Math.min(size.w, size.h) * 0.22;
  const out: Record<string, LayoutPoint> = {};

  for (const node of nodes) {
    switch (node.role) {
      case 'institution':
        out[node.id] = { x: hub.x - spreadX, y: hub.y };
        break;
      case 'supplier':
        out[node.id] = { x: hub.x + spreadX, y: hub.y - spreadY * 0.35 };
        break;
      case 'product':
        out[node.id] = { x: hub.x + spreadX * 0.15, y: hub.y + spreadY };
        break;
      default:
        out[node.id] = {
          x: hub.x + spreadX * 0.5,
          y: hub.y + spreadY * 0.5,
        };
    }
  }

  return out;
}
