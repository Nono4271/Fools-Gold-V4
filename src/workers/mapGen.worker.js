// ── Map Generation Web Worker ─────────────────────────────────────────────────
// Communicates via postMessage:
//   incoming: { facKey }
//   outgoing: { type:'progress', pct, label }
//             { type:'done', buffers, meta, spawnKeys }   ← transferable, zero-copy
//
// PERFORMANCE: instead of postMessage({ map: 490k JS objects }) which structured-clones
// ~187MB, we pack tile data into flat TypedArrays and transfer them zero-copy (~12MB).
// Game.jsx reconstructs the tile map from these arrays in one fast pass.

const COLS = 700, ROWS = 700;
const SIZE = COLS * ROWS;
const SIEGE_BASE = 50;

const RKEYS      = ["stone","wood","ore","gas"];
const TROOP_KEYS = ["infantry","mage","spearmen","horsemen"];

const POWER_DEFS = {
  1: { cmdLvl:2,  troops:200  },
  2: { cmdLvl:6,  troops:600  },
  3: { cmdLvl:10, troops:1000 },
  4: { cmdLvl:15, troops:1500 },
};
const REGION_POWER = { start:1, farm:2, conflict:3, ring:4 };

// ── Enums for typed array encoding ───────────────────────────────────────────
const TERRAIN_ENC = { grass:0, forest:1, mountain:2, desert:3, shore:4 };
const TERRAIN_DEC = ["grass","forest","mountain","desert","shore"];
const RSS_ENC     = { stone:1, wood:2, ore:3, gas:4 }; // 0 = null
const RSS_DEC     = [null,"stone","wood","ore","gas"];
const TROOP_ENC   = { infantry:1, mage:2, spearmen:3, horsemen:4 }; // 0 = null
const TROOP_DEC   = [null,"infantry","mage","spearmen","horsemen"];
const OWNER_ENC   = { player:1, ai:2, pirates:3, merfolk:4, marines:5, orcs:6, bountyhunters:7, dragons:8 };
const OWNER_DEC   = [null,"player","ai","pirates","merfolk","marines","orcs","bountyhunters","dragons"];

// Flag bits packed into one Uint8 per tile
const F_SHORE    = 1<<0;
const F_KEEP     = 1<<1;
const F_KEEPPART = 1<<2;
const F_HQ       = 1<<3;
const F_HQPART   = 1<<4;
const F_WIN      = 1<<5;
const F_DEFEATED = 1<<6;

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
const KEEP_FOOTPRINT_RADIUS = 5;
const KEEP_FOOTPRINT_SET = new Set();
for (const r of REGION_LIST) {
  for (let dc=-KEEP_FOOTPRINT_RADIUS; dc<=KEEP_FOOTPRINT_RADIUS; dc++)
    for (let dr=-KEEP_FOOTPRINT_RADIUS; dr<=KEEP_FOOTPRINT_RADIUS; dr++)
      KEEP_FOOTPRINT_SET.add(`${r.cx+dc},${r.cy+dr}`);
}

// Region key → index (1-based, 0 = unassigned)
const REGION_KEY_TO_IDX = {};
REGION_LIST.forEach((r,i) => { REGION_KEY_TO_IDX[r.key] = i+1; });

// Biome seeds — deterministic
const BIOME_SEEDS = (() => {
  let s = 0xdeadbeef|0;
  const rng = () => { s=(Math.imul(s,1664525)+1013904223)|0; return((s>>>0)/0xffffffff); };
  const seeds = [];
  [["grass",60],["forest",45],["mountain",40],["desert",40]].forEach(([t,n]) => {
    for (let i=0;i<n;i++) {
      let c,r;
      do { c=Math.floor(rng()*700); r=Math.floor(rng()*700); } while (Math.max(c,r)<50 && t!=="grass");
      seeds.push({c,r,t});
    }
  });
  return seeds;
})();
const TERRAIN_NAMES = ["grass","forest","mountain","desert"];

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

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i=0,j=poly.length-1; i<poly.length; j=i++) {
    const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];
    if (((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}

function buildLookups() {
  const TERRAIN_MAP = new Uint8Array(SIZE);
  const REGION_MAP  = new Uint8Array(SIZE);
  const SHORE_MAP   = new Uint8Array(SIZE);

  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++)
    if (c===0||r===0||c===COLS-1||r===ROWS-1) SHORE_MAP[r*COLS+c]=1;

  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
    let best=Infinity, bi=0;
    for (let i=0;i<BIOME_SEEDS.length;i++) {
      const sd=BIOME_SEEDS[i], d=(c-sd.c)**2+(r-sd.r)**2;
      if (d<best){best=d;bi=i;}
    }
    const ti=TERRAIN_NAMES.indexOf(BIOME_SEEDS[bi].t);
    TERRAIN_MAP[r*COLS+c]=ti<0?0:ti;
  }

  const regionCentroids=REGION_LIST.map(reg=>({idx:REGION_KEY_TO_IDX[reg.key],cx:reg.cx,cy:reg.cy}));
  const polyEntries=Object.entries(POLYS);
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
    let found=0;
    for (let p=0;p<polyEntries.length;p++) {
      if (pointInPoly(c,r,polyEntries[p][1])){found=REGION_KEY_TO_IDX[polyEntries[p][0]];break;}
    }
    if (!found&&!SHORE_MAP[r*COLS+c]) {
      let bestD=Infinity,bestIdx=0;
      for (const rc of regionCentroids) {
        const d=(c-rc.cx)**2+(r-rc.cy)**2;
        if (d<bestD){bestD=d;bestIdx=rc.idx;}
      }
      found=bestIdx;
    }
    REGION_MAP[r*COLS+c]=found;
  }
  return {TERRAIN_MAP,REGION_MAP,SHORE_MAP};
}

function randomSpawn(regionKey, SHORE_MAP, usedKeys) {
  const reg=REGION_LIST.find(r=>r.key===regionKey);
  if (!reg) return null;
  for (let attempt=0;attempt<200;attempt++) {
    const c=reg.cx+Math.floor((Math.random()-0.5)*70);
    const r=reg.cy+Math.floor((Math.random()-0.5)*70);
    if (c<1||c>=COLS-1||r<1||r>=ROWS-1) continue;
    const k=`${c},${r}`;
    if (KEEP_FOOTPRINT_SET.has(k)||usedKeys.has(k)||SHORE_MAP[r*COLS+c]) continue;
    return k;
  }
  return `${reg.cx+5},${reg.cy+5}`;
}

self.onmessage = function(e) {
  const { facKey } = e.data;

  postMessage({ type:"progress", pct:5,  label:"Building terrain..." });
  const { TERRAIN_MAP, REGION_MAP, SHORE_MAP } = buildLookups();
  postMessage({ type:"progress", pct:20, label:"Packing tiles..." });

  // ── Allocate flat typed arrays ────────────────────────────────────────────
  const terrainArr  = new Uint8Array(SIZE);   // TERRAIN_ENC value
  const ownerArr    = new Uint8Array(SIZE);   // OWNER_ENC value (0=none)
  const rssArr      = new Uint8Array(SIZE);   // RSS_ENC (0=none)
  const troopArr    = new Uint8Array(SIZE);   // TROOP_ENC (0=none)
  const powerArr    = new Uint8Array(SIZE);   // 0-4
  const regionArr   = new Uint8Array(SIZE);   // region index 1-16, 0=none
  const flagArr     = new Uint8Array(SIZE);   // bitfield
  const garrisonArr = new Uint32Array(SIZE);
  const siegeArr    = new Uint32Array(SIZE);
  const siegeMaxArr = new Uint32Array(SIZE);
  // keepPrimIdx: index of primary keep tile (r*COLS+c), -1 if not a keepPart
  const keepPrimArr = new Int32Array(SIZE).fill(-1);

  const PROGRESS_INTERVAL = 50;

  for (let r=0;r<ROWS;r++) {
    for (let c=0;c<COLS;c++) {
      const idx=r*COLS+c;

      if (SHORE_MAP[idx]) {
        terrainArr[idx]  = TERRAIN_ENC.shore;
        flagArr[idx]    |= F_SHORE;
        continue;
      }

      const regIdx  = REGION_MAP[idx];
      const reg     = regIdx ? REGION_LIST[regIdx-1] : null;
      const pl      = reg ? (REGION_POWER[reg.layer]??1) : 1;
      const pd      = POWER_DEFS[pl];
      const rssKey  = RKEYS[Math.floor(Math.random()*4)];
      const trpKey  = TROOP_KEYS[Math.floor(Math.random()*4)];

      terrainArr[idx]  = TERRAIN_ENC[TERRAIN_NAMES[TERRAIN_MAP[idx]]] ?? 0;
      rssArr[idx]      = RSS_ENC[rssKey] ?? 0;
      troopArr[idx]    = TROOP_ENC[trpKey] ?? 0;
      powerArr[idx]    = pl;
      regionArr[idx]   = regIdx;
      garrisonArr[idx] = pd.troops;
      siegeArr[idx]    = SIEGE_BASE;
      siegeMaxArr[idx] = SIEGE_BASE;
    }

    if (r % PROGRESS_INTERVAL === 0) {
      postMessage({ type:"progress", pct: 20+Math.round((r/ROWS)*60), label:"Packing tiles..." });
    }
  }

  postMessage({ type:"progress", pct:82, label:"Placing keeps..." });

  const KEEP_CMD_LVL=20, KEEP_TROOPS=2000, KEEP_SIEGE=5000, KEEP_RADIUS=5;
  // keepMeta: per-keep extra data (defCmd, keepName) — only 16 entries, sent as JSON
  const keepMeta = {};

  for (const reg of REGION_LIST) {
    const idx = reg.cy*COLS + reg.cx;
    if (flagArr[idx] & F_SHORE) continue;

    terrainArr[idx]  = TERRAIN_ENC.grass;
    rssArr[idx]      = 0;
    powerArr[idx]    = 4;
    regionArr[idx]   = REGION_KEY_TO_IDX[reg.key];
    garrisonArr[idx] = KEEP_TROOPS;
    siegeArr[idx]    = KEEP_SIEGE;
    siegeMaxArr[idx] = KEEP_SIEGE;
    flagArr[idx]     = (flagArr[idx] & ~(F_KEEPPART|F_HQ|F_HQPART)) | F_KEEP;
    if (reg.layer==="ring") flagArr[idx] |= F_WIN;

    keepMeta[`${reg.cx},${reg.cy}`] = {
      keepName: reg.keepName,
      defCmd: {
        n:reg.keepName, icon:"🏰", cls:"defender", faction:null, rarity:"veteran",
        troopType:TROOP_KEYS[0], lvl:KEEP_CMD_LVL, troops:KEEP_TROOPS,
        atk:120*KEEP_CMD_LVL, spd:40+KEEP_CMD_LVL*2,
      },
    };

    for (let dc=-KEEP_RADIUS; dc<=KEEP_RADIUS; dc++) {
      for (let dr=-KEEP_RADIUS; dr<=KEEP_RADIUS; dr++) {
        if (dc===0&&dr===0) continue;
        const fc=reg.cx+dc, fr=reg.cy+dr;
        if (fc<0||fr<0||fc>=COLS||fr>=ROWS) continue;
        const fi=fr*COLS+fc;
        if (flagArr[fi]&F_SHORE) continue;
        terrainArr[fi]  = TERRAIN_ENC.grass;
        rssArr[fi]      = 0;
        regionArr[fi]   = REGION_KEY_TO_IDX[reg.key];
        flagArr[fi]     = (flagArr[fi]&~(F_KEEP|F_HQ|F_HQPART|F_WIN))|F_KEEPPART;
        keepPrimArr[fi] = reg.cy*COLS+reg.cx;
      }
    }
  }

  // Phase 3b: pre-own starter keeps
  const STARTER_CMDS = {
    pirates:       { n:"Saltmere Captain",    icon:"⚓" },
    merfolk:       { n:"Tidesreach Warden",   icon:"🌊" },
    marines:       { n:"Ironhaven Commander", icon:"⚔"  },
    orcs:          { n:"Grimhold Warchief",   icon:"💀" },
    bountyhunters: { n:"Ashenveil Ranger",    icon:"🏹" },
    dragons:       { n:"Emberpeak Drake",     icon:"🔥" },
  };
  for (const [fk, regions] of Object.entries(FACTION_REGIONS)) {
    const startReg = REGION_LIST.find(r=>r.key===regions.start);
    if (!startReg) continue;
    const idx = startReg.cy*COLS+startReg.cx;
    ownerArr[idx] = OWNER_ENC[fk];
    const sc = STARTER_CMDS[fk];
    const meta = keepMeta[`${startReg.cx},${startReg.cy}`];
    if (meta && sc) {
      meta.defCmd = { ...meta.defCmd, ...sc, cls:"defender", rarity:"veteran", faction:fk };
    }
    for (let dc=-KEEP_RADIUS; dc<=KEEP_RADIUS; dc++) {
      for (let dr=-KEEP_RADIUS; dr<=KEEP_RADIUS; dr++) {
        if (dc===0&&dr===0) continue;
        const fc=startReg.cx+dc, fr=startReg.cy+dr;
        if (fc<0||fr<0||fc>=COLS||fr>=ROWS) continue;
        const fi=fr*COLS+fc;
        if ((flagArr[fi]&F_KEEPPART)&&keepPrimArr[fi]===idx) ownerArr[fi]=OWNER_ENC[fk];
      }
    }
  }

  postMessage({ type:"progress", pct:92, label:"Finding spawn points..." });

  const spawnKeys={}, usedKeys=new Set();
  for (const fk of ["pirates","merfolk","marines","orcs","bountyhunters","dragons"]) {
    const startRegion=FACTION_REGIONS[fk]?.start;
    if (!startRegion) continue;
    const key=randomSpawn(startRegion,SHORE_MAP,usedKeys);
    if (key){spawnKeys[fk]=key;usedKeys.add(key);}
  }

  postMessage({ type:"progress", pct:98, label:"Finishing up..." });

  // Transfer all typed arrays zero-copy
  const transferables = [
    terrainArr.buffer, ownerArr.buffer, rssArr.buffer, troopArr.buffer,
    powerArr.buffer, regionArr.buffer, flagArr.buffer,
    garrisonArr.buffer, siegeArr.buffer, siegeMaxArr.buffer, keepPrimArr.buffer,
  ];

  postMessage({
    type: "done",
    buffers: {
      terrain:  terrainArr.buffer,
      owner:    ownerArr.buffer,
      rss:      rssArr.buffer,
      troop:    troopArr.buffer,
      power:    powerArr.buffer,
      region:   regionArr.buffer,
      flags:    flagArr.buffer,
      garrison: garrisonArr.buffer,
      siege:    siegeArr.buffer,
      siegeMax: siegeMaxArr.buffer,
      keepPrim: keepPrimArr.buffer,
    },
    meta: {
      COLS, ROWS,
      regionList: REGION_LIST,
      keepMeta,
      TERRAIN_DEC, RSS_DEC, TROOP_DEC, OWNER_DEC,
      F_SHORE, F_KEEP, F_KEEPPART, F_HQ, F_HQPART, F_WIN, F_DEFEATED,
    },
    spawnKeys,
  }, transferables);
};
