/**
 * Utilidades compartidas para las funciones de Cloudflare Pages que consultan Minehost/Pterodactyl.
 */

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders
    }
  });
}

export function getMinehostConfig(env) {
  const panelUrl = env.MINEHOST_URL ? env.MINEHOST_URL.replace(/\/$/, '') : '';
  const apiKey = env.MINEHOST_API_KEY || '';
  const serverId = env.MINEHOST_SERVER_ID || '';
  if (!panelUrl || !apiKey || !serverId) return null;
  return { panelUrl, apiKey, serverId };
}

export function pteroFetch(cfg, path, options = {}) {
  const { headers = {}, ...rest } = options;
  return fetch(`${cfg.panelUrl}/api/client/servers/${cfg.serverId}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      Accept: 'application/json',
      ...headers
    }
  });
}
