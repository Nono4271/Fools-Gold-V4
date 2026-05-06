// Updated regions — v11 polygon layout
// Polys scaled to tile coordinate space (700 x 860)
export const REGIONS = {
  holyGrail:         { key: 'holyGrail',         name: 'The Holy Grail',          layer: 'ring',     keepName: 'The Holy Grail',              cx: 350, cy: 442, factions: null },
  shatteredShallows: { key: 'shatteredShallows', name: 'The Shattered Shallows',  layer: 'conflict', keepName: 'The Shattered Shallows Keep',  cx: 350, cy: 233, factions: ['pirates', 'merfolk'] },
  ashenRift:         { key: 'ashenRift',         name: 'The Ashen Rift',          layer: 'conflict', keepName: 'The Ashen Rift Keep',          cx: 240, cy: 520, factions: ['bountyhunters', 'dragons'] },
  bloodmarch:        { key: 'bloodmarch',        name: 'Bloodmarch',             layer: 'conflict', keepName: 'Bloodmarch Keep',              cx: 460, cy: 520, factions: ['marines', 'orcs'] },
  brinefields:       { key: 'brinefields',       name: 'Brinefields',            layer: 'farm',     keepName: 'Brinefields Keep',             cx: 269, cy:  74, factions: ['pirates'] },
  coralfen:          { key: 'coralfen',          name: 'Coralfen',               layer: 'farm',     keepName: 'Coralfen Keep',                cx: 431, cy:  74, factions: ['merfolk'] },
  cinderplain:       { key: 'cinderplain',       name: 'Cinderplain',            layer: 'farm',     keepName: 'Cinderplain Keep',             cx:  88, cy: 539, factions: ['dragons'] },
  stormwatch:        { key: 'stormwatch',        name: 'Stormwatch',             layer: 'farm',     keepName: 'Stormwatch Keep',              cx: 612, cy: 539, factions: ['marines'] },
  runemarks:         { key: 'runemarks',         name: 'Runemarks',              layer: 'farm',     keepName: 'Runemarks Keep',               cx: 250, cy: 784, factions: ['bountyhunters'] },
  boneridge:         { key: 'boneridge',         name: 'Boneridge',              layer: 'farm',     keepName: 'Boneridge Keep',               cx: 450, cy: 784, factions: ['orcs'] },
  saltmere:          { key: 'saltmere',          name: 'Saltmere',               layer: 'start',    keepName: 'Saltmere Keep',                cx: 114, cy: 122, factions: ['pirates'] },
  tidesreach:        { key: 'tidesreach',        name: 'Tidesreach',             layer: 'start',    keepName: 'Tidesreach Keep',              cx: 586, cy: 122, factions: ['merfolk'] },
  emberpeak:         { key: 'emberpeak',         name: 'Emberpeak',              layer: 'start',    keepName: 'Emberpeak Keep',               cx:  98, cy: 352, factions: ['dragons'] },
  ironhaven:         { key: 'ironhaven',         name: 'Ironhaven',              layer: 'start',    keepName: 'Ironhaven Keep',               cx: 602, cy: 352, factions: ['marines'] },
  ashenveil:         { key: 'ashenveil',         name: 'Ashenveil',              layer: 'start',    keepName: 'Ashenveil Keep',               cx: 110, cy: 743, factions: ['bountyhunters'] },
  grimhold:          { key: 'grimhold',          name: 'Grimhold',               layer: 'start',    keepName: 'Grimhold Keep',                cx: 590, cy: 743, factions: ['orcs'] },
};

export const REGION_LIST = Object.values(REGIONS);

// Polys in tile coordinate space (x: 0–700, y: 0–860)
export const POLYS = {
  saltmere:          [[0,0],[206,0],[171,139],[192,236],[0,236]],
  brinefields:       [[206,0],[350,0],[350,147],[170,147]],
  coralfen:          [[350,0],[494,0],[530,147],[350,147]],
  tidesreach:        [[494,0],[700,0],[700,236],[508,236],[529,139]],
  emberpeak:         [[0,236],[205,236],[188,468],[0,468]],
  shatteredShallows: [[170,147],[530,147],[503,344],[390,344],[390,295],[310,295],[310,344],[197,344],[192,236],[205,236]],
  ironhaven:         [[495,236],[700,236],[700,468],[512,468]],
  cinderplain:       [[0,468],[175,468],[175,609],[0,609]],
  stormwatch:        [[525,468],[700,468],[700,609],[525,609]],
  ashenRift:         [[175,344],[310,344],[310,588],[350,588],[350,713],[175,713]],
  holyGrail:         [[310,295],[390,295],[390,588],[310,588]],
  bloodmarch:        [[390,344],[525,344],[525,713],[350,713],[350,588],[390,588],[390,344]],
  runemarks:         [[175,713],[350,713],[350,860],[200,860],[175,774]],
  boneridge:         [[350,713],[525,713],[525,774],[500,860],[350,860]],
  ashenveil:         [[0,609],[175,609],[175,774],[200,860],[0,860]],
  grimhold:          [[525,609],[700,609],[700,860],[500,860],[525,774]],
};

export function tileRegion(c, r) {
  for (const [key, poly] of Object.entries(POLYS)) {
    if (pointInPoly(c, r, poly)) return REGION_LIST.find(rg => rg.key === key);
  }
  return null;
}

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

export const KEEP_KEYS = new Set(REGION_LIST.map(r => `${r.cx},${r.cy}`));
export const FACTION_REGIONS = {};
export const REGION_POWER = { start: 1, farm: 2, conflict: 3, ring: 4 };
