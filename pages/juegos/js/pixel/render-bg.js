/**
 * Renderizado de cielos y fondos parallax (nocturno, atardecer, galaxia y secreto del Sol).
 */
import { G } from '../state.js';
import { levels } from '../levels.js';

export function skyFadeT() {
  const Lf = levels[G.currentLevel];
  if (!Lf || !Lf.skyFade || !G.flagObj) return 0;
  const d = Math.abs(G.px - G.flagObj.x);
  const r = (Lf.fadeRange || 1400) * 1.5;
  const t = 1 - Math.min(1, d / r);
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t * t * (3 - 2 * t);
}

export function drawRidge(ctx, par, baseY, w, h, color) {
  const off = (G.camX * par) % (w * 2);
  ctx.fillStyle = color;
  for (let k = -1; k < 5; k++) {
    const bx = k * w * 2 - off;
    ctx.beginPath();
    ctx.moveTo(bx, baseY + 60);
    ctx.lineTo(bx + w, baseY - h * ((k % 2 === 0) ? 1 : 0.6));
    ctx.lineTo(bx + w * 2, baseY + 60);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawSunsetSky(ctx) {
  const grd = ctx.createLinearGradient(0, 0, 0, 320);
  grd.addColorStop(0, '#160f38');
  grd.addColorStop(0.45, '#5b2a6e');
  grd.addColorStop(0.72, '#c94b6d');
  grd.addColorStop(1, '#f5a65b');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 480, 320);

  const t = Date.now() / 1000;
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.25 + 0.55 * Math.abs(Math.sin(t * 1.3 + i));
    ctx.fillRect((i * 83 + 7) % 480, (i * 47 + 13) % 150, 1, 1);
  }
  ctx.globalAlpha = 1;

  const sunX = 350 - G.camX * 0.03;
  const sunY = 218;
  const halo = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
  halo.addColorStop(0, 'rgba(255,214,110,0.55)');
  halo.addColorStop(1, 'rgba(255,214,110,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sunX - 90, sunY - 90, 180, 180);

  ctx.fillStyle = '#ffd66e';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(sunX - 6, sunY - 6, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,170,200,0.45)';
  for (let i = 0; i < 4; i++) {
    const clx = ((i * 390 + t * 6) % 680) - 100 - G.camX * 0.05;
    const cly = 36 + i * 30;
    ctx.fillRect(clx, cly, 70, 8);
    ctx.fillRect(clx + 12, cly - 6, 44, 8);
  }

  ctx.fillStyle = '#2a1e4a';
  for (let i = 0; i < 3; i++) {
    const bdx = ((i * 260 + t * 22) % 600) - 60;
    const bdy = 70 + i * 24 + Math.sin(t * 2 + i) * 4;
    ctx.fillRect(bdx, bdy, 6, 2);
    ctx.fillRect(bdx + 6, bdy - 2, 2, 2);
    ctx.fillRect(bdx - 2, bdy - 2, 2, 2);
  }

  drawRidge(ctx, 0.22, 235, 150, 120, '#4a3670');
  drawRidge(ctx, 0.45, 265, 190, 150, '#2c2152');

  for (let i = 0; i < 22; i++) {
    const fwx = (i * 197 + 53) % 1600;
    const fwy = 130 + (i * 89 + 17) % 170;
    ctx.fillStyle = '#ffe66d';
    ctx.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(t * 1.8 + i * 1.7));
    ctx.fillRect(fwx - G.camX, fwy - G.camY, 2, 2);
  }
  ctx.globalAlpha = 1;
}

export function drawGalaxySky(ctx, alpha) {
  const a = alpha === undefined ? 1 : alpha;
  const grdG = ctx.createLinearGradient(0, 0, 0, 320);
  grdG.addColorStop(0, 'rgba(5,0,20,' + a + ')');
  grdG.addColorStop(0.5, 'rgba(11,5,51,' + a + ')');
  grdG.addColorStop(1, 'rgba(26,10,58,' + a + ')');
  ctx.fillStyle = grdG;
  ctx.fillRect(0, 0, 480, 320);

  const tNow = Date.now() / 600;
  for (let gi = 0; gi < 70; gi++) {
    const sx = ((gi * 137 + 20) % 500) - 10;
    const sy = ((gi * 89 + 15) % 300);
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(tNow + gi));
    ctx.fillStyle = gi % 9 === 0 ? '#a29bfe' : (gi % 5 === 0 ? '#74b9ff' : '#ffffff');
    ctx.globalAlpha = tw * a;
    ctx.fillRect(sx, sy, gi % 4 === 0 ? 2 : 1, gi % 4 === 0 ? 2 : 1);
  }
  ctx.globalAlpha = 1;

  const gcx = 340;
  const gcy = 90;
  const gglow = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, 90);
  gglow.addColorStop(0, 'rgba(155,89,182,' + (0.5 * a) + ')');
  gglow.addColorStop(0.4, 'rgba(108,92,231,' + (0.25 * a) + ')');
  gglow.addColorStop(1, 'rgba(108,92,231,0)');
  ctx.fillStyle = gglow;
  ctx.beginPath();
  ctx.arc(gcx, gcy, 90, 0, Math.PI * 2);
  ctx.fill();

  for (let ga2 = 0; ga2 < 110; ga2++) {
    const ang = ga2 * 0.42;
    const rad = (ga2 % 45) * 1.9;
    const gpx = gcx + Math.cos(ang + tNow * 0.3) * rad * 0.45;
    const gpy = gcy + Math.sin(ang) * rad * 0.28;
    ctx.fillStyle = ga2 % 4 === 0
      ? 'rgba(255,214,165,' + (0.7 * a) + ')'
      : (ga2 % 3 === 0 ? 'rgba(155,180,255,' + (0.7 * a) + ')' : 'rgba(230,170,255,' + (0.6 * a) + ')');
    ctx.fillRect(gpx, gpy + 20, ga2 % 3 === 0 ? 2 : 1, ga2 % 3 === 0 ? 2 : 1);
  }
}

export function drawSecretSky(ctx, L) {
  const grdS = ctx.createLinearGradient(0, 0, 0, 280);
  grdS.addColorStop(0, '#1a0533');
  grdS.addColorStop(0.3, '#6b1d5e');
  grdS.addColorStop(0.5, '#e94560');
  grdS.addColorStop(0.65, '#f39c12');
  grdS.addColorStop(0.75, '#f1c40f');
  grdS.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = grdS;
  ctx.fillRect(0, 0, 480, 320);

  const sunR1 = L.sunR1 || 40;
  const sunR2 = L.sunR2 || 30;
  const sunCX = G.sunBoss ? 520 : 240;
  const sunCY = G.sunBoss ? 200 : 160;

  if (G.sunBoss) {
    const hpRatio = G.sunBoss.hp / G.sunBoss.maxHp;
    const rayCount = 10;
    const rayLen = 80 + (1 - hpRatio) * 140;
    const rayAlpha = 0.12 + (1 - hpRatio) * 0.2;
    for (let ri = 0; ri < rayCount; ri++) {
      const angle = G.sunRays + (ri / rayCount) * Math.PI * 2;
      const rx1 = sunCX + Math.cos(angle) * (sunR1 + 5);
      const ry1 = sunCY + Math.sin(angle) * (sunR1 + 5);
      const rx2 = sunCX + Math.cos(angle) * (sunR1 + rayLen);
      const ry2 = sunCY + Math.sin(angle) * (sunR1 + rayLen);
      ctx.strokeStyle = 'rgba(243,156,18,' + rayAlpha + ')';
      ctx.lineWidth = 2 + (1 - hpRatio) * 3;
      ctx.beginPath();
      ctx.moveTo(rx1, ry1);
      ctx.lineTo(rx2, ry2);
      ctx.stroke();
    }

    const glowPulse = Math.sin(Date.now() / (300 - hpRatio * 150)) * (8 + (1 - hpRatio) * 12);
    const glowAlpha = 0.15 + (1 - hpRatio) * 0.2;
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
    for (let i = 0; i < 10; i++) {
      const w1 = 20 + i * 18;
      ctx.fillRect(sunCX - w1, sunCY + sunR1 * 0.6 + i * 10, w1 * 2, 8);
    }
  }

  if (G.sunParticles.length > 0) {
    for (let spi = 0; spi < G.sunParticles.length; spi++) {
      const spp = G.sunParticles[spi];
      const sa = spp.fade !== undefined ? spp.fade * 0.9 : 0.9;
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
        const grd = ctx.createRadialGradient(spp.x, spp.y, 0, spp.x, spp.y, spp.size * 2.2);
        grd.addColorStop(0, 'rgba(255,224,120,' + sa + ')');
        grd.addColorStop(0.35, 'rgba(245,170,40,' + (sa * 0.6) + ')');
        grd.addColorStop(1, 'rgba(220,120,20,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(spp.x, spp.y, spp.size * 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const grd2 = ctx.createRadialGradient(spp.x, spp.y, 0, spp.x, spp.y, spp.size * 3);
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
    const bw = 80;
    const bfill = (G.sunBoss.hp / G.sunBoss.maxHp) * bw;
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
}

/**
 * Dibuja el cielo y estrellas del nivel actual.
 */
export function drawBackground(ctx, L, isSecret, cy) {
  if (isSecret) {
    drawSecretSky(ctx, L);
  } else if (L.galaxy) {
    drawGalaxySky(ctx, 1);
  } else if (L.theme === 'sunset') {
    drawSunsetSky(ctx);
  } else if (L.skyFade) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 480, 320);
    const fadeT = skyFadeT();
    if (fadeT > 0.01) {
      drawGalaxySky(ctx, fadeT);
    }
  } else {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 480, 320);
  }

  if (!isSecret && !L.galaxy && L.theme !== 'sunset') {
    let starA = 1;
    if (L.skyFade) starA = 1 - skyFadeT();
    if (starA > 0) {
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = starA;
      for (let i = 0; i < 40; i++) {
        ctx.fillRect((i * 67 + 10) % 480, (i * 43 + 5 + cy * 0.2) % (G.levelH > 320 ? G.levelH : 160), 1, 1);
      }
      ctx.globalAlpha = 1;
    }
  }
}
