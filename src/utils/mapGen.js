import { COLS, ROWS } from "../constants/geometry.js";
import { clusteredTerrain } from "../constants/terrain.js";
import { RKEYS, WIN_KEY, POWER_DEFS, SIEGE_BASE, SIEGE_HQ_BASE, SIEGE_KEEP_BASE } from "../constants/map.js";
import { TROOP_KEYS } from "../constants/troops.js";
import { REGION_LIST, REGION_POWER, tileRegion, isKeepTile, FACTION_REGIONS } from "../constants/regions.js";
import { npcForPowerLevel } from "../constants/heroes.js";
import { isShore } from "./pathfinding.js";

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

// ── Find a random non-shore, non-keep tile inside a region's bounding area ──
function randomSpawnInRegion(regionKey, tiles, existingKeys = new Set()) {
  const reg = REGION_LIST.find(r => r.key === regionKey);
  if (!reg) return null;
  // Try up to 200 random positions within ~40 tiles of the region center
  for (let attempt = 0; attempt < 200; attempt++) {
    const dc = Math.floor((Math.random() - 0.5) * 70);
    const dr = Math.floor((Math.random() - 0.5) * 70);
    const c = reg.cx + dc;
    const r = reg.cy + dr;
    if (c < 1 || c >= COLS-1 || r < 1 || r >= ROWS-1) continue;
    const k = `${c},${r}`;
    if (isKeepTile(k)) continue;
    if (existingKeys.has(k)) continue;
    if (!tiles[k] || tiles[k].isShore) continue;
    return k;
  }
  // Fallback: use region center offset by 5
  return `${reg.cx + 5},${reg.cy + 5}`;
}

export function genMap() {
  const m = {};

  // ── Base tile generation ──────────────────────────────────────────────────
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const k = `${c},${r}`;
      if (isShore(c, r)) {
        m[k] = { c, r, k, terrain:"shore", rss:null, troopType:null, powerLevel:0,
          defCmd:null, owner:null, garrison:0, siege:0, siegeMax:0,
          garrisonDefeated:false, resetAt:null,
          isHQ:false, isWin:false, isKeep:false, isShore:true,
          regionKey:null, regionName:null };
        continue;
      }

      // Determine region and power level
      const reg = tileRegion(c, r);
      const pl  = reg ? (REGION_POWER[reg.layer] ?? 1) : 1;
      const pd  = POWER_DEFS[pl];
      const npc = npcForPowerLevel(pl);
      const rss = RKEYS[Math.floor(Math.random() * RKEYS.length)];
      const troopType = TROOP_KEYS[Math.floor(Math.random() * TROOP_KEYS.length)];

      m[k] = {
        c, r, k,
        terrain: clusteredTerrain(c, r),
        rss,
        troopType,
        powerLevel: pl,
        regionKey:  reg?.key  ?? null,
        regionName: reg?.name ?? null,
        defCmd: {
          n: npc.n, icon: npc.icon, cls: npc.cls, faction: null, rarity: "soldier",
          troopType: npc.troopType,
          lvl:    pd.cmdLvl,
          troops: pd.troops,
          atk:    npc.atk * pd.cmdLvl,
          spd:    npc.spd + pd.cmdLvl * 2,
        },
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

  // ── Place keeps for all 16 regions ───────────────────────────────────────
  // Keep stats: garrison level 20, 5000 siege
  const KEEP_CMD_LVL   = 20;
  const KEEP_TROOPS    = 2000;
  const KEEP_SIEGE     = 5000;

  for (const reg of REGION_LIST) {
    const k = `${reg.cx},${reg.cy}`;
    if (!m[k]) continue;
    const isWin = reg.layer === 'ring';
    const npc   = npcForPowerLevel(4); // keep commanders are strong

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
      garrison:      KEEP_TROOPS,
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

  // ── HQ spawn positions (returned alongside map, applied by FactionScreen) ─
  // We pre-compute valid random spawn positions per faction here so FactionScreen
  // can call genMap() once and get everything it needs.
  const spawnKeys = {};
  const usedSpawns = new Set();

  // Order matters — player faction goes first, then the 5 AI factions
  const ALL_FACTIONS = ['pirates', 'merfolk', 'marines', 'orcs', 'bountyhunters', 'dragons'];
  for (const fk of ALL_FACTIONS) {
    const startRegion = FACTION_REGIONS[fk]?.start;
    if (!startRegion) continue;
    const key = randomSpawnInRegion(startRegion, m, usedSpawns);
    if (key) {
      spawnKeys[fk] = key;
      usedSpawns.add(key);
    }
  }

  // Attach spawn metadata to map (will be consumed by Game.jsx on init)
  m.__spawnKeys = spawnKeys;

  return m;
}
