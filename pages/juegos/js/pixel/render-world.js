/**
 * Renderizado de entidades del mundo: plataformas, trampas, ítems, enemigos, jefes y jugador.
 */
import { G } from '../state.js';

export function drawWorld(ctx, L, isSecret, cx, cy) {
  let platBase = '#6c5ce7';
  let platTop = '#00b894';
  if (isSecret) { platBase = '#2d1b4e'; platTop = '#4a2d6e'; }
  else if (L.galaxy) { platBase = '#4a2b7a'; platTop = '#00cec9'; }
  else if (L.theme === 'sunset') { platBase = '#6e3b5e'; platTop = '#ffd166'; }

  ctx.fillStyle = platBase;
  for (let i = 0; i < G.platList.length; i++) {
    const p = G.platList[i];
    ctx.fillRect(p[0] + cx, p[1] + cy, p[2], p[3]);
  }
  ctx.fillStyle = platTop;
  for (let i = 0; i < G.platList.length; i++) {
    const p = G.platList[i];
    ctx.fillRect(p[0] + cx, p[1] + cy, p[2], 3);
  }

  for (let i = 0; i < G.spikeList.length; i++) {
    const sp = G.spikeList[i];
    const sw = sp.w;
    const sh = 12;
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

  for (let i = 0; i < G.dashPointList.length; i++) {
    const dp = G.dashPointList[i];
    if (!dp.alive) continue;
    const dpw = Math.sin(Date.now() / 180 + i) * 2;
    ctx.fillStyle = '#ff69b4';
    ctx.fillRect(dp.x - 6 + dpw + cx, dp.y - 6 + cy, 12, 12);
    ctx.fillStyle = '#ffb6d9';
    ctx.fillRect(dp.x - 3 + dpw + cx, dp.y - 3 + cy, 6, 6);
    ctx.fillStyle = '#fff';
    ctx.fillRect(dp.x - 1 + dpw + cx, dp.y - 1 + cy, 2, 2);
  }

  for (let i = 0; i < G.gemList.length; i++) {
    const g = G.gemList[i];
    if (!g.alive) continue;
    const w = Math.sin(Date.now() / 200 + i) * 1.5;
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(g.x - 4 + w + cx, g.y - 4 + cy, 8, 8);
    ctx.fillStyle = '#fff8a0';
    ctx.fillRect(g.x - 2 + w + cx, g.y - 2 + cy, 4, 4);
  }

  if (G.dashItem.alive) {
    const dw = Math.sin(Date.now() / 150) * 2;
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
    const ww = Math.sin(Date.now() / 120) * 2;
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
    const wa = 1 - G.waveRadius / 120;
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

  for (let i = 0; i < G.enemyList.length; i++) {
    const e = G.enemyList[i];
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
    const mx = G.mercenary.x + cx;
    const my = G.mercenary.y + cy;
    if (G.mercenary.trail && G.mercenary.trail.length > 0) {
      for (let ti = 0; ti < G.mercenary.trail.length; ti++) {
        const tr = G.mercenary.trail[ti];
        const a = (tr.life / 14) * (G.mercenary.state === 'dash' ? 0.85 : 0.45);
        ctx.fillStyle = 'rgba(116,185,255,' + a + ')';
        ctx.fillRect(tr.x + cx, tr.y + cy, 12, 14);
        ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.5) + ')';
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
      const mglow = Math.sin(Date.now() / 300) * 2;
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
      const bx = G.boss.x + cx;
      const by = G.boss.y + cy;
      ctx.fillStyle = G.boss.stun > 0 ? '#888' : (G.boss.jumping ? '#6b21a8' : '#7c3aed');
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

    const bw = 60;
    const bfill = (G.boss.hp / G.boss.maxHp) * bw;
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

  for (let bpi = 0; bpi < G.bossProjectiles.length; bpi++) {
    const bpo = G.bossProjectiles[bpi];
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(bpo.x + cx, bpo.y + cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(bpo.x + cx, bpo.y + cy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let swj = 0; swj < G.bossShockwaves.length; swj++) {
    const sw2 = G.bossShockwaves[swj];
    ctx.fillStyle = 'rgba(147,51,234,' + (sw2.life / 25) + ')';
    ctx.fillRect(sw2.x + cx - 6, sw2.y + cy - 4, 12, 8);
    ctx.fillStyle = 'rgba(255,255,255,' + (sw2.life / 25 * 0.6) + ')';
    ctx.fillRect(sw2.x + cx - 3, sw2.y + cy - 2, 6, 4);
  }

  for (let bi2 = G.breakEffects.length - 1; bi2 >= 0; bi2--) {
    const be = G.breakEffects[bi2];
    be.life--;
    if (be.life <= 0) { G.breakEffects.splice(bi2, 1); continue; }
    if (be.type === 'shock') {
      const sAlpha = be.life / 15;
      const sR = (15 - be.life) * 6;
      ctx.strokeStyle = 'rgba(147,51,234,' + sAlpha + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(be.x + be.w / 2 + cx, be.y + cy, sR, 0, Math.PI * 2);
      ctx.stroke();
    } else if (be.col) {
      be.x += be.vx;
      be.y += be.vy;
      be.vy += 0.35;
      const pa = be.life / 18;
      ctx.fillStyle = be.col;
      ctx.globalAlpha = pa;
      ctx.fillRect(be.x + cx, be.y + cy, 4, 4);
      ctx.globalAlpha = 1;
    } else {
      const alpha = be.life / 20;
      for (let bsi = 0; bsi < 4; bsi++) {
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
      const cw = Math.sin(Date.now() / 200) * 1;
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(G.checkpoint.x + 5 + cw + cx, G.checkpoint.y - 8 + cy, 8, 6);
    }
  }

  for (let i = 0; i < G.dashTrail.length; i++) {
    const t = G.dashTrail[i];
    const a = t.life / 14;
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
  const lo = (G.onGround && Math.abs(G.pvx) > 0) ? Math.sin(Date.now() / 80) * 2 : 0;
  ctx.fillRect(G.px + 2 + cx, G.py + 12 + cy, 3, 4 + lo);
  ctx.fillRect(G.px + 7 + cx, G.py + 12 + cy, 3, 4 - lo);
}
