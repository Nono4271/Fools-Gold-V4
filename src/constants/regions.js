// Rebalanced World Map - Option B (Shallow Corner Wrap) - Final Tuned Version
export const REGIONS = {
  holyGrail: { key: 'holyGrail', name: 'The Holy Grail', layer: 'ring', keepName: 'The Holy Grail', cx: 350, cy: 400, factions: null },
  shatteredShallows: { key: 'shatteredShallows', name: 'The Shattered Shallows', layer: 'conflict', keepName: 'The Shattered Shallows Keep', cx: 350, cy: 130, factions: ['pirates', 'merfolk'] },
  ashenRift: { key: 'ashenRift', name: 'The Ashen Rift', layer: 'conflict', keepName: 'The Ashen Rift Keep', cx: 260, cy: 400, factions: ['bountyhunters', 'dragons'] },
  bloodmarch: { key: 'bloodmarch', name: 'Bloodmarch', layer: 'conflict', keepName: 'Bloodmarch Keep', cx: 440, cy: 400, factions: ['marines', 'orcs'] },
  brinefields: { key: 'brinefields', name: 'Brinefields', layer: 'farm', keepName: 'Brinefields Keep', cx: 220, cy: 130, factions: ['pirates'] },
  coralfen: { key: 'coralfen', name: 'Coralfen', layer: 'farm', keepName: 'Coralfen Keep', cx: 480, cy: 130, factions: ['merfolk'] },
  cinderplain: { key: 'cinderplain', name: 'Cinderplain', layer: 'farm', keepName: 'Cinderplain Keep', cx: 85, cy: 470, factions: ['dragons'] },
  stormwatch: { key: 'stormwatch', name: 'Stormwatch', layer: 'farm', keepName: 'Stormwatch Keep', cx: 615, cy: 470, factions: ['marines'] },
  runemarks: { key: 'runemarks', name: 'Runemarks', layer: 'farm', keepName: 'Runemarks Keep', cx: 260, cy: 635, factions: ['bountyhunters'] },
  boneridge: { key: 'boneridge', name: 'Boneridge', layer: 'farm', keepName: 'Boneridge Keep', cx: 440, cy: 635, factions: ['orcs'] },
  saltmere: { key: 'saltmere', name: 'Saltmere', layer: 'start', keepName: 'Saltmere Keep', cx: 85, cy: 100, factions: ['pirates'] },
  tidesreach: { key: 'tidesreach', name: 'Tidesreach', layer: 'start', keepName: 'Tidesreach Keep', cx: 615, cy: 100, factions: ['merfolk'] },
  emberpeak: { key: 'emberpeak', name: 'Emberpeak', layer: 'start', keepName: 'Emberpeak Keep', cx: 85, cy: 306, factions: ['dragons'] },
  ironhaven: { key: 'ironhaven', name: 'Ironhaven', layer: 'start', keepName: 'Ironhaven Keep', cx: 615, cy: 306, factions: ['marines'] },
  ashenveil: { key: 'ashenveil', name: 'Ashenveil', layer: 'start', keepName: 'Ashenveil Keep', cx: 92, cy: 636, factions: ['bountyhunters'] },
  grimhold: { key: 'grimhold', name: 'Grimhold', layer: 'start', keepName: 'Grimhold Keep', cx: 608, cy: 636, factions: ['orcs'] },
};

export const REGION_LIST = Object.values(REGIONS);

export const POLYS = {
  saltmere:          [[0,0],[200,0],[170,200],[0,200]],
  tidesreach:        [[700,0],[500,0],[530,200],[700,200]],
  emberpeak:         [[0,200],[170,200],[170,413],[0,413]],
  ironhaven:         [[700,200],[530,200],[530,413],[700,413]],
  ashenveil:         [[0,430],[128,430],[128,590],[0,590]],
  grimhold:          [[700,430],[222,430],[222,590],[700,590]],
  brinefields:       [[200,0],[295,0],[240,200],[240,261],[170,261],[170,200]],
  coralfen:          [[500,0],[405,0],[460,200],[460,261],[530,261],[530,200]],
  cinderplain:       [[0,413],[170,413],[170,529],[0,529]],
  stormwatch:        [[700,413],[530,413],[530,529],[700,529]],
  runemarks:         [[0,590],[128,590],[60,860],[0,860]],
  boneridge:         [[700,590],[222,590],[290,860],[700,860]],
  shatteredShallows: [[128,90],[222,90],[222,215],[128,215]],
  ashenRift:         [[128,590],[175,590],[175,860],[60,860]],
  bloodmarch:        [[222,590],[175,590],[175,860],[290,860]],
  holyGrail:         [[128,215],[222,215],[228,255],[222,295],[128,295],[122,255]],
};

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

export function tileRegion(c, r) {
  for (const [key, poly] of Object.entries(POLYS)) {
    if (pointInPoly(c, r, poly)) return REGION_LIST.find(rg => rg.key === key) || null;
  }
  return null;
}

export const KEEP_KEYS = new Set(REGION_LIST.map(r => `${r.cx},${r.cy}`));

export const FACTION_REGIONS = {
  pirates:       { start: 'saltmere',   farm: 'brinefields' },
  merfolk:       { start: 'tidesreach', farm: 'coralfen'    },
  marines:       { start: 'ironhaven',  farm: 'stormwatch'  },
  orcs:          { start: 'grimhold',   farm: 'boneridge'   },
  bountyhunters: { start: 'ashenveil',  farm: 'runemarks'   },
  dragons:       { start: 'emberpeak',  farm: 'cinderplain' },
};

export const REGION_POWER = {
  start: 1, farm: 2, conflict: 3, ring: 4,
};
