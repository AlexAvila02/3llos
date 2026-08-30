export async function onRequest(context) {
  const { request, env } = context;
  const PANEL_URL = env.MINEHOST_URL;
  const API_KEY = env.MINEHOST_API_KEY;
  const SERVER_ID = env.MINEHOST_SERVER_ID;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" }
    });
  }

  try {
    let files = [];
    if (request.method === "POST") {
      try {
        const body = await request.json();
        if (body.files && body.files.length > 0) files = body.files;
      } catch (e) {}
    }

    if (files.length === 0) {
      const listRes = await fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}/files/list?directory=%2Fmods`, {
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' }
      });
      const listData = await listRes.json();
      const SERVER_KW = ['chunky','ftbbackups','ftb-ranks','ftb-essentials','spark','skinrestorer','daytimecontrol','madeinsleep'];
      files = listData.data.filter(i => i.attributes.name.endsWith('.jar')).map(i => i.attributes.name).filter(n=> !SERVER_KW.some(k=> n.toLowerCase().includes(k)));
    }

    async function doCompress(root, fileList){
      const r = await fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}/files/compress`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ root, files: fileList })
      });
      const t = await r.text();
      let j=null; try{ j=JSON.parse(t);}catch{}
      return {ok:r.ok, text:t, json:j, status:r.status};
    }

    let c = await doCompress('/mods', files);
    let archiveName = c.json?.attributes?.name || c.json?.name;
    if(!c.ok || !archiveName){
      // fallback root "/" with mods/ prefix
      const altFiles = files.map(f=>'mods/'+f);
      const c2 = await doCompress('/', altFiles);
      if(c2.ok && (c2.json?.attributes?.name||c2.json?.name)){
        archiveName = c2.json.attributes.name || c2.json.name;
        c = c2;
      } else if(!archiveName){
        return new Response(JSON.stringify({ error: c.text.slice(0,800) }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }

    // esperar un poco y buscar archive si es necesario
    if(!archiveName){
      const m=c.text.match(/archive[^"\s]*\.(zip|tar\.gz)/i);
      if(m) archiveName=m[0];
    }
    if(!archiveName){
      await new Promise(r=>setTimeout(r,900));
      for(const dir of ['%2Fmods','%2F']){
        const lr=await fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}/files/list?directory=${dir}`, {headers:{'Authorization':`Bearer ${API_KEY}`,Accept:'application/json'}});
        const lt=await lr.text();
        try{
          const lj=JSON.parse(lt);
          const arr=lj.data||lj;
          const cand=(Array.isArray(arr)?arr:[]).map(x=>(x.attributes||x).name).filter(n=>n&&n.toLowerCase().includes('archive')).sort((a,b)=>b.localeCompare(a));
          if(cand.length){ archiveName = dir==='%2Fmods' ? cand[0] : cand[0].includes('/')?cand[0]:cand[0]; if(dir==='%2Fmods') archiveName='mods/'+archiveName; else archiveName=cand[0]; break; }
        }catch{}
      }
    }
    if(!archiveName) return new Response(JSON.stringify({error:'No archive', details:c.text.slice(0,600)}),{status:500, headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});

    let fileParam = archiveName;
    if(!fileParam.startsWith('/')) fileParam='/'+fileParam;
    // si es /archive.zip en root, mantener, si es mods/archive.zip ya tiene
    const dlRes = await fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}/files/download?file=${encodeURIComponent(fileParam)}`, {
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' }
    });
    const dlText = await dlRes.text();
    let dlData; try{ dlData=JSON.parse(dlText);}catch{ return new Response(JSON.stringify({error:'dl json', details:dlText.slice(0,600)}),{status:500, headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}})}
    const wingsUrl = dlData.attributes?.url || dlData.data?.attributes?.url;
    if(!wingsUrl) return new Response(JSON.stringify({error:'No url', raw:dlData}),{status:500, headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});

    const fileRes = await fetch(wingsUrl);
    // verificar tamaño: si zip es <2MB y deberia ser >50MB, reintentar con root "/"
    const len = fileRes.headers.get('Content-Length');
    if(len && parseInt(len) < 5*1024*1024 && files.length>20){
      // muy pequeño, intentar fallback ya hecho
    }
    return new Response(fileRes.body, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(archiveName.split('/').pop())}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, stack:e.stack?.slice(0,400) }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
}
