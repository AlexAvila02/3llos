import { G } from './state.js';
import { playJumpSound, playDashSound } from './audio.js';
var SPD = 3.2;
var ACCEL = 0.65;
var DECEL = 0.55;
var AIR_ACCEL = 0.58;
var AIR_DECEL = 0.22;
var JUMP_VEL = -8.5;
var GRAV_UP = 0.36;
var GRAV_DOWN = 0.62;
var GRAV_APEX = 0.12;
var MAX_FALL = 10;
var JUMP_CUT_VEL = -1.5;
var COYOTE_FRAMES = 7;
var JUMP_BUFFER_FRAMES = 8;
export const input = { keys: {}, zPressed: false, xPressed: false, dashHeld: false, coyoteTimer: 0, jumpBufferTimer: 0, jumpHeld: false, isMobile: ('ontouchstart' in window) || navigator.maxTouchPoints > 0 };
export function hitTest(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function updatePlayer() {
var i, p;
  G.wasDashing = G.dashTimer > 0 || Math.abs(G.dashMX) > 0.5 || Math.abs(G.dashMY) > 0.5;
    var mx = 0;
    if (input.keys.ArrowLeft) mx = -1;
    if (input.keys.ArrowRight) mx = 1;

    if (G.dashCD > 0) G.dashCD--;

    if (G.dashTimer > 0) {
      if (!input.dashHeld && G.dashTimer > 1) {
        G.dashTimer = 0;
        G.dashMX = 0;
        G.dashMY = 0;
        G.pvx = 0;
        G.pvy = 0;
      } else {
        G.dashTimer--;
        G.pvx = G.dashDX * 10;
        G.pvy = G.dashDY * 10;
        G.dashMX = G.dashDX * 10;
        G.dashMY = G.dashDY * 10;
        G.dashTrail.push({ x: G.px, y: G.py, life: 14 });
        G.dashTrail.push({ x: G.px - G.dashDX * 6, y: G.py - G.dashDY * 6, life: 10 });
        input.coyoteTimer = 0;
        input.jumpBufferTimer = 0;
      }
    } else {
      if (G.sunKnockback > 0) {
        G.pvx *= 0.9;
        G.pvy += GRAV_DOWN;
        if (G.pvy > MAX_FALL) G.pvy = MAX_FALL;
      } else if (G.dashMX !== 0) {
        G.pvx = G.dashMX;
        G.dashMX *= 0.88;
        if (Math.abs(G.dashMX) < 0.5) G.dashMX = 0;
      }
      if (G.sunKnockback <= 0 && G.dashMY !== 0) {
        G.pvy = G.dashMY;
        G.dashMY *= 0.88;
        if (Math.abs(G.dashMY) < 0.5) G.dashMY = 0;
      }

      if (G.sunKnockback <= 0) {
        var accel = G.onGround ? ACCEL : AIR_ACCEL;
        var decel = G.onGround ? DECEL : AIR_DECEL;
        if (mx !== 0) {
          G.pvx += mx * accel;
          if (G.pvx > SPD) G.pvx = SPD;
          if (G.pvx < -SPD) G.pvx = -SPD;
          G.facing = mx;
        } else {
          if (G.pvx > 0) { G.pvx -= decel; if (G.pvx < 0) G.pvx = 0; }
          else if (G.pvx < 0) { G.pvx += decel; if (G.pvx > 0) G.pvx = 0; }
        }
      }
    }

    if (input.zPressed && G.hasDash && G.dashCD <= 0 && G.dashTimer <= 0) {
      G.dashTimer = 9;
      G.dashCD = 42;
      input.zPressed = false;
      var dx = 0, dy = 0;
      if (input.keys.ArrowLeft) dx = -1;
      if (input.keys.ArrowRight) dx = 1;
      if (input.keys.ArrowUp) dy = -1;
      if (input.keys.ArrowDown) dy = 1;
      if (dx !== 0 || dy !== 0) {
        var len = Math.sqrt(dx * dx + dy * dy);
        G.dashDX = dx / len;
        G.dashDY = dy / len;
      } else {
        G.dashDX = G.facing;
        G.dashDY = 0;
      }
      G.dashTrail.push({ x: G.px, y: G.py, life: 14 });
      try{ playDashSound(); }catch(e){}
    }

    if (G.onGround) {
      input.coyoteTimer = COYOTE_FRAMES;
    } else {
      if (input.coyoteTimer > 0) input.coyoteTimer--;
    }

    if (input.jumpBufferTimer > 0) input.jumpBufferTimer--;

    if (input.keys.ArrowUp || input.keys.Space) {
      if (!input.jumpHeld || G.onGround) input.jumpBufferTimer = JUMP_BUFFER_FRAMES;
      input.jumpHeld = true;
    } else {
      input.jumpHeld = false;
    }

    if (input.jumpBufferTimer > 0 && input.coyoteTimer > 0 && G.dashTimer <= 0) {
      G.pvy = JUMP_VEL;
      G.onGround = false;
      input.coyoteTimer = 0;
      input.jumpBufferTimer = 0;
      try{ playJumpSound(); }catch(e){}
    }

    if (input.jumpHeld === false && G.pvy < JUMP_CUT_VEL) {
      G.pvy = JUMP_CUT_VEL;
    }

    if (G.dashTimer <= 0) {
      if (G.pvy < 0) {
        G.pvy += GRAV_UP;
      } else if (G.pvy > 0 && G.pvy < 1.5) {
        G.pvy += GRAV_APEX;
      } else {
        G.pvy += GRAV_DOWN;
      }
      if (G.pvy > MAX_FALL) G.pvy = MAX_FALL;
    } else {
      if (G.pvy > 0) G.pvy = 0;
    }

    G.px += G.pvx;
    if (G.px < 0) G.px = 0;
    if (G.px > G.levelW - 12) G.px = G.levelW - 12;
    var i, p;
    for (i = 0; i < G.platList.length; i++) {
      p = G.platList[i];
      if (hitTest(G.px, G.py, 12, 16, p[0], p[1], p[2], p[3])) {
        if (G.pvx > 0) G.px = p[0] - 12;
        else if (G.pvx < 0) G.px = p[0] + p[2];
      }
    }

    G.py += G.pvy;
    G.onGround = false;
    for (i = 0; i < G.platList.length; i++) {
      p = G.platList[i];
      if (hitTest(G.px, G.py, 12, 16, p[0], p[1], p[2], p[3])) {
        if (G.pvy > 0) { G.py = p[1] - 16; G.pvy = 0; G.onGround = true; }
        else if (G.pvy < 0) { G.py = p[1] + p[3]; G.pvy = 0; }
      }
    }

    if (G.py > G.levelH + 20) {
      die();
      return;
    }

    G.camX = G.px + 6 - 240;
    if (G.camX < 0) G.camX = 0;
    if (G.camX > G.levelW - 480) G.camX = G.levelW - 480;
    if (G.levelW <= 480) G.camX = 0;
    G.camY = G.py + 8 - 160;
    if (G.camY < 0) G.camY = 0;
    if (G.camY > G.levelH - 320) G.camY = G.levelH - 320;
    if (G.levelH <= 320) G.camY = 0;

    if (G.checkpoint && !G.checkpoint.active) {
      if (Math.abs(G.px + 6 - G.checkpoint.x) < 24 && Math.abs(G.py + 8 - G.checkpoint.y) < 24) {
        G.checkpoint.active = true;
      }
    }
}
export function resetPlayerTransient() {
  input.coyoteTimer = 0;
  input.jumpBufferTimer = 0;
  input.jumpHeld = false;
}
export function initInput(actions, canvas) {

  var cheatBuffer = '';

  document.addEventListener('keydown', function(e) {
    var codes = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyZ','KeyX','KeyE'];
    if (codes.indexOf(e.code) !== -1) e.preventDefault();
    input.keys[e.code] = true;
    if (e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z') { input.zPressed = true; input.dashHeld = true; }
    if (e.code === 'KeyX' || e.key === 'x' || e.key === 'X') input.xPressed = true;
    if (e.code === 'KeyR') actions.restart();
    if (e.code === 'Enter') {
      if (G.dead || G.won || G.sunDeath) {
        if (G.won) actions.winContinue(); else actions.restart();
      }
    }
    if (/^[0-9a-zA-Z]$/.test(e.key)) {
      cheatBuffer += e.key.toLowerCase();
      if (cheatBuffer.length > 12) cheatBuffer = cheatBuffer.slice(-12);
      if (cheatBuffer.indexOf('04') !== -1) {
        G.hasDash = true;
        G.hasWave = true;
        actions.load(3);
        cheatBuffer = '';
      }
      if (cheatBuffer.indexOf('05') !== -1) {
        actions.load(4);
        cheatBuffer = '';
      }
      if (cheatBuffer.indexOf('06') !== -1) {
        G.hasDash = true;
        G.hasWave = true;
        actions.load(5);
        cheatBuffer = '';
      }
      if (cheatBuffer.indexOf('07') !== -1) {
        G.hasDash = true;
        G.hasWave = true;
        actions.load(6);
        cheatBuffer = '';
      }
      if (cheatBuffer.indexOf('08') !== -1) {
        G.hasDash = true;
        G.hasWave = true;
        actions.load(7);
        cheatBuffer = '';
      }
      if (cheatBuffer.indexOf('09') !== -1) {
        G.hasDash = true;
        G.hasWave = true;
        G.hasDashKill = true;
        G.dashKillEquipped = true;
        actions.load(8);
        cheatBuffer = '';
      }
      if (cheatBuffer.indexOf('10') !== -1) {
        G.hasDash = true;
        G.hasWave = true;
        G.hasDashKill = true;
        G.dashKillEquipped = true;
        actions.load(9);
        cheatBuffer = '';
      }
      if (cheatBuffer.indexOf('11') !== -1) {
        G.hasDash = true;
        G.hasWave = true;
        G.hasDashKill = true;
        G.dashKillEquipped = true;
        actions.load(10);
        cheatBuffer = '';
      }
      if (cheatBuffer.indexOf('12') !== -1) {
        G.hasDash = true;
        G.hasWave = true;
        G.hasDashKill = true;
        G.dashKillEquipped = true;
        actions.load(11);
        cheatBuffer = '';
      }
    } else {
      cheatBuffer = '';
    }
  });
  document.addEventListener('keyup', function(e) {
    input.keys[e.code] = false;
    if (e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z') { input.zPressed = false; input.dashHeld = false; }
    if (e.code === 'KeyX' || e.key === 'x' || e.key === 'X') input.xPressed = false;
  });

  canvas.addEventListener('touchstart', function(e) {
    if (G.dead || G.won || G.sunDeath) {
      e.preventDefault();
      if (G.won) actions.winContinue(); else actions.restart();
    }
  }, { passive: false });

  canvas.tabIndex = 1;
  canvas.focus();

  var touchState = { left: false, right: false, jump: false, dash: false, wave: false };


  var keySource = {};

  function setKey(key, val, source) {
    if (val) {
      keySource[key] = source;
      input.keys[key] = true;
    } else if (keySource[key] === source) {
      input.keys[key] = false;
      delete keySource[key];
    }
  }

  var joystick = document.getElementById('joystick');
  var joystickKnob = document.getElementById('joystick-knob');
  var joystickActive = false;
  var joystickTouchId = null;
  var joystickRadius = 60;
  var knobRadius = 24;
  var joystickCenterX = 0;
  var joystickCenterY = 0;

  function updateJoystick(clientX, clientY) {
    var rect = joystick.getBoundingClientRect();
    joystickCenterX = rect.left + rect.width / 2;
    joystickCenterY = rect.top + rect.height / 2;
    var dx = clientX - joystickCenterX;
    var dy = clientY - joystickCenterY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var maxDist = joystickRadius - knobRadius;
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }
    joystickKnob.style.left = (60 + dx) + 'G.px';
    joystickKnob.style.top = (60 + dy) + 'G.px';
    joystickKnob.style.transform = 'translate(-50%, -50%)';

    var threshold = 15;
    setKey('ArrowLeft', dx < -threshold, 'joystick');
    setKey('ArrowRight', dx > threshold, 'joystick');
    setKey('ArrowUp', dy < -threshold, 'joystick');
    setKey('Space', dy < -threshold, 'joystick');
  }

  function resetJoystick() {
    joystickKnob.style.left = '50%';
    joystickKnob.style.top = '50%';
    joystickKnob.style.transform = 'translate(-50%, -50%)';
    setKey('ArrowLeft', false, 'joystick');
    setKey('ArrowRight', false, 'joystick');
    setKey('ArrowUp', false, 'joystick');
    setKey('Space', false, 'joystick');
  }

  joystick.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var t = e.changedTouches[0];
    joystickActive = true;
    joystickTouchId = t.identifier;
    updateJoystick(t.clientX, t.clientY);
  }, { passive: false });

  joystick.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (!joystickActive) return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === joystickTouchId) {
        updateJoystick(t.clientX, t.clientY);
        break;
      }
    }
  }, { passive: false });

  joystick.addEventListener('touchend', function(e) {
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId) {
        joystickActive = false;
        joystickTouchId = null;
        resetJoystick();
        break;
      }
    }
  }, { passive: false });

  joystick.addEventListener('touchcancel', function(e) {
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId) {
        joystickActive = false;
        joystickTouchId = null;
        resetJoystick();
        break;
      }
    }
  }, { passive: false });

  function bindTouchBtn(id, stateKey) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      touchState[stateKey] = true;
      if (stateKey === 'dash') { input.zPressed = true; input.dashHeld = true; }
      if (stateKey === 'wave') input.xPressed = true;
      if (stateKey === 'jump') { setKey('Space', true, 'btn-jump'); setKey('ArrowUp', true, 'btn-jump'); }
    }, { passive: false });
    btn.addEventListener('touchend', function(e) {
      e.preventDefault();
      touchState[stateKey] = false;
      if (stateKey === 'dash') { input.zPressed = false; input.dashHeld = false; }
      if (stateKey === 'wave') input.xPressed = false;
      if (stateKey === 'jump') { setKey('Space', false, 'btn-jump'); setKey('ArrowUp', false, 'btn-jump'); }
    }, { passive: false });
    btn.addEventListener('touchcancel', function(e) {
      e.preventDefault();
      touchState[stateKey] = false;
      if (stateKey === 'dash') { input.zPressed = false; input.dashHeld = false; }
      if (stateKey === 'wave') input.xPressed = false;
      if (stateKey === 'jump') { setKey('Space', false, 'btn-jump'); setKey('ArrowUp', false, 'btn-jump'); }
    }, { passive: false });
  }

  function bindRestartBtn(id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (G.dead || G.won || G.sunDeath) {
        if (G.won) actions.winContinue(); else actions.restart();
      }
    }, { passive: false });
  }

  bindTouchBtn('btn-jump', 'jump');
  bindTouchBtn('btn-dash', 'dash');
  bindTouchBtn('btn-wave', 'wave');
  bindRestartBtn('btn-restart');

  (function() {
    var btn = document.getElementById('btn-equip');
    if (!btn) return;
    btn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      input.keys.KeyE = true;
    }, { passive: false });
    btn.addEventListener('touchend', function(e) {
      e.preventDefault();
      input.keys.KeyE = false;
    }, { passive: false });
    btn.addEventListener('touchcancel', function(e) {
      e.preventDefault();
      input.keys.KeyE = false;
    }, { passive: false });
  })();

}
