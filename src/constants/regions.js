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
  saltmere:          [[0,0],[220,0],[220,148],[140,155],[62,155],[0,118]],
  tidesreach:        [[480,0],[700,0],[700,118],[638,155],[560,155],[480,148]],
  brinefields:       [[62,155],[140,155],[220,148],[287,168],[240,192],[160,198],[95,198],[62,155]],
  coralfen:          [[560,155],[638,155],[700,155],[700,198],[605,198],[460,192],[412,168],[480,148],[560,155]],
  emberpeak:         [[0,118],[62,155],[95,198],[160,198],[202,252],[122,305],[82,370],[0,370]],
  ironhaven:         [[700,118],[700,370],[618,370],[578,305],[498,256],[540,198],[638,155],[700,118]],
  shatteredShallows: [[160,198],[240,192],[287,168],[350,160],[412,168],[460,192],[540,198],[498,256],[394,296],[350,296],[306,296],[202,256],[160,198]],
  cinderplain:       [[0,370],[82,370],[122,305],[202,256],[202,490],[128,490],[0,490]],
  stormwatch:        [[700,370],[618,370],[578,305],[498,256],[498,490],[572,490],[700,490]],
  holyGrail:         [[306,296],[394,296],[422,372],[422,442],[350,470],[278,442],[278,372]],
  ashenRift:         [[202,256],[306,296],[278,372],[278,442],[350,470],[278,490],[202,490]],
  bloodmarch:        [[498,256],[394,296],[422,372],[422,442],[350,470],[422,490],[498,490]],
  runemarks:         [[230,460],[278,490],[350,470],[350,542],[302,572],[245,588],[188,570],[175,560],[230,560],[230,460]],
  boneridge:         [[470,460],[422,490],[350,470],[350,542],[398,572],[455,588],[512,570],[525,560],[470,560],[470,460]],
  ashenveil:         [[0,490],[202,490],[230,460],[230,560],[175,590],[80,605],[0,605]],
  grimhold:          [[470,460],[498,490],[572,490],[700,490],[700,605],[620,605],[525,590],[470,560],[470,460]],
};

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i=0, j=poly.length-1; i<poly.length; j=i++) {
    const xi=poly[i][0], yi=poly[i][1], xj=poly[j][0], yj=poly[j][1];
    if (((yi>py)!==(yj>py)) && (px < (xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}

const Y_SCALE = 660/700;

export function tileRegion(c, r) {
  const sx = c, sy = r * Y_SCALE;
  for (const [key, poly] of Object.entries(POLYS)) {
    if (pointInPoly(sx, sy, poly)) return REGION_LIST.find(rg => rg.key === key) || null;
  }
  return null;
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
