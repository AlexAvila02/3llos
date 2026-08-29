const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8'
};

async function httpGet(url) {
  return axios.get(url, {
    timeout: 12000,
    headers: DEFAULT_HEADERS,
    maxRedirects: 5,
    validateStatus: (s) => s >= 200 && s < 400
  });
}

const formatPrice = (priceStr) => {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[^\d]/g, '');
  return parseInt(cleaned) || 0;
};

const formatPriceDisplay = (num) => {
  return '$' + num.toLocaleString('es-AR', { maximumFractionDigits: 0 });
};

const extractModel = (name) => {
  const modelPatterns = [
    /RTX\s*(\d{4})\s*(Ti\s*)?(Super\s*)?(\d*GB)?/i,
    /RX\s*(\d{4})\s*(XT\s*)?(\d*GB)?/i,
    /RTX\s*(\d{3})/i,
    /DDR[45]\s*(\d+)\s*GB\s*\(?(2x\d+\s*GB|4x\d+\s*GB)\)?/i,
    /(2x\d+\s*GB|4x\d+\s*GB)\s*DDR[45]\s*(\d+)\s*GB/i,
    /DDR[45]\s*(\d+)\s*GB/i,
    /(\d+)\s*GB\s*(DDR[45])/i
  ];
  
  for (const pattern of modelPatterns) {
    const match = name.match(pattern);
    if (match) {
      const raw = match[0].toUpperCase();
      return raw.replace(/\b(\d)X(\d+)\s*GB\b/g, (_, a, b) => `${a}x${b}GB`);
    }
  }
  
  return name.substring(0, 30).toUpperCase();
};

const STORES = {
  mercadolibre: {
    name: 'MercadoLibre',
    icon: '🛒',
    baseUrl: 'https://www.mercadolibre.com.ar',
    search: (q) => `https://www.mercadolibre.com.ar/search?q=${encodeURIComponent(q)}`
  },
  venex: {
    name: 'Venex',
    icon: '⚡',
    baseUrl: 'https://www.venex.com.ar',
    gpuUrl: 'https://www.venex.com.ar/placas-de-video',
    ramUrl: 'https://www.venex.com.ar/memorias-ram'
  },
  compragamer: {
    name: 'CompraGamer',
    icon: '🎮',
    baseUrl: 'https://compragamer.com',
    gpuUrl: 'https://compragamer.com/placas-de-video',
    ramUrl: 'https://compragamer.com/memorias-ram'
  },
  fullh4rd: {
    name: 'FullH4rd',
    icon: '🔥',
    baseUrl: 'https://fullh4rd.com.ar',
    gpuUrl: 'https://fullh4rd.com.ar/category/placas-de-video',
    ramUrl: 'https://fullh4rd.com.ar/category/memorias-ram'
  },
  maximus: {
    name: 'Maximus',
    icon: '💎',
    baseUrl: 'https://www.maximus.com.ar',
    gpuUrl: 'https://www.maximus.com.ar/placas-de-video',
    ramUrl: 'https://www.maximus.com.ar/memorias-ram'
  }
};

async function scrapeVenex() {
  const results = { gpus: [], rams: [] };
  
  try {
    const gpuRes = await httpGet(STORES.venex.gpuUrl);
    const $gpu = cheerio.load(gpuRes.data);
    
    $gpu('.vtex-product-summary-2-x-productName').each((i, el) => {
      if (results.gpus.length >= 15) return;
      const name = $gpu(el).text().trim();
      if (!name) return;
      
      const isGPU = /RTX|RX\s*\d{4}|4060|4070|4080|4090|3060|3070|7600|7800/i.test(name);
      if (!isGPU) return;
      
      const parent = $gpu(el).closest('[class*="productSummary"]');
      let price = '';
      parent.find('[class*="Price"], [class*="price"]').each((j, p) => {
        const txt = $gpu(p).text().trim();
        if (txt.includes('$')) price = txt;
      });
      
      if (price) {
        results.gpus.push({
          nombre: name,
          precio: formatPrice(price),
          seller: 'Venex',
          link: STORES.venex.baseUrl + '/placas-de-video'
        });
      }
    });
  } catch (e) {
    console.log('Venex GPU error:', e.message);
  }
  
  try {
    const ramRes = await httpGet(STORES.venex.ramUrl);
    const $ram = cheerio.load(ramRes.data);
    
    $ram('.vtex-product-summary-2-x-productName').each((i, el) => {
      if (results.rams.length >= 15) return;
      const name = $ram(el).text().trim();
      if (!name) return;
      
      const isRAM = /DDR[45]|\d+\s*GB|Memoria/i.test(name);
      if (!isRAM) return;
      
      const parent = $ram(el).closest('[class*="productSummary"]');
      let price = '';
      parent.find('[class*="Price"], [class*="price"]').each((j, p) => {
        const txt = $ram(p).text().trim();
        if (txt.includes('$')) price = txt;
      });
      
      if (price) {
        results.rams.push({
          nombre: name,
          precio: formatPrice(price),
          seller: 'Venex',
          link: STORES.venex.baseUrl + '/memorias-ram'
        });
      }
    });
  } catch (e) {
    console.log('Venex RAM error:', e.message);
  }
  
  return results;
}

async function scrapeCompraGamer() {
  // CompraGamer cambia seguido el HTML de listados; es más confiable extraer desde la página de producto.
  const [gpus, rams] = await Promise.all([
    scrapeCompraGamerByProducts('gpus'),
    scrapeCompraGamerByProducts('rams')
  ]);
  return { gpus, rams };
}

async function scrapeFullH4rd() {
  const results = { gpus: [], rams: [] };
  
  try {
    const gpuRes = await httpGet(STORES.fullh4rd.gpuUrl);
    const $gpu = cheerio.load(gpuRes.data);
    
    $gpu('.card-product').each((i, el) => {
      if (results.gpus.length >= 15) return;
      const name = $gpu(el).find('.card-title, .product-name, h3').first().text().trim();
      const price = $gpu(el).find('.price, .product-price').first().text().trim();
      
      if (name && /RTX|RX\s*\d{4}|4060|4070|4080|4090/i.test(name) && price) {
        results.gpus.push({
          nombre: name,
          precio: formatPrice(price),
          seller: 'FullH4rd',
          link: STORES.fullh4rd.gpuUrl
        });
      }
    });
  } catch (e) {
    console.log('F4H GPU error:', e.message);
  }
  
  try {
    const ramRes = await httpGet(STORES.fullh4rd.ramUrl);
    const $ram = cheerio.load(ramRes.data);
    
    $ram('.card-product').each((i, el) => {
      if (results.rams.length >= 15) return;
      const name = $ram(el).find('.card-title, .product-name, h3').first().text().trim();
      const price = $ram(el).find('.price, .product-price').first().text().trim();
      
      if (name && /DDR[45]|\d+\s*GB/i.test(name) && price) {
        results.rams.push({
          nombre: name,
          precio: formatPrice(price),
          seller: 'FullH4rd',
          link: STORES.fullh4rd.ramUrl
        });
      }
    });
  } catch (e) {
    console.log('F4H RAM error:', e.message);
  }
  
  return results;
}

function normalizeSearchTerm(str) {
  return (str || '')
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9\s+.-]/g, '')
    .replace(/\s/g, '+');
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function findFirstStructuredPrice(html) {
  const $ = cheerio.load(html);

  // JSON-LD (schema.org)
  const jsonLdNodes = $('script[type="application/ld+json"]').toArray();
  for (const node of jsonLdNodes) {
    const raw = $(node).text().trim();
    if (!raw) continue;
    const parsed = tryParseJson(raw);
    const candidates = Array.isArray(parsed) ? parsed : [parsed];
    for (const obj of candidates) {
      if (!obj || typeof obj !== 'object') continue;
      const offers = obj.offers;
      const offerList = Array.isArray(offers) ? offers : (offers ? [offers] : []);
      for (const offer of offerList) {
        const price = offer?.price ?? offer?.lowPrice;
        if (price == null) continue;
        const priceNum = formatPrice(String(price));
        if (priceNum > 0) return priceNum;
      }
    }
  }

  // OpenGraph / microdata
  const metaPrice = $('meta[property="product:price:amount"]').attr('content');
  if (metaPrice) {
    const n = formatPrice(metaPrice);
    if (n > 0) return n;
  }

  const itempropPrice = $('[itemprop="price"]').attr('content') || $('[itemprop="price"]').first().text().trim();
  if (itempropPrice) {
    const n = formatPrice(itempropPrice);
    if (n > 0) return n;
  }

  // Heurística: primera coincidencia grande con $ y miles (por ej. $2.199.999)
  const text = $.text();
  const m = text.match(/\$\s*([0-9]{1,3}(?:[.\s][0-9]{3})+|[0-9]{6,})/);
  if (m?.[1]) {
    const n = formatPrice(m[1]);
    if (n > 0) return n;
  }

  return 0;
}

function resolveAbsoluteUrl(baseUrl, href) {
  if (!href) return '';
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return '';
  }
}

function parseCompraGamerFirstProductUrl(listHtml) {
  const $ = cheerio.load(listHtml);
  const link = $('a[href*="/producto/"]').first().attr('href');
  return link || '';
}

async function fetchCompraGamerProductByQuery(query) {
  const q = (query || '').toString().replace(/\+/g, ' ').trim();
  if (!q) return null;

  const candidates = [
    `https://compragamer.com/index.php?seccion=3&criterio=${encodeURIComponent(q)}&sort=lower_price`,
    `https://compragamer.com/index.php?criterio=${encodeURIComponent(q)}&sort=lower_price`,
    `https://compragamer.com/?criterio=${encodeURIComponent(q)}&sort=lower_price`
  ];

  for (const listUrl of candidates) {
    try {
      const listRes = await httpGet(listUrl);
      const href = parseCompraGamerFirstProductUrl(listRes.data);
      const productUrl = resolveAbsoluteUrl('https://compragamer.com', href);
      if (!productUrl) continue;

      const prodRes = await httpGet(productUrl);
      const price = findFirstStructuredPrice(prodRes.data);
      if (price > 0) {
        const $p = cheerio.load(prodRes.data);
        const name = ($p('h1').first().text().trim() || $p('title').text().trim() || q).trim();
        return { name, price, url: productUrl };
      }
    } catch {
      // seguir con siguiente candidate
    }
  }

  return null;
}

async function scrapeCompraGamerByProducts(type) {
  const list = PRODUCTS[type] || [];
  const results = [];

  // Concurrencia baja para evitar bloqueos.
  const concurrency = 2;
  let index = 0;

  async function worker() {
    while (index < list.length) {
      const current = list[index++];
      const query = current.compraGamerQuery || current.search || current.modelo;
      const found = await fetchCompraGamerProductByQuery(query);
      if (!found) continue;
      results.push({
        nombre: found.name || current.modelo,
        precio: found.price,
        seller: 'CompraGamer',
        link: found.url,
        search: normalizeSearchTerm(current.modelo)
      });
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

function parseMercadoLibreFirstPrice(html) {
  const $ = cheerio.load(html);
  const item = $('li.ui-search-layout__item').first();
  if (!item.length) return 0;

  const fraction = item.find('[class*="price-tag-fraction"]').first().text().trim();
  const altFraction = item.find('span.andes-money-amount__fraction').first().text().trim();
  const raw = fraction || altFraction;
  return formatPrice(raw);
}

async function scrapeMercadoLibreByProducts(type) {
  const list = PRODUCTS[type] || [];
  const results = [];

  // Concurrencia baja para evitar rate-limit/captcha
  const concurrency = 3;
  let index = 0;

  async function worker() {
    while (index < list.length) {
      const current = list[index++];
      const search = current.search || normalizeSearchTerm(current.modelo);
      const url = `https://lista.mercadolibre.com.ar/${search}`;

      try {
        const res = await httpGet(url);
        const price = parseMercadoLibreFirstPrice(res.data);
        if (price > 0) {
          results.push({
            nombre: current.modelo,
            precio: price,
            seller: 'MercadoLibre',
            link: url,
            search
          });
        }
      } catch (e) {
        // Silencioso: MercadoLibre bloquea fácil scraping
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return results;
}

function groupAndSortByPrice(items, type) {
  const groups = {};
  const isRam = type === 'rams' || type === 'ram';
  
  items.forEach(item => {
    const model = extractModel(item.nombre);
    const key = model;
    const searchTerm = item.search || model.replace(/ /g, '+');
    
    if (!groups[key]) {
      groups[key] = {
        modelo: model,
        precios: [],
        nombreCompleto: item.nombre,
        search: searchTerm
      };
    }
    
    const mlLink = item.seller === 'MercadoLibre' 
      ? item.link 
      : `https://lista.mercadolibre.com.ar/${searchTerm}`;

    const storeDefaultLink = (() => {
      if (item.seller === 'Venex') return isRam ? STORES.venex.ramUrl : STORES.venex.gpuUrl;
      if (item.seller === 'CompraGamer') return isRam ? STORES.compragamer.ramUrl : STORES.compragamer.gpuUrl;
      if (item.seller === 'FullH4rd') return isRam ? STORES.fullh4rd.ramUrl : STORES.fullh4rd.gpuUrl;
      if (item.seller === 'Maximus') return isRam ? STORES.maximus.ramUrl : STORES.maximus.gpuUrl;
      return '';
    })();
    
    groups[key].precios.push({
      precio: item.precio,
      seller: item.seller,
      link: item.link || (item.seller === 'MercadoLibre' ? mlLink : storeDefaultLink || mlLink)
    });
  });
  
  const result = Object.values(groups)
    .map(g => ({
      modelo: g.modelo,
      nombreCompleto: g.nombreCompleto,
      precios: g.precios.sort((a, b) => a.precio - b.precio),
      precioMinimo: g.precios[0]?.precio || 0,
      tiendaMasBarata: g.precios[0]?.seller || 'N/A',
      linkMasBarato: g.precios[0]?.link || `https://lista.mercadolibre.com.ar/${g.search}`
    }))
    .sort((a, b) => a.precioMinimo - b.precioMinimo);
  
  return result;
}

const PRODUCTS = {
  gpus: [
    { modelo: 'RTX 4090 24GB', search: 'geforce+rtx+4090' },
    { modelo: 'RTX 4080 SUPER 16GB', search: 'geforce+rtx+4080+super' },
    { modelo: 'RTX 4070 TI SUPER', search: 'geforce+rtx+4070+ti+super' },
    { modelo: 'RTX 4070 SUPER 12GB', search: 'geforce+rtx+4070+super' },
    { modelo: 'RTX 4060 TI 8GB', search: 'geforce+rtx+4060+ti' },
    { modelo: 'RTX 4060 8GB', search: 'geforce+rtx+4060' },
    { modelo: 'RTX 3070 TI', search: 'geforce+rtx+3070+ti' },
    { modelo: 'RTX 3070 8GB', search: 'geforce+rtx+3070' },
    { modelo: 'RTX 3060 TI', search: 'geforce+rtx+3060+ti' },
    { modelo: 'RTX 3060 12GB', search: 'geforce+rtx+3060' },
    { modelo: 'RX 7800 XT 16GB', search: 'radeon+rx+7800+xt' },
    { modelo: 'RX 7700 XT', search: 'radeon+rx+7700+xt' },
    { modelo: 'RX 7600 8GB', search: 'radeon+rx+7600' }
  ],
  rams: [
    { modelo: 'DDR5 64GB (2x32GB)', search: 'memoria+ddr5+64gb' },
    { modelo: 'DDR5 32GB (2x16GB)', search: 'memoria+ddr5+32gb' },
    { modelo: 'DDR5 16GB', search: 'memoria+ddr5+16gb' },
    { modelo: 'DDR4 32GB (2x16GB)', search: 'memoria+ddr4+32gb' },
    { modelo: 'DDR4 16GB (2x8GB)', search: 'memoria+ddr4+16gb' },
    { modelo: 'DDR4 8GB', search: 'memoria+ddr4+8gb' }
  ]
};

function getDemoData() {
  return {
    gpus: [
      { modelo: 'RTX 4090 24GB', precios: [{precio: 690000, seller: 'Venex', link: 'https://www.venex.com.ar/placas-de-video'}, {precio: 720000, seller: 'CompraGamer', link: 'https://compragamer.com/placas-de-video'}, {precio: 850000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/geforce-rtx-4090'}]},
      { modelo: 'RTX 4080 SUPER 16GB', precios: [{precio: 590000, seller: 'CompraGamer', link: 'https://compragamer.com/placas-de-video'}, {precio: 620000, seller: 'Venex', link: 'https://www.venex.com.ar/placas-de-video'}, {precio: 780000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/geforce-rtx-4080-super'}]},
      { modelo: 'RTX 4070 TI SUPER', precios: [{precio: 520000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/geforce-rtx-4070-ti-super'}, {precio: 550000, seller: 'Venex', link: 'https://www.venex.com.ar/placas-de-video'}, {precio: 680000, seller: 'CompraGamer', link: 'https://compragamer.com/placas-de-video'}]},
      { modelo: 'RTX 4070 SUPER 12GB', precios: [{precio: 480000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/geforce-rtx-4070-super'}, {precio: 510000, seller: 'Venex', link: 'https://www.venex.com.ar/placas-de-video'}, {precio: 650000, seller: 'CompraGamer', link: 'https://compragamer.com/placas-de-video'}]},
      { modelo: 'RTX 4060 TI 8GB', precios: [{precio: 410000, seller: 'Venex', link: 'https://www.venex.com.ar/placas-de-video'}, {precio: 450000, seller: 'CompraGamer', link: 'https://compragamer.com/placas-de-video'}, {precio: 520000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/geforce-rtx-4060-ti'}]},
      { modelo: 'RTX 4060 8GB', precios: [{precio: 380000, seller: 'Venex', link: 'https://www.venex.com.ar/placas-de-video'}, {precio: 420000, seller: 'CompraGamer', link: 'https://compragamer.com/placas-de-video'}, {precio: 480000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/geforce-rtx-4060'}]},
      { modelo: 'RTX 3070 TI', precios: [{precio: 450000, seller: 'CompraGamer', link: 'https://compragamer.com/placas-de-video'}, {precio: 480000, seller: 'Venex', link: 'https://www.venex.com.ar/placas-de-video'}, {precio: 580000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/geforce-rtx-3070-ti'}]},
      { modelo: 'RTX 3070 8GB', precios: [{precio: 420000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/geforce-rtx-3070'}, {precio: 450000, seller: 'Venex', link: 'https://www.venex.com.ar/placas-de-video'}, {precio: 520000, seller: 'CompraGamer', link: 'https://compragamer.com/placas-de-video'}]},
      { modelo: 'RTX 3060 TI', precios: [{precio: 380000, seller: 'Venex', link: 'https://www.venex.com.ar/placas-de-video'}, {precio: 420000, seller: 'CompraGamer', link: 'https://compragamer.com/placas-de-video'}, {precio: 480000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/geforce-rtx-3060-ti'}]},
      { modelo: 'RTX 3060 12GB', precios: [{precio: 350000, seller: 'Venex', link: 'https://www.venex.com.ar/placas-de-video'}, {precio: 390000, seller: 'CompraGamer', link: 'https://compragamer.com/placas-de-video'}, {precio: 450000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/geforce-rtx-3060'}]},
      { modelo: 'RX 7800 XT 16GB', precios: [{precio: 490000, seller: 'Venex', link: 'https://www.venex.com.ar/placas-de-video'}, {precio: 520000, seller: 'CompraGamer', link: 'https://compragamer.com/placas-de-video'}, {precio: 620000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/radeon-rx-7800-xt'}]},
      { modelo: 'RX 7700 XT', precios: [{precio: 420000, seller: 'Venex', link: 'https://www.venex.com.ar/placas-de-video'}, {precio: 450000, seller: 'CompraGamer', link: 'https://compragamer.com/placas-de-video'}, {precio: 550000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/radeon-rx-7700-xt'}]},
      { modelo: 'RX 7600 8GB', precios: [{precio: 350000, seller: 'Venex', link: 'https://www.venex.com.ar/placas-de-video'}, {precio: 380000, seller: 'CompraGamer', link: 'https://compragamer.com/placas-de-video'}, {precio: 450000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/radeon-rx-7600'}]}
    ].map(g => {
      const sorted = [...g.precios].sort((a,b) => a.precio - b.precio);
      return {
        modelo: g.modelo,
        nombreCompleto: g.modelo,
        precios: sorted,
        precioMinimo: sorted[0]?.precio || 0,
        tiendaMasBarata: sorted[0]?.seller || '',
        linkMasBarato: sorted[0]?.link || ''
      };
    }),
    rams: [
      { modelo: 'DDR5 64GB (2x32GB)', precios: [{precio: 155000, seller: 'CompraGamer', link: 'https://compragamer.com/memorias-ram'}, {precio: 180000, seller: 'Venex', link: 'https://www.venex.com.ar/memorias-ram'}, {precio: 220000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/memoria-ddr5-64gb'}]},
      { modelo: 'DDR5 32GB (2x16GB)', precios: [{precio: 95000, seller: 'Venex', link: 'https://www.venex.com.ar/memorias-ram'}, {precio: 110000, seller: 'CompraGamer', link: 'https://compragamer.com/memorias-ram'}, {precio: 140000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/memoria-ddr5-32gb'}]},
      { modelo: 'DDR5 16GB', precios: [{precio: 65000, seller: 'CompraGamer', link: 'https://compragamer.com/memorias-ram'}, {precio: 75000, seller: 'Venex', link: 'https://www.venex.com.ar/memorias-ram'}, {precio: 95000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/memoria-ddr5-16gb'}]},
      { modelo: 'DDR4 32GB (2x16GB)', precios: [{precio: 120000, seller: 'Venex', link: 'https://www.venex.com.ar/memorias-ram'}, {precio: 135000, seller: 'CompraGamer', link: 'https://compragamer.com/memorias-ram'}, {precio: 160000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/memoria-ddr4-32gb'}]},
      { modelo: 'DDR4 16GB (2x8GB)', precios: [{precio: 75000, seller: 'Venex', link: 'https://www.venex.com.ar/memorias-ram'}, {precio: 85000, seller: 'CompraGamer', link: 'https://compragamer.com/memorias-ram'}, {precio: 110000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/memoria-ddr4-16gb'}]},
      { modelo: 'DDR4 8GB', precios: [{precio: 45000, seller: 'Venex', link: 'https://www.venex.com.ar/memorias-ram'}, {precio: 52000, seller: 'CompraGamer', link: 'https://compragamer.com/memorias-ram'}, {precio: 65000, seller: 'MercadoLibre', link: 'https://lista.mercadolibre.com.ar/memoria-ddr4-8gb'}]}
    ].map(r => {
      const sorted = [...r.precios].sort((a,b) => a.precio - b.precio);
      return {
        modelo: r.modelo,
        nombreCompleto: r.modelo,
        precios: sorted,
        precioMinimo: sorted[0]?.precio || 0,
        tiendaMasBarata: sorted[0]?.seller || '',
        linkMasBarato: sorted[0]?.link || ''
      };
    })
  };
}

let cachedData = null;
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

async function fetchLiveData(options = {}) {
  const includeML = options.includeML === true;

  const storeStatuses = {
    venex: { ok: false, error: null, count: { gpus: 0, rams: 0 } },
    compragamer: { ok: false, error: null, count: { gpus: 0, rams: 0 } },
    fullh4rd: { ok: false, error: null, count: { gpus: 0, rams: 0 } },
    mercadolibre: { ok: false, error: null, count: { gpus: 0, rams: 0 } }
  };

  const [venex, cg, f4h] = await Promise.allSettled([
    scrapeVenex(),
    scrapeCompraGamer(),
    scrapeFullH4rd()
  ]);

  const gpuItems = [];
  const ramItems = [];

  if (venex.status === 'fulfilled') {
    storeStatuses.venex.ok = true;
    storeStatuses.venex.count.gpus = venex.value.gpus.length;
    storeStatuses.venex.count.rams = venex.value.rams.length;
    gpuItems.push(...venex.value.gpus);
    ramItems.push(...venex.value.rams);
  } else {
    storeStatuses.venex.error = venex.reason?.message || String(venex.reason);
  }

  if (cg.status === 'fulfilled') {
    storeStatuses.compragamer.ok = true;
    storeStatuses.compragamer.count.gpus = cg.value.gpus.length;
    storeStatuses.compragamer.count.rams = cg.value.rams.length;
    gpuItems.push(...cg.value.gpus);
    ramItems.push(...cg.value.rams);
  } else {
    storeStatuses.compragamer.error = cg.reason?.message || String(cg.reason);
  }

  if (f4h.status === 'fulfilled') {
    storeStatuses.fullh4rd.ok = true;
    storeStatuses.fullh4rd.count.gpus = f4h.value.gpus.length;
    storeStatuses.fullh4rd.count.rams = f4h.value.rams.length;
    gpuItems.push(...f4h.value.gpus);
    ramItems.push(...f4h.value.rams);
  } else {
    storeStatuses.fullh4rd.error = f4h.reason?.message || String(f4h.reason);
  }

  if (includeML) {
    try {
      const [mlGpus, mlRams] = await Promise.all([
        scrapeMercadoLibreByProducts('gpus'),
        scrapeMercadoLibreByProducts('rams')
      ]);
      storeStatuses.mercadolibre.ok = true;
      storeStatuses.mercadolibre.count.gpus = mlGpus.length;
      storeStatuses.mercadolibre.count.rams = mlRams.length;
      gpuItems.push(...mlGpus);
      ramItems.push(...mlRams);
    } catch (e) {
      storeStatuses.mercadolibre.error = e.message;
    }
  }

  const totalItems = gpuItems.length + ramItems.length;
  if (totalItems === 0) {
    const error = new Error('No se pudieron extraer productos de las tiendas (posible bloqueo o cambio de HTML).');
    error.code = 'NO_ITEMS';
    error.meta = { stores: storeStatuses };
    throw error;
  }

  const gpus = groupAndSortByPrice(gpuItems, 'gpus');
  const rams = groupAndSortByPrice(ramItems, 'rams');

  return {
    meta: {
      fetchedAt: new Date().toISOString(),
      cacheDurationMs: CACHE_DURATION,
      includeML,
      stores: storeStatuses
    },
    gpus,
    rams
  };
}

app.get('/api/precios', async (req, res) => {
  const force = req.query.force === '1' || req.query.force === 'true';
  const demo = req.query.demo === '1' || req.query.demo === 'true';
  const includeML = req.query.includeML === '1' || req.query.includeML === 'true' || process.env.INCLUDE_ML === 'true';

  if (demo) {
    const demoData = getDemoData();
    demoData.meta = { fetchedAt: new Date().toISOString(), demo: true };
    res.json(demoData);
    return;
  }

  const now = Date.now();
  if (!force && cachedData && now - lastFetch < CACHE_DURATION) {
    res.json(cachedData);
    return;
  }

  try {
    cachedData = await fetchLiveData({ includeML });
    lastFetch = now;
    res.json(cachedData);
  } catch (e) {
    // No devolver números "inventados" si falla el scraping.
    // Si hay cache previo válido, devolverlo como "stale". Si no, devolver vacío con error.
    if (cachedData && lastFetch) {
      cachedData.meta = {
        ...(cachedData.meta || {}),
        stale: true,
        error: e.message,
        code: e.code || null,
        stores: e.meta?.stores || cachedData.meta?.stores || null
      };
      res.json(cachedData);
      return;
    }

    res.json({
      meta: {
        fetchedAt: new Date().toISOString(),
        error: e.message,
        code: e.code || null,
        stores: e.meta?.stores || null
      },
      gpus: [],
      rams: []
    });
  }
});

app.get('/api/refresh', (req, res) => {
  cachedData = null;
  lastFetch = 0;
  res.json({ status: 'Cache limpiado' });
});

app.listen(PORT, () => {
  console.log(`🎮 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📡 Endpoint: http://localhost:${PORT}/api/precios`);
});
