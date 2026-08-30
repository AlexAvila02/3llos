export async function onRequest(context) {
  const { request, env } = context;
  const PANEL_URL = env.MINEHOST_URL;
  const API_KEY = env.MINEHOST_API_KEY;
  const SERVER_ID = env.MINEHOST_SERVER_ID;

  try {
    let filesToCompress = [];

    // 1. Si el cliente envió una lista de archivos seleccionados por POST
    if (request.method === "POST") {
      try {
        const body = await request.json();
        if (body.files && Array.isArray(body.files) && body.files.length > 0) {
          filesToCompress = body.files;
        }
      } catch (e) {}
    }

    // 2. Si no hay archivos específicos seleccionados (Descargar Todos),
    // consultamos primero a Minehost la lista de todos los .jar en /mods
    if (filesToCompress.length === 0) {
      const listRes = await fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}/files/list?directory=%2Fmods`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json'
        }
      });
      const listData = await listRes.json();
      filesToCompress = listData.data
        .filter(item => item.attributes.name.endsWith('.jar'))
        .map(item => item.attributes.name);
    }

    if (filesToCompress.length === 0) {
      return new Response(JSON.stringify({ error: "No hay mods para comprimir" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // 3. Enviar a Minehost la orden de comprimir con la lista real de archivos
    const compressRes = await fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}/files/compress`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        root: '/mods',
        files: filesToCompress
      })
    });

    if (!compressRes.ok) {
      const errDetail = await compressRes.text();
      return new Response(JSON.stringify({ error: "Error al comprimir en Minehost", details: errDetail }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const compressData = await compressRes.json();
    const archiveName = compressData.attributes.name;

    // 4. Obtener el enlace de descarga del archivo comprimido recién creado
    const downloadRes = await fetch(
      `${PANEL_URL}/api/client/servers/${SERVER_ID}/files/download?file=%2Fmods%2F${encodeURIComponent(archiveName)}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json',
        }
      }
    );

    const downloadData = await downloadRes.json();
    const downloadUrl = downloadData.attributes.url;

    // 5. Redirigir al usuario a la descarga del archivo comprimido
    return Response.redirect(downloadUrl, 302);

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
