exports.handler = async () => {
  const F = global.fetch || (()=>{ try{return require('node-fetch')}catch{return null}})();
  if(!F) return {statusCode:500, headers:{'Content-Type':'application/json'}, body:JSON.stringify({error:'fetch no disponible'})};
  const fetchFn = F;
  const { MINEHOST_URL, MINEHOST_API_KEY, MINEHOST_SERVER_ID } = process.env;
  if (!MINEHOST_URL || !MINEHOST_API_KEY || !MINEHOST_SERVER_ID) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Faltan variables de entorno', hasUrl:!!MINEHOST_URL, hasKey:!!MINEHOST_API_KEY, hasId:!!MINEHOST_SERVER_ID }) };
  }
  const base = MINEHOST_URL.replace(/\/$/, '');
  const SERVER_KW = ['chunky','ftbbackups','ftb-ranks','ftb-essentials','spark','skinrestorer','daytimecontrol','madeinsleep'];
  try {
    const listRes = await fetchFn(`${base}/api/client/servers/${MINEHOST_SERVER_ID}/files/list?directory=%2Fmods`, {
      headers: { Authorization: `Bearer ${MINEHOST_API_KEY}`, Accept: 'application/json' }
    });
    const listText = await listRes.text();
    if (!listRes.ok) return { statusCode: 500, headers:{'Content-Type':'application/json'}, body:JSON.stringify({error:'list failed '+listRes.status, details:listText.slice(0,800)})};
    let lj; try{ lj=JSON.parse(listText);}catch(e){ return {statusCode:500, headers:{'Content-Type':'application/json'}, body:JSON.stringify({error:'list JSON parse', details:listText.slice(0,800)})};}
    const raw = lj.data || lj;
    let jars = (Array.isArray(raw)?raw:[]).map(x=>(x.attributes||x).name||(x.attributes||x).filename).filter(n=>n&&n.endsWith('.jar'));
    jars = jars.filter(n=> !SERVER_KW.some(k=> n.toLowerCase().includes(k)));
    if(!jars.length) return {statusCode:404, headers:{'Content-Type':'application/json'}, body:JSON.stringify({error:'No hay mods cliente'})};

    // Intento 1: comprimir lista filtrada
    let archiveName=null, lastErr='';
    // Intento 1 spec: wildcard *
    let cr = await fetchFn(`${base}/api/client/servers/${MINEHOST_SERVER_ID}/files/compress`, {
      method:'POST', headers:{ Authorization:`Bearer ${MINEHOST_API_KEY}`, 'Content-Type':'application/json', Accept:'application/json' },
      body: JSON.stringify({ root:'/mods', files: ['*'] })
    });
    let ct = await cr.text();
    if(cr.ok){
      try{ const cj=JSON.parse(ct); archiveName=cj?.attributes?.name||cj?.name||cj?.file; }catch{}
      if(!archiveName){ const m=ct.match(/archive[^"\s]*\.(zip|tar\.gz)/i); if(m) archiveName=m[0]; }
    } else lastErr='intento1 * '+cr.status+' '+ct.slice(0,400);
    // Intento 2: lista filtrada
    if(!archiveName){
      cr = await fetchFn(`${base}/api/client/servers/${MINEHOST_SERVER_ID}/files/compress`, {
        method:'POST', headers:{ Authorization:`Bearer ${MINEHOST_API_KEY}`, 'Content-Type':'application/json', Accept:'application/json' },
        body: JSON.stringify({ root:'/mods', files: jars })
      });
      ct = await cr.text();
      if(cr.ok){
        try{ const cj=JSON.parse(ct); archiveName=cj?.attributes?.name||cj?.name||cj?.file; }catch{}
        if(!archiveName){ const m=ct.match(/archive[^"\s]*\.(zip|tar\.gz)/i); if(m) archiveName=m[0]; }
      } else lastErr+=' | intento2 lista '+cr.status+' '+ct.slice(0,400);
    }

    // Fallback: comprimir carpeta mods completa
    if(!archiveName){
      const cr2 = await fetchFn(`${base}/api/client/servers/${MINEHOST_SERVER_ID}/files/compress`, {
        method:'POST', headers:{ Authorization:`Bearer ${MINEHOST_API_KEY}`, 'Content-Type':'application/json', Accept:'application/json' },
        body: JSON.stringify({ root:'/', files:['mods'] })
      });
      const ct2 = await cr2.text();
      if(cr2.ok){
        try{ const cj2=JSON.parse(ct2); archiveName=cj2?.attributes?.name||cj2?.name||cj2?.file; }catch{}
        if(!archiveName){ const m2=ct2.match(/archive[^"\s]*\.(zip|tar\.gz)/i); if(m2) archiveName=m2[0]; }
      }
      if(!archiveName && !cr.ok) lastErr+=' | intento2 '+cr2.status+' '+ct2.slice(0,400);
      if(!archiveName) {
        // Buscar archive en / y /mods
        await new Promise(r=>setTimeout(r,900));
        for(const dir of ['%2F','%2Fmods']){
          const lr=await fetchFn(`${base}/api/client/servers/${MINEHOST_SERVER_ID}/files/list?directory=${dir}`, {headers:{Authorization:`Bearer ${MINEHOST_API_KEY}`, Accept:'application/json'}});
          const lt=await lr.text();
          try{ const lj2=JSON.parse(lt); const arr=lj2.data||lj2; const f=(Array.isArray(arr)?arr:[]).map(x=>(x.attributes||x).name).find(n=>n&&n.toLowerCase().includes('archive')); if(f){ archiveName = dir==='%2F'? f : 'mods/'+f; break; } }catch{}
        }
      }
      if(!archiveName) return {statusCode:500, headers:{'Content-Type':'application/json'}, body:JSON.stringify({error:'No se obtuvo archive', details:lastErr.slice(0,600)})};
    }

    let fileParam = archiveName;
    if(!fileParam.startsWith('/')) fileParam='/'+fileParam;
    // si es mods.zip en raiz, queda /mods.zip o /archive...; si es en /mods, queda /mods/archive...
    const dl = await fetchFn(`${base}/api/client/servers/${MINEHOST_SERVER_ID}/files/download?file=${encodeURIComponent(fileParam)}`, {
      headers:{ Authorization:`Bearer ${MINEHOST_API_KEY}`, Accept:'application/json' }
    });
    const dt = await dl.text();
    if(!dl.ok) return {statusCode:500, headers:{'Content-Type':'application/json'}, body:JSON.stringify({error:'download url failed '+dl.status+' file='+fileParam, details:dt.slice(0,600)})};
    let dj; try{ dj=JSON.parse(dt);}catch(e){ return {statusCode:500, headers:{'Content-Type':'application/json'}, body:JSON.stringify({error:'download json parse', details:dt.slice(0,600)})};}
    const url = dj?.attributes?.url || dj?.data?.attributes?.url;
    if(!url) return {statusCode:500, headers:{'Content-Type':'application/json'}, body:JSON.stringify({error:'No url', raw:dj})};
    return {statusCode:200, headers:{'Content-Type':'application/json'}, body:JSON.stringify({url})};
  } catch(e){
    return {statusCode:500, headers:{'Content-Type':'application/json'}, body:JSON.stringify({error:e.message||String(e), stack:e.stack?.slice(0,800)})};
  }
};
