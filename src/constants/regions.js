// ── 16 Region definitions ─────────────────────────────────────────────────────
// cx/cy = tile coordinate of the keep (center of region)
// layer: 'ring' | 'conflict' | 'farm' | 'start'
// faction(s): which faction(s) this region belongs to

export const REGIONS = {
  holyGrail: {
    key: 'holyGrail', name: 'The Holy Grail', layer: 'ring',
    keepName: 'The Holy Grail',
    cx: 350, cy: 408,
    factions: null,
  },
  shatteredShallows: {
    key: 'shatteredShallows', name: 'The Shattered Shallows', layer: 'conflict',
    keepName: 'The Shattered Shallows Keep',
    cx: 342, cy: 234,
    factions: ['pirates', 'merfolk'],
  },
  bloodmarch: {
    key: 'bloodmarch', name: 'Bloodmarch', layer: 'conflict',
    keepName: 'Bloodmarch Keep',
    cx: 429, cy: 418,
    factions: ['marines', 'orcs'],
  },
  ashenRift: {
    key: 'ashenRift', name: 'The Ashen Rift', layer: 'conflict',
    keepName: 'The Ashen Rift Keep',
    cx: 271, cy: 418,
    factions: ['bountyhunters', 'dragons'],
  },
  brinefields: {
    key: 'brinefields', name: 'Brinefields', layer: 'farm',
    keepName: 'Brinefields Keep',
    cx: 158, cy: 181,
    factions: ['pirates'],
  },
  coralfen: {
    key: 'coralfen', name: 'Coralfen', layer: 'farm',
    keepName: 'Coralfen Keep',
    cx: 510, cy: 176,
    factions: ['merfolk'],
  },
  stormwatch: {
    key: 'stormwatch', name: 'Stormwatch', layer: 'farm',
    keepName: 'Stormwatch Keep',
    cx: 595, cy: 420,
    factions: ['marines'],
  },
  boneridge: {
    key: 'boneridge', name: 'Boneridge', layer: 'farm',
    keepName: 'Boneridge Keep',
    cx: 423, cy: 548,
    factions: ['orcs'],
  },
  runemarks: {
    key: 'runemarks', name: 'Runemarks', layer: 'farm',
    keepName: 'Runemarks Keep',
    cx: 277, cy: 548,
    factions: ['bountyhunters'],
  },
  cinderplain: {
    key: 'cinderplain', name: 'Cinderplain', layer: 'farm',
    keepName: 'Cinderplain Keep',
    cx: 105, cy: 420,
    factions: ['dragons'],
  },
  saltmere: {
    key: 'saltmere', name: 'Saltmere', layer: 'start',
    keepName: 'Saltmere Keep',
    cx: 107, cy: 102,
    factions: ['pirates'],
  },
  tidesreach: {
    key: 'tidesreach', name: 'Tidesreach', layer: 'start',
    keepName: 'Tidesreach Keep',
    cx: 593, cy: 102,
    factions: ['merfolk'],
  },
  ironhaven: {
    key: 'ironhaven', name: 'Ironhaven', layer: 'start',
    keepName: 'Ironhaven Keep',
    cx: 622, cy: 251,
    factions: ['marines'],
  },
  grimhold: {
    key: 'grimhold', name: 'Grimhold', layer: 'start',
    keepName: 'Grimhold Keep',
    cx: 552, cy: 555,
    factions: ['orcs'],
  },
  ashenveil: {
    key: 'ashenveil', name: 'Ashenveil', layer: 'start',
    keepName: 'Ashenveil Keep',
    cx: 140, cy: 565,
    factions: ['bountyhunters'],
  },
  emberpeak: {
    key: 'emberpeak', name: 'Emberpeak', layer: 'start',
    keepName: 'Emberpeak Keep',
    cx: 103, cy: 255,
    factions: ['dragons'],
  },
};

export const REGION_LIST = Object.values(REGIONS);

// ── World map polygons (mirrors WorldMap.jsx POLYS) ──────────────────────────
const POLYS = {
  saltmere:          [[0,0],[200,0],[170,200],[0,200]],
  tidesreach:        [[700,0],[500,0],[530,200],[700,200]],
  emberpeak:         [[0,200],[170,200],[170,402],[0,402]],
  ironhaven:         [[700,200],[530,200],[530,402],[700,402]],
  ashenveil:         [[0,532],[170,532],[170,573],[215,573],[215,700],[0,700]],
  grimhold:          [[700,532],[530,532],[530,573],[485,573],[485,700],[700,700]],
  brinefields:       [[200,0],[295,0],[250,200],[250,261],[170,261],[170,200]],
  coralfen:          [[500,0],[405,0],[450,200],[450,261],[530,261],[530,200]],
  cinderplain:       [[0,402],[170,402],[170,532],[0,532]],
  stormwatch:        [[700,402],[530,402],[530,532],[700,532]],
  runemarks:         [[170,573],[350,573],[350,700],[215,700],[170,573]],
  boneridge:         [[530,573],[350,573],[350,700],[485,700],[530,573]],
  shatteredShallows: [[295,0],[405,0],[450,200],[450,261],[250,261],[250,200]],
  ashenRift:         [[170,261],[350,261],[350,319],[275,319],[265,399],[275,479],[350,479],[350,573],[170,573]],
  bloodmarch:        [[530,261],[350,261],[350,319],[425,319],[435,399],[425,479],[350,479],[350,573],[530,573]],
  holyGrail:         [[275,319],[425,319],[435,399],[425,479],[275,479],[265,399]],
};

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i=0, j=poly.length-1; i<poly.length; j=i++) {
    const xi=poly[i][0], yi=poly[i][1], xj=poly[j][0], yj=poly[j][1];
    if (((yi>py)!==(yj>py)) && (px < (xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}

export function tileRegion(c, r) {
  for (const [key, poly] of Object.entries(POLYS)) {
    if (pointInPoly(c, r, poly)) return REGION_LIST.find(rg => rg.key === key) || null;
  }
  return null;
}

// Keep tile keys
export const KEEP_KEYS = new Set(REGION_LIST.map(r => `${r.cx},${r.cy}`));

export function isKeepTile(k) { return KEEP_KEYS.has(k); }

// Faction to their starting region and farm region
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
