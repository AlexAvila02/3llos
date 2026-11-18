import test from 'node:test';
import assert from 'node:assert/strict';

import * as seriesIndex from '../functions/api/series/index.js';
import * as seriesRegister from '../functions/api/series/register.js';
import * as seriesLogin from '../functions/api/series/login.js';
import * as seriesLogout from '../functions/api/series/logout.js';
import * as seriesUser from '../functions/api/series/[username].js';

/**
 * Crea un mock en memoria compatible con la API de Cloudflare KV usada por _series-store.js.
 */
function createMemoryKv() {
  const store = new Map();
  return {
    async get(key, type) {
      const entry = store.get(key);
      if (!entry) return null;
      return type === 'json' ? JSON.parse(entry.value) : entry.value;
    },
    async put(key, value, options = {}) {
      store.set(key, {
        value: String(value),
        metadata: options.metadata || null
      });
    },
    async list({ prefix = '' } = {}) {
      const keys = [];
      for (const [name, entry] of store.entries()) {
        if (name.startsWith(prefix)) {
          keys.push({ name, metadata: entry.metadata });
        }
      }
      return { keys, list_complete: true };
    }
  };
}

function jsonRequest(url, method, body, headers = {}) {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
}

test('GET /api/series devuelve 503 cuando falta SERIES_KV', async () => {
  const res = await seriesIndex.onRequestGet({ env: {} });
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.code, 'KV_NOT_CONFIGURED');
});

test('Flujo completo de Series API: register, list, get, put, login y logout', async () => {
  const kv = createMemoryKv();
  const env = { SERIES_KV: kv };

  // 1. Listado inicial vacío
  const emptyListRes = await seriesIndex.onRequestGet({ env });
  assert.equal(emptyListRes.status, 200);
  assert.deepEqual(await emptyListRes.json(), { users: [] });

  // 2. Registro rechaza slug reservado y PIN corto
  const reservedRes = await seriesRegister.onRequestPost({
    env,
    request: jsonRequest('https://example.com/api/series/register', 'POST', {
      username: 'admin',
      pin: '1234'
    })
  });
  assert.equal(reservedRes.status, 400);

  const shortPinRes = await seriesRegister.onRequestPost({
    env,
    request: jsonRequest('https://example.com/api/series/register', 'POST', {
      username: 'Calipso',
      pin: '12'
    })
  });
  assert.equal(shortPinRes.status, 400);

  // 3. Registro válido devuelve 201 + token + perfil público
  const regRes = await seriesRegister.onRequestPost({
    env,
    request: jsonRequest('https://example.com/api/series/register', 'POST', {
      username: 'Calipso',
      pin: '1234'
    })
  });
  assert.equal(regRes.status, 201);
  const regBody = await regRes.json();
  assert.ok(regBody.token);
  assert.equal(regBody.profile.slug, 'calipso');
  assert.equal(regBody.profile.displayName, 'Calipso');
  assert.equal(regBody.profile.pinHash, undefined);
  assert.equal(regBody.profile.sessions, undefined);

  // 4. Registro duplicado devuelve 409
  const dupRes = await seriesRegister.onRequestPost({
    env,
    request: jsonRequest('https://example.com/api/series/register', 'POST', {
      username: 'Calipso',
      pin: '9999'
    })
  });
  assert.equal(dupRes.status, 409);

  // 5. GET público no expone pinHash ni sessions
  const getRes = await seriesUser.onRequestGet({
    env,
    params: { username: 'calipso' }
  });
  assert.equal(getRes.status, 200);
  const getBody = await getRes.json();
  assert.equal(getBody.profile.slug, 'calipso');
  assert.equal(getBody.profile.pinHash, undefined);
  assert.equal(getBody.profile.sessions, undefined);

  // 6. PUT rechaza sin token o con token inválido
  const unauthPut = await seriesUser.onRequestPut({
    env,
    params: { username: 'calipso' },
    request: jsonRequest('https://example.com/api/series/calipso', 'PUT', { data: { seriesList: [] } })
  });
  assert.equal(unauthPut.status, 401);

  const badTokenPut = await seriesUser.onRequestPut({
    env,
    params: { username: 'calipso' },
    request: jsonRequest(
      'https://example.com/api/series/calipso',
      'PUT',
      { data: { seriesList: [] } },
      { Authorization: 'Bearer token-falso' }
    )
  });
  assert.equal(badTokenPut.status, 401);

  // 7. PUT autorizado guarda cambios
  const updatedPayload = {
    activeSeriesId: 's1',
    chartScope: 'season',
    episodeFilter: 'all',
    seriesList: [
      {
        id: 's1',
        title: 'Arcane',
        activeSeasonId: 't1',
        seasons: [
          {
            id: 't1',
            number: 1,
            episodes: [{ id: 'e1', number: 1, title: 'Piloto', score: 9.5 }]
          }
        ]
      }
    ]
  };
  const validPut = await seriesUser.onRequestPut({
    env,
    params: { username: 'calipso' },
    request: jsonRequest(
      'https://example.com/api/series/calipso',
      'PUT',
      { data: updatedPayload },
      { Authorization: `Bearer ${regBody.token}` }
    )
  });
  assert.equal(validPut.status, 200);
  const putBody = await validPut.json();
  assert.equal(putBody.ok, true);
  assert.equal(putBody.summary.topSeriesTitle, 'Arcane');
  assert.equal(putBody.summary.avgScore, 9.5);

  // 8. Login rechaza PIN incorrecto y emite token válido con PIN correcto
  const badLogin = await seriesLogin.onRequestPost({
    env,
    request: jsonRequest('https://example.com/api/series/login', 'POST', {
      username: 'calipso',
      pin: '0000'
    })
  });
  assert.equal(badLogin.status, 401);

  const okLogin = await seriesLogin.onRequestPost({
    env,
    request: jsonRequest('https://example.com/api/series/login', 'POST', {
      username: 'calipso',
      pin: '1234'
    })
  });
  assert.equal(okLogin.status, 200);
  const loginBody = await okLogin.json();
  assert.ok(loginBody.token);
  assert.notEqual(loginBody.token, regBody.token);

  // 9. Logout revoca solo ese token y un PUT posterior con ese token devuelve 401
  const logoutRes = await seriesLogout.onRequestPost({
    env,
    request: jsonRequest(
      'https://example.com/api/series/logout',
      'POST',
      { slug: 'calipso' },
      { Authorization: `Bearer ${loginBody.token}` }
    )
  });
  assert.equal(logoutRes.status, 200);

  const afterLogoutPut = await seriesUser.onRequestPut({
    env,
    params: { username: 'calipso' },
    request: jsonRequest(
      'https://example.com/api/series/calipso',
      'PUT',
      { data: updatedPayload },
      { Authorization: `Bearer ${loginBody.token}` }
    )
  });
  assert.equal(afterLogoutPut.status, 401);
});
