// ── 16 Region definitions ─────────────────────────────────────────────────────
// cx/cy = tile coordinate of the keep (center of region)
// layer: 'ring' | 'conflict' | 'farm' | 'start'
// faction(s): which faction(s) this region belongs to

export const REGIONS = {
  // ── Center ────────────────────────────────────────────────────────────────
  holyGrail: {
    key: 'holyGrail', name: 'The Holy Grail', layer: 'ring',
    keepName: 'The Holy Grail',
    cx: 350, cy: 350,
    factions: null,
  },

  // ── Conflict Zones ────────────────────────────────────────────────────────
  shatteredShallows: {
    key: 'shatteredShallows', name: 'The Shattered Shallows', layer: 'conflict',
    keepName: 'The Shattered Shallows Keep',
    cx: 350, cy: 250,
    factions: ['pirates', 'merfolk'],
  },
  bloodmarch: {
    key: 'bloodmarch', name: 'Bloodmarch', layer: 'conflict',
    keepName: 'Bloodmarch Keep',
    cx: 437, cy: 400,
    factions: ['marines', 'orcs'],
  },
  ashenRift: {
    key: 'ashenRift', name: 'The Ashen Rift', layer: 'conflict',
    keepName: 'The Ashen Rift Keep',
    cx: 263, cy: 400,
    factions: ['bountyhunters', 'dragons'],
  },

  // ── Farm Regions ──────────────────────────────────────────────────────────
  brinefields: {
    key: 'brinefields', name: 'Brinefields', layer: 'farm',
    keepName: 'Brinefields Keep',
    cx: 225, cy: 185,
    factions: ['pirates'],
  },
  coralfen: {
    key: 'coralfen', name: 'Coralfen', layer: 'farm',
    keepName: 'Coralfen Keep',
    cx: 475, cy: 185,
    factions: ['merfolk'],
  },
  stormwatch: {
    key: 'stormwatch', name: 'Stormwatch', layer: 'farm',
    keepName: 'Stormwatch Keep',
    cx: 540, cy: 330,
    factions: ['marines'],
  },
  boneridge: {
    key: 'boneridge', name: 'Boneridge', layer: 'farm',
    keepName: 'Boneridge Keep',
    cx: 445, cy: 520,
    factions: ['orcs'],
  },
  runemarks: {
    key: 'runemarks', name: 'Runemarks', layer: 'farm',
    keepName: 'Runemarks Keep',
    cx: 255, cy: 520,
    factions: ['bountyhunters'],
  },
  cinderplain: {
    key: 'cinderplain', name: 'Cinderplain', layer: 'farm',
    keepName: 'Cinderplain Keep',
    cx: 160, cy: 330,
    factions: ['dragons'],
  },

  // ── Starting Regions ──────────────────────────────────────────────────────
  // Saltmere (Pirates) — top-left corner, funnels into Brinefields → Shattered Shallows
  saltmere: {
    key: 'saltmere', name: 'Saltmere', layer: 'start',
    keepName: 'Saltmere Keep',
    cx: 136, cy: 170,
    factions: ['pirates'],
  },
  // Tidesreach (Merfolk) — top-right corner, funnels into Coralfen → Shattered Shallows
  tidesreach: {
    key: 'tidesreach', name: 'Tidesreach', layer: 'start',
    keepName: 'Tidesreach Keep',
    cx: 564, cy: 170,
    factions: ['merfolk'],
  },
  // Ironhaven (Marines) — far-right mid, funnels into Stormwatch → Bloodmarch
  ironhaven: {
    key: 'ironhaven', name: 'Ironhaven', layer: 'start',
    keepName: 'Ironhaven Keep',
    cx: 613, cy: 254,
    factions: ['marines'],
  },
  // Grimhold (Orcs) — bottom-right corner, funnels into Boneridge → Bloodmarch
  grimhold: {
    key: 'grimhold', name: 'Grimhold', layer: 'start',
    keepName: 'Grimhold Keep',
    cx: 399, cy: 626,
    factions: ['orcs'],
  },
  // Ashenveil (Wizards/Bountyhunters) — bottom-left corner, funnels into Runemarks → Ashen Rift
  ashenveil: {
    key: 'ashenveil', name: 'Ashenveil', layer: 'start',
    keepName: 'Ashenveil Keep',
    cx: 301, cy: 626,
    factions: ['bountyhunters'],
  },
  // Emberpeak (Dragons) — far-left mid, funnels into Cinderplain → Ashen Rift
  emberpeak: {
    key: 'emberpeak', name: 'Emberpeak', layer: 'start',
    keepName: 'Emberpeak Keep',
    cx: 87, cy: 254,
    factions: ['dragons'],
  },
};

export const REGION_LIST = Object.values(REGIONS);

// Quick lookup: given a tile coordinate, which region does it belong to?
// Uses nearest-keep assignment within a max radius
const REGION_RADIUS_SQ = 100 * 100; // ~100 tile radius per region

export function tileRegion(c, r) {
  let best = null, bestDist = Infinity;
  for (const reg of REGION_LIST) {
    const d = (c - reg.cx) ** 2 + (r - reg.cy) ** 2;
    if (d < bestDist) { bestDist = d; best = reg; }
  }
  return bestDist <= REGION_RADIUS_SQ ? best : null;
}

// Keep tile keys
export const KEEP_KEYS = new Set(REGION_LIST.map(r => `${r.cx},${r.cy}`));

export function isKeepTile(k) { return KEEP_KEYS.has(k); }

// Faction → their starting region and farm region
export const FACTION_REGIONS = {
  pirates:       { start: 'saltmere',   farm: 'brinefields' },
  merfolk:       { start: 'tidesreach', farm: 'coralfen'    },
  marines:       { start: 'ironhaven',  farm: 'stormwatch'  },
  orcs:          { start: 'grimhold',   farm: 'boneridge'   },
  bountyhunters: { start: 'ashenveil',  farm: 'runemarks'   },
  dragons:       { start: 'emberpeak',  farm: 'cinderplain' },
};

// Power level by region layer
export const REGION_POWER = {
  start:    1,
  farm:     2,
  conflict: 3,
  ring:     4,
};
