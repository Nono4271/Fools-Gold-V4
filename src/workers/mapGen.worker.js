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

// ── Region coords aligned to WorldMap.jsx polygon centroids ──────────────────
const REGION_LIST = [
  { key:"holyGrail",         name:"The Holy Grail",          layer:"ring",     keepName:"The Holy Grail",               cx:350, cy:407 },
  { key:"shatteredShallows", name:"The Shattered Shallows",  layer:"conflict", keepName:"The Shattered Shallows Keep",  cx:335, cy:234 },
  { key:"bloodmarch",        name:"Bloodmarch",               layer:"conflict", keepName:"Bloodmarch Keep",              cx:429, cy:426 },
  { key:"ashenRift",         name:"The Ashen Rift",           layer:"conflict", keepName:"The Ashen Rift Keep",          cx:271, cy:426 },
  { key:"brinefields",       name:"Brinefields",              layer:"farm",     keepName:"Brinefields Keep",             cx:158, cy:181 },
  { key:"coralfen",          name:"Coralfen",                 layer:"farm",     keepName:"Coralfen Keep",                cx:568, cy:179 },
  { key:"stormwatch",        name:"Stormwatch",               layer:"farm",     keepName:"Stormwatch Keep",              cx:595, cy:420 },
  { key:"boneridge",         name:"Boneridge",                layer:"farm",     keepName:"Boneridge Keep",               cx:442, cy:559 },
  { key:"runemarks",         name:"Runemarks",                layer:"farm",     keepName:"Runemarks Keep",               cx:258, cy:559 },
  { key:"cinderplain",       name:"Cinderplain",              layer:"farm",     keepName:"Cinderplain Keep",             cx:105, cy:420 },
  { key:"saltmere",          name:"Saltmere",                 layer:"start",    keepName:"Saltmere Keep",                cx:107, cy:102, factions:["pirates"]       },
  { key:"tidesreach",        name:"Tidesreach",               layer:"start",    keepName:"Tidesreach Keep",              cx:593, cy:102, factions:["merfolk"]        },
  { key:"ironhaven",         name:"Ironhaven",                layer:"start",    keepName:"Ironhaven Keep",               cx:622, cy:250, factions:["marines"]        },
  { key:"grimhold",          name:"Grimhold",                 layer:"start",    keepName:"Grimhold Keep",                cx:558, cy:560, factions:["orcs"]           },
  { key:"ashenveil",         name:"Ashenveil",                layer:"start",    keepName:"Ashenveil Keep",               cx:131, cy:576, factions:["bountyhunters"]  },
  { key:"emberpeak",         name:"Emberpeak",                layer:"start",    keepName:"Emberpeak Keep",               cx:90,  cy:261, factions:["dragons"]        },
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

// ── World map polygons (from WorldMap.jsx POLYS) — SVG design space 700×660 ──
// Tile space is 700×700; scale tile r → SVG y by (660/700)
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

// Map region key → index in REGION_LIST
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

// Tile (c,r) → SVG point — tile grid 700×700, SVG design space 700×660
const Y_SCALE = 660/700;
function tileToSVG(c, r) { return [c, r * Y_SCALE]; }

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

  // Region — polygon point-in-polygon, exact match to world map shapes
  const polyEntries = Object.entries(POLYS);
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
    const [sx, sy] = tileToSVG(c, r);
    let found = 0;
    for (let p=0; p<polyEntries.length; p++) {
      const [key, poly] = polyEntries[p];
      if (pointInPoly(sx, sy, poly)) {
        found = REGION_KEY_TO_IDX[key] + 1;
        break;
      }
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
    if (KEEP_SET.has(k)||usedKeys.has(k)||SHORE_MAP[r*COLS+c]) continue;
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

  // Phase 2: generate tiles
  // We'll post progress every 50 rows (~7% increments)
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
    // Primary keep tile — carries all game data
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
    // Visual footprint tiles — passable/capturable like normal but styled as keep
    for (let dc = -KEEP_RADIUS; dc <= KEEP_RADIUS; dc++) {
      for (let dr = -KEEP_RADIUS; dr <= KEEP_RADIUS; dr++) {
        if (dc === 0 && dr === 0) continue; // skip primary
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
