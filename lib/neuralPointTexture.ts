import * as THREE from 'three';

let cached: THREE.CanvasTexture | null = null;

/** Textura circular suave para que los vértices no se vean como cuadrados blancos */
export function getNeuralPointTexture(): THREE.CanvasTexture {
  if (cached) return cached;

  const s = 64;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d')!;

  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cached = tex;
  return tex;
}
