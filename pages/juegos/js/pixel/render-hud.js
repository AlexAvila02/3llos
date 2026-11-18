/**
 * Renderizado de HUD, tienda, textos de mercenario, pantallas de estado y final del Sol.
 */
import { G } from '../state.js';
import { input } from '../player.js';

export function drawHud(ctx, L, isSecret, cx, cy) {
  if (G.hasDash) {
    const barW = 40;
    const fill = G.dashCD > 0 ? (1 - G.dashCD / 42) * barW : barW;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(10, 10, barW, 6);
    ctx.fillStyle = G.dashCD > 0 ? '#e94560' : '#4ecdc4';
    ctx.fillRect(10, 10, fill, 6);
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText('DASH', 10, 24);
  }

  if (G.hasWave) {
    const waveBarW = 40;
    const waveFill = G.waveCD > 0 ? (1 - G.waveCD / 120) * waveBarW : waveBarW;
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
  if (L && L.route === 2) ctx.fillText('Ruta 2', 10, 298);
  else ctx.fillText('Nivel: ' + (isSecret ? 0 : G.currentLevel + 1), 10, 298);
  ctx.fillText('Monedas: ' + G.score, 10, 312);

  if (L && L.shop) {
    const shopX = 220;
    const shopY = 195;
    if (!G.hasDashKill) {
      const glow = Math.sin(Date.now() / 200) * 2;
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
    const equipBtn = document.getElementById('btn-equip');
    if (equipBtn) equipBtn.style.display = input.isMobile ? 'block' : 'none';
  } else {
    const equipBtn2 = document.getElementById('btn-equip');
    if (equipBtn2) equipBtn2.style.display = 'none';
  }

  if (G.mercenary && G.mercenary.alive && !G.mercenary.hired) {
    const mInfoX = G.mercenary.x + cx;
    const mInfoY = G.mercenary.y + cy;
    const mNear = Math.abs(G.px + 6 - G.mercenary.x) < 24 && Math.abs(G.py + 8 - G.mercenary.y) < 24;
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
    const phw = 60;
    const phfill = (G.playerHp / G.playerMaxHp) * phw;
    const psx = G.px + 6 + cx;
    const psy = G.py + cy;
    let phx = psx - phw / 2;
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

  if (G.sunDeath) {
    const deathProgress = Math.min(1, (180 - G.sunDialogueTimer) / 120);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.7 + deathProgress * 0.25) + ')';
    ctx.fillRect(0, 0, 480, 320);

    const sunDimR = 35 * (1 - deathProgress * 0.6);
    const sunDimAlpha = 1 - deathProgress * 0.7;
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

    for (let sdk = 0; sdk < 6; sdk++) {
      const rayA = G.sunRays * 0.5 + (sdk / 6) * Math.PI * 2;
      const rayAlpha2 = 0.15 * (1 - deathProgress);
      ctx.strokeStyle = 'rgba(243,156,18,' + rayAlpha2 + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(240 + Math.cos(rayA) * (sunDimR + 3), 90 + Math.sin(rayA) * (sunDimR + 3));
      ctx.lineTo(240 + Math.cos(rayA) * (sunDimR + 40), 90 + Math.sin(rayA) * (sunDimR + 40));
      ctx.stroke();
    }

    if (G.sunParticles.length > 0) {
      for (let spk = 0; spk < G.sunParticles.length; spk++) {
        const sp2 = G.sunParticles[spk];
        const sa2 = (sp2.fade !== undefined ? sp2.fade : 1) * sunDimAlpha;
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
          const grdD = ctx.createRadialGradient(sp2.x, sp2.y, 0, sp2.x, sp2.y, sp2.size * 2.2);
          grdD.addColorStop(0, 'rgba(255,224,120,' + sa2 + ')');
          grdD.addColorStop(0.35, 'rgba(245,170,40,' + (sa2 * 0.5) + ')');
          grdD.addColorStop(1, 'rgba(220,120,20,0)');
          ctx.fillStyle = grdD;
          ctx.beginPath();
          ctx.arc(sp2.x, sp2.y, sp2.size * 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const grdD2 = ctx.createRadialGradient(sp2.x, sp2.y, 0, sp2.x, sp2.y, sp2.size * 3);
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
      const textAlpha = Math.min(1, (deathProgress - 0.3) / 0.3);
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
