// Camara del motor. Fase 1: encuadre identico al actual.
// zoom y smooth quedan preparados para fases siguientes:
// con smooth en 1 y zoom en 1 el resultado es el de siempre.
import { G } from '../state.js';
export var cam = { x: 0, y: 0, zoom: 1, smooth: 1 };
export function followPlayer() {
  var tx = G.px + 6 - 240;
  if (tx < 0) tx = 0;
  if (tx > G.levelW - 480) tx = G.levelW - 480;
  if (G.levelW <= 480) tx = 0;
  var ty = G.py + 8 - 160;
  if (ty < 0) ty = 0;
  if (ty > G.levelH - 320) ty = G.levelH - 320;
  if (G.levelH <= 320) ty = 0;
  cam.x += (tx - cam.x) * cam.smooth;
  cam.y += (ty - cam.y) * cam.smooth;
  G.camX = cam.x;
  G.camY = cam.y;
}
