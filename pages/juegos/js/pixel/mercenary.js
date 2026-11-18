/**
 * Lógica de contratación, IA de seguimiento y ataque del mercenario en Pixel Adventure.
 */
import { G } from '../state.js';
import { input, hitTest } from '../player.js';
import { playImpactSound } from '../audio.js';

const MERC_WEIGHTS = [
  0.322497, 0.487635, 2.092766, 1.898941, -1.554489, 2.359027, -0.461373, -0.486549,
  0.300074, -1.007611, -0.918000, 1.392882, 0.737550, 1.018002, 0.197128, -1.206836,
  -1.804399, -1.773482, -0.237806, -0.352953, 0.797649, 1.332043, 0.874462, 0.061290,
  -1.073861, -1.673746, -0.688109, 1.842079, 0.141718, 0.803960, -0.809859, 0.105714,
  2.365887, -0.117582, 0.479755, -0.937944, -1.861802, 0.035554, 3.699180, 0.858208,
  1.761528, -1.623166, -2.262835, -1.065472, 2.108608, 0.048867, 1.396110, 0.263961,
  -1.610974, -0.137082, 0.042844, 1.427858, 0.719162, 0.262156, -1.096781, -0.853847,
  0.437849, -0.434578, -0.753942, -2.932730, -0.573048, 1.369255, -0.368905, 0.433555,
  -0.124136, -2.220882, -0.211088, 0.562663, 3.115312, -0.174085, -1.025988, 1.512716,
  1.573080, -0.817067, -0.660910, 2.766700, -0.099102, 2.772087, -1.260832, -0.371030,
  0.864043, -0.928753, -0.766718, 0.235206, -2.366748, 1.908203, 1.511522, 1.214424,
  1.599911, 0.451730, 0.562019
];
const MERC_NIN = 7;
const MERC_NHID = 8;
const MERC_NOUT = 3;

export function mercForward(inp) {
  const h = [];
  const o = [];
  let idx = 0;
  for (let i = 0; i < MERC_NHID; i++) {
    let s = MERC_WEIGHTS[idx + MERC_NIN];
    for (let j = 0; j < MERC_NIN; j++) s += MERC_WEIGHTS[idx + j] * inp[j];
    idx += MERC_NIN + 1;
    h.push(Math.tanh(s));
  }
  for (let k = 0; k < MERC_NOUT; k++) {
    let t = MERC_WEIGHTS[idx + MERC_NHID];
    for (let l = 0; l < MERC_NHID; l++) t += MERC_WEIGHTS[idx + l] * h[l];
    idx += MERC_NHID + 1;
    o.push(Math.tanh(t));
  }
  return o;
}

/**
 * Actualiza contratación, persecución de enemigos, seguimiento y física del mercenario.
 */
export function updateMercenary() {
  if (G.mercenary && G.mercenary.alive && !G.mercenary.hired) {
    const mercCost = 30;
    const mercDistX = Math.abs(G.px + 6 - G.mercenary.x);
    const mercDistY = Math.abs(G.py + 8 - G.mercenary.y);
    if (mercDistX < 24 && mercDistY < 24 && input.keys.KeyE && G.score >= mercCost) {
      G.score -= mercCost;
      G.mercenary.hired = true;
      G.mercHired = true;
      G.mercHiredPersist = true;
      input.keys.KeyE = false;
    }
  }

  if (!G.mercenary || !G.mercenary.hired) return;

  const tmDist = Math.hypot(G.px + 6 - G.mercenary.x, G.py + 8 - G.mercenary.y);

  if (G.mercenary.state !== 'dash' && G.mercenary.y > G.levelH + 40) {
    G.mercenary.returning = true;
    G.mercenary.pvym = 0;
    G.mercenary.pvxm = 0;
    const rdx0 = (G.px + 6 - G.mercenary.x);
    const rdy0 = (G.py + 8 - G.mercenary.y);
    const rdl0 = Math.max(1, Math.hypot(rdx0, rdy0));
    G.mercenary.dashDX = (rdx0 / rdl0) * 8;
    G.mercenary.dashDY = (rdy0 / rdl0) * 8;
    G.mercenary.dashTimer = 13;
    G.mercenary.state = 'dash';
  }

  if (G.mercenary.state === 'dash') {
    G.mercenary.x += G.mercenary.dashDX;
    G.mercenary.y += G.mercenary.dashDY;
    G.mercenary.trail.push({ x: G.mercenary.x, y: G.mercenary.y, life: 14 });
    G.mercenary.trail.push({
      x: G.mercenary.x - G.mercenary.dashDX * 0.3,
      y: G.mercenary.y - G.mercenary.dashDY * 0.3,
      life: 10
    });

    let mHit = -1;
    for (let i = 0; i < G.enemyList.length; i++) {
      const mhe = G.enemyList[i];
      if (Math.abs(mhe.x + 7 - G.mercenary.x) < 22 && Math.abs(mhe.y + 7 - G.mercenary.y) < 22) {
        mHit = i;
        break;
      }
    }

    if (mHit !== -1) {
      const hx = G.enemyList[mHit].x + 7;
      const hy = G.enemyList[mHit].y + 7;
      G.enemyList.splice(mHit, 1);
      G.killCount++;
      for (let hp = 0; hp < 8; hp++) {
        G.breakEffects.push({ x: hx, y: hy, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6 - 2, life: 18, col: '#74b9ff' });
      }
      try { playImpactSound(); } catch (e) {}
      G.mercenary.dashTimer = 0;
      G.mercenary.state = 'idle';
      G.mercenary.attackCD = 22;
    } else {
      G.mercenary.dashTimer--;
      if (G.mercenary.dashTimer <= 0) {
        if (G.mercenary.returning && tmDist > 60) {
          const rdx = (G.px + 6 - G.mercenary.x);
          const rdy = (G.py + 8 - G.mercenary.y);
          const rdl = Math.max(1, Math.hypot(rdx, rdy));
          G.mercenary.dashDX = (rdx / rdl) * 10;
          G.mercenary.dashDY = (rdy / rdl) * 10;
          G.mercenary.dashTimer = 11;
          // Nota: en el original playDashSound no estaba importado aquí y no sonaba durante el dash del mercenario
        } else {
          G.mercenary.returning = false;
          G.mercenary.state = 'idle';
          G.mercenary.attackCD = 20;
        }
      }
    }
  } else {
    let targetIdx = -1;
    let bestScore = 180;
    for (let i = 0; i < G.enemyList.length; i++) {
      const me3 = G.enemyList[i];
      const me3Dist = Math.hypot(me3.x + 7 - G.mercenary.x, me3.y + 7 - G.mercenary.y);
      if (me3Dist > 180) continue;
      const vPen = Math.abs(me3.y - G.mercenary.y) * 0.35;
      let scoreM = me3Dist + vPen;
      let losBlocked = false;
      for (let li = 0; li < G.platList.length; li++) {
        const lp = G.platList[li];
        if (hitTest((G.mercenary.x + me3.x + 7) / 2, (G.mercenary.y + me3.y + 7) / 2, 6, 6, lp[0], lp[1], lp[2], lp[3])) {
          losBlocked = true;
          break;
        }
      }
      if (losBlocked) scoreM += 40;
      if (scoreM < bestScore) {
        bestScore = scoreM;
        targetIdx = i;
      }
    }

    if (targetIdx !== -1) {
      const tgtX = G.enemyList[targetIdx].x + 7;
      const tgtY = G.enemyList[targetIdx].y + 7;
      const toTgt = Math.hypot(tgtX - G.mercenary.x, tgtY - G.mercenary.y);
      let tgtLOS = true;
      for (let ci = 0; ci < G.platList.length; ci++) {
        const cp = G.platList[ci];
        if (hitTest((G.mercenary.x + tgtX) / 2, (G.mercenary.y + tgtY) / 2, 8, 8, cp[0], cp[1], cp[2], cp[3])) {
          tgtLOS = false;
          break;
        }
      }

      if (toTgt <= 95 && tgtLOS && G.mercenary.attackCD <= 0) {
        const ddx = (tgtX - G.mercenary.x);
        const ddy = (tgtY - G.mercenary.y);
        const ddl = Math.max(1, Math.hypot(ddx, ddy));
        G.mercenary.dashDX = (ddx / ddl) * 11;
        G.mercenary.dashDY = (ddy / ddl) * 11;
        G.mercenary.dashTimer = 10;
        G.mercenary.state = 'dash';
        G.mercenary.attackCD = 26;
        G.mercenary.trail.push({ x: G.mercenary.x, y: G.mercenary.y, life: 14 });
      } else {
        const edir = (tgtX > G.mercenary.x) ? 1 : -1;
        const tgtAbove = (tgtY < G.mercenary.y - 18);
        const hDist = Math.abs(tgtX - G.mercenary.x);
        G.mercenary.pvxm += edir * 0.38;
        if (G.mercenary.pvxm > 3.2) G.mercenary.pvxm = 3.2;
        if (G.mercenary.pvxm < -3.2) G.mercenary.pvxm = -3.2;
        const tProbe = G.mercenary.x + edir * 12;
        let tBlocked = false;
        for (let i = 0; i < G.platList.length; i++) {
          const tPlat = G.platList[i];
          if (hitTest(tProbe, G.mercenary.y + 4, 10, 10, tPlat[0], tPlat[1], tPlat[2], tPlat[3])) {
            tBlocked = true;
            break;
          }
        }
        const needJump = (tBlocked && hDist < 60) || (tgtAbove && hDist < 50);
        if (needJump && G.mercenary.onGround) {
          G.mercenary.pvym = -8.2;
          G.mercenary.onGround = false;
        }
        if (tgtAbove && hDist > 70 && G.mercenary.attackCD <= 0 && G.mercenary.onGround) {
          const ddxB = (tgtX - G.mercenary.x);
          const ddyB = (tgtY - G.mercenary.y);
          const ddlB = Math.max(1, Math.hypot(ddxB, ddyB));
          if (Math.abs(ddyB) > 55) {
            G.mercenary.dashDX = (ddxB / ddlB) * 11;
            G.mercenary.dashDY = (ddyB / ddlB) * 11;
            G.mercenary.dashTimer = 10;
            G.mercenary.state = 'dash';
            G.mercenary.attackCD = 28;
          }
        }
      }
    } else {
      if (tmDist > 350 && G.mercenary.state !== 'dash') {
        G.mercenary.x = G.px + (G.px + 6 > G.mercenary.x ? -20 : 20);
        G.mercenary.y = G.py - 10;
        G.mercenary.pvxm = 0;
        G.mercenary.pvym = 0;
      }
      const followDist = Math.abs(G.px + 6 - G.mercenary.x);
      const fdir = (G.px + 6 > G.mercenary.x) ? 1 : -1;
      let folBlocked = false;
      const folProbe = G.mercenary.x + fdir * 12;
      for (let i = 0; i < G.platList.length; i++) {
        const mpf = G.platList[i];
        if (hitTest(folProbe, G.mercenary.y + 4, 10, 10, mpf[0], mpf[1], mpf[2], mpf[3])) {
          folBlocked = true;
          break;
        }
      }
      let folGap = false;
      if (G.mercenary.onGround) {
        const folGx = G.mercenary.x + fdir * 16;
        let folSup = false;
        for (let i = 0; i < G.platList.length; i++) {
          const gpF = G.platList[i];
          if (folGx > gpF[0] && folGx < gpF[0] + gpF[2] && G.mercenary.y + 14 >= gpF[1] - 4 && G.mercenary.y + 14 <= gpF[1] + 5) {
            folSup = true;
            break;
          }
        }
        folGap = !folSup;
        if (folGap) {
          const folGx2 = G.mercenary.x + fdir * 28;
          for (let i = 0; i < G.platList.length; i++) {
            const gpF2 = G.platList[i];
            if (folGx2 > gpF2[0] && folGx2 < gpF2[0] + gpF2[2] && Math.abs((G.mercenary.y + 14) - gpF2[1]) < 40) {
              folGap = false;
              break;
            }
          }
        }
      }
      if (followDist > 28) {
        G.mercenary.pvxm += fdir * 0.34;
        if (G.mercenary.pvxm > 2.9) G.mercenary.pvxm = 2.9;
        if (G.mercenary.pvxm < -2.9) G.mercenary.pvxm = -2.9;
      } else if (followDist < 18) {
        G.mercenary.pvxm *= 0.82;
        if (Math.abs(G.mercenary.pvxm) < 0.1) G.mercenary.pvxm = 0;
      } else {
        if (G.mercenary.pvxm > 0) {
          G.mercenary.pvxm -= 0.18;
          if (G.mercenary.pvxm < 0) G.mercenary.pvxm = 0;
        } else if (G.mercenary.pvxm < 0) {
          G.mercenary.pvxm += 0.18;
          if (G.mercenary.pvxm > 0) G.mercenary.pvxm = 0;
        }
      }
      G.mercenary.stuckT = G.mercenary.stuckT || 0;
      if (G.mercenary.onGround && Math.abs(G.mercenary.pvxm) < 0.2 && followDist > 30) G.mercenary.stuckT++;
      else G.mercenary.stuckT = 0;

      if (G.mercenary.stuckT > 22 && G.mercenary.onGround) {
        G.mercenary.pvym = -7.8;
        G.mercenary.onGround = false;
        G.mercenary.stuckT = 0;
      }
      if (followDist > 20 && (folBlocked || folGap || (G.py + 8 < G.mercenary.y - 22)) && G.mercenary.onGround) {
        G.mercenary.pvym = -8.0;
        G.mercenary.onGround = false;
      }
    }
  }

  if (G.mercenary.state !== 'dash') {
    G.mercenary.pvym += 0.5;
    if (G.mercenary.pvym > 10) G.mercenary.pvym = 10;
    G.mercenary.x += G.mercenary.pvxm;
    G.mercenary.y += G.mercenary.pvym;
    G.mercenary.onGround = false;
    for (let i = 0; i < G.platList.length; i++) {
      const mp2 = G.platList[i];
      if (hitTest(G.mercenary.x, G.mercenary.y, 12, 14, mp2[0], mp2[1], mp2[2], mp2[3])) {
        if (G.mercenary.pvym > 0) {
          G.mercenary.y = mp2[1] - 14;
          G.mercenary.pvym = 0;
          G.mercenary.onGround = true;
        } else if (G.mercenary.pvym < 0) {
          G.mercenary.y = mp2[1] + mp2[3];
          G.mercenary.pvym = 0;
        }
      }
    }
    if (G.mercenary.x < 0) G.mercenary.x = 0;
    if (G.mercenary.x > G.levelW - 12) G.mercenary.x = G.levelW - 12;
  }

  for (let i = G.mercenary.trail.length - 1; i >= 0; i--) {
    G.mercenary.trail[i].life--;
    if (G.mercenary.trail[i].life <= 0) G.mercenary.trail.splice(i, 1);
  }

  if (G.mercenary.attackCD > 0 && G.mercenary.state !== 'dash') G.mercenary.attackCD--;
}
