/**
 * Coordinador de entidades del nivel en Pixel Adventure.
 * Re-exporta utilidades de combate, carga de niveles y ambiente solar por compatibilidad.
 */
import { G } from './state.js';
import { levels, nextStoryLevel } from './levels.js';
import { input, hitTest } from './player.js';
import { playImpactSound } from './audio.js';
import { die, hitSunBoss } from './pixel/combat.js';
import { loadLevel } from './pixel/level-loader.js';
import { updateMercenary } from './pixel/mercenary.js';
import { updateSunAmbient, updateBoss, updateSunBoss } from './pixel/bosses.js';

export { die, hitSunBoss, updateSunAmbient, loadLevel };

/**
 * Actualiza coleccionables, tienda, mercenario, onda expansiva, enemigos, pinchos, jefes y metas.
 */
export function updateEntities() {
  if (G.dead || G.won || G.sunDeath) return;

  for (let i = 0; i < G.gemList.length; i++) {
    const g = G.gemList[i];
    if (!g.alive) continue;
    if (Math.abs(G.px + 6 - g.x) < 14 && Math.abs(G.py + 8 - g.y) < 14) {
      g.alive = false;
      G.score++;
    }
  }

  if (G.dashItem.alive) {
    if (Math.abs(G.px + 6 - G.dashItem.x) < 14 && Math.abs(G.py + 8 - G.dashItem.y) < 14) {
      G.dashItem.alive = false;
      G.hasDash = true;
    }
  }

  if (G.waveItem && G.waveItem.alive) {
    if (Math.abs(G.px + 6 - G.waveItem.x) < 14 && Math.abs(G.py + 8 - G.waveItem.y) < 14) {
      G.waveItem.alive = false;
      G.hasWave = true;
    }
  }

  if (levels[G.currentLevel] && levels[G.currentLevel].shop) {
    const shopDistX = Math.abs(G.px + 6 - 224);
    const shopDistY = Math.abs(G.py + 8 - 201);
    if (shopDistX < 30 && shopDistY < 24) {
      if (!G.hasDashKill && G.score >= 20) {
        G.score -= 20;
        G.hasDashKill = true;
        G.dashKillEquipped = true;
      } else if (G.hasDashKill && input.keys.KeyE) {
        G.dashKillEquipped = !G.dashKillEquipped;
        input.keys.KeyE = false;
      }
    }
  }

  updateMercenary();

  if (G.waveCD > 0) G.waveCD--;

  if (input.xPressed && G.hasWave && !G.waveActive && G.waveCD <= 0) {
    G.waveActive = true;
    G.waveRadius = 0;
    G.waveX = G.px + 6;
    G.waveY = G.py + 8;
    G.waveCD = 120;
    input.xPressed = false;
    for (let i = G.enemyList.length - 1; i >= 0; i--) {
      const ex = G.enemyList[i].x + 7;
      const ey = G.enemyList[i].y + 7;
      const dist = Math.sqrt((ex - G.waveX) * (ex - G.waveX) + (ey - G.waveY) * (ey - G.waveY));
      if (dist < 120) {
        G.enemyList.splice(i, 1);
        G.killCount++;
      }
    }
    for (let i = G.platList.length - 1; i >= 0; i--) {
      const pp = G.platList[i];
      const cx = pp[0] + pp[2] / 2;
      const cy = pp[1] + pp[3] / 2;
      const d2 = Math.sqrt((cx - G.waveX) * (cx - G.waveX) + (cy - G.waveY) * (cy - G.waveY));
      if (d2 < 120 && pp[2] <= 60) G.platList.splice(i, 1);
    }
  }
  input.xPressed = false;

  for (let i = 0; i < G.enemyList.length; i++) {
    const e = G.enemyList[i];
    e.x += e.vx;
    if (e.x > e.ox + 50 || e.x < e.ox - 50) e.vx *= -1;
    if (hitTest(G.px, G.py, 12, 16, e.x, e.y, 14, 14)) {
      if (G.pvy > 0 && G.py + 12 < e.y + 7) {
        G.pvy = -7;
        G.enemyList.splice(i, 1);
        G.killCount++;
        i--;
        try { playImpactSound(); } catch (err) {}
      } else if (G.dashKillEquipped && G.wasDashing) {
        G.dashTimer += 5;
        const hx2 = e.x + 7;
        const hy2 = e.y + 7;
        G.enemyList.splice(i, 1);
        G.killCount++;
        for (let hp2 = 0; hp2 < 6; hp2++) {
          G.breakEffects.push({ x: hx2, y: hy2, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5 - 1, life: 14, col: '#00cec9' });
        }
        i--;
      } else {
        die();
        return;
      }
    }
  }

  if (G.spikeList.length > 0) {
    for (let i = 0; i < G.spikeList.length; i++) {
      const sp = G.spikeList[i];
      for (let ei = G.enemyList.length - 1; ei >= 0; ei--) {
        const se = G.enemyList[ei];
        if (hitTest(se.x, se.y, 14, 14, sp.x, sp.y - 12, sp.w, 12)) {
          G.enemyList.splice(ei, 1);
          G.killCount++;
        }
      }
      if (hitTest(G.px, G.py, 12, 16, sp.x, sp.y - 12, sp.w, 12)) {
        if (G.hasDash && G.dashTimer > 0) {
          G.dashCD = 0;
        } else {
          die();
          return;
        }
      }
    }
  }

  for (let i = G.dashPointList.length - 1; i >= 0; i--) {
    const dp = G.dashPointList[i];
    if (!dp.alive) {
      dp.cooldown = (dp.cooldown || 0) - 1;
      if (dp.cooldown <= 0) dp.alive = true;
      continue;
    }
    if (G.dashTimer > 0 && hitTest(G.px, G.py, 12, 16, dp.x - 6, dp.y - 6, 12, 12)) {
      G.dashTimer += 8;
      G.dashCD = 0;
      dp.alive = false;
      dp.cooldown = 600;
    }
  }

  if (updateBoss()) return;
  updateSunBoss();

  if (G.currentLevel === 6 && G.px > 195 && G.px < 285 && G.py < 0 && G.pvy < 0) {
    loadLevel(13);
    return;
  }

  if (G.currentLevel >= 13 && G.currentLevel <= 16 && levels[G.currentLevel].secret && G.py < 0 && !G.sunDeath) {
    loadLevel(G.currentLevel + 1);
    return;
  }

  if (G.flagObj && Math.abs(G.px - G.flagObj.x) < 16 && Math.abs(G.py - G.flagObj.y) < 20) {
    if (!G.boss && !G.sunBoss) {
      if (levels[G.currentLevel] && levels[G.currentLevel].secret) {
        if (levels[G.currentLevel].sunBossLevel && G.sunBoss && G.sunBoss.hp > 0) {
          return;
        }
        G.won = true;
      } else if (levels[G.currentLevel] && levels[G.currentLevel].shop) {
        G.won = true;
      } else {
        const next = nextStoryLevel(G.currentLevel);
        if (next >= levels.length) {
          G.won = true;
        } else {
          loadLevel(next);
        }
      }
    }
  }
}
