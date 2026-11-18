/**
 * Lógica del Test de Teclado (detección física, teclado virtual e historial reciente).
 */
let totalCount = 0;
const uniqueKeys = new Set();

function findKeyElement(code) {
  if (!code) return null;
  const escaped = (window.CSS && CSS.escape) ? CSS.escape(code) : code.replace(/"/g, '\\"');
  return document.querySelector(`[data-key="${escaped}"]`);
}

document.addEventListener('keydown', (e) => {
  e.preventDefault();

  // Detectar tecla FN si el navegador expone su estado modificador
  if (e.getModifierState && e.getModifierState('Fn')) {
    const fnKey = document.querySelector('[data-key="Fn"]');
    if (fnKey) fnKey.classList.add('pressed');
  }

  const key = findKeyElement(e.code);
  if (key) {
    key.classList.add('pressed');
    registerKey(e.key, e.code);
  }
});

document.addEventListener('keyup', (e) => {
  const key = findKeyElement(e.code);
  if (key) key.classList.remove('pressed');

  if (e.getModifierState && !e.getModifierState('Fn')) {
    const fnKey = document.querySelector('[data-key="Fn"]');
    if (fnKey) fnKey.classList.remove('pressed');
  }
});

document.querySelectorAll('.key').forEach((key) => {
  key.addEventListener('mousedown', () => {
    key.classList.add('pressed');
    if (key.dataset.key === 'Fn') {
      registerKey('FN (Hardware)', 'Fn');
    } else {
      registerKey(key.textContent, key.dataset.key);
    }
  });

  key.addEventListener('mouseup', () => key.classList.remove('pressed'));
  key.addEventListener('mouseleave', () => key.classList.remove('pressed'));
});

function registerKey(keyName, code) {
  totalCount++;
  uniqueKeys.add(code);

  const label = keyName === ' ' ? 'Space' : keyName;
  document.getElementById('lastKey').textContent = label;
  document.getElementById('totalKeys').textContent = totalCount;
  document.getElementById('uniqueKeys').textContent = uniqueKeys.size;

  const pressedKeysContainer = document.getElementById('pressedKeys');
  const tag = document.createElement('div');
  tag.className = 'pressed-key-tag';
  tag.textContent = label;
  pressedKeysContainer.appendChild(tag);

  while (pressedKeysContainer.children.length > 20) {
    pressedKeysContainer.removeChild(pressedKeysContainer.firstChild);
  }
  pressedKeysContainer.scrollTop = pressedKeysContainer.scrollHeight;
}

function resetTest() {
  totalCount = 0;
  uniqueKeys.clear();
  document.getElementById('lastKey').textContent = '-';
  document.getElementById('totalKeys').textContent = '0';
  document.getElementById('uniqueKeys').textContent = '0';
  document.getElementById('pressedKeys').innerHTML = '';
}

initThemeControls({ sound: 'slide' });
