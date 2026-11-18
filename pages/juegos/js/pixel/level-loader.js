/**
 * Carga e inicialización de entidades y música de cada nivel de Pixel Adventure.
 */
import { G } from '../state.js';
import { levels } from '../levels.js';
import { resetPlayerTransient } from '../player.js';
import { stopSunBattleMusic, stopAllBgm, audioLevelMusic, startSunBattleMusic } from '../audio.js';

/**
 * Carga el nivel `n`, reinicia entidades transitorias y ajusta la música.
 */
export function loadLevel(n) {
  const L = levels[n % levels.length];
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
  for (let i = 0; i < L.ground.length; i++) G.platList.push(L.ground[i].slice());
  for (let i = 0; i < L.plat.length; i++) G.platList.push(L.plat[i].slice());

  G.gemList = [];
  for (let i = 0; i < L.gems.length; i++) {
    G.gemList.push({ x: L.gems[i][0], y: L.gems[i][1], alive: true });
  }

  G.enemyList = [];
  for (let i = 0; i < L.enemies.length; i++) {
    G.enemyList.push({ x: L.enemies[i][0], y: L.enemies[i][1], vx: 1.2, ox: L.enemies[i][0] });
  }

  G.dashItem = L.dash ? { x: L.dash[0], y: L.dash[1], alive: !G.hasDash } : { x: -100, y: -100, alive: false };
  G.waveItem = L.wave ? { x: L.wave[0], y: L.wave[1], alive: !G.hasWave } : null;
  G.flagObj = L.flag ? { x: L.flag[0], y: L.flag[1] } : null;

  G.spikeList = [];
  if (L.spikes) {
    for (let i = 0; i < L.spikes.length; i++) {
      G.spikeList.push({ x: L.spikes[i][0], y: L.spikes[i][1], w: L.spikes[i][2] || 12 });
    }
  }

  G.dashPointList = [];
  G.breakEffects = [];
  if (L.dashLine) {
    for (let dlx = 0; dlx < L.dashLine; dlx += 40) {
      G.dashPointList.push({ x: dlx, y: 348, alive: true });
    }
  } else if (L.dashExtend) {
    for (let i = 0; i < L.dashExtend.length; i++) {
      G.dashPointList.push({ x: L.dashExtend[i][0], y: L.dashExtend[i][1], alive: true });
    }
  }

  G.levelH = L.worldH || 320;
  G.levelW = L.worldW || 480;
  G.camX = 0;
  G.camY = 0;

  if (L.boss2) {
    G.boss = {
      x: L.boss2.x, y: L.boss2.y, hp: L.boss2.hp, maxHp: L.boss2.maxHp, vx: L.boss2.vx,
      atkCD: 0, atkPattern: 0, stun: 0, phase: 0, isBoss2: true,
      jumpTimer: 120, jumping: false, jumpVY: 0, stompCD: 0
    };
  } else if (L.boss) {
    G.boss = {
      x: L.boss.x, y: L.boss.y, hp: L.boss.hp, maxHp: L.boss.maxHp, vx: L.boss.vx,
      atkCD: 0, atkPattern: 0, stun: 0, phase: 0
    };
  } else {
    G.boss = null;
  }

  G.checkpoint = L.checkpoint
    ? { x: L.checkpoint[0], y: L.checkpoint[1], active: (L.checkpoint[0] === L.spawn[0] && L.checkpoint[1] === L.spawn[1]) }
    : null;
  G.waveActive = false;
  G.waveRadius = 0;
  G.bossProjectiles = [];
  G.bossShockwaves = [];
  G.mercHired = false;

  if (G.mercHiredPersist) {
    G.mercenary = {
      x: L.merc ? L.merc[0] : (L.spawn[0] + 24),
      y: L.merc ? L.merc[1] : L.spawn[1],
      alive: true, hired: true, attackCD: 0, state: 'idle',
      dashTimer: 0, dashDX: 0, dashDY: 0, dashMX: 0, dashMY: 0, trail: [],
      pxm: L.merc ? L.merc[0] : L.spawn[0], pym: L.merc ? L.merc[1] : L.spawn[1],
      onGround: false, pvxm: 0, pvym: 0, targetIdx: -1, returning: false
    };
    G.mercHired = true;
  } else {
    G.mercenary = L.merc
      ? {
          x: L.merc[0], y: L.merc[1],
          alive: true, hired: false, attackCD: 0, state: 'idle',
          dashTimer: 0, dashDX: 0, dashDY: 0, dashMX: 0, dashMY: 0, trail: [],
          pxm: L.merc[0], pym: L.merc[1],
          onGround: false, pvxm: 0, pvym: 0, targetIdx: -1, returning: false
        }
      : null;
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
