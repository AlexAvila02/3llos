import test from 'node:test';
import assert from 'node:assert/strict';

import { getMinehostConfig, jsonResponse } from '../functions/api/_minehost.js';
import { onRequestGet as downloadModGet } from '../functions/api/download-mod.js';

test('getMinehostConfig valida variables requeridas y normaliza la URL base', () => {
  assert.equal(getMinehostConfig({}), null);
  assert.equal(getMinehostConfig({ MINEHOST_URL: 'https://panel.test' }), null);

  const cfg = getMinehostConfig({
    MINEHOST_URL: 'https://panel.test/',
    MINEHOST_API_KEY: 'secret-key',
    MINEHOST_SERVER_ID: 'srv123'
  });
  assert.deepEqual(cfg, {
    panelUrl: 'https://panel.test',
    apiKey: 'secret-key',
    serverId: 'srv123'
  });
});

test('jsonResponse serializa JSON con estado y cabeceras', async () => {
  const res = jsonResponse({ ok: true }, 201, { 'X-Test': '1' });
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('Content-Type'), 'application/json');
  assert.equal(res.headers.get('X-Test'), '1');
  assert.deepEqual(await res.json(), { ok: true });
});

test('download-mod.js valida configuración y bloquea rutas inválidas o no-.jar', async () => {
  const validEnv = {
    MINEHOST_URL: 'https://panel.test',
    MINEHOST_API_KEY: 'key',
    MINEHOST_SERVER_ID: 'srv'
  };

  const missingEnvRes = await downloadModGet({
    env: {},
    request: new Request('https://example.com/api/download-mod?file=mod.jar')
  });
  assert.equal(missingEnvRes.status, 500);

  const missingFileRes = await downloadModGet({
    env: validEnv,
    request: new Request('https://example.com/api/download-mod')
  });
  assert.equal(missingFileRes.status, 400);

  const traversalRes = await downloadModGet({
    env: validEnv,
    request: new Request('https://example.com/api/download-mod?file=../secret.jar')
  });
  assert.equal(traversalRes.status, 400);

  const nonJarRes = await downloadModGet({
    env: validEnv,
    request: new Request('https://example.com/api/download-mod?file=config.txt')
  });
  assert.equal(nonJarRes.status, 400);
});
