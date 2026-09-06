import { G } from './state.js';
import { levels } from './levels.js';
import { input, hitTest, resetPlayerTransient } from './player.js';
import { playImpactSound, playGameOverSound, stopSunBattleMusic, stopAllBgm, stopGameOverBgm, audioLevelMusic, startSunBattleMusic } from './audio.js';
var MERC_WEIGHTS = [0.322497,0.487635,2.092766,1.898941,-1.554489,2.359027,-0.461373,-0.486549,0.300074,-1.007611,-0.918000,1.392882,0.737550,1.018002,0.197128,-1.206836,-1.804399,-1.773482,-0.237806,-0.352953,0.797649,1.332043,0.874462,0.061290,-1.073861,-1.673746,-0.688109,1.842079,0.141718,0.803960,-0.809859,0.105714,2.365887,-0.117582,0.479755,-0.937944,-1.861802,0.035554,3.699180,0.858208,1.761528,-1.623166,-2.262835,-1.065472,2.108608,0.048867,1.396110,0.263961,-1.610974,-0.137082,0.042844,1.427858,0.719162,0.262156,-1.096781,-0.853847,0.437849,-0.434578,-0.753942,-2.932730,-0.573048,1.369255,-0.368905,0.433555,-0.124136,-2.220882,-0.211088,0.562663,3.115312,-0.174085,-1.025988,1.512716,1.573080,-0.817067,-0.660910,2.766700,-0.099102,2.772087,-1.260832,-0.371030,0.864043,-0.928753,-0.766718,0.235206,-2.366748,1.908203,1.511522,1.214424,1.599911,0.451730,0.562019];
var MERC_NIN = 7, MERC_NHID = 8, MERC_NOUT = 3;
function mercForward(inp) {
  var h = [], o = [], idx = 0;
  for (var i = 0; i < MERC_NHID; i++) {
    var s = MERC_WEIGHTS[idx + MERC_NIN];
    for (var j = 0; j < MERC_NIN; j++) s += MERC_WEIGHTS[idx + j] * inp[j];
    idx += MERC_NIN + 1;
    h.push(Math.tanh(s));
  }
  for (var k = 0; k < MERC_NOUT; k++) {
    var t = MERC_WEIGHTS[idx + MERC_NHID];
    for (var l = 0; l < MERC_NHID; l++) t += MERC_WEIGHTS[idx + l] * h[l];
    idx += MERC_NHID + 1;
    o.push(Math.tanh(t));
  }
  return o;
}
export function die() {
  if (G.sunBoss) {
    G.sunDeath = true;
    G.sunDialogue = "";
    G.sunDialogueTimer = 0;
    try{ stopSunBattleMusic(); }catch(e){}
    try{ playGameOverSound(); }catch(e){}
    return;
  }
  if (G.currentLevel >= 2 && G.checkpoint && G.checkpoint.active) {
    try{ playImpactSound(); }catch(e){}
    G.px = G.checkpoint.x;
    G.py = G.checkpoint.y;
    G.pvy = 0;
    G.pvx = 0;
    for (var di = 0; di < G.enemyList.length; di++) {
      var de = G.enemyList[di];
      if (Math.abs(de.x - G.px) < 60) { de.x = de.ox; de.vx = Math.abs(de.vx); }
    }
  } else if (G.currentLevel >= 2) {
    try{ playImpactSound(); }catch(e){}
    var L = levels[G.currentLevel];
    G.px = L.spawn[0];
    G.py = L.spawn[1];
    G.pvy = 0;
    G.pvx = 0;
    for (var di2 = 0; di2 < G.enemyList.length; di2++) {
      var de2 = G.enemyList[di2];
      if (Math.abs(de2.x - G.px) < 60) { de2.x = de2.ox; de2.vx = Math.abs(de2.vx); }
    }
  } else {
    G.dead = true;
    try{ playGameOverSound(); }catch(e){}
    stopGameOverBgm();
  }
}

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
    G.sunDialogue = "";
    G.sunDialogueTimer = 0;
    G.sunDeath = true;
    G.score += 100;
    try{ stopSunBattleMusic(); }catch(e){}
  } else if (G.sunBoss.hp <= 25 && G.sunBoss.phase < 3) {
    G.sunBoss.phase = 3;
    G.playerHp = 1;
    G.showPlayerHealth = true;
    G.sunDialogue = "";
    G.sunDialogueTimer = 0;
  } else if (G.sunBoss.hp <= 50 && G.sunBoss.phase < 2) {
    G.sunBoss.phase = 2;
    G.showPlayerHealth = true;
    G.sunDialogue = "";
    G.sunDialogueTimer = 0;
  } else {
    G.sunDialogue = "";
    G.sunDialogueTimer = 0;
  }
}

export function updateSunAmbient() {

    if (G.sunBoss || G.sunDeath) {
      if (G.sunDialogueTimer > 0) G.sunDialogueTimer--;
      else G.sunDialogue = '';

      var L = levels[G.currentLevel];
      var hpRatio = G.sunBoss ? G.sunBoss.hp / G.sunBoss.maxHp : 0;
      var speed = 0.008 + (1 - hpRatio) * 0.025;
      G.sunRays += speed;
      var maxP = G.sunDeath ? 12 : 20 + Math.floor((1 - hpRatio) * 45);

      var pMinX, pMaxX, pMinY, pMaxY, rise;
      if (G.sunDeath) {
        pMinX = 200; pMaxX = 280; pMinY = 55; pMaxY = 135; rise = false;
      } else if (G.sunBoss) {
        pMinX = 315; pMaxX = 478; pMinY = 20; pMaxY = 375; rise = true;
      } else {
        var pr = L.sunR1 || 40;
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
        var type = Math.random();
        var p = {
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
      for (var si = G.sunParticles.length - 1; si >= 0; si--) {
        var sp = G.sunParticles[si];
        sp.age++;
        sp.wobblePhase += sp.wobbleSpeed;
        sp.x += sp.vx + Math.sin(sp.wobblePhase) * sp.wobbleAmp;
        sp.y += sp.vy;
        var lifeRatio = sp.age / sp.maxLife;
        var fade = 1;
        if (lifeRatio < 0.12) fade = lifeRatio / 0.12;
        else if (lifeRatio > 0.72) fade = 1 - (lifeRatio - 0.72) / 0.28;
        sp.fade = Math.max(0, Math.min(1, fade));
        if (sp.x < pMinX - 10 || sp.x > pMaxX + 10 || sp.y < pMinY - 30 || sp.y > 360 || sp.age >= sp.maxLife) {
          if (G.sunDeath) { G.sunParticles.splice(si, 1); }
          else {
            place(sp);
            sp.age = 0;
            sp.maxLife = 160 + Math.random() * 260;
          }
        }
      }
    }

    if (G.dead || G.won || G.sunDeath) return;
}
export function updateEntities() {
var i, p;

    for (i = 0; i < G.gemList.length; i++) {
      var g = G.gemList[i];
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
      var shopDistX = Math.abs(G.px + 6 - 224);
      var shopDistY = Math.abs(G.py + 8 - 201);
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

    if (G.mercenary && G.mercenary.alive && !G.mercenary.hired) {
      var mercCost = 30;
      var mercDistX = Math.abs(G.px + 6 - G.mercenary.x);
      var mercDistY = Math.abs(G.py + 8 - G.mercenary.y);
      if (mercDistX < 24 && mercDistY < 24) {
        if (input.keys.KeyE && G.score >= mercCost) {
          G.score -= mercCost;
          G.mercenary.hired = true;
          G.mercHired = true;
          G.mercHiredPersist = true;
          input.keys.KeyE = false;
        }
      }
    }

    if (G.mercenary && G.mercenary.hired) {
      var tmDist = Math.hypot(G.px + 6 - G.mercenary.x, G.py + 8 - G.mercenary.y);

      if (G.mercenary.state !== 'dash' && G.mercenary.y > G.levelH + 40) {
        G.mercenary.returning = true;
        G.mercenary.pvym = 0;
        G.mercenary.pvxm = 0;
        var rdx0 = (G.px + 6 - G.mercenary.x);
        var rdy0 = (G.py + 8 - G.mercenary.y);
        var rdl0 = Math.max(1, Math.hypot(rdx0, rdy0));
        G.mercenary.dashDX = (rdx0 / rdl0) * 8;
        G.mercenary.dashDY = (rdy0 / rdl0) * 8;
        G.mercenary.dashTimer = 13;
        G.mercenary.state = 'dash';
      }

      if (G.mercenary.state === 'dash') {
        G.mercenary.x += G.mercenary.dashDX;
        G.mercenary.y += G.mercenary.dashDY;
        G.mercenary.trail.push({ x: G.mercenary.x, y: G.mercenary.y, life: 14 });
        G.mercenary.trail.push({ x: G.mercenary.x - G.mercenary.dashDX * 0.3, y: G.mercenary.y - G.mercenary.dashDY * 0.3, life: 10 });
        var mHit = -1;
        for (i = 0; i < G.enemyList.length; i++) {
          var mhe = G.enemyList[i];
          if (Math.abs(mhe.x + 7 - G.mercenary.x) < 22 && Math.abs(mhe.y + 7 - G.mercenary.y) < 22) {
            mHit = i;
            break;
          }
        }
        if (mHit !== -1) {
          var hx = G.enemyList[mHit].x + 7, hy = G.enemyList[mHit].y + 7;
          G.enemyList.splice(mHit, 1);
          G.killCount++;
          for (var hp = 0; hp < 8; hp++) G.breakEffects.push({ x: hx, y: hy, vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6 -2, life: 18, col: '#74b9ff' });
          try{ playImpactSound(); }catch(e){}
          G.mercenary.dashTimer = 0;
          G.mercenary.state = 'idle';
          G.mercenary.attackCD = 22;
        } else {
          G.mercenary.dashTimer--;
          if (G.mercenary.dashTimer <= 0) {
            if (G.mercenary.returning && tmDist > 60) {
              var rdx = (G.px + 6 - G.mercenary.x);
              var rdy = (G.py + 8 - G.mercenary.y);
              var rdl = Math.max(1, Math.hypot(rdx, rdy));
              G.mercenary.dashDX = (rdx / rdl) * 10;
              G.mercenary.dashDY = (rdy / rdl) * 10;
              G.mercenary.dashTimer = 11;
              try{ playDashSound(); }catch(e){}
            } else {
              G.mercenary.returning = false;
              G.mercenary.state = 'idle';
              G.mercenary.attackCD = 20;
            }
          }
        }
      } else {
        var targetIdx = -1;
        var bestScore = 180;
        for (i = 0; i < G.enemyList.length; i++) {
          var me3 = G.enemyList[i];
          var me3Dist = Math.hypot(me3.x + 7 - G.mercenary.x, me3.y + 7 - G.mercenary.y);
          if (me3Dist > 180) continue;
          var vPen = Math.abs(me3.y - G.mercenary.y) * 0.35;
          var scoreM = me3Dist + vPen;
          var losBlocked = false;
          for (var li = 0; li < G.platList.length; li++) {
            var lp = G.platList[li];
            if (hitTest((G.mercenary.x + me3.x + 7) / 2, (G.mercenary.y + me3.y + 7) / 2, 6, 6, lp[0], lp[1], lp[2], lp[3])) { losBlocked = true; break; }
          }
          if (losBlocked) scoreM += 40;
          if (scoreM < bestScore) { bestScore = scoreM; targetIdx = i; }
        }

        var hasTarget = targetIdx !== -1;

        if (hasTarget) {
          var tgtX = G.enemyList[targetIdx].x + 7;
          var tgtY = G.enemyList[targetIdx].y + 7;
          var toTgt = Math.hypot(tgtX - G.mercenary.x, tgtY - G.mercenary.y);
          var tgtLOS = true;
          for (var ci = 0; ci < G.platList.length; ci++) {
            var cp = G.platList[ci];
            if (hitTest((G.mercenary.x + tgtX) / 2, (G.mercenary.y + tgtY) / 2, 8, 8, cp[0], cp[1], cp[2], cp[3])) { tgtLOS = false; break; }
          }

          if (toTgt <= 95 && tgtLOS && G.mercenary.attackCD <= 0) {
            var ddx = (tgtX - G.mercenary.x);
            var ddy = (tgtY - G.mercenary.y);
            var ddl = Math.max(1, Math.hypot(ddx, ddy));
            G.mercenary.dashDX = (ddx / ddl) * 11;
            G.mercenary.dashDY = (ddy / ddl) * 11;
            G.mercenary.dashTimer = 10;
            G.mercenary.state = 'dash';
            G.mercenary.attackCD = 26;
            G.mercenary.trail.push({ x: G.mercenary.x, y: G.mercenary.y, life: 14 });
            try{ playDashSound(); }catch(e){}
          } else {
            var edir = (tgtX > G.mercenary.x) ? 1 : -1;
            var tgtAbove = (tgtY < G.mercenary.y - 18);
            var hDist = Math.abs(tgtX - G.mercenary.x);
            G.mercenary.pvxm += edir * 0.38;
            if (G.mercenary.pvxm > 3.2) G.mercenary.pvxm = 3.2;
            if (G.mercenary.pvxm < -3.2) G.mercenary.pvxm = -3.2;
            var tProbe = G.mercenary.x + edir * 12;
            var tBlocked = false;
            for (i = 0; i < G.platList.length; i++) {
              var tPlat = G.platList[i];
              if (hitTest(tProbe, G.mercenary.y + 4, 10, 10, tPlat[0], tPlat[1], tPlat[2], tPlat[3])) { tBlocked = true; break; }
            }
            var needJump = (tBlocked && hDist < 60) || (tgtAbove && hDist < 50);
            if (needJump && G.mercenary.onGround) {
              G.mercenary.pvym = -8.2;
              G.mercenary.onGround = false;
            }
            if (tgtAbove && hDist > 70 && G.mercenary.attackCD <= 0 && G.mercenary.onGround) {
              var ddxB = (tgtX - G.mercenary.x);
              var ddyB = (tgtY - G.mercenary.y);
              var ddlB = Math.max(1, Math.hypot(ddxB, ddyB));
              if (Math.abs(ddyB) > 55) {
                G.mercenary.dashDX = (ddxB / ddlB) * 11;
                G.mercenary.dashDY = (ddyB / ddlB) * 11;
                G.mercenary.dashTimer = 10;
                G.mercenary.state = 'dash';
                G.mercenary.attackCD = 28;
                try{ playDashSound(); }catch(e){}
              }
            }
          }
        } else {
          if (tmDist > 350 && G.mercenary.state !== 'dash') {
            G.mercenary.x = G.px + (G.px + 6 > G.mercenary.x ? -20 : 20);
            G.mercenary.y = G.py - 10;
            G.mercenary.pvxm = 0; G.mercenary.pvym = 0;
          }
          var followDist = Math.abs(G.px + 6 - G.mercenary.x);
          var fdir = (G.px + 6 > G.mercenary.x) ? 1 : -1;
          var folBlocked = false;
          var folProbe = G.mercenary.x + fdir * 12;
          for (i = 0; i < G.platList.length; i++) {
            var mpf = G.platList[i];
            if (hitTest(folProbe, G.mercenary.y + 4, 10, 10, mpf[0], mpf[1], mpf[2], mpf[3])) { folBlocked = true; break; }
          }
          var folGap = false;
          if (G.mercenary.onGround) {
            var folGx = G.mercenary.x + fdir * 16;
            var folSup = false;
            for (i = 0; i < G.platList.length; i++) {
              var gpF = G.platList[i];
              if (folGx > gpF[0] && folGx < gpF[0] + gpF[2] && G.mercenary.y + 14 >= gpF[1] - 4 && G.mercenary.y + 14 <= gpF[1] + 5) { folSup = true; break; }
            }
            folGap = !folSup;
            if (folGap) {
              var folGx2 = G.mercenary.x + fdir * 28;
              for (i = 0; i < G.platList.length; i++) {
                var gpF2 = G.platList[i];
                if (folGx2 > gpF2[0] && folGx2 < gpF2[0] + gpF2[2] && Math.abs((G.mercenary.y + 14) - gpF2[1]) < 40) { folGap = false; break; }
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
            if (G.mercenary.pvxm > 0) { G.mercenary.pvxm -= 0.18; if (G.mercenary.pvxm < 0) G.mercenary.pvxm = 0; }
            else if (G.mercenary.pvxm < 0) { G.mercenary.pvxm += 0.18; if (G.mercenary.pvxm > 0) G.mercenary.pvxm = 0; }
          }
          G.mercenary.stuckT = G.mercenary.stuckT || 0;
          if (G.mercenary.onGround && Math.abs(G.mercenary.pvxm) < 0.2 && followDist > 30) G.mercenary.stuckT++; else G.mercenary.stuckT = 0;
          if (G.mercenary.stuckT > 22 && G.mercenary.onGround) { G.mercenary.pvym = -7.8; G.mercenary.onGround = false; G.mercenary.stuckT = 0; }
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
        for (i = 0; i < G.platList.length; i++) {
          var mp2 = G.platList[i];
          if (hitTest(G.mercenary.x, G.mercenary.y, 12, 14, mp2[0], mp2[1], mp2[2], mp2[3])) {
            if (G.mercenary.pvym > 0) { G.mercenary.y = mp2[1] - 14; G.mercenary.pvym = 0; G.mercenary.onGround = true; }
            else if (G.mercenary.pvym < 0) { G.mercenary.y = mp2[1] + mp2[3]; G.mercenary.pvym = 0; }
          }
        }
        if (G.mercenary.x < 0) G.mercenary.x = 0;
        if (G.mercenary.x > G.levelW - 12) G.mercenary.x = G.levelW - 12;
      }

      for (i = G.mercenary.trail.length - 1; i >= 0; i--) {
        G.mercenary.trail[i].life--;
        if (G.mercenary.trail[i].life <= 0) G.mercenary.trail.splice(i, 1);
      }

      if (G.mercenary.attackCD > 0 && G.mercenary.state !== 'dash') G.mercenary.attackCD--;
    }

    if (G.waveCD > 0) G.waveCD--;

    if (input.xPressed && G.hasWave && !G.waveActive && G.waveCD <= 0) {
      G.waveActive = true;
      G.waveRadius = 0;
      G.waveX = G.px + 6;
      G.waveY = G.py + 8;
      G.waveCD = 120;
      input.xPressed = false;
      for (i = G.enemyList.length - 1; i >= 0; i--) {
        var ex = G.enemyList[i].x + 7;
        var ey = G.enemyList[i].y + 7;
        var dist = Math.sqrt((ex - G.waveX) * (ex - G.waveX) + (ey - G.waveY) * (ey - G.waveY));
        if (dist < 120) { G.enemyList.splice(i, 1); G.killCount++; }
      }
      for (i = G.platList.length - 1; i >= 0; i--) {
        var pp = G.platList[i];
        var cx = pp[0] + pp[2] / 2;
        var cy = pp[1] + pp[3] / 2;
        var d2 = Math.sqrt((cx - G.waveX) * (cx - G.waveX) + (cy - G.waveY) * (cy - G.waveY));
        if (d2 < 120 && pp[2] <= 60) G.platList.splice(i, 1);
      }
    }
    input.xPressed = false;

    for (i = 0; i < G.enemyList.length; i++) {
      var e = G.enemyList[i];
      e.x += e.vx;
      if (e.x > e.ox + 50 || e.x < e.ox - 50) e.vx *= -1;
      if (hitTest(G.px, G.py, 12, 16, e.x, e.y, 14, 14)) {
        if (G.pvy > 0 && G.py + 12 < e.y + 7) {
          G.pvy = -7;
          G.enemyList.splice(i, 1);
          G.killCount++;
          i--;
          try{ playImpactSound(); }catch(e){}
        } else if (G.dashKillEquipped && G.wasDashing) {
          G.dashTimer += 5;
          var hx2 = e.x + 7, hy2 = e.y + 7;
          G.enemyList.splice(i, 1);
          G.killCount++;
          for (var hp2 = 0; hp2 < 6; hp2++) G.breakEffects.push({ x: hx2, y: hy2, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5 -1, life: 14, col: '#00cec9' });
          i--;
        } else {
          die();
          return;
        }
      }
    }

    if (G.spikeList.length > 0) {
      for (i = 0; i < G.spikeList.length; i++) {
        var sp = G.spikeList[i];
        for (var ei = G.enemyList.length - 1; ei >= 0; ei--) {
          var se = G.enemyList[ei];
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

    for (i = G.dashPointList.length - 1; i >= 0; i--) {
      var dp = G.dashPointList[i];
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

    if (G.boss) {
      if (G.boss.stun > 0) {
        G.boss.stun--;
      } else {
        var bspd = 1.5 + G.boss.phase * 0.8;

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
                return;
              }
              for (var bki = G.platList.length - 1; bki >= 0; bki--) {
                var bkp = G.platList[bki];
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
            for (var pi = 0; pi < 3 + G.boss.phase; pi++) {
              var ang = -0.6 + (1.2 / (2 + G.boss.phase)) * pi;
              G.bossProjectiles.push({ x: G.boss.x + 10, y: G.boss.y + 10, vx: Math.cos(ang) * 3.5, vy: Math.sin(ang) * 3.5, life: 50 });
            }
          } else {
            G.boss.vx = (G.px > G.boss.x ? bspd : -bspd) * (G.boss.isBoss2 ? 3 : 2.5);
          }
        }
      }

      for (var bi = G.bossProjectiles.length - 1; bi >= 0; bi--) {
        var bp = G.bossProjectiles[bi];
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
            return;
          }
        }
      }

      for (var swi = G.bossShockwaves.length - 1; swi >= 0; swi--) {
        var sw = G.bossShockwaves[swi];
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
            return;
          }
        }
      }

      if (G.boss.stun <= 0 && hitTest(G.px, G.py, 12, 16, G.boss.x, G.boss.y, 28, 32)) {
        if (G.dashKillEquipped && G.wasDashing) {
          var dmg = Math.max(1, Math.floor(G.killCount / 3));
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
          try{ playImpactSound(); }catch(e){}
        } else {
          die();
          return;
        }
      }

      if (G.waveActive) {
        var bdist = Math.sqrt((G.boss.x + 14 - G.waveX) * (G.boss.x + 14 - G.waveX) + (G.boss.y + 16 - G.waveY) * (G.boss.y + 16 - G.waveY));
        if (bdist < 100 && G.boss.stun <= 0) {
          G.boss.hp -= 1;
          G.boss.stun = 25;
          G.boss.vx = (G.waveX < G.boss.x ? 2 : -2);
        }
        for (var bpi = G.bossProjectiles.length - 1; bpi >= 0; bpi--) {
          var bpw = G.bossProjectiles[bpi];
          var bpd = Math.sqrt((bpw.x - G.waveX) * (bpw.x - G.waveX) + (bpw.y - G.waveY) * (bpw.y - G.waveY));
          if (bpd < G.waveRadius) {
            G.bossProjectiles.splice(bpi, 1);
          }
        }
      }

      if (G.boss.hp <= 0) {
        G.boss = null;
        G.score += 100;
      } else {
        G.boss.phase = G.boss.hp <= G.boss.maxHp * 0.3 ? 2 : G.boss.hp <= G.boss.maxHp * 0.6 ? 1 : 0;
      }
    }

    if (G.sunBoss) {
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

    if (G.currentLevel === 6 && G.px > 195 && G.px < 285 && G.py < 0 && G.pvy < 0) {
      loadLevel(12);
      return;
    }

    if (G.currentLevel >= 12 && G.currentLevel <= 15 && levels[G.currentLevel].secret && G.py < 0 && !G.sunDeath) {
      loadLevel(G.currentLevel + 1);
      return;
    }

    if (G.flagObj && Math.abs(G.px - G.flagObj.x) < 16 && Math.abs(G.py - G.flagObj.y) < 20) {
      if (!G.boss && !G.sunBoss) {
        if (levels[G.currentLevel] && levels[G.currentLevel].secret) {
          G.score += 100;
          if (levels[G.currentLevel].sunBossLevel && G.sunBoss && G.sunBoss.hp > 0) {
            return;
          }
          G.won = true;
        } else if (levels[G.currentLevel] && levels[G.currentLevel].shop) {
          G.score += 100;
          G.won = true;
        } else {
          G.score += 50;
          if (G.currentLevel + 1 >= levels.length) {
            G.won = true;
          } else {
            loadLevel(G.currentLevel + 1);
          }
        }
      }
    }
}


export function loadLevel(n) {
  var L = levels[n % levels.length];
  G.currentLevel = n;
  try { stopSunBattleMusic(); } catch (e) {}
  if (L.sunBossLevel) {
    stopAllBgm();
    try { startSunBattleMusic(); } catch (e) {}
  } else if (L.secret) {
    audioLevelMusic('secret', G.dead);
  } else if (L.galaxy) {
    audioLevelMusic('galaxy', G.dead);
  } else if (L.skyFade) {
    audioLevelMusic('sky', G.dead);
  } else {
    audioLevelMusic('main', G.dead);
  }
  G.px = L.spawn[0];
  G.py = L.spawn[1];
  G.pvx = 0;
  G.pvy = 0;
  G.onGround = false;
  G.facing = 1;

  G.platList = [];
  var i;
  for (i = 0; i < L.ground.length; i++) G.platList.push(L.ground[i].slice());
  for (i = 0; i < L.plat.length; i++) G.platList.push(L.plat[i].slice());

  G.gemList = [];
  for (i = 0; i < L.gems.length; i++) {
    G.gemList.push({ x: L.gems[i][0], y: L.gems[i][1], alive: true });
  }

  G.enemyList = [];
  for (i = 0; i < L.enemies.length; i++) {
    G.enemyList.push({ x: L.enemies[i][0], y: L.enemies[i][1], vx: 1.2, ox: L.enemies[i][0] });
  }

  G.dashItem = L.dash ? { x: L.dash[0], y: L.dash[1], alive: !G.hasDash } : { x: -100, y: -100, alive: false };
  G.waveItem = L.wave ? { x: L.wave[0], y: L.wave[1], alive: !G.hasWave } : null;
  G.flagObj = L.flag ? { x: L.flag[0], y: L.flag[1] } : null;

  G.spikeList = [];
  if (L.spikes) {
    for (i = 0; i < L.spikes.length; i++) {
      G.spikeList.push({ x: L.spikes[i][0], y: L.spikes[i][1], w: L.spikes[i][2] || 12 });
    }
  }
  G.dashPointList = [];
  G.breakEffects = [];
  if (L.dashLine) {
    for (var dlx = 0; dlx < L.dashLine; dlx += 40) {
      G.dashPointList.push({ x: dlx, y: 348, alive: true });
    }
  } else if (L.dashExtend) {
    for (i = 0; i < L.dashExtend.length; i++) {
      G.dashPointList.push({ x: L.dashExtend[i][0], y: L.dashExtend[i][1], alive: true });
    }
  }
  G.levelH = L.worldH || 320;
  G.levelW = L.worldW || 480;
  G.camX = 0;
  G.camY = 0;
  if (L.boss2) {
    G.boss = { x: L.boss2.x, y: L.boss2.y, hp: L.boss2.hp, maxHp: L.boss2.maxHp, vx: L.boss2.vx, atkCD: 0, atkPattern: 0, stun: 0, phase: 0, isBoss2: true, jumpTimer: 120, jumping: false, jumpVY: 0, stompCD: 0 };
  } else if (L.boss) {
    G.boss = { x: L.boss.x, y: L.boss.y, hp: L.boss.hp, maxHp: L.boss.maxHp, vx: L.boss.vx, atkCD: 0, atkPattern: 0, stun: 0, phase: 0 };
  } else {
    G.boss = null;
  }
  G.checkpoint = L.checkpoint ? { x: L.checkpoint[0], y: L.checkpoint[1], active: (L.checkpoint[0] === L.spawn[0] && L.checkpoint[1] === L.spawn[1]) } : null;
  G.waveActive = false;
  G.waveRadius = 0;
  G.bossProjectiles = [];
  G.bossShockwaves = [];
  G.mercHired = false;
  if (G.mercHiredPersist) {
    G.mercenary = { x: L.merc ? L.merc[0] : (L.spawn[0] + 24), y: L.merc ? L.merc[1] : L.spawn[1], alive: true, hired: true, attackCD: 0, state: 'idle', dashTimer: 0, dashDX: 0, dashDY: 0, dashMX: 0, dashMY: 0, trail: [], pxm: L.merc ? L.merc[0] : L.spawn[0], pym: L.merc ? L.merc[1] : L.spawn[1], onGround: false, pvxm: 0, pvym: 0, targetIdx: -1, returning: false };
    G.mercHired = true;
  } else {
    G.mercenary = L.merc ? { x: L.merc[0], y: L.merc[1], alive: true, hired: false, attackCD: 0, state: 'idle', dashTimer: 0, dashDX: 0, dashDY: 0, dashMX: 0, dashMY: 0, trail: [], pxm: L.merc[0], pym: L.merc[1], onGround: false, pvxm: 0, pvym: 0, targetIdx: -1, returning: false } : null;
  }
  G.dashCD = 0;
  G.dashTimer = 0;
  G.dashTrail = [];
  G.dashMX = 0;
  G.dashMY = 0;
  G.dashDX = 0;
  G.dashDY = 0;
  resetPlayerTransient();
  G.shakeX = 0;
  G.shakeY = 0;

  G.sunBoss = L.sunBossLevel ? { hp: 100, maxHp: 100, phase: 0, hitCount: 0, stun: 0 } : null;
  G.playerHp = 100;
  G.showPlayerHealth = false;
  G.sunHitCount = 0;
  G.sunDeath = false;
  G.sunDialogue = '';
  G.sunDialogueTimer = 0;
  G.sunKnockback = 0;
  G.sunRays = 0;
  G.sunParticles = [];
}

