/**
 * Lógica de jefes (Jefe 1, Jefe 2 y Jefe Sol) y partículas solares ambientales.
 */
import { G } from '../state.js';
import { levels } from '../levels.js';
import { hitTest } from '../player.js';
import { playImpactSound } from '../audio.js';
import { die, hitSunBoss } from './combat.js';

/**
 * Actualiza los rayos y partículas del Sol en niveles secretos y batalla final.
 */
export function updateSunAmbient() {
  if (!G.sunBoss && !G.sunDeath) return;

  if (G.sunDialogueTimer > 0) G.sunDialogueTimer--;
  else G.sunDialogue = '';

  const L = levels[G.currentLevel];
  const hpRatio = G.sunBoss ? G.sunBoss.hp / G.sunBoss.maxHp : 0;
  const speed = 0.008 + (1 - hpRatio) * 0.025;
  G.sunRays += speed;
  const maxP = G.sunDeath ? 12 : 20 + Math.floor((1 - hpRatio) * 45);

  let pMinX, pMaxX, pMinY, pMaxY, rise;
  if (G.sunDeath) {
    pMinX = 200; pMaxX = 280; pMinY = 55; pMaxY = 135; rise = false;
  } else if (G.sunBoss) {
    pMinX = 315; pMaxX = 478; pMinY = 20; pMaxY = 375; rise = true;
  } else {
    const pr = L.sunR1 || 40;
    pMinX = 240 - pr; pMaxX = 240 + pr;
    pMinY = 160 - pr; pMaxY = 160 + pr; rise = true;
  }

  function place(p) {
    p.x = pMinX + Math.random() * (pMaxX - pMinX);
    p.y = pMinY + Math.random() * (pMaxY - pMinY);
    p.vx = (Math.random() - 0.5) * 0.5;
    p.vy = rise ? -(0.12 + Math.random() * 0.4) : (0.2 + Math.random() * 0.5);
  }

  while (G.sunParticles.length < maxP) {
    const type = Math.random();
    const p = {
      vx: 0, vy: 0, age: 0,
      maxLife: 160 + Math.random() * 260,
      size: type < 0.35 ? 0.9 + Math.random() * 1.3 : type < 0.7 ? 1.8 + Math.random() * 2.2 : 3.2 + Math.random() * 3.5,
      type: type < 0.35 ? 0 : type < 0.7 ? 1 : 2,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.03 + Math.random() * 0.05,
      wobbleAmp: 0.5 + Math.random() * 1.2
    };
    place(p);
    G.sunParticles.push(p);
  }

  for (let si = G.sunParticles.length - 1; si >= 0; si--) {
    const sp = G.sunParticles[si];
    sp.age++;
    sp.wobblePhase += sp.wobbleSpeed;
    sp.x += sp.vx + Math.sin(sp.wobblePhase) * sp.wobbleAmp;
    sp.y += sp.vy;
    const lifeRatio = sp.age / sp.maxLife;
    let fade = 1;
    if (lifeRatio < 0.12) fade = lifeRatio / 0.12;
    else if (lifeRatio > 0.72) fade = 1 - (lifeRatio - 0.72) / 0.28;
    sp.fade = Math.max(0, Math.min(1, fade));

    if (sp.x < pMinX - 10 || sp.x > pMaxX + 10 || sp.y < pMinY - 30 || sp.y > 360 || sp.age >= sp.maxLife) {
      if (G.sunDeath) {
        G.sunParticles.splice(si, 1);
      } else {
        place(sp);
        sp.age = 0;
        sp.maxLife = 160 + Math.random() * 260;
      }
    }
  }
}

/**
 * Actualiza el jefe normal o Jefe 2. Devuelve `true` si el jugador murió en este frame.
 */
export function updateBoss() {
  if (!G.boss) return false;

  if (G.boss.stun > 0) {
    G.boss.stun--;
  } else {
    const bspd = 1.5 + G.boss.phase * 0.8;

    if (G.boss.isBoss2) {
      G.boss.jumpTimer--;
      if (G.boss.jumpTimer <= 0 && !G.boss.jumping) {
        G.boss.jumping = true;
        G.boss.jumpVY = -10;
        G.boss.jumpTimer = 0;
      }
      if (G.boss.jumping) {
        G.boss.y += G.boss.jumpVY;
        G.boss.jumpVY += 0.4;
        if (G.boss.y >= 318) {
          G.boss.y = 318;
          G.boss.jumping = false;
          G.boss.jumpTimer = 90 - G.boss.phase * 20;
          G.shakeX = (Math.random() - 0.5) * 8;
          G.shakeY = (Math.random() - 0.5) * 8;
          G.bossShockwaves.push({ x: G.boss.x - 14, y: G.boss.y + 28, vx: -3, life: 25 });
          G.bossShockwaves.push({ x: G.boss.x + 14, y: G.boss.y + 28, vx: 3, life: 25 });
          G.breakEffects.push({ x: G.boss.x - 20, y: G.boss.y - 4, w: 72, life: 15, type: 'shock' });
          if (Math.abs(G.px + 6 - G.boss.x - 14) < 40 && Math.abs(G.py + 8 - G.boss.y) < 20) {
            die();
            return true;
          }
          for (let bki = G.platList.length - 1; bki >= 0; bki--) {
            const bkp = G.platList[bki];
            if (G.boss.x + 28 > bkp[0] - 30 && G.boss.x < bkp[0] + bkp[2] + 30 && Math.abs(G.boss.y - bkp[1]) < 20) {
              G.breakEffects.push({ x: bkp[0], y: bkp[1], w: bkp[2], life: 20 });
              G.platList.splice(bki, 1);
            }
          }
        }
      } else {
        G.boss.x += G.boss.vx;
        if (G.boss.x < 1100 || G.boss.x > 1550) G.boss.vx *= -1;
      }
    } else {
      G.boss.x += G.boss.vx;
      if (G.boss.x < 50 || G.boss.x > 400) G.boss.vx *= -1;
    }

    G.boss.atkCD--;
    if (G.boss.atkCD <= 0) {
      G.boss.atkPattern = (G.boss.atkPattern + 1) % 3;
      G.boss.atkCD = (G.boss.isBoss2 ? 60 : 80) - G.boss.phase * 15;

      if (G.boss.atkPattern === 0) {
        G.bossProjectiles.push({ x: G.boss.x, y: G.boss.y + 10, vx: (G.px > G.boss.x ? 4 : -4), vy: 0, life: 60 });
      } else if (G.boss.atkPattern === 1) {
        for (let pi = 0; pi < 3 + G.boss.phase; pi++) {
          const ang = -0.6 + (1.2 / (2 + G.boss.phase)) * pi;
          G.bossProjectiles.push({ x: G.boss.x + 10, y: G.boss.y + 10, vx: Math.cos(ang) * 3.5, vy: Math.sin(ang) * 3.5, life: 50 });
        }
      } else {
        G.boss.vx = (G.px > G.boss.x ? bspd : -bspd) * (G.boss.isBoss2 ? 3 : 2.5);
      }
    }
  }

  for (let bi = G.bossProjectiles.length - 1; bi >= 0; bi--) {
    const bp = G.bossProjectiles[bi];
    bp.x += bp.vx;
    bp.y += bp.vy;
    bp.life--;
    if (bp.life <= 0 || bp.x < -20 || bp.x > G.levelW + 20 || bp.y < -20 || bp.y > G.levelH + 20) {
      G.bossProjectiles.splice(bi, 1);
      continue;
    }
    if (hitTest(G.px, G.py, 12, 16, bp.x - 4, bp.y - 4, 8, 8)) {
      if (G.wasDashing && G.dashKillEquipped) {
        G.bossProjectiles.splice(bi, 1);
      } else {
        die();
        return true;
      }
    }
  }

  for (let swi = G.bossShockwaves.length - 1; swi >= 0; swi--) {
    const sw = G.bossShockwaves[swi];
    sw.x += sw.vx;
    sw.life--;
    if (sw.life <= 0 || sw.x < -20 || sw.x > G.levelW + 20) {
      G.bossShockwaves.splice(swi, 1);
      continue;
    }
    if (hitTest(G.px, G.py, 12, 16, sw.x - 6, sw.y - 4, 12, 8)) {
      if (G.wasDashing) {
        G.dashTimer += 5;
        G.bossShockwaves.splice(swi, 1);
      } else {
        die();
        return true;
      }
    }
  }

  if (G.boss.stun <= 0 && hitTest(G.px, G.py, 12, 16, G.boss.x, G.boss.y, 28, 32)) {
    if (G.dashKillEquipped && G.wasDashing) {
      const dmg = Math.max(1, Math.floor(G.killCount / 3));
      G.boss.hp -= dmg;
      G.boss.stun = 40;
      G.boss.vx = (G.px < G.boss.x ? 5 : -5);
      G.pvx = (G.px < G.boss.x ? -6 : 6);
      G.pvy = -4;
      G.dashTimer = 0;
      G.dashMX = 0;
      G.dashMY = 0;
    } else if (G.pvy > 0 && G.py + 12 < G.boss.y + 16) {
      G.pvy = -8;
      G.boss.hp--;
      G.boss.stun = 20;
      try { playImpactSound(); } catch (e) {}
    } else {
      die();
      return true;
    }
  }

  if (G.waveActive) {
    const bdist = Math.sqrt((G.boss.x + 14 - G.waveX) * (G.boss.x + 14 - G.waveX) + (G.boss.y + 16 - G.waveY) * (G.boss.y + 16 - G.waveY));
    if (bdist < 100 && G.boss.stun <= 0) {
      G.boss.hp -= 1;
      G.boss.stun = 25;
      G.boss.vx = (G.waveX < G.boss.x ? 2 : -2);
    }
    for (let bpi = G.bossProjectiles.length - 1; bpi >= 0; bpi--) {
      const bpw = G.bossProjectiles[bpi];
      const bpd = Math.sqrt((bpw.x - G.waveX) * (bpw.x - G.waveX) + (bpw.y - G.waveY) * (bpw.y - G.waveY));
      if (bpd < G.waveRadius) {
        G.bossProjectiles.splice(bpi, 1);
      }
    }
  }

  if (G.boss.hp <= 0) {
    G.boss = null;
  } else {
    G.boss.phase = G.boss.hp <= G.boss.maxHp * 0.3 ? 2 : G.boss.hp <= G.boss.maxHp * 0.6 ? 1 : 0;
  }

  return false;
}

/**
 * Actualiza la colisión y retroceso contra el jefe Sol.
 */
export function updateSunBoss() {
  if (!G.sunBoss) return;
  if (G.sunBoss.stun > 0) G.sunBoss.stun--;

  if (G.sunBoss.stun <= 0 && hitTest(G.px, G.py, 12, 16, 300, 0, 180, 800)) {
    if (G.dashKillEquipped && G.wasDashing) {
      hitSunBoss();
    } else {
      G.pvx = -12;
      G.pvy = -9;
      G.sunKnockback = 15;
    }
  }
}
