// ============================================
// T2 - DATOS DEL EQUIPO (fuente: op.gg LAS, sep 2026)
// Edita este archivo para actualizar la página.
// ============================================

const T2_DATA = {
  team: {
    name: "T2",
    tag: "T2 · Equipo 1",
    fullName: "Team T2",
    temporada: "Split 2026",
    region: "LAS",
    logoEmoji: "⚔️",
    wins: 1,
    losses: 1,
    racha: "1W",
    ranking: "—",
    lema: "Equipo 1 — Susie, LOKI7O, Elfic Ticio, Fama, Pajalenta + Buenaardoo",
    descripcion: "Datos de soloQ/flex (op.gg LAS, sep 2026) + 2 partidas del Equipo 1: derrota 58-84 y victoria 47-26. MVP Elfic Ticio (27 kills) y Buenaardoo (28/7/6)."
  },

  players: [
    {
      summoner: "Susie",
      realName: "—",
      role: "TOP",
      rank: "Esmeralda IV",
      lp: "flex",
      mains: ["Por definir", "—", "—"],
      games: 2, wins: 1, losses: 1,
      kills: 16, deaths: 16, assists: 37,
      csProm: 292, visionProm: 0,
      opgg: "https://op.gg/lol/summoners/las/Susie-LAS"
    },
    {
      summoner: "Pajalenta",
      realName: "—",
      role: "JGL",
      rank: "Esmeralda IV",
      lp: "flex · Platino IV solo",
      mains: ["Nunu", "Sett", "Morgana"],
      games: 21, wins: 10, losses: 11,
      kills: 18, deaths: 18, assists: 53,
      csProm: 238, visionProm: 0,
      opgg: "https://op.gg/lol/summoners/las/LTA%20Pajalenta-LTAzz"
    },
    {
      summoner: "Elfic Ticio",
      realName: "—",
      role: "MID",
      rank: "Diamante II",
      lp: "77 LP",
      mains: ["Irelia", "Garen", "Wukong"],
      games: 161, wins: 86, losses: 75,
      kills: 27, deaths: 17, assists: 12,
      csProm: 0, visionProm: 0,
      opgg: "https://op.gg/lol/summoners/las/Elfic%20Ticio-LAS"
    },
    {
      summoner: "Fama",
      realName: "≡≡≡Fama≡≡≡",
      role: "ADC",
      rank: "Plata IV",
      lp: "flex · Oro III solo",
      mains: ["Kha'Zix", "Jhin", "Vayne"],
      games: 5, wins: 4, losses: 1,
      kills: 4, deaths: 26, assists: 59,
      csProm: 142, visionProm: 1,
      opgg: "https://op.gg/lol/summoners/las/Fama-LAS"
    },
    {
      summoner: "LOKI7O",
      realName: "—",
      role: "SUP",
      rank: "Bronce IV",
      lp: "flex · Hierro III solo",
      mains: ["Blitzcrank", "Brand", "Nautilus"],
      games: 165, wins: 75, losses: 90,
      kills: 12, deaths: 26, assists: 22,
      csProm: 42, visionProm: 9,
      opgg: "https://op.gg/lol/summoners/las/LOKI7O-LAS"
    },
    {
      summoner: "Buenaardoo",
      realName: "—",
      role: "MID",
      rank: "Esmeralda IV",
      lp: "0 LP flex · Plata IV solo",
      mains: ["Anivia", "Ezreal", "Senna"],
      games: 108, wins: 64, losses: 44,
      kills: 28, deaths: 7, assists: 6,
      csProm: 270, visionProm: 0,
      opgg: "https://op.gg/lol/summoners/las/Buenaardoo-LAS"
    }
  ],

  matches: [
    {
      fecha: "sep 2026",
      vs: "Rival — (victoria)",
      resultado: "W",
      marcador: "47-26 en kills",
      duracion: "—",
      torneo: "Flex",
      mvp: "Buenaardoo (28/7/6)",
      picks: "Susie 6/0/10 Perfect (33.192 daño) · Fama 1/5/26 · Buenaardoo 28/7/6 (64.192 daño) · Pajalenta 5/7/15 · LOKI7O 7/7/11"
    },
    {
      fecha: "sep 2026",
      vs: "Rival — (partida registrada)",
      resultado: "L",
      marcador: "58-84 en kills",
      duracion: "—",
      torneo: "Scrim / Flex",
      mvp: "Elfic Ticio (27/17/12)",
      picks: "Susie 10/16/27 (22.955 daño) · LOKI7O 5/19/11 (19.895) · Elfic Ticio 27/17/12 (27.824) · Fama 3/21/33 (20.281) · Pajalenta 13/11/38 (24.246)"
    }
  ],

  champs: [
    { name: "Irelia (Elfic — 768k pts)", games: 0, wins: 0, kda: "—" },
    { name: "Garen (Elfic — 463k pts)", games: 0, wins: 0, kda: "—" },
    { name: "Nunu (Pajalenta — 309k pts)", games: 0, wins: 0, kda: "—" },
    { name: "Sett (Pajalenta — 245k pts)", games: 0, wins: 0, kda: "—" },
    { name: "Blitzcrank (LOKI7O — 165k pts)", games: 0, wins: 0, kda: "—" },
    { name: "Brand (LOKI7O — 163k pts)", games: 0, wins: 0, kda: "—" },
    { name: "Anivia (Buenaardoo — 39k pts)", games: 0, wins: 0, kda: "—" },
    { name: "Ezreal (Buenaardoo — 15k pts)", games: 0, wins: 0, kda: "—" },
    { name: "Kha'Zix (Fama — 172k pts)", games: 0, wins: 0, kda: "—" },
    { name: "Jhin (Fama — 145k pts)", games: 0, wins: 0, kda: "—" }
  ]
};
