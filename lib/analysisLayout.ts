/** Layout compartido entre el canvas 3D y la vista de análisis orbital. */

export const PANEL_WIDTH_MAX = 400;
export const PANEL_WIDTH_VW = 0.4;
export const PANEL_MARGIN_RIGHT = 24;
/** Espacio reservado para botones circulares (izquierda). */
export const VIZ_LEFT_GUTTER = 148;

export function panelWidthPx(viewportW: number): number {
  return Math.min(PANEL_WIDTH_MAX, viewportW * PANEL_WIDTH_VW);
}

export function computeSphereLayout(
  width: number,
  height: number,
  panelOpen: boolean,
): { centerX: number; centerY: number; circleRadius: number } {
  const panelW = panelWidthPx(width);
  const vizLeft = VIZ_LEFT_GUTTER;
  const vizRight = panelOpen ? width - panelW - PANEL_MARGIN_RIGHT : width - 20;
  const vizWidth = Math.max(280, vizRight - vizLeft);

  const centerX = vizLeft + vizWidth / 2;
  const centerY = height * 0.5;
  const circleRadius = Math.min(vizWidth * 0.4, height * 0.36, 340);

  return { centerX, centerY, circleRadius };
}
