// ── Map Generation Web Worker ─────────────────────────────────────────────────
// Self-contained — all constants inlined to avoid bundler import issues in workers.
// Communicates via postMessage:
//   incoming: { facKey } — player's chosen faction
//   outgoing: { type:'progress', pct } during generation
//             { type:'done', map, spawnKeys } when complete

// ── Constants ─────────────────────────────────────────────────────────────────
const COLS = 700, ROWS = 700;
const SIZE = COLS * ROWS;
const SIEGE_BASE      = 50;
const SIEGE_KEEP_BASE = 5000;

const RKEYS      = ["stone","wood","ore","gas"];
const TROOP_KEYS = ["infantry","mage","spearmen","horsemen"];

const POWER_DEFS = {
  1: { cmdLvl:2,  troops:200,  label:"I"   },
  2: { cmdLvl:6,  troops:600,  label:"II"  },
  3: { cmdLvl:10, troops:1000, label:"III" },
  4: { cmdLvl:15, troops:1500, label:"IV"  },
};

const REGION_POWER = { start:1, farm:2, conflict:3, ring:4 };

const NPC = {
  1: { n:"Skirmisher", icon:"⚔",  cls:"attacker", atk:45, spd:35, troopType:"infantry" },
  2: { n:"Raider",     icon:"🗡",  cls:"attacker", atk:50, spd:38, troopType:"spearmen" },
  3: { n:"Outlaw",     icon:"💀",  cls:"attacker", atk:55, spd:40, troopType:"horsemen" },
  4: { n:"Outlaw",     icon:"💀",  cls:"attacker", atk:55, spd:40, troopType:"horsemen" },
};

// ── Region list — v36 coordinates (source of truth) ──────────────────────────
const REGION_LIST = [
  { key:"holyGrail",         name:"The Holy Grail",          layer:"ring",     keepName:"The Holy Grail",              cx:350, cy:360 },
  { key:"shatteredShallows", name:"The Shattered Shallows",  layer:"conflict", keepName:"The Shattered Shallows Keep", cx:350, cy:190 },
  { key:"bloodmarch",        name:"Bloodmarch",              layer:"conflict", keepName:"Bloodmarch Keep",             cx:460, cy:425 },
  { key:"ashenRift",         name:"The Ashen Rift",          layer:"conflict", keepName:"The Ashen Rift Keep",         cx:240, cy:425 },
  { key:"brinefields",       name:"Brinefields",             layer:"farm",     keepName:"Brinefields Keep",            cx:269, cy: 60 },
  { key:"coralfen",          name:"Coralfen",                layer:"farm",     keepName:"Coralfen Keep",               cx:431, cy: 60 },
  { key:"stormwatch",        name:"Stormwatch",              layer:"farm",     keepName:"Stormwatch Keep",             cx:612, cy:438 },
  { key:"boneridge",         name:"Boneridge",               layer:"farm",     keepName:"Boneridge Keep",              cx:450, cy:638 },
  { key:"runemarks",         name:"Runemarks",               layer:"farm",     keepName:"Runemarks Keep",              cx:250, cy:638 },
  { key:"cinderplain",       name:"Cinderplain",             layer:"farm",     keepName:"Cinderplain Keep",            cx: 88, cy:438 },
  { key:"saltmere",          name:"Saltmere",                layer:"start",    keepName:"Saltmere Keep",               cx:114, cy:100, factions:["pirates"]       },
  { key:"tidesreach",        name:"Tidesreach",              layer:"start",    keepName:"Tidesreach Keep",             cx:586, cy:100, factions:["merfolk"]        },
  { key:"ironhaven",         name:"Ironhaven",               layer:"start",    keepName:"Ironhaven Keep",              cx:602, cy:287, factions:["marines"]        },
  { key:"grimhold",          name:"Grimhold",                layer:"start",    keepName:"Grimhold Keep",               cx:590, cy:600, factions:["orcs"]           },
  { key:"ashenveil",         name:"Ashenveil",               layer:"start",    keepName:"Ashenveil Keep",              cx:110, cy:600, factions:["bountyhunters"]  },
  { key:"emberpeak",         name:"Emberpeak",               layer:"start",    keepName:"Emberpeak Keep",              cx: 98, cy:287, factions:["dragons"]        },
];

const FACTION_REGIONS = {
  pirates:       { start:"saltmere",   farm:"brinefields" },
  merfolk:       { start:"tidesreach", farm:"coralfen"    },
  marines:       { start:"ironhaven",  farm:"stormwatch"  },
  orcs:          { start:"grimhold",   farm:"boneridge"   },
  bountyhunters: { start:"ashenveil",  farm:"runemarks"   },
  dragons:       { start:"emberpeak",  farm:"cinderplain" },
};

const KEEP_SET = new Set(REGION_LIST.map(r => `${r.cx},${r.cy}`));

// Block the entire keep footprint (KEEP_RADIUS = 5, so 11×11 around each keep)
const KEEP_FOOTPRINT_RADIUS = 5;
const KEEP_FOOTPRINT_SET = new Set();
for (const r of REGION_LIST) {
  for (let dc = -KEEP_FOOTPRINT_RADIUS; dc <= KEEP_FOOTPRINT_RADIUS; dc++) {
    for (let dr = -KEEP_FOOTPRINT_RADIUS; dr <= KEEP_FOOTPRINT_RADIUS; dr++) {
      KEEP_FOOTPRINT_SET.add(`${r.cx + dc},${r.cy + dr}`);
    }
  }
}

// Biome seeds — deterministic (same as terrain.js)
const BIOME_SEEDS = (() => {
  let s = 0xdeadbeef|0;
  const rng = () => { s=(Math.imul(s,1664525)+1013904223)|0; return((s>>>0)/0xffffffff); };
  const seeds = [];
  const biomes = [
    {t:"grass",n:60},{t:"forest",n:45},{t:"mountain",n:40},{t:"desert",n:40}
  ];
  biomes.forEach(({t,n}) => {
    for (let i=0;i<n;i++) {
      let c,r;
      do { c=Math.floor(rng()*700); r=Math.floor(rng()*700); }
      while (Math.max(c,r)<50 && t!=="grass");
      seeds.push({c,r,t});
    }
  });
  return seeds;
})();

const TERRAIN_NAMES = ["grass","forest","mountain","desert"];

// ── World map polygons — v36 source of truth (700×700 tile space) ─────────────
const POLYS = {
  saltmere:          [[0,0],[206,0],[171,113],[192,192],[0,192]],
  brinefields:       [[206,0],[350,0],[350,120],[170,120]],
  coralfen:          [[350,0],[494,0],[530,120],[350,120]],
  tidesreach:        [[494,0],[700,0],[700,192],[508,192],[529,113]],
  emberpeak:         [[0,192],[205,192],[205,280],[188,381],[0,381]],
  shatteredShallows: [[173,120],[530,120],[508,192],[508,259],[390,259],[390,280],[310,280],[310,252],[205,252],[205,192],[192,192],[173,120]],
  ironhaven:         [[508,192],[700,192],[700,381],[512,381],[508,280]],
  cinderplain:       [[0,381],[175,381],[175,496],[0,496]],
  stormwatch:        [[525,381],[700,381],[700,496],[525,496]],
  ashenRift:         [[175,381],[188,381],[205,252],[310,252],[310,479],[350,479],[350,580],[175,580],[175,381]],
  holyGrail:         [[310,280],[390,280],[390,479],[310,479]],
  bloodmarch:        [[390,259],[508,259],[512,381],[525,381],[525,580],[350,580],[350,479],[390,479],[390,259]],
  runemarks:         [[175,580],[350,580],[350,700],[200,700],[175,630]],
  boneridge:         [[350,580],[525,580],[525,630],[500,700],[350,700]],
  ashenveil:         [[0,496],[175,496],[175,580],[175,630],[200,700],[0,700]],
  grimhold:          [[525,496],[700,496],[700,700],[500,700],[525,630]],
};

// Map region key to index in REGION_LIST
const REGION_KEY_TO_IDX = {};
REGION_LIST.forEach((r,i) => { REGION_KEY_TO_IDX[r.key] = i; });

// Standard ray-casting point-in-polygon
function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i=0, j=poly.length-1; i<poly.length; j=i++) {
    const xi=poly[i][0], yi=poly[i][1];
    const xj=poly[j][0], yj=poly[j][1];
    if (((yi>py)!==(yj>py)) && (px < (xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}

// Pre-bake lookup arrays ────────────────────────────────────────────────────
function buildLookups() {
  const TERRAIN_MAP = new Uint8Array(SIZE);
  const REGION_MAP  = new Uint8Array(SIZE);
  const SHORE_MAP   = new Uint8Array(SIZE);

  // Shore
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
    if (c===0||r===0||c===COLS-1||r===ROWS-1) SHORE_MAP[r*COLS+c]=1;
  }

  // Terrain (Voronoi nearest biome seed)
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
    let best=Infinity, bi=0;
    for (let i=0;i<BIOME_SEEDS.length;i++) {
      const sd=BIOME_SEEDS[i];
      const d=(c-sd.c)**2+(r-sd.r)**2;
      if (d<best){best=d;bi=i;}
    }
    const ti=TERRAIN_NAMES.indexOf(BIOME_SEEDS[bi].t);
    TERRAIN_MAP[r*COLS+c]=ti<0?0:ti;
  }

  // Region — polygon point-in-polygon, gap-fill unassigned tiles to nearest region
  const regionCentroids = REGION_LIST.map(reg => ({
    idx: REGION_KEY_TO_IDX[reg.key] + 1,
    cx: reg.cx,
    cy: reg.cy,
  }));

  const polyEntries = Object.entries(POLYS);
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
    let found = 0;
    for (let p=0; p<polyEntries.length; p++) {
      const [key, poly] = polyEntries[p];
      if (pointInPoly(c, r, poly)) {
        found = REGION_KEY_TO_IDX[key] + 1;
        break;
      }
    }
    // Gap-fill: assign any unassigned non-shore tile to nearest region centroid
    if (!found && !SHORE_MAP[r*COLS+c]) {
      let bestD = Infinity, bestIdx = 0;
      for (const rc of regionCentroids) {
        const d = (c - rc.cx) ** 2 + (r - rc.cy) ** 2;
        if (d < bestD) { bestD = d; bestIdx = rc.idx; }
      }
      found = bestIdx;
    }
    REGION_MAP[r*COLS+c] = found;
  }

  return { TERRAIN_MAP, REGION_MAP, SHORE_MAP };
}

// ── Random spawn inside a region ─────────────────────────────────────────────
function randomSpawn(regionKey, SHORE_MAP, usedKeys) {
  const reg = REGION_LIST.find(r=>r.key===regionKey);
  if (!reg) return null;
  for (let attempt=0;attempt<200;attempt++) {
    const c = reg.cx + Math.floor((Math.random()-0.5)*70);
    const r = reg.cy + Math.floor((Math.random()-0.5)*70);
    if (c<1||c>=COLS-1||r<1||r>=ROWS-1) continue;
    const k=`${c},${r}`;
    if (KEEP_FOOTPRINT_SET.has(k)||usedKeys.has(k)||SHORE_MAP[r*COLS+c]) continue;
    return k;
  }
  return `${reg.cx+5},${reg.cy+5}`;
}

// ── Main generation ───────────────────────────────────────────────────────────
self.onmessage = function(e) {
  const { facKey } = e.data;

  // Phase 1: prebake lookups (~10% of work)
  postMessage({ type:"progress", pct:5, label:"Building terrain..." });
  const { TERRAIN_MAP, REGION_MAP, SHORE_MAP } = buildLookups();
  postMessage({ type:"progress", pct:20, label:"Placing tiles..." });

  const m = {};
  const PROGRESS_INTERVAL = 50;

  for (let r=0;r<ROWS;r++) {
    for (let c=0;c<COLS;c++) {
      const k=`${c},${r}`;
      const idx=r*COLS+c;

      if (SHORE_MAP[idx]) {
        m[k]={c,r,k,terrain:"shore",rss:null,troopType:null,powerLevel:0,
          defCmd:null,owner:null,garrison:0,siege:0,siegeMax:0,
          garrisonDefeated:false,resetAt:null,
          isHQ:false,isWin:false,isKeep:false,isShore:true,
          regionKey:null,regionName:null};
        continue;
      }

      const regIdx = REGION_MAP[idx];
      const reg    = regIdx ? REGION_LIST[regIdx-1] : null;
      const pl     = reg ? (REGION_POWER[reg.layer]??1) : 1;
      const pd     = POWER_DEFS[pl];
      const rss    = RKEYS[Math.floor(Math.random()*4)];
      const troopType = TROOP_KEYS[Math.floor(Math.random()*4)];

      m[k]={c,r,k,
        terrain:TERRAIN_NAMES[TERRAIN_MAP[idx]],
        rss, troopType,
        powerLevel:pl,
        regionKey:  reg?.key  ??null,
        regionName: reg?.name ??null,
        defCmd:null,
        owner:null,
        garrison:pd.troops, garrisonTroops:pd.troops,
        hasAiCommander:false,
        siege:SIEGE_BASE, siegeMax:SIEGE_BASE,
        garrisonDefeated:false, resetAt:null,
        isHQ:false, isWin:false, isKeep:false, isShore:false,
      };
    }

    // Progress update every N rows
    if (r % PROGRESS_INTERVAL === 0) {
      const pct = 20 + Math.round((r / ROWS) * 65);
      postMessage({ type:"progress", pct, label:"Placing tiles..." });
    }
  }

  postMessage({ type:"progress", pct:85, label:"Placing keeps..." });

  // Phase 3: keeps — primary tile + 10x10 visual footprint (isKeepPart)
  const KEEP_CMD_LVL=20, KEEP_TROOPS=2000, KEEP_SIEGE=5000;
  const KEEP_RADIUS = 5; // 10x10 footprint
  for (const reg of REGION_LIST) {
    const k=`${reg.cx},${reg.cy}`;
    if (!m[k]) continue;
    m[k]={...m[k],
      terrain:"grass", rss:null, powerLevel:4,
      isKeep:true, isWin:reg.layer==="ring", isHQ:false,
      regionKey:reg.key, regionName:reg.name, keepName:reg.keepName,
      owner:null,
      garrison:KEEP_TROOPS, garrisonTroops:KEEP_TROOPS,
      siege:KEEP_SIEGE, siegeMax:KEEP_SIEGE,
      garrisonDefeated:false, resetAt:null,
      defCmd:{n:reg.keepName,icon:"🏰",cls:"defender",faction:null,rarity:"veteran",
        troopType:TROOP_KEYS[0],lvl:KEEP_CMD_LVL,troops:KEEP_TROOPS,
        atk:120*KEEP_CMD_LVL,spd:40+KEEP_CMD_LVL*2},
    };
    // Visual footprint tiles
    for (let dc = -KEEP_RADIUS; dc <= KEEP_RADIUS; dc++) {
      for (let dr = -KEEP_RADIUS; dr <= KEEP_RADIUS; dr++) {
        if (dc === 0 && dr === 0) continue;
        const fc = reg.cx + dc, fr = reg.cy + dr;
        const fk = `${fc},${fr}`;
        if (!m[fk] || m[fk].isShore) continue;
        m[fk] = { ...m[fk],
          terrain: "grass", rss: null,
          isKeepPart: true, keepPrimaryKey: k,
          regionKey: reg.key, regionName: reg.name, keepName: reg.keepName,
          isWin: false, isHQ: false, isKeep: false,
        };
      }
    }
  }

  // Phase 3b: pre-own all starter keeps — each faction owns their start region from day 1
  const STARTER_CMDS = {
    pirates:       { n:"Saltmere Captain",    icon:"⚓", cls:"defender", rarity:"veteran" },
    merfolk:       { n:"Tidesreach Warden",   icon:"🌊", cls:"defender", rarity:"veteran" },
    marines:       { n:"Ironhaven Commander", icon:"⚔", cls:"defender", rarity:"veteran" },
    orcs:          { n:"Grimhold Warchief",   icon:"💀", cls:"defender", rarity:"veteran" },
    bountyhunters: { n:"Ashenveil Ranger",    icon:"🏹", cls:"defender", rarity:"veteran" },
    dragons:       { n:"Emberpeak Drake",     icon:"🔥", cls:"defender", rarity:"veteran" },
  };
  for (const [fk, regions] of Object.entries(FACTION_REGIONS)) {
    const startReg = REGION_LIST.find(r => r.key === regions.start);
    if (!startReg) continue;
    const k = `${startReg.cx},${startReg.cy}`;
    if (!m[k]) continue;
    const cmd = STARTER_CMDS[fk];
    m[k] = { ...m[k],
      owner: fk,
      defCmd: { ...m[k].defCmd, ...cmd, faction: fk },
    };
    // Propagate owner to keep footprint tiles
    for (let dc = -KEEP_RADIUS; dc <= KEEP_RADIUS; dc++) {
      for (let dr = -KEEP_RADIUS; dr <= KEEP_RADIUS; dr++) {
        if (dc === 0 && dr === 0) continue;
        const fkk = `${startReg.cx + dc},${startReg.cy + dr}`;
        if (m[fkk]?.isKeepPart && m[fkk].keepPrimaryKey === k) {
          m[fkk] = { ...m[fkk], owner: fk };
        }
      }
    }
  }

  postMessage({ type:"progress", pct:92, label:"Finding spawn points..." });

  // Phase 4: spawn points
  const spawnKeys={}, usedKeys=new Set();
  const ALL_FACTIONS=["pirates","merfolk","marines","orcs","bountyhunters","dragons"];
  for (const fk of ALL_FACTIONS) {
    const startRegion=FACTION_REGIONS[fk]?.start;
    if (!startRegion) continue;
    const key=randomSpawn(startRegion, SHORE_MAP, usedKeys);
    if (key){spawnKeys[fk]=key; usedKeys.add(key);}
  }

  postMessage({ type:"progress", pct:98, label:"Finishing up..." });

  // Done — transfer the map
  postMessage({ type:"done", map:m, spawnKeys });
};
