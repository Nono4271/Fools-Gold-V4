import { COLS, ROWS } from "../constants/geometry.js";
import { clusteredTerrain } from "../constants/terrain.js";
import { RKEYS } from "../constants/map.js";
import { TROOP_KEYS } from "../constants/troops.js";
import { HQP, AI_HQ_KEY, WIN_KEY, POWER_DEFS, SIEGE_BASE, SIEGE_HQ_BASE, tilePowerLevel } from "../constants/map.js";
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

export function genMap() {
  const m = {};
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const k = `${c},${r}`;
      const shore = isShore(c, r);
      if (shore) {
        m[k] = { c, r, k, terrain:"shore", rss:null, troopType:null, powerLevel:0,
          defCmd:null, owner:null, garrison:0, siege:0, siegeMax:0,
          garrisonDefeated:false, resetAt:null, isHQ:false, isWin:false, isShore:true };
        continue;
      }
      const rss = RKEYS[Math.floor(Math.random() * RKEYS.length)];
      const troopType = TROOP_KEYS[Math.floor(Math.random() * TROOP_KEYS.length)];
      const pl = tilePowerLevel(c, r);
      const pd = POWER_DEFS[pl];
      const npc = npcForPowerLevel(pl);
      m[k] = {
        c, r, k,
        terrain: clusteredTerrain(c, r),
        rss,
        troopType,
        powerLevel: pl,
        defCmd: {
          n: npc.n, icon: npc.icon, cls: npc.cls, faction: null, rarity: "soldier",
          troopType: npc.troopType,
          lvl:   pd.cmdLvl,
          troops: pd.troops,
          atk:   npc.atk * pd.cmdLvl,
          spd:   npc.spd + pd.cmdLvl * 2,
        },
        owner: null,
        garrison: pd.troops,
        garrisonTroops: pd.troops,
        hasAiCommander: false,
        siege: SIEGE_BASE,
        siegeMax: SIEGE_BASE,
        garrisonDefeated: false,
        resetAt: null,
        isHQ: false,
        isWin: false,
        isShore: false,
      };
    }
  }

  // Player HQ
  const hqK = `${HQP.player.c},${HQP.player.r}`;
  m[hqK] = { ...m[hqK], owner:"player", isHQ:true, garrison:0, terrain:"grass", rss:null, defCmd:null,
    siege:SIEGE_HQ_BASE, siegeMax:SIEGE_HQ_BASE, garrisonDefeated:false, resetAt:null };

  // AI HQ
  m[AI_HQ_KEY] = { ...m[AI_HQ_KEY], owner:"ai", isHQ:true, garrison:0, terrain:"grass", rss:null, defCmd:null,
    siege:SIEGE_HQ_BASE, siegeMax:SIEGE_HQ_BASE, garrisonDefeated:false, resetAt:null };

  // Win tile
  const winPD = POWER_DEFS[4];
  m[WIN_KEY] = {
    ...m[WIN_KEY], isWin:true, terrain:"grass", rss:null, powerLevel:4,
    garrison: winPD.troops,
    siege: SIEGE_BASE, siegeMax: SIEGE_BASE, garrisonDefeated:false, resetAt:null,
    defCmd:{ lvl:winPD.cmdLvl, troops:winPD.troops, troopType:TROOP_KEYS[0], atk:200, spd:75 },
  };

  // Ruin
  const ruinK = "1,2";
  m[ruinK] = {
    ...m[ruinK], isRuin:true, terrain:"ruin", rss:null, powerLevel:1,
    owner:null, garrison:100,
    siege:1300, siegeMax:1300,
    garrisonDefeated:false, resetAt:null,
    defCmd:{ lvl:1, troops:100, troopType:TROOP_KEYS[0], atk:80, spd:30 },
  };

  return m;
}
