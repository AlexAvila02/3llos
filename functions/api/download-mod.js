import { CORS_HEADERS, getMinehostConfig, pteroFetch } from './_minehost.js';

export function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const filename = url.searchParams.get('file');

  const cfg = getMinehostConfig(env);
  if (!cfg) {
    return new Response('Faltan variables de entorno en Cloudflare', { status: 500 });
  }
  if (!filename) {
    return new Response('Falta el archivo', { status: 400 });
  }
  if (!filename.endsWith('.jar') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return new Response('Nombre de archivo inválido', { status: 400 });
  }

  try {
    // 1. Pedir a Minehost la URL firmada del archivo
    const pteroRes = await pteroFetch(cfg, `/files/download?file=%2Fmods%2F${encodeURIComponent(filename)}`);
    if (!pteroRes.ok) {
      return new Response('No se pudo obtener el mod de Minehost', { status: pteroRes.status });
    }

    const pteroData = await pteroRes.json();
    const wingsDownloadUrl = pteroData?.attributes?.url;
    if (!wingsDownloadUrl) {
      return new Response('No se recibió URL de descarga', { status: 502 });
    }

    // 2. Cloudflare descarga el archivo directamente (entre servidores NO hay CORS)
    const fileRes = await fetch(wingsDownloadUrl);
    if (!fileRes.ok) {
      return new Response('Error al descargar el mod desde el nodo', { status: fileRes.status });
    }

    // 3. Devolver el archivo directamente con código 200 OK y CORS permitido (sin redirect 302)
    return new Response(fileRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/java-archive',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Access-Control-Allow-Origin': CORS_HEADERS['Access-Control-Allow-Origin'],
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      }
    });
  } catch (err) {
    return new Response('Error: ' + err.message, { status: 500 });
  }
}
