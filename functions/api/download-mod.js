export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const filename = url.searchParams.get("file");

  const PANEL_URL = env.MINEHOST_URL;
  const API_KEY = env.MINEHOST_API_KEY;
  const SERVER_ID = env.MINEHOST_SERVER_ID;

  if (!filename || !filename.endsWith('.jar') || filename.includes('..')) {
    return new Response("Archivo no válido", { status: 400 });
  }

  try {
    // 1. Obtener enlace firmado de Minehost
    const dlRes = await fetch(
      `${PANEL_URL}/api/client/servers/${SERVER_ID}/files/download?file=%2Fmods%2F${encodeURIComponent(filename)}`,
      { headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' } }
    );
    const dlData = await dlRes.json();
    const wingsUrl = dlData.attributes.url;

    // 2. Descargar el archivo binario servidor a servidor (Sin bloqueo de CORS)
    const fileRes = await fetch(wingsUrl);

    // 3. Transmitir el archivo directamente al navegador con cabeceras CORS abiertas
    return new Response(fileRes.body, {
      headers: {
        'Content-Type': 'application/java-archive',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
