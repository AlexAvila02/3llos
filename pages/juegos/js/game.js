import { G } from './state.js';
import { levels, nextStoryLevel } from './levels.js';
import { initAudioUI, audioLevelMusic, stopAllBgm, resumeMainBgm, updateAudioFrame, startSunBattleMusic, stopSunBattleMusic, syncSunBattleMusic } from './audio.js';
import { input, initInput, updatePlayer, resetPlayerTransient } from './player.js';
import { updateSunAmbient, updateEntities, loadLevel } from './entities.js';
var backIcon = document.getElementById('back-icon');
var bctx = backIcon.getContext('2d');
bctx.fillStyle = '#fff';
bctx.fillRect(0, 0, 1, 1);
bctx.fillRect(6, 0, 1, 1);
bctx.fillRect(1, 1, 1, 1);
bctx.fillRect(5, 1, 1, 1);
bctx.fillRect(2, 2, 1, 1);
bctx.fillRect(4, 2, 1, 1);
bctx.fillRect(3, 3, 1, 1);
bctx.fillRect(2, 4, 1, 1);
bctx.fillRect(4, 4, 1, 1);
bctx.fillRect(1, 5, 1, 1);
bctx.fillRect(5, 5, 1, 1);
bctx.fillRect(0, 6, 1, 1);
bctx.fillRect(6, 6, 1, 1);
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');

function skyFadeT() {
  var Lf = levels[currentLevel];
  if (!Lf || !Lf.skyFade || !flagObj) return 0;
  var d = Math.abs(px - flagObj.x);
  var r = (Lf.fadeRange || 1400) * 1.5;
  var t = 1 - Math.min(1, d / r);
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t * t * (3 - 2 * t);
}

function drawGalaxySky(alpha) {
  var a = alpha === undefined ? 1 : alpha;
  var grdG = ctx.createLinearGradient(0, 0, 0, 320);
  grdG.addColorStop(0, 'rgba(5,0,20,' + a + ')');
  grdG.addColorStop(0.5, 'rgba(11,5,51,' + a + ')');
  grdG.addColorStop(1, 'rgba(26,10,58,' + a + ')');
  ctx.fillStyle = grdG;
  ctx.fillRect(0, 0, 480, 320);

  var tNow = Date.now() / 600;
  for (var gi = 0; gi < 70; gi++) {
    var sx = ((gi * 137 + 20) % 500) - 10;
    var sy = ((gi * 89 + 15) % 300);
    var tw = 0.4 + 0.6 * Math.abs(Math.sin(tNow + gi));
    ctx.fillStyle = gi % 9 === 0 ? '#a29bfe' : (gi % 5 === 0 ? '#74b9ff' : '#ffffff');
    ctx.globalAlpha = tw * a;
    ctx.fillRect(sx, sy, gi % 4 === 0 ? 2 : 1, gi % 4 === 0 ? 2 : 1);
  }
  ctx.globalAlpha = 1;

  var gcx = 340, gcy = 90;
  var gglow = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, 90);
  gglow.addColorStop(0, 'rgba(155,89,182,' + (0.5 * a) + ')');
  gglow.addColorStop(0.4, 'rgba(108,92,231,' + (0.25 * a) + ')');
  gglow.addColorStop(1, 'rgba(108,92,231,0)');
  ctx.fillStyle = gglow;
  ctx.beginPath();
  ctx.arc(gcx, gcy, 90, 0, Math.PI * 2);
  ctx.fill();

  for (var ga2 = 0; ga2 < 110; ga2++) {
    var ang = ga2 * 0.42;
    var rad = (ga2 % 45) * 1.9;
    var gpx = gcx + Math.cos(ang + tNow * 0.3) * rad * 0.45;
    var gpy = gcy + Math.sin(ang) * rad * 0.28;
    ctx.fillStyle = ga2 % 4 === 0 ? 'rgba(255,214,165,' + (0.7 * a) + ')' : (ga2 % 3 === 0 ? 'rgba(155,180,255,' + (0.7 * a) + ')' : 'rgba(230,170,255,' + (0.6 * a) + ')');
    ctx.fillRect(gpx, gpy + 20, ga2 % 3 === 0 ? 2 : 1, ga2 % 3 === 0 ? 2 : 1);
  }
}

function restartGame() {
  G.score = 0;
  G.dead = false;
  G.won = false;
  G.hasDash = false;
  G.hasWave = false;
  G.sunBoss = null;
  G.playerHp = 100;
  G.showPlayerHealth = false;
  G.sunHitCount = 0;
  G.sunDeath = false;
  G.sunDialogue = '';
  G.sunDialogueTimer = 0;
  G.sunKnockback = 0;
  G.sunRays = 0;
  G.sunParticles = [];
  G.mercenary = null;
  G.mercHired = false;
  G.mercHiredPersist = false;
  try { stopSunBattleMusic(); } catch (e) {}
  stopAllBgm();
  resumeMainBgm();
  loadLevel(0);
}

function winContinue() {
  var next = nextStoryLevel(G.currentLevel);
  if (next >= levels.length) {
    restartGame();
    return;
  }
  resumeMainBgm();
  loadLevel(next);
  G.won = false;
}
function update() {
  updateSunAmbient();
  if (G.sunDialogueTimer > 0) G.sunDialogueTimer--;
  else G.sunDialogue = '';
  if (G.sunKnockback > 0) G.sunKnockback--;
  updatePlayer();
  updateEntities();
  var i;
  for (i = G.dashTrail.length - 1; i >= 0; i--) {
    G.dashTrail[i].life--;
    if (G.dashTrail[i].life <= 0) G.dashTrail.splice(i, 1);
  }
}
function render() {
  var isSecret = levels[G.currentLevel] && levels[G.currentLevel].secret;
  var L = levels[G.currentLevel];

  if (isSecret) {
    var grdS = ctx.createLinearGradient(0, 0, 0, 280);
    grdS.addColorStop(0, '#1a0533');
    grdS.addColorStop(0.3, '#6b1d5e');
    grdS.addColorStop(0.5, '#e94560');
    grdS.addColorStop(0.65, '#f39c12');
    grdS.addColorStop(0.75, '#f1c40f');
    grdS.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = grdS;
    ctx.fillRect(0, 0, 480, 320);

    var sunR1 = L.sunR1 || 40;
    var sunR2 = L.sunR2 || 30;
    var sunCX = G.sunBoss ? 520 : 240;
    var sunCY = G.sunBoss ? 200 : 160;

    if (G.sunBoss) {
      var hpRatio = G.sunBoss.hp / G.sunBoss.maxHp;
      var rayCount = 10;
      var rayLen = 80 + (1 - hpRatio) * 140;
      var rayAlpha = 0.12 + (1 - hpRatio) * 0.2;
      for (var ri = 0; ri < rayCount; ri++) {
        var angle = G.sunRays + (ri / rayCount) * Math.PI * 2;
        var rx1 = sunCX + Math.cos(angle) * (sunR1 + 5);
        var ry1 = sunCY + Math.sin(angle) * (sunR1 + 5);
        var rx2 = sunCX + Math.cos(angle) * (sunR1 + rayLen);
        var ry2 = sunCY + Math.sin(angle) * (sunR1 + rayLen);
        ctx.strokeStyle = 'rgba(243,156,18,' + rayAlpha + ')';
        ctx.lineWidth = 2 + (1 - hpRatio) * 3;
        ctx.beginPath();
        ctx.moveTo(rx1, ry1);
        ctx.lineTo(rx2, ry2);
        ctx.stroke();
      }

      var glowPulse = Math.sin(Date.now() / (300 - hpRatio * 150)) * (8 + (1 - hpRatio) * 12);
      var glowAlpha = 0.15 + (1 - hpRatio) * 0.2;
      ctx.fillStyle = 'rgba(243,156,18,' + glowAlpha + ')';
      ctx.beginPath();
      ctx.arc(sunCX, sunCY, sunR1 + 20 + glowPulse, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = G.sunBoss && G.sunBoss.stun > 0 ? '#888' : '#f39c12';
    ctx.beginPath();
    ctx.arc(sunCX, sunCY, sunR1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = G.sunBoss && G.sunBoss.stun > 0 ? '#aaa' : '#f1c40f';
    ctx.beginPath();
    ctx.arc(sunCX, sunCY, sunR2, 0, Math.PI * 2);
    ctx.fill();

    if (G.sunBoss) {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      for (i = 0; i < 10; i++) {
        var w1 = 20 + i * 18;
        ctx.fillRect(sunCX - w1, sunCY + sunR1 * 0.6 + i * 10, w1 * 2, 8);
      }
    }

    if (G.sunParticles.length > 0) {
      for (var spi = 0; spi < G.sunParticles.length; spi++) {
        var spp = G.sunParticles[spi];
        var sa = spp.fade !== undefined ? spp.fade * 0.9 : 0.9;
        if (spp.type === 0) {
          ctx.fillStyle = 'rgba(255,255,235,' + sa + ')';
          ctx.beginPath();
          ctx.arc(spp.x, spp.y, spp.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,236,180,' + (sa * 0.45) + ')';
          ctx.beginPath();
          ctx.arc(spp.x, spp.y, spp.size * 2.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (spp.type === 1) {
          var grd = ctx.createRadialGradient(spp.x, spp.y, 0, spp.x, spp.y, spp.size * 2.2);
          grd.addColorStop(0, 'rgba(255,224,120,' + sa + ')');
          grd.addColorStop(0.35, 'rgba(245,170,40,' + (sa * 0.6) + ')');
          grd.addColorStop(1, 'rgba(220,120,20,0)');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(spp.x, spp.y, spp.size * 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          var grd2 = ctx.createRadialGradient(spp.x, spp.y, 0, spp.x, spp.y, spp.size * 3);
          grd2.addColorStop(0, 'rgba(255,244,200,' + sa + ')');
          grd2.addColorStop(0.18, 'rgba(255,190,70,' + (sa * 0.7) + ')');
          grd2.addColorStop(0.5, 'rgba(235,135,25,' + (sa * 0.3) + ')');
          grd2.addColorStop(1, 'rgba(205,90,15,0)');
          ctx.fillStyle = grd2;
          ctx.beginPath();
          ctx.arc(spp.x, spp.y, spp.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (G.sunBoss) {
      var bw = 80;
      var bfill = (G.sunBoss.hp / G.sunBoss.maxHp) * bw;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(240 - bw / 2, 10, bw, 8);
      ctx.fillStyle = G.sunBoss.hp <= 25 ? '#e74c3c' : '#f39c12';
      ctx.fillRect(240 - bw / 2, 10, bfill, 8);
      ctx.fillStyle = '#fff';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SOL ' + G.sunBoss.hp + '%', 240, 8);
      ctx.textAlign = 'left';
    }
  } else if (L.galaxy) {
    drawGalaxySky(1);
  } else if (L.skyFade) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 480, 320);
    var fadeT = skyFadeT();
    if (fadeT > 0.01) {
      drawGalaxySky(fadeT);
    }
  } else {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 480, 320);
  }

  var i, p, g, e, t;
  var cx = -G.camX + G.shakeX, cy = -G.camY + G.shakeY;
  G.shakeX *= 0.8;
  G.shakeY *= 0.8;
  if (Math.abs(G.shakeX) < 0.5) G.shakeX = 0;
  if (Math.abs(G.shakeY) < 0.5) G.shakeY = 0;

  if (!isSecret && !L.galaxy) {
    var starA = 1;
    if (L.skyFade) starA = 1 - skyFadeT();
    if (starA > 0) {
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = starA;
      for (i = 0; i < 40; i++) {
        ctx.fillRect((i * 67 + 10) % 480, (i * 43 + 5 + cy * 0.2) % (G.levelH > 320 ? G.levelH : 160), 1, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  ctx.fillStyle = isSecret ? '#2d1b4e' : (L.galaxy ? '#4a2b7a' : '#6c5ce7');
  for (i = 0; i < G.platList.length; i++) {
    p = G.platList[i];
    ctx.fillRect(p[0] + cx, p[1] + cy, p[2], p[3]);
  }
  ctx.fillStyle = isSecret ? '#4a2d6e' : (L.galaxy ? '#00cec9' : '#00b894');
  for (i = 0; i < G.platList.length; i++) {
    p = G.platList[i];
    ctx.fillRect(p[0] + cx, p[1] + cy, p[2], 3);
  }

  for (i = 0; i < G.spikeList.length; i++) {
    var sp = G.spikeList[i];
    var sw = sp.w;
    var sh = 12;
    ctx.fillStyle = '#e94560';
    ctx.beginPath();
    ctx.moveTo(sp.x + cx, sp.y + cy);
    ctx.lineTo(sp.x + sw / 2 + cx, sp.y - sh + cy);
    ctx.lineTo(sp.x + sw + cx, sp.y + cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.moveTo(sp.x + 2 + cx, sp.y + cy);
    ctx.lineTo(sp.x + sw / 2 + cx, sp.y - sh + 4 + cy);
    ctx.lineTo(sp.x + sw - 2 + cx, sp.y + cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(sp.x + sw / 2 - 1 + cx, sp.y - sh + cy, 2, 3);
  }

  for (i = 0; i < G.dashPointList.length; i++) {
    var dp = G.dashPointList[i];
    if (!dp.alive) continue;
    var dpw = Math.sin(Date.now() / 180 + i) * 2;
    ctx.fillStyle = '#ff69b4';
    ctx.fillRect(dp.x - 6 + dpw + cx, dp.y - 6 + cy, 12, 12);
    ctx.fillStyle = '#ffb6d9';
    ctx.fillRect(dp.x - 3 + dpw + cx, dp.y - 3 + cy, 6, 6);
    ctx.fillStyle = '#fff';
    ctx.fillRect(dp.x - 1 + dpw + cx, dp.y - 1 + cy, 2, 2);
  }

  for (i = 0; i < G.gemList.length; i++) {
    g = G.gemList[i];
    if (!g.alive) continue;
    var w = Math.sin(Date.now() / 200 + i) * 1.5;
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(g.x - 4 + w + cx, g.y - 4 + cy, 8, 8);
    ctx.fillStyle = '#fff8a0';
    ctx.fillRect(g.x - 2 + w + cx, g.y - 2 + cy, 4, 4);
  }

  if (G.dashItem.alive) {
    var dw = Math.sin(Date.now() / 150) * 2;
    ctx.fillStyle = '#e94560';
    ctx.fillRect(G.dashItem.x - 6 + dw + cx, G.dashItem.y - 6 + cy, 12, 12);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(G.dashItem.x - 3 + dw + cx, G.dashItem.y - 3 + cy, 6, 6);
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Z', G.dashItem.x + dw + cx, G.dashItem.y + 3 + cy);
    ctx.textAlign = 'left';
  }

  if (G.waveItem && G.waveItem.alive) {
    var ww = Math.sin(Date.now() / 120) * 2;
    ctx.fillStyle = '#ff9f43';
    ctx.fillRect(G.waveItem.x - 6 + ww + cx, G.waveItem.y - 6 + cy, 12, 12);
    ctx.fillStyle = '#feca57';
    ctx.fillRect(G.waveItem.x - 3 + ww + cx, G.waveItem.y - 3 + cy, 6, 6);
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('X', G.waveItem.x + ww + cx, G.waveItem.y + 3 + cy);
    ctx.textAlign = 'left';
  }

  if (G.waveActive) {
    G.waveRadius += 6;
    var wa = 1 - G.waveRadius / 120;
    ctx.strokeStyle = 'rgba(255,159,67,' + wa + ')';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(G.waveX + cx, G.waveY + cy, G.waveRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(254,202,87,' + (wa * 0.5) + ')';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(G.waveX + cx, G.waveY + cy, G.waveRadius * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    if (G.waveRadius >= 120) G.waveActive = false;
  }

  for (i = 0; i < G.enemyList.length; i++) {
    e = G.enemyList[i];
    ctx.fillStyle = '#e94560';
    ctx.fillRect(e.x + cx, e.y + cy, 14, 14);
    ctx.fillStyle = '#fff';
    ctx.fillRect(e.x + 2 + cx, e.y + 2 + cy, 3, 3);
    ctx.fillRect(e.x + 9 + cx, e.y + 2 + cy, 3, 3);
    ctx.fillStyle = '#000';
    ctx.fillRect(e.x + 3 + cx, e.y + 3 + cy, 2, 2);
    ctx.fillRect(e.x + 10 + cx, e.y + 3 + cy, 2, 2);
  }

  if (G.mercenary && G.mercenary.alive) {
    var mx = G.mercenary.x + cx, my = G.mercenary.y + cy;
    if (G.mercenary.trail && G.mercenary.trail.length > 0) {
      for (var ti = 0; ti < G.mercenary.trail.length; ti++) {
        var tr = G.mercenary.trail[ti];
        var a = (tr.life / 14) * (G.mercenary.state==='dash'?0.85:0.45);
        ctx.fillStyle = 'rgba(116,185,255,' + a + ')';
        ctx.fillRect(tr.x + cx, tr.y + cy, 12, 14);
        ctx.fillStyle = 'rgba(255,255,255,' + a*0.5 + ')';
        ctx.fillRect(tr.x + 2 + cx, tr.y + 2 + cy, 8, 10);
      }
    }
    if (G.mercenary.state === 'dash') {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(mx - 2, my - 1, 16, 16);
    }
    if (G.mercenary.hired) {
      ctx.fillStyle = '#0984e3';
      ctx.fillRect(mx, my, 12, 14);
      ctx.fillStyle = '#74b9ff';
      ctx.fillRect(mx + 1, my + 1, 10, 12);
      ctx.fillStyle = '#dfe6e9';
      ctx.fillRect(mx + 9, my, 3, 8);
      ctx.fillStyle = '#fff';
      ctx.fillRect(mx + 2, my + 3, 2, 2);
      ctx.fillRect(mx + 7, my + 3, 2, 2);
      ctx.fillStyle = '#000';
      ctx.fillRect(mx + 2, my + 3, 1, 1);
      ctx.fillRect(mx + 7, my + 3, 1, 1);
      ctx.fillStyle = '#00b894';
      ctx.fillRect(mx + 3, my + 11, 6, 2);
    } else {
      var mglow = Math.sin(Date.now() / 300) * 2;
      ctx.fillStyle = '#111';
      ctx.fillRect(mx, my + mglow, 12, 14);
      ctx.fillStyle = '#636e72';
      ctx.fillRect(mx + 1, my + 1 + mglow, 10, 12);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(mx + 9, my + mglow, 3, 8);
      ctx.fillStyle = '#fff';
      ctx.fillRect(mx + 2, my + 3 + mglow, 2, 2);
      ctx.fillRect(mx + 7, my + 3 + mglow, 2, 2);
      ctx.fillStyle = '#000';
      ctx.fillRect(mx + 2, my + 3 + mglow, 1, 1);
      ctx.fillRect(mx + 7, my + 3 + mglow, 1, 1);
      ctx.fillStyle = '#e17055';
      ctx.fillRect(mx + 3, my + 11 + mglow, 6, 2);
    }
  }

  if (G.boss) {
    if (G.boss.isBoss2) {
      var bx = G.boss.x + cx, by = G.boss.y + cy;
      if (G.boss.jumping) {
        ctx.fillStyle = G.boss.stun > 0 ? '#888' : '#6b21a8';
      } else {
        ctx.fillStyle = G.boss.stun > 0 ? '#888' : '#7c3aed';
      }
      ctx.fillRect(bx, by, 32, 32);
      ctx.fillStyle = '#9333ea';
      ctx.fillRect(bx + 2, by + 2, 28, 28);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(bx + 4, by + 6, 6, 6);
      ctx.fillRect(bx + 22, by + 6, 6, 6);
      ctx.fillStyle = '#000';
      ctx.fillRect(bx + 5, by + 7, 4, 4);
      ctx.fillRect(bx + 23, by + 7, 4, 4);
      ctx.fillStyle = '#6b21a8';
      ctx.fillRect(bx + 6, by + 22, 20, 3);
      ctx.fillStyle = '#fff';
      ctx.fillRect(bx + 8, by + 23, 3, 2);
      ctx.fillRect(bx + 14, by + 23, 3, 2);
      ctx.fillRect(bx + 20, by + 23, 3, 2);
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(bx - 4, by + 10, 6, 16);
      ctx.fillRect(bx + 30, by + 10, 6, 16);
      ctx.fillStyle = '#9333ea';
      ctx.fillRect(bx + 4, by + 32, 6, 4);
      ctx.fillRect(bx + 22, by + 32, 6, 4);
      if (G.boss.phase >= 1) {
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(bx + 10, by - 4, 4, 6);
        ctx.fillRect(bx + 18, by - 4, 4, 6);
      }
      if (G.boss.phase >= 2) {
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(bx - 2, by + 4, 4, 6);
        ctx.fillRect(bx + 30, by + 4, 4, 6);
      }
      if (G.boss.jumping) {
        ctx.fillStyle = 'rgba(124,58,237,0.3)';
        ctx.fillRect(bx - 4, by + 36, 40, 8);
      }
    } else {
      ctx.fillStyle = G.boss.stun > 0 ? '#888' : '#c0392b';
      ctx.fillRect(G.boss.x + cx, G.boss.y + cy, 28, 32);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(G.boss.x + 2 + cx, G.boss.y + 2 + cy, 24, 28);

      ctx.fillStyle = G.boss.phase >= 2 ? '#f39c12' : G.boss.phase >= 1 ? '#e67e22' : '#fff';
      ctx.fillRect(G.boss.x + 5 + cx, G.boss.y + 6 + cy, 5, 5);
      ctx.fillRect(G.boss.x + 18 + cx, G.boss.y + 6 + cy, 5, 5);
      ctx.fillStyle = '#000';
      ctx.fillRect(G.boss.x + 6 + cx, G.boss.y + 7 + cy, 3, 3);
      ctx.fillRect(G.boss.x + 19 + cx, G.boss.y + 7 + cy, 3, 3);

      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(G.boss.x + 4 + cx, G.boss.y + 20 + cy, 20, 3);
      ctx.fillStyle = '#fff';
      ctx.fillRect(G.boss.x + 7 + cx, G.boss.y + 21 + cy, 2, 2);
      ctx.fillRect(G.boss.x + 12 + cx, G.boss.y + 21 + cy, 2, 2);
      ctx.fillRect(G.boss.x + 17 + cx, G.boss.y + 21 + cy, 2, 2);

      ctx.fillStyle = '#922b21';
      ctx.fillRect(G.boss.x - 4 + cx, G.boss.y + 10 + cy, 6, 16);
      ctx.fillRect(G.boss.x + 26 + cx, G.boss.y + 10 + cy, 6, 16);

      if (G.boss.phase >= 1) {
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(G.boss.x + 8 + cx, G.boss.y - 4 + cy, 4, 6);
        ctx.fillRect(G.boss.x + 16 + cx, G.boss.y - 4 + cy, 4, 6);
      }
    }

    var bw = 60;
    var bfill = (G.boss.hp / G.boss.maxHp) * bw;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(240 - bw / 2, 10, bw, 8);
    ctx.fillStyle = G.boss.hp <= G.boss.maxHp * 0.3 ? '#e74c3c' : G.boss.isBoss2 ? '#9333ea' : '#e94560';
    ctx.fillRect(240 - bw / 2, 10, bfill, 8);
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(G.boss.isBoss2 ? 'JEFE 2' : 'JEFE', 240, 8);
    ctx.textAlign = 'left';
  }

  for (var bpi = 0; bpi < G.bossProjectiles.length; bpi++) {
    var bpo = G.bossProjectiles[bpi];
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(bpo.x + cx, bpo.y + cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(bpo.x + cx, bpo.y + cy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (var swj = 0; swj < G.bossShockwaves.length; swj++) {
    var sw2 = G.bossShockwaves[swj];
    ctx.fillStyle = 'rgba(147,51,234,' + (sw2.life / 25) + ')';
    ctx.fillRect(sw2.x + cx - 6, sw2.y + cy - 4, 12, 8);
    ctx.fillStyle = 'rgba(255,255,255,' + (sw2.life / 25 * 0.6) + ')';
    ctx.fillRect(sw2.x + cx - 3, sw2.y + cy - 2, 6, 4);
  }

  for (var bi2 = G.breakEffects.length - 1; bi2 >= 0; bi2--) {
    var be = G.breakEffects[bi2];
    be.life--;
    if (be.life <= 0) { G.breakEffects.splice(bi2, 1); continue; }
    if (be.type === 'shock') {
      var sAlpha = be.life / 15;
      var sR = (15 - be.life) * 6;
      ctx.strokeStyle = 'rgba(147,51,234,' + sAlpha + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(be.x + be.w / 2 + cx, be.y + cy, sR, 0, Math.PI * 2);
      ctx.stroke();
    } else if (be.col) {
      be.x += be.vx; be.y += be.vy; be.vy += 0.35;
      var pa = be.life / 18;
      ctx.fillStyle = be.col;
      ctx.globalAlpha = pa;
      ctx.fillRect(be.x + cx, be.y + cy, 4, 4);
      ctx.globalAlpha = 1;
    } else {
      var alpha = be.life / 20;
      for (var bsi = 0; bsi < 4; bsi++) {
        ctx.fillStyle = 'rgba(150,150,150,' + alpha + ')';
        ctx.fillRect(
          be.x + Math.random() * be.w + cx - 2,
          be.y + Math.random() * 10 - 5 + cy,
          4, 4
        );
      }
      ctx.fillStyle = 'rgba(200,200,200,' + (alpha * 0.5) + ')';
      ctx.fillRect(be.x + cx, be.y + cy, be.w, 10);
    }
  }

  if (G.flagObj) {
    ctx.fillStyle = '#aaa';
    ctx.fillRect(G.flagObj.x + 6 + cx, G.flagObj.y - 10 + cy, 2, 24);
    ctx.fillStyle = G.won ? '#00b894' : '#4ecdc4';
    ctx.fillRect(G.flagObj.x + 8 + cx, G.flagObj.y - 10 + cy, 10, 8);
  }

  if (G.checkpoint) {
    ctx.fillStyle = '#aaa';
    ctx.fillRect(G.checkpoint.x + 3 + cx, G.checkpoint.y - 8 + cy, 2, 20);
    ctx.fillStyle = G.checkpoint.active ? '#f39c12' : '#555';
    ctx.fillRect(G.checkpoint.x + 5 + cx, G.checkpoint.y - 8 + cy, 8, 6);
    if (!G.checkpoint.active) {
      ctx.fillStyle = '#fff';
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', G.checkpoint.x + 9 + cx, G.checkpoint.y - 3 + cy);
      ctx.textAlign = 'left';
    } else {
      var cw = Math.sin(Date.now() / 200) * 1;
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(G.checkpoint.x + 5 + cw + cx, G.checkpoint.y - 8 + cy, 8, 6);
    }
  }

  for (i = 0; i < G.dashTrail.length; i++) {
    t = G.dashTrail[i];
    var a = t.life / 14;
    ctx.fillStyle = 'rgba(78,205,196,' + (a * 0.55) + ')';
    ctx.fillRect(t.x + cx, t.y + cy, 12, 16);
    ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.35) + ')';
    ctx.fillRect(t.x + 2 + cx, t.y + 2 + cy, 8, 12);
  }
  if (G.dashTimer > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(G.px - 2 + cx, G.py - 1 + cy, 16, 18);
  }

  ctx.fillStyle = '#4ecdc4';
  ctx.fillRect(G.px + 2 + cx, G.py + 4 + cy, 8, 8);
  ctx.fillStyle = '#ffeaa7';
  ctx.fillRect(G.px + 2 + cx, G.py + cy, 8, 6);
  ctx.fillStyle = '#2d3436';
  ctx.fillRect(G.px + 7 + cx, G.py + 2 + cy, 2, 2);
  ctx.fillStyle = '#6c5ce7';
  ctx.fillRect(G.px + 2 + cx, G.py - 1 + cy, 8, 2);
  ctx.fillStyle = '#2d3436';
  var lo = (G.onGround && Math.abs(G.pvx) > 0) ? Math.sin(Date.now() / 80) * 2 : 0;
  ctx.fillRect(G.px + 2 + cx, G.py + 12 + cy, 3, 4 + lo);
  ctx.fillRect(G.px + 7 + cx, G.py + 12 + cy, 3, 4 - lo);

  if (G.hasDash) {
    var barW = 40;
    var fill = G.dashCD > 0 ? (1 - G.dashCD / 42) * barW : barW;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(10, 10, barW, 6);
    ctx.fillStyle = G.dashCD > 0 ? '#e94560' : '#4ecdc4';
    ctx.fillRect(10, 10, fill, 6);
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText('DASH', 10, 24);
  }

  if (G.hasWave) {
    var waveBarW = 40;
    var waveFill = G.waveCD > 0 ? (1 - G.waveCD / 120) * waveBarW : waveBarW;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(10, 30, waveBarW, 6);
    ctx.fillStyle = G.waveCD > 0 ? '#e94560' : '#ff9f43';
    ctx.fillRect(10, 30, waveFill, 6);
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText('ONDA', 10, 44);
  }

  if (G.hasDashKill) {
    ctx.fillStyle = G.dashKillEquipped ? '#f39c12' : '#555';
    ctx.fillRect(10, 50, 8, 8);
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.fillText(G.dashKillEquipped ? 'GOLPE:ON' : 'GOLPE:OFF', 22, 57);
    ctx.fillStyle = '#aaa';
    ctx.fillText('Kills:' + G.killCount + ' Dmg:' + Math.max(1, Math.floor(G.killCount / 3)), 10, 68);
  }

  ctx.fillStyle = '#fff';
  ctx.font = '12px monospace';
  ctx.fillText('Nivel: ' + (isSecret ? 0 : G.currentLevel + 1), 10, 310);
  ctx.fillText('Monedas: ' + G.score, 10, 324);

  if (levels[G.currentLevel] && levels[G.currentLevel].shop) {
    var shopX = 220, shopY = 195;
    if (!G.hasDashKill) {
      var glow = Math.sin(Date.now() / 200) * 2;
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(shopX - 4 + glow + cx, shopY - 2 + cy, 4, 12);
      ctx.fillRect(shopX + 0 + cx, shopY - 6 + cy, 12, 4);
      ctx.fillRect(shopX - 2 + cx, shopY - 4 + cy, 4, 4);
      ctx.fillRect(shopX + 2 + cx, shopY + 2 + cy, 8, 4);
      ctx.fillStyle = '#fff';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GOLPE DASH', shopX + 4 + cx, shopY - 10 + cy);
      ctx.fillStyle = G.score >= 20 ? '#00b894' : '#e94560';
      ctx.fillText('20 monedas', shopX + 4 + cx, shopY + 14 + cy);
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(G.dashKillEquipped ? 'Equipado' : 'Comprado', shopX + 4 + cx, shopY - 10 + cy);
      ctx.fillText(input.isMobile ? 'Toca E para equipar' : 'Presiona E para equipar', shopX + 4 + cx, shopY + 14 + cy);
      ctx.textAlign = 'left';
    }
    var equipBtn = document.getElementById('btn-equip');
    if (equipBtn) equipBtn.style.display = input.isMobile ? 'block' : 'none';
  } else {
    var equipBtn2 = document.getElementById('btn-equip');
    if (equipBtn2) equipBtn2.style.display = 'none';
  }

  if (G.mercenary && G.mercenary.alive && !G.mercenary.hired) {
    var mInfoX = G.mercenary.x + cx, mInfoY = G.mercenary.y + cy;
    var mNear = Math.abs(G.px + 6 - G.mercenary.x) < 24 && Math.abs(G.py + 8 - G.mercenary.y) < 24;
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MERCENARIO', mInfoX + 6, mInfoY - 12);
    ctx.fillStyle = G.score >= 30 ? '#00b894' : '#e94560';
    ctx.fillText('30 monedas', mInfoX + 6, mInfoY - 2);
    if (mNear) {
      ctx.fillStyle = '#f1c40f';
      ctx.fillText(input.isMobile ? 'Toca E para pagar' : 'Presiona E para pagar', mInfoX + 6, mInfoY + 26);
      if (G.score < 30) {
        ctx.fillStyle = '#e94560';
        ctx.fillText('No tienes suficientes monedas', mInfoX + 6, mInfoY + 36);
      }
    }
    ctx.textAlign = 'left';
  }

  if (G.mercenary && G.mercenary.hired) {
    ctx.fillStyle = '#74b9ff';
    ctx.font = '8px monospace';
    ctx.fillText('MERCE:ON', 10, 80);
    ctx.fillStyle = '#dfe6e9';
    ctx.fillText('Mata enemigos cercanos', 10, 90);
  }

  if (G.dead) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, 480, 320);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 30px monospace';
    ctx.fillText('GAME OVER', 240, 140);
    ctx.fillStyle = '#aaa';
    ctx.font = '16px monospace';
    ctx.fillText('Monedas: ' + G.score, 240, 175);
    ctx.fillText(input.isMobile ? 'Toca para reiniciar' : 'Presiona ENTER', 240, 210);
    ctx.textAlign = 'left';
  }

  if (G.won) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, 480, 320);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00b894';
    ctx.font = 'bold 30px monospace';
    ctx.fillText('NIVEL COMPLETADO', 240, 140);
    ctx.fillStyle = '#aaa';
    ctx.font = '16px monospace';
    ctx.fillText('Monedas: ' + G.score, 240, 175);
    ctx.fillText(input.isMobile ? 'Toca para continuar' : 'Presiona ENTER', 240, 210);
    ctx.textAlign = 'left';
  }

  if (G.showPlayerHealth && !G.sunDeath) {
    var phw = 60;
    var phfill = (G.playerHp / G.playerMaxHp) * phw;
    var psx = G.px + 6 + cx;
    var psy = G.py + cy;
    var phx = psx - phw / 2;
    phx = Math.max(2, Math.min(480 - phw - 2, phx));
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(phx, psy - 10, phw, 7);
    ctx.fillStyle = G.playerHp <= 25 ? '#e74c3c' : '#00b894';
    ctx.fillRect(phx, psy - 10, phfill, 7);
    ctx.fillStyle = '#fff';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HP: ' + G.playerHp, phx + phw / 2, psy - 12);
    ctx.textAlign = 'left';
  }

  if (false) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(60, 250, 360, 40);
    ctx.fillStyle = '#f1c40f';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(G.sunDialogue, 240, 275);
    ctx.textAlign = 'left';
  }

  if (G.sunDeath) {
    var deathProgress = Math.min(1, (180 - G.sunDialogueTimer) / 120);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.7 + deathProgress * 0.25) + ')';
    ctx.fillRect(0, 0, 480, 320);

    var sunDimR = 35 * (1 - deathProgress * 0.6);
    var sunDimAlpha = 1 - deathProgress * 0.7;
    ctx.fillStyle = 'rgba(243,156,18,' + sunDimAlpha + ')';
    ctx.beginPath();
    ctx.arc(240, 90, sunDimR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(241,196,15,' + (sunDimAlpha * 0.7) + ')';
    ctx.beginPath();
    ctx.arc(240, 90, sunDimR * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,' + (sunDimAlpha * 0.5) + ')';
    ctx.beginPath();
    ctx.arc(240, 90, sunDimR * 0.3, 0, Math.PI * 2);
    ctx.fill();

    for (var sdk = 0; sdk < 6; sdk++) {
      var rayA = G.sunRays * 0.5 + (sdk / 6) * Math.PI * 2;
      var rayAlpha2 = 0.15 * (1 - deathProgress);
      ctx.strokeStyle = 'rgba(243,156,18,' + rayAlpha2 + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(240 + Math.cos(rayA) * (sunDimR + 3), 90 + Math.sin(rayA) * (sunDimR + 3));
      ctx.lineTo(240 + Math.cos(rayA) * (sunDimR + 40), 90 + Math.sin(rayA) * (sunDimR + 40));
      ctx.stroke();
    }

    if (G.sunParticles.length > 0) {
      for (var spk = 0; spk < G.sunParticles.length; spk++) {
        var sp2 = G.sunParticles[spk];
        var sa2 = (sp2.fade !== undefined ? sp2.fade : 1) * sunDimAlpha;
        if (sp2.type === 0) {
          ctx.fillStyle = 'rgba(255,255,235,' + sa2 + ')';
          ctx.beginPath();
          ctx.arc(sp2.x, sp2.y, sp2.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,236,180,' + (sa2 * 0.4) + ')';
          ctx.beginPath();
          ctx.arc(sp2.x, sp2.y, sp2.size * 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (sp2.type === 1) {
          var grdD = ctx.createRadialGradient(sp2.x, sp2.y, 0, sp2.x, sp2.y, sp2.size * 2.2);
          grdD.addColorStop(0, 'rgba(255,224,120,' + sa2 + ')');
          grdD.addColorStop(0.35, 'rgba(245,170,40,' + (sa2 * 0.5) + ')');
          grdD.addColorStop(1, 'rgba(220,120,20,0)');
          ctx.fillStyle = grdD;
          ctx.beginPath();
          ctx.arc(sp2.x, sp2.y, sp2.size * 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          var grdD2 = ctx.createRadialGradient(sp2.x, sp2.y, 0, sp2.x, sp2.y, sp2.size * 3);
          grdD2.addColorStop(0, 'rgba(255,244,200,' + sa2 + ')');
          grdD2.addColorStop(0.18, 'rgba(255,190,70,' + (sa2 * 0.6) + ')');
          grdD2.addColorStop(0.5, 'rgba(235,135,25,' + (sa2 * 0.25) + ')');
          grdD2.addColorStop(1, 'rgba(205,90,15,0)');
          ctx.fillStyle = grdD2;
          ctx.beginPath();
          ctx.arc(sp2.x, sp2.y, sp2.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (deathProgress > 0.3) {
      var textAlpha = Math.min(1, (deathProgress - 0.3) / 0.3);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(243,156,18,' + textAlpha + ')';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('LA ÚLTIMA LUZ', 240, 165);
      ctx.fillText('SE HA APAGADO', 240, 190);
      ctx.fillStyle = 'rgba(170,170,170,' + textAlpha + ')';
      ctx.font = '11px monospace';
      ctx.fillText(input.isMobile ? 'Toca para reiniciar' : 'Presiona ENTER', 240, 230);
      ctx.textAlign = 'left';
    }
  }
}
initAudioUI();
initInput({ restart: restartGame, load: loadLevel, winContinue: winContinue }, canvas);
restartGame();
var STEP = 1 / 60;
var acc = 0;
var last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  var dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  acc += dt;
  while (acc >= STEP) {
    update();
    acc -= STEP;
  }
  render();
  try { syncSunBattleMusic(); } catch (e) {}
  var L = levels[G.currentLevel];
  if (L && L.skyFade && G.flagObj) updateAudioFrame(true, skyFadeT(), false);
  else if (L && (L.galaxy || L.secret)) updateAudioFrame(false, 0, true);
  else updateAudioFrame(false, 0, false);
  if (G.frameShake > 0.5) {
    G.frameShake *= 0.85;
    var fsx = (Math.random() - 0.5) * G.frameShake;
    var fsy = (Math.random() - 0.5) * G.frameShake;
    canvas.style.transform = 'translate(' + fsx + 'px,' + fsy + 'px)';
  } else {
    G.frameShake = 0;
    if (canvas.style.transform) canvas.style.transform = '';
  }
}
requestAnimationFrame(frame);
