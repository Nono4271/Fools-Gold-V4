import { COLS, ROWS } from "../constants/geometry.js";
import { BIOME_SEEDS } from "../constants/terrain.js";
import { RKEYS, POWER_DEFS, SIEGE_BASE, SIEGE_KEEP_BASE } from "../constants/map.js";
import { TROOP_KEYS } from "../constants/troops.js";
import { REGION_LIST, REGION_POWER, KEEP_KEYS, FACTION_REGIONS } from "../constants/regions.js";
import { npcForPowerLevel } from "../constants/heroes.js";

export function tileRng(c, r) {
  let s = (((c + 1) * 73856093) ^ ((r + 1) * 19349663)) | 0;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) | 0;
    return ((s >>> 16) & 0x7fff) / 0x7fff;
  };
}

export function diamondPos(rnd, marginA = 0.85) {
  const a = rnd() - 0.5, b = rnd() - 0.5;
  return { dx: (a + b) * 36 * marginA, dy: (a - b) * 18 * marginA };
}

// ── Pre-baked lookup arrays (built once at module load, O(1) per tile in genMap) ──
//
// Both arrays are flat Uint8Arrays indexed by r*COLS+c.
// Building them here costs the same ~98M distance calculations as before,
// but they're computed once and reused for every genMap() call.

const SIZE = COLS * ROWS;
const REGION_RADIUS_SQ = 100 * 100;

// TERRAIN_MAP: index → terrain string index (0=grass,1=forest,2=mountain,3=desert)
const TERRAIN_NAMES = ["grass", "forest", "mountain", "desert"];
const TERRAIN_MAP = new Uint8Array(SIZE); // default 0 = grass

// REGION_MAP: index → region index+1 in REGION_LIST (0 = no region)
const REGION_MAP = new Uint8Array(SIZE); // default 0 = no region

// SHORE_MAP: index → 1 if shore tile
const SHORE_MAP = new Uint8Array(SIZE);

(() => {
  // Build shore map
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c === 0 || r === 0 || c === COLS - 1 || r === ROWS - 1) {
        SHORE_MAP[r * COLS + c] = 1;
      }
    }
  }

  // Build terrain map — nearest biome seed (Voronoi)
  // For each tile, find the closest seed and record its terrain index
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let bestDist = Infinity, bestIdx = 0;
      for (let i = 0; i < BIOME_SEEDS.length; i++) {
        const s = BIOME_SEEDS[i];
        const d = (c - s.c) ** 2 + (r - s.r) ** 2;
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      const ti = TERRAIN_NAMES.indexOf(BIOME_SEEDS[bestIdx].t);
      TERRAIN_MAP[r * COLS + c] = ti < 0 ? 0 : ti;
    }
  }

  // Build region map — nearest region center within radius
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let bestDist = Infinity, bestIdx = 0;
      for (let i = 0; i < REGION_LIST.length; i++) {
        const reg = REGION_LIST[i];
        const d = (c - reg.cx) ** 2 + (r - reg.cy) ** 2;
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      // Store index+1 so 0 means "no region" (outside radius)
      REGION_MAP[r * COLS + c] = bestDist <= REGION_RADIUS_SQ ? bestIdx + 1 : 0;
    }
  }
})();

// O(1) lookups used by genMap
function getTerrain(c, r) { return TERRAIN_NAMES[TERRAIN_MAP[r * COLS + c]]; }
function getRegion(c, r)  { const i = REGION_MAP[r * COLS + c]; return i ? REGION_LIST[i - 1] : null; }
function getIsShore(c, r) { return SHORE_MAP[r * COLS + c] === 1; }

// ── Find a random non-shore, non-keep tile inside a region ───────────────────
function randomSpawnInRegion(regionKey, existingKeys = new Set()) {
  const reg = REGION_LIST.find(r => r.key === regionKey);
  if (!reg) return null;
  for (let attempt = 0; attempt < 200; attempt++) {
    const dc = Math.floor((Math.random() - 0.5) * 70);
    const dr = Math.floor((Math.random() - 0.5) * 70);
    const c = reg.cx + dc;
    const r = reg.cy + dr;
    if (c < 1 || c >= COLS - 1 || r < 1 || r >= ROWS - 1) continue;
    const k = `${c},${r}`;
    if (KEEP_KEYS.has(k)) continue;
    if (existingKeys.has(k)) continue;
    if (getIsShore(c, r)) continue;
    return k;
  }
  return `${reg.cx + 5},${reg.cy + 5}`;
}

export function genMap() {
  const m = {};

  // ── Base tile generation — O(1) lookups per tile ─────────────────────────
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const k = `${c},${r}`;

      if (getIsShore(c, r)) {
        m[k] = { c, r, k, terrain:"shore", rss:null, troopType:null, powerLevel:0,
          defCmd:null, owner:null, garrison:0, siege:0, siegeMax:0,
          garrisonDefeated:false, resetAt:null,
          isHQ:false, isWin:false, isKeep:false, isShore:true,
          regionKey:null, regionName:null };
        continue;
      }

      const reg = getRegion(c, r);
      const pl  = reg ? (REGION_POWER[reg.layer] ?? 1) : 1;
      const pd  = POWER_DEFS[pl];
      const rss = RKEYS[Math.floor(Math.random() * RKEYS.length)];
      const troopType = TROOP_KEYS[Math.floor(Math.random() * TROOP_KEYS.length)];

      m[k] = {
        c, r, k,
        terrain: getTerrain(c, r),
        rss,
        troopType,
        powerLevel: pl,
        regionKey:  reg?.key  ?? null,
        regionName: reg?.name ?? null,
        // defCmd is resolved on-demand via garrisonDefCmd(tile) in battle/useMarch
        // Storing it on every tile added 490k extra object allocations — removed for perf.
        defCmd: null,
        owner: null,
        garrison: pd.troops,
        garrisonTroops: pd.troops,
        hasAiCommander: false,
        siege:    SIEGE_BASE,
        siegeMax: SIEGE_BASE,
        garrisonDefeated: false,
        resetAt: null,
        isHQ:    false,
        isWin:   false,
        isKeep:  false,
        isShore: false,
      };
    }
  }

  // ── Place keeps ───────────────────────────────────────────────────────────
  const KEEP_CMD_LVL = 20;
  const KEEP_TROOPS  = 2000;
  const KEEP_SIEGE   = 5000;

  for (const reg of REGION_LIST) {
    const k = `${reg.cx},${reg.cy}`;
    if (!m[k]) continue;
    const isWin = reg.layer === "ring";
    const npc   = npcForPowerLevel(4);

    m[k] = {
      ...m[k],
      terrain: "grass",
      rss: null,
      powerLevel: 4,
      isKeep:  true,
      isWin:   isWin,
      isHQ:    false,
      regionKey:  reg.key,
      regionName: reg.name,
      keepName:   reg.keepName,
      owner:  null,
      garrison:       KEEP_TROOPS,
      garrisonTroops: KEEP_TROOPS,
      siege:    KEEP_SIEGE,
      siegeMax: KEEP_SIEGE,
      garrisonDefeated: false,
      resetAt: null,
      defCmd: {
        n: reg.keepName, icon: "🏰", cls: "defender", faction: null, rarity: "veteran",
        troopType: TROOP_KEYS[0],
        lvl:    KEEP_CMD_LVL,
        troops: KEEP_TROOPS,
        atk:    120 * KEEP_CMD_LVL,
        spd:    40 + KEEP_CMD_LVL * 2,
      },
    };
  }

  // ── Random HQ spawns per faction ─────────────────────────────────────────
  const spawnKeys  = {};
  const usedSpawns = new Set();
  const ALL_FACTIONS = ["pirates","merfolk","marines","orcs","bountyhunters","dragons"];

  for (const fk of ALL_FACTIONS) {
    const startRegion = FACTION_REGIONS[fk]?.start;
    if (!startRegion) continue;
    const key = randomSpawnInRegion(startRegion, usedSpawns);
    if (key) { spawnKeys[fk] = key; usedSpawns.add(key); }
  }

  m.__spawnKeys = spawnKeys;
  return m;
}
