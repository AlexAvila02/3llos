/**
 * Punto de entrada y bucle principal de Pixel Adventure.
 * Orquesta escena, entrada, música de fondo y renderizado por capas.
 */
import { G } from './state.js';
import { levels, nextStoryLevel } from './levels.js';
import { initAudioUI, stopAllBgm, resumeMainBgm, updateAudioFrame, stopSunBattleMusic, syncSunBattleMusic } from './audio.js';
import { initInput, updatePlayer } from './player.js';
import { updateSunAmbient, updateEntities, loadLevel } from './entities.js';
import { startLoop } from './engine/loop.js';
import { registerScene, setScene, updateScene, renderScene } from './engine/scene.js';
import { skyFadeT, drawBackground } from './pixel/render-bg.js';
import { drawWorld } from './pixel/render-world.js';
import { drawHud } from './pixel/render-hud.js';

function drawBackIcon() {
  const backIcon = document.getElementById('back-icon');
  if (!backIcon) return;
  const bctx = backIcon.getContext('2d');
  bctx.fillStyle = '#fff';
  const pixels = [
    [0, 0], [6, 0], [1, 1], [5, 1], [2, 2], [4, 2],
    [3, 3], [2, 4], [4, 4], [1, 5], [5, 5], [0, 6], [6, 6]
  ];
  pixels.forEach(([x, y]) => bctx.fillRect(x, y, 1, 1));
}

function initFullscreenButton() {
  const fsBtn = document.getElementById('fs-btn');
  if (!fsBtn) return;
  fsBtn.addEventListener('click', () => {
    try {
      if (!document.fullscreenElement) {
        (document.documentElement.requestFullscreen || document.body.requestFullscreen).call(document.documentElement);
      } else {
        document.exitFullscreen();
      }
    } catch (e) {}
  });
}

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

drawBackIcon();
initFullscreenButton();

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
  const next = nextStoryLevel(G.currentLevel);
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
  for (let i = G.dashTrail.length - 1; i >= 0; i--) {
    G.dashTrail[i].life--;
    if (G.dashTrail[i].life <= 0) G.dashTrail.splice(i, 1);
  }
}

function render() {
  const L = levels[G.currentLevel];
  const isSecret = Boolean(L && L.secret);

  const cx = -G.camX + G.shakeX;
  const cy = -G.camY + G.shakeY;
  G.shakeX *= 0.8;
  G.shakeY *= 0.8;
  if (Math.abs(G.shakeX) < 0.5) G.shakeX = 0;
  if (Math.abs(G.shakeY) < 0.5) G.shakeY = 0;

  drawBackground(ctx, L, isSecret, cy);
  drawWorld(ctx, L, isSecret, cx, cy);
  drawHud(ctx, L, isSecret, cx, cy);
}

initAudioUI();
initInput({ restart: restartGame, load: loadLevel, winContinue }, canvas);
restartGame();

// Debug: abrir en un nivel concreto con #nivel=N (no afecta al juego normal)
(function applyDebugLevelFromHash() {
  try {
    const m = (location.hash || '').match(/nivel=(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 0 && n < levels.length) loadLevel(n);
    }
  } catch (e) {}
})();

registerScene('game', { update, render });
setScene('game');
startLoop({
  update: updateScene,
  render: renderScene,
  afterFrame() {
    try { syncSunBattleMusic(); } catch (e) {}
    const L = levels[G.currentLevel];
    if (L && L.skyFade && G.flagObj) updateAudioFrame(true, skyFadeT(), false);
    else if (L && (L.galaxy || L.secret)) updateAudioFrame(false, 0, true);
    else updateAudioFrame(false, 0, false);

    if (G.frameShake > 0.5) {
      G.frameShake *= 0.85;
      const fsx = (Math.random() - 0.5) * G.frameShake;
      const fsy = (Math.random() - 0.5) * G.frameShake;
      canvas.style.transform = 'translate(' + fsx + 'px,' + fsy + 'px)';
    } else {
      G.frameShake = 0;
      if (canvas.style.transform) canvas.style.transform = '';
    }
  }
});
