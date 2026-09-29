// Nucleo del motor: bucle con paso fijo y render.
// La semantica es identica al bucle original de game.js.
export function startLoop(hooks) {
  var step = hooks.step || 1 / 60;
  var acc = 0;
  var last = performance.now();
  var running = true;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    var dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    while (acc >= step) {
      hooks.update();
      acc -= step;
    }
    hooks.render();
    if (hooks.afterFrame) hooks.afterFrame();
  }
  requestAnimationFrame(frame);
  return function stop() { running = false; };
}
