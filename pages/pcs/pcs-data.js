// Papu Banda — Datos de PCs
// Para agregar un nuevo miembro, copia un bloque y cambia los valores.
// El ranking se calcula automáticamente con `score` (mayor = mejor PC).
// score sugerido: CPU (0-40) + RAM (0-25) + GPU (0-25) + Almacenamiento (0-10)

const PCS_DATA = [
  {
    id: "shadownix23",
    nombre: "SHADOWNIX23",
    tag: "🐵 META",
    fecha: "28/9/2026 00:53",
    avatarEmoji: "👑",
    color: "#ff3b3b",
    color2: "#7a0000",
    rank: 1,
    score: 97,
    tier: "S — Dios de la Papu Banda",
    frase: "La bestia indiscutible. 32GB + 5700X3D + RTX 3060 Ti.",
    cpu: { nombre: "AMD Ryzen 7 5700X3D 8-Core Processor", detalle: "3.00 GHz · 8 núcleos / 16 hilos · 3D V-Cache gaming", puntos: 38 },
    ram: { cantidad: "32,0 GB", detalle: "Velocidad: 3600 MT/s · Dual channel ideal", puntos: 25 },
    gpu: { cantidad: "8 GB", nombre: "NVIDIA GeForce RTX 3060 Ti", detalle: "Dedicada · DLSS · Ray Tracing · 1080p/1440p Ultra", puntos: 25 },
    almacenamiento: { cantidad: "2,73 TB", detalle: "2,29 TB de 2,73 TB usado · Espacio de sobra", puntos: 9 },
    pros: ["Mejor CPU gaming (X3D)", "32GB RAM, ideal multitarea", "RTX 3060 Ti dedicada", "2.73TB almacenamiento total"],
    contras: ["Disco casi lleno (2.29TB usados)"],
    veredicto: "Top 1 absoluto. La única PC de la banda capaz de todo en Ultra sin despeinarse. El resto mira desde abajo.",
    page: "shadownix23.html"
  },
  {
    id: "gubi",
    nombre: "gubi",
    tag: "🦎",
    fecha: "28/9/2026 00:54",
    avatarEmoji: "💪",
    color: "#22c55e",
    color2: "#064e2b",
    rank: 2,
    score: 74,
    tier: "A — Gama media-alta sólida",
    frase: "Laptop/notebook guerrera con i5 HX de 13va + 8GB VRAM.",
    cpu: { nombre: "13th Gen Intel(R) Core(TM) i5-13450HX", detalle: "2.40 GHz base · 10 núcleos (6P+4E) · Serie HX potente", puntos: 30 },
    ram: { cantidad: "16,0 GB", detalle: "Velocidad: 4800 MT/s · DDR5 rápida", puntos: 18 },
    gpu: { cantidad: "8 GB", nombre: "Varias GPU instaladas", detalle: "Dedicada 8GB + integrada · Lista para jugar", puntos: 19 },
    almacenamiento: { cantidad: "477 GB", detalle: "341 GB de 477 GB usado · 136GB libres", puntos: 7 },
    pros: ["i5-13450HX muy capaz", "16GB DDR5 a 4800 MT/s", "GPU dedicada de 8GB", "Equilibrio total"],
    contras: ["Almacenamiento justo (477GB)", "341GB ya usados, toca limpiar"],
    veredicto: "Top 2 sólido. Le pasa el trapo a la i3 de Lokito y juega a todo en Alto. Solo le falta más disco para pelear el #1.",
    page: "gubi.html"
  },
  {
    id: "lokito",
    nombre: "LOKITO",
    tag: "🔥 LV",
    fecha: "28/9/2026 00:52",
    avatarEmoji: "🍚",
    color: "#a855f7",
    color2: "#3b0764",
    rank: 3,
    score: 32,
    tier: "C — Ofimática con dignidad",
    frase: "Humilde i3-N305 con integrados. Para Discord y LoL tranqui.",
    cpu: { nombre: "Intel(R) Core(TM) i3-N305", detalle: "1.80 GHz · 8 núcleos eficientes · Bajo consumo", puntos: 15 },
    ram: { cantidad: "8,00 GB", detalle: "Velocidad: 4800 MT/s · DDR5 pero poca cantidad", puntos: 10 },
    gpu: { cantidad: "128 MB", nombre: "Intel(R) UHD Graphics", detalle: "Integrada · Sin VRAM dedicada · Solo juegos livianos", puntos: 3 },
    almacenamiento: { cantidad: "477 GB", detalle: "202 GB de 477 GB usado · 275GB libres, lo mejor del equipo", puntos: 4 },
    pros: ["RAM DDR5 rápida (4800 MT/s)", "Bastante espacio libre en disco", "Eficiente y fresquita"],
    contras: ["Sin GPU dedicada (128MB)", "Solo 8GB RAM", "i3-N305 gama baja"],
    veredicto: "Top 3 con honor. Perfecta para Discord, navegar y juegos patata. Prohibido abrir el Cyberpunk acá.",
    page: "lokito.html"
  }
];
