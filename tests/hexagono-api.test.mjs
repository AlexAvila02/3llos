import test from 'node:test';
import assert from 'node:assert/strict';

import * as hexagonoApi from '../functions/api/hexagono.js';
import * as seriesIndex from '../functions/api/series/index.js';
import * as seriesRegister from '../functions/api/series/register.js';

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

test('GET /api/hexagono devuelve 503 cuando falta SERIES_KV', async () => {
  const res = await hexagonoApi.onRequestGet({
    env: {},
    request: new Request('https://example.com/api/hexagono')
  });
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.code, 'KV_NOT_CONFIGURED');
});

test('GET y PUT /api/hexagono permiten lectura pública y restringen edición exclusivamente a @alex', async () => {
  const kv = createMemoryKv();
  const env = { SERIES_KV: kv };

  // 1. Lectura inicial pública devuelve plantilla HEXACO por defecto
  const initialGet = await hexagonoApi.onRequestGet({
    env,
    request: new Request('https://example.com/api/hexagono')
  });
  assert.equal(initialGet.status, 200);
  const initialBody = await initialGet.json();
  assert.equal(initialBody.isDefault, true);
  assert.equal(initialBody.canEdit, false);
  assert.equal(initialBody.board.archetypes.length, 6);
  assert.ok(initialBody.board.people.length >= 6);

  // 2. PUT sin token es rechazado con 401
  const anonPut = await hexagonoApi.onRequestPut({
    env,
    request: jsonRequest('https://example.com/api/hexagono', 'PUT', { board: initialBody.board })
  });
  assert.equal(anonPut.status, 401);

  // 3. Registrar a @calipso y a @alex
  const calipsoReg = await seriesRegister.onRequestPost({
    env,
    request: jsonRequest('https://example.com/api/series/register', 'POST', {
      username: 'Calipso',
      pin: '1234'
    })
  });
  const calipsoToken = (await calipsoReg.json()).token;

  const alexReg = await seriesRegister.onRequestPost({
    env,
    request: jsonRequest('https://example.com/api/series/register', 'POST', {
      username: 'Alex',
      pin: '9876'
    })
  });
  const alexToken = (await alexReg.json()).token;

  // 4. @calipso no puede editar el hexágono (403)
  const calipsoPut = await hexagonoApi.onRequestPut({
    env,
    request: jsonRequest(
      'https://example.com/api/hexagono',
      'PUT',
      { board: initialBody.board },
      { Authorization: `Bearer ${calipsoToken}` }
    )
  });
  assert.equal(calipsoPut.status, 403);

  // 5. GET con token de @calipso indica canEdit: false; con token de @alex indica canEdit: true
  const calipsoGet = await hexagonoApi.onRequestGet({
    env,
    request: new Request('https://example.com/api/hexagono', {
      headers: { Authorization: `Bearer ${calipsoToken}` }
    })
  });
  assert.equal((await calipsoGet.json()).canEdit, false);

  const alexGet = await hexagonoApi.onRequestGet({
    env,
    request: new Request('https://example.com/api/hexagono', {
      headers: { Authorization: `Bearer ${alexToken}` }
    })
  });
  assert.equal((await alexGet.json()).canEdit, true);

  // 6. @alex sí puede editar y guardar cambios
  const modifiedBoard = structuredClone(initialBody.board);
  modifiedBoard.title = 'Hexágono Editado por Alex';
  modifiedBoard.archetypes[0].name = 'El Paladín';
  modifiedBoard.people.push({
    id: 'person-nuevo',
    name: 'Invitado',
    alias: 'Nuevo',
    emoji: '🦊',
    avatarUrl: '',
    color: '#fbbf24',
    bio: 'Prueba',
    scores: { H: 92, E: 50, X: 50, A: 60, C: 65, O: 55 },
    pos: { x: 0, y: -0.6 },
    manualPos: true
  });

  const alexPut = await hexagonoApi.onRequestPut({
    env,
    request: jsonRequest(
      'https://example.com/api/hexagono',
      'PUT',
      { board: modifiedBoard },
      { Authorization: `Bearer ${alexToken}` }
    )
  });
  assert.equal(alexPut.status, 200);
  const putBody = await alexPut.json();
  assert.equal(putBody.ok, true);
  assert.equal(putBody.updatedBy, 'alex');
  assert.equal(putBody.board.title, 'Hexágono Editado por Alex');
  assert.equal(putBody.board.archetypes[0].name, 'El Paladín');

  // 7. GET público posterior refleja los cambios y GET /api/series no se contamina
  const updatedGet = await hexagonoApi.onRequestGet({
    env,
    request: new Request('https://example.com/api/hexagono')
  });
  const updatedBody = await updatedGet.json();
  assert.equal(updatedBody.isDefault, false);
  assert.equal(updatedBody.board.title, 'Hexágono Editado por Alex');
  assert.ok(updatedBody.board.people.some((p) => p.id === 'person-nuevo'));

  const seriesUsersRes = await seriesIndex.onRequestGet({ env });
  const seriesUsersBody = await seriesUsersRes.json();
  assert.equal(seriesUsersBody.users.length, 2);
});
