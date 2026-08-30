export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const filename = url.searchParams.get("file");

  const PANEL_URL = env.MINEHOST_URL;
  const API_KEY = env.MINEHOST_API_KEY;
  const SERVER_ID = env.MINEHOST_SERVER_ID;

  if (!filename) return new Response("Falta el archivo", { status: 400 });

  try {
    // 1. Pedir a Minehost la URL firmada del archivo
    const pteroRes = await fetch(
      `${PANEL_URL}/api/client/servers/${SERVER_ID}/files/download?file=%2Fmods%2F${encodeURIComponent(filename)}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json',
        }
      }
    );

    if (!pteroRes.ok) {
      return new Response("No se pudo obtener el mod de Minehost", { status: pteroRes.status });
    }

    const pteroData = await pteroRes.json();
    const wingsDownloadUrl = pteroData.attributes.url;

    // 2. Cloudflare descarga el archivo directamente (entre servidores NO hay CORS)
    const fileRes = await fetch(wingsDownloadUrl);

    // 3. Devolver el archivo directamente con código 200 OK y CORS permitido (¡NO HACER REDIRECT 302!)
    return new Response(fileRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/java-archive',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      }
    });

  } catch (err) {
    return new Response("Error: " + err.message, { status: 500 });
  }
}
