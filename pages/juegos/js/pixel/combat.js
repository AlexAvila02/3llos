/**
 * Reglas de muerte, respawn en checkpoint y daño al jefe Sol en Pixel Adventure.
 */
import { G } from '../state.js';
import { levels } from '../levels.js';
import { playImpactSound, playGameOverSound, stopSunBattleMusic, stopGameOverBgm } from '../audio.js';

/**
 * Cobra 1 moneda por reaparecer; si no alcanza, marca derrota definitiva.
 */
function payRespawnCost() {
  if (G.score > 1) {
    G.score--;
    return true;
  }
  G.score = 0;
  G.dead = true;
  try { playGameOverSound(); } catch (e) {}
  stopGameOverBgm();
  return false;
}

/**
 * Procesa la muerte o reaparición del jugador según el nivel y checkpoint activo.
 */
export function die() {
  if (G.dead) return;
  if (G.sunBoss) {
    G.sunDeath = true;
    G.sunDialogue = '';
    G.sunDialogueTimer = 0;
    try { stopSunBattleMusic(); } catch (e) {}
    try { playGameOverSound(); } catch (e) {}
    return;
  }

  if (G.currentLevel >= 2) {
    if (!payRespawnCost()) return;
    try { playImpactSound(); } catch (e) {}
    if (G.checkpoint && G.checkpoint.active) {
      G.px = G.checkpoint.x;
      G.py = G.checkpoint.y;
    } else {
      const level = levels[G.currentLevel];
      G.px = level.spawn[0];
      G.py = level.spawn[1];
    }
    G.pvy = 0;
    G.pvx = 0;
    for (let i = 0; i < G.enemyList.length; i++) {
      const enemy = G.enemyList[i];
      if (Math.abs(enemy.x - G.px) < 60) {
        enemy.x = enemy.ox;
        enemy.vx = Math.abs(enemy.vx);
      }
    }
    return;
  }

  G.dead = true;
  try { playGameOverSound(); } catch (e) {}
  stopGameOverBgm();
}

/**
 * Aplica un golpe al jefe Sol y actualiza sus fases de combate.
 */
export function hitSunBoss() {
  playImpactSound();
  G.frameShake = 14;
  G.sunBoss.hp--;
  G.sunBoss.hitCount++;
  G.sunBoss.stun = 20;
  G.sunHitCount++;
  G.shakeX = (Math.random() - 0.5) * 6;
  G.shakeY = (Math.random() - 0.5) * 6;
  G.pvx = -12;
  G.pvy = -9;
  G.sunKnockback = 15;
  G.dashTimer = 0;
  G.dashMX = 0;
  G.dashMY = 0;

  if (G.sunBoss.phase >= 2) {
    G.playerHp -= 1;
    G.showPlayerHealth = true;
  }

  if (G.sunBoss.hp <= 0) {
    G.sunBoss.hp = 0;
    G.sunDialogue = '';
    G.sunDialogueTimer = 0;
    G.sunDeath = true;
    G.score += 100;
    try { stopSunBattleMusic(); } catch (e) {}
  } else if (G.sunBoss.hp <= 25 && G.sunBoss.phase < 3) {
    G.sunBoss.phase = 3;
    G.playerHp = 1;
    G.showPlayerHealth = true;
    G.sunDialogue = '';
    G.sunDialogueTimer = 0;
  } else if (G.sunBoss.hp <= 50 && G.sunBoss.phase < 2) {
    G.sunBoss.phase = 2;
    G.showPlayerHealth = true;
    G.sunDialogue = '';
    G.sunDialogueTimer = 0;
  } else {
    G.sunDialogue = '';
    G.sunDialogueTimer = 0;
  }
}
