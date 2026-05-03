/* ─────────────────────────────────────────────────────────────────────────────
   gear.js — V4 Gear System (Design Doc §5)
   4 slots: Helmet, Armor, Bracers, Accessory
   4 rarities: Common, Rare, Epic, Legendary
   Strengthening: 1-5 stars via same-rarity fodder
   Refining: gold stars via exact duplicate copies
───────────────────────────────────────────────────────────────────────────── */

// ── Gear rarity ───────────────────────────────────────────────────────────────
export const GEAR_RARITY = {
  common:    { n: "Common",    color: "#8a8a8a", secSlots: 1, statMult: 1.0  },
  rare:      { n: "Rare",      color: "#4488cc", secSlots: 2, statMult: 1.4  },
  epic:      { n: "Epic",      color: "#a855f7", secSlots: 3, statMult: 1.9  },
  legendary: { n: "Legendary", color: "#f0c040", secSlots: 4, statMult: 2.6  },
};

// Pull rates for gear slots
export const GEAR_PULL_RATES = {
  common:    0.85,
  rare:      0.10,
  epic:      0.04,
  legendary: 0.01,
};

// ── Gear slots ────────────────────────────────────────────────────────────────
export const GEAR_SLOTS = {
  helmet:    { n: "Helmet",    icon: "⛑",  primaryAffinity: "defense" },
  armor:     { n: "Armor",     icon: "🛡",  primaryAffinity: "defense" },
  bracers:   { n: "Bracers",   icon: "🥊",  primaryAffinity: "attack"  },
  accessory: { n: "Accessory", icon: "💍",  primaryAffinity: "utility" },
};
export const GEAR_SLOT_KEYS = Object.keys(GEAR_SLOTS);

// ── Main stat affinity pools ──────────────────────────────────────────────────
// Each slot has primary + off-affinity variants
const MAIN_STATS = {
  defense: ["DEF", "HP",  "GARRISON"],
  attack:  ["ATK", "FOC", "SIEGE"],
  utility: ["SPD", "CMD", "MARCH"],
};

// Stat base values by rarity (scaled by GEAR_RARITY.statMult in practice)
const STAT_BASE = {
  DEF:      { base: 80,  label: "Defense",       icon: "🛡" },
  HP:       { base: 500, label: "HP",             icon: "❤" },
  GARRISON: { base: 60,  label: "Garrison Str",   icon: "🏰" },
  ATK:      { base: 70,  label: "Attack",         icon: "⚔" },
  FOC:      { base: 65,  label: "Focus",          icon: "✦" },
  SIEGE:    { base: 55,  label: "Siege Power",    icon: "🪨" },
  SPD:      { base: 40,  label: "March Speed",    icon: "💨" },
  CMD:      { base: 300, label: "Command Cap",    icon: "📡" },
  MARCH:    { base: 1,   label: "March Slots",    icon: "🚶" },
};

// Secondary stat pool (random rolls)
const SEC_STAT_POOL = ["ATK","DEF","FOC","HP","SPD","CMD","GARRISON","SIEGE"];

// ── Gear piece definitions ────────────────────────────────────────────────────
// Each piece has: id, name, slot, alignment (null=both/humans/creatures),
// primaryStatKey, flavour icon
export const GEAR_PIECES = [
  // ── Helmets ──
  { id:"g1",  n:"Iron Skullcap",      slot:"helmet",    alignment:null,       primaryStat:"DEF",     rarity:"common",    icon:"⛑" },
  { id:"g2",  n:"Warlord's Helm",     slot:"helmet",    alignment:"creatures",primaryStat:"ATK",     rarity:"rare",      icon:"🪖" },
  { id:"g3",  n:"Admiral's Tricorne", slot:"helmet",    alignment:"humans",   primaryStat:"CMD",     rarity:"rare",      icon:"🎩" },
  { id:"g4",  n:"Dragonscale Crest",  slot:"helmet",    alignment:"creatures",primaryStat:"DEF",     rarity:"epic",      icon:"🐉" },
  { id:"g5",  n:"Arcane Circlet",     slot:"helmet",    alignment:"humans",   primaryStat:"FOC",     rarity:"epic",      icon:"💫" },
  { id:"g6",  n:"Crown of Dominion",  slot:"helmet",    alignment:null,       primaryStat:"HP",      rarity:"legendary", icon:"👑" },

  // ── Armor ──
  { id:"g7",  n:"Leather Vest",       slot:"armor",     alignment:null,       primaryStat:"DEF",     rarity:"common",    icon:"🛡" },
  { id:"g8",  n:"Corsair Coat",       slot:"armor",     alignment:"humans",   primaryStat:"SPD",     rarity:"rare",      icon:"🧥" },
  { id:"g9",  n:"Boneplate Mail",     slot:"armor",     alignment:"creatures",primaryStat:"HP",      rarity:"rare",      icon:"💀" },
  { id:"g10", n:"Ember Aegis",        slot:"armor",     alignment:"creatures",primaryStat:"DEF",     rarity:"epic",      icon:"🔥" },
  { id:"g11", n:"Tidal Breastplate",  slot:"armor",     alignment:"humans",   primaryStat:"DEF",     rarity:"epic",      icon:"🌊" },
  { id:"g12", n:"Mantle of the Deep", slot:"armor",     alignment:null,       primaryStat:"GARRISON",rarity:"legendary", icon:"⚜" },

  // ── Bracers ──
  { id:"g13", n:"Crude Gauntlets",    slot:"bracers",   alignment:null,       primaryStat:"ATK",     rarity:"common",    icon:"🥊" },
  { id:"g14", n:"Duelist's Wraps",    slot:"bracers",   alignment:"humans",   primaryStat:"ATK",     rarity:"rare",      icon:"⚔" },
  { id:"g15", n:"Tuskbound Grips",    slot:"bracers",   alignment:"creatures",primaryStat:"ATK",     rarity:"rare",      icon:"🪓" },
  { id:"g16", n:"Arcane Channels",    slot:"bracers",   alignment:"humans",   primaryStat:"FOC",     rarity:"epic",      icon:"✨" },
  { id:"g17", n:"Siege Fists",        slot:"bracers",   alignment:"creatures",primaryStat:"SIEGE",   rarity:"epic",      icon:"💥" },
  { id:"g18", n:"Conqueror's Vambraces",slot:"bracers", alignment:null,       primaryStat:"ATK",     rarity:"legendary", icon:"🏆" },

  // ── Accessories ──
  { id:"g19", n:"Copper Amulet",      slot:"accessory", alignment:null,       primaryStat:"SPD",     rarity:"common",    icon:"💍" },
  { id:"g20", n:"Navigator's Compass",slot:"accessory", alignment:"humans",   primaryStat:"MARCH",   rarity:"rare",      icon:"🧭" },
  { id:"g21", n:"Shaman's Totem",     slot:"accessory", alignment:"creatures",primaryStat:"FOC",     rarity:"rare",      icon:"🪬" },
  { id:"g22", n:"Warchief's Standard",slot:"accessory", alignment:"creatures",primaryStat:"CMD",     rarity:"epic",      icon:"🏴" },
  { id:"g23", n:"Admiral's Signet",   slot:"accessory", alignment:"humans",   primaryStat:"CMD",     rarity:"epic",      icon:"🔑" },
  { id:"g24", n:"Relic of Ages",      slot:"accessory", alignment:null,       primaryStat:"HP",      rarity:"legendary", icon:"⚱" },
];

// ── Stat value helpers ────────────────────────────────────────────────────────
export function gearStatValue(statKey, rarityKey, stars = 0) {
  const base = STAT_BASE[statKey]?.base ?? 50;
  const mult = GEAR_RARITY[rarityKey]?.statMult ?? 1;
  const starBonus = 1 + stars * 0.12; // +12% per star level
  return Math.round(base * mult * starBonus);
}

// Roll random secondary stats for a piece
function rollSecStats(rarityKey) {
  const count = GEAR_RARITY[rarityKey]?.secSlots ?? 1;
  const pool = [...SEC_STAT_POOL];
  const stats = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const key = pool.splice(idx, 1)[0];
    stats.push({ key, value: Math.round(STAT_BASE[key].base * 0.3 + Math.random() * STAT_BASE[key].base * 0.25) });
  }
  return stats;
}

// ── Create a gear instance ────────────────────────────────────────────────────
// Returns a gear instance object (not a definition — has rolled secondary stats)
export function createGearInstance(pieceId, overrideRarity) {
  const def = GEAR_PIECES.find(p => p.id === pieceId);
  if (!def) return null;
  const rarity = overrideRarity ?? def.rarity;
  return {
    instanceId: `gi_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    pieceId:    def.id,
    n:          def.n,
    slot:       def.slot,
    alignment:  def.alignment,
    primaryStat:def.primaryStat,
    rarity,
    icon:       def.icon,
    stars:      0,        // silver stars 0-5 (strengthening)
    goldStars:  0,        // gold stars (refining)
    secStats:   rollSecStats(rarity),
    equippedBy: null,     // commander uid or null
  };
}

// ── Roll a gear schematic from gacha ─────────────────────────────────────────
// Returns a gear instance weighted by rarity
export function rollGearSchematic(playerAlignment) {
  const r = Math.random();
  let rarity;
  if      (r < GEAR_PULL_RATES.legendary) rarity = "legendary";
  else if (r < GEAR_PULL_RATES.legendary + GEAR_PULL_RATES.epic) rarity = "epic";
  else if (r < GEAR_PULL_RATES.legendary + GEAR_PULL_RATES.epic + GEAR_PULL_RATES.rare) rarity = "rare";
  else rarity = "common";

  // Filter by alignment (alignment:null pieces are for everyone)
  const pool = GEAR_PIECES.filter(p =>
    p.rarity === rarity &&
    (p.alignment === null || p.alignment === playerAlignment)
  );
  const fallback = GEAR_PIECES.filter(p => p.rarity === rarity);
  const src = pool.length ? pool : fallback;
  const def = src[Math.floor(Math.random() * src.length)];
  return createGearInstance(def.id);
}

// ── Strengthening ────────────────────────────────────────────────────────────
// Cost: same-rarity gear pieces. Returns { canAfford, newStars }
export const STRENGTHEN_COST = [2, 3, 4, 5, 6]; // pieces needed for star 1→2→3→4→5
export function canStrengthen(piece, inventoryCount) {
  if (piece.stars >= 5) return false;
  return inventoryCount >= STRENGTHEN_COST[piece.stars];
}
export function strengthen(piece) {
  if (piece.stars >= 5) return piece;
  return { ...piece, stars: piece.stars + 1 };
}

// ── Refining ─────────────────────────────────────────────────────────────────
// Cost: exact duplicate (same pieceId). Each refine increases one sec stat.
export function canRefine(piece, duplicateCount) {
  return piece.goldStars < piece.secStats.length && duplicateCount >= 1;
}
export function refine(piece, secStatIndex) {
  if (piece.goldStars >= piece.secStats.length) return piece;
  const newSecStats = piece.secStats.map((s, i) =>
    i === secStatIndex ? { ...s, value: Math.round(s.value * 1.25), gold: true } : s
  );
  return { ...piece, goldStars: piece.goldStars + 1, secStats: newSecStats };
}

// ── Respect schematic item ────────────────────────────────────────────────────
export function createRespectSchematic(rarity = "soldier", commander = null) {
  // If commander is provided → commander-specific schematic (+100 each)
  // If commander is null → generic schematic (overflow, +30 each)
  const isSpecific = commander !== null;
  const PTS = isSpecific
    ? { soldier: 100, veteran: 100, champion: 100 }
    : { soldier: 30,  veteran: 30,  champion: 30  };

  const rarityColor = rarity === "champion" ? "#f0c040" : rarity === "veteran" ? "#a855f7" : "#4488cc";

  return {
    instanceId: `rs_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    type:        "respectSchematic",
    rarity,
    points:      PTS[rarity] ?? 100,
    icon:        rarity === "champion" ? "🏆" : rarity === "veteran" ? "⭐" : "📜",
    // Commander-specific fields
    commanderId:   isSpecific ? commander.id   : null,
    commanderName: isSpecific ? commander.n    : null,
    isGeneric:     !isSpecific,
    rarityColor,
    n: isSpecific
      ? `${commander.n}'s Schematic`
      : `Generic ${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Schematic`,
  };
}

// ── Roll a full 3-slot pull (doc §6.2) ───────────────────────────────────────
// Slot 1: guaranteed respect schematic OR commander
// Slot 2: guaranteed gear schematic
// Slot 3: open (gear/respect/commander weighted)
// commanderPool: array of HDEFS commanders in this alignment (for specific schematic targeting)
export function rollFullPull(alignFactions, playerAlignment, pityCounters, commanderPool = []) {
  // Pick a random commander from pool by rarity for schematic targeting
  function pickSchematicTarget(scRarity) {
    const pool = commanderPool.filter(h => h.rarity === scRarity);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Slot 1: 98% respect schematic, 2% full commander pull
  const slot1IsCmd = Math.random() < 0.02;
  let slot1;
  if (slot1IsCmd) {
    slot1 = { type: "commander" };
  } else {
    const r = Math.random();
    const scRarity = r < 0.02 ? "champion" : r < 0.10 ? "veteran" : "soldier";
    slot1 = createRespectSchematic(scRarity, pickSchematicTarget(scRarity));
  }

  // Slot 2: always gear
  const slot2 = rollGearSchematic(playerAlignment);

  // Slot 3: open — 84% gear, 15% respect schematic, 1% commander
  const s3r = Math.random();
  let slot3;
  if (s3r < 0.01) {
    slot3 = { type: "commander" };
  } else if (s3r < 0.16) {
    const r = Math.random();
    const scRarity = r < 0.02 ? "champion" : r < 0.10 ? "veteran" : "soldier";
    slot3 = createRespectSchematic(scRarity, pickSchematicTarget(scRarity));
  } else {
    slot3 = rollGearSchematic(playerAlignment);
  }

  return { slot1, slot2, slot3 };
}

// ── Commander rarity within a full-pull slot ─────────────────────────────────
// When a slot rolls "commander", these rates decide which rarity drops.
// Designed so overall rates (given ~2% commander chance) approximate:
//   soldier ~1%, veteran ~0.7%, champion ~0.3% of all pulls.
// Within a commander slot: soldier 50%, veteran 35%, champion 15%.
export const FULL_PULL_CMD_RATES = { soldier: 0.50, veteran: 0.35, champion: 0.15 };

export function rollFullPullCmdRarity() {
  const r = Math.random();
  if (r < FULL_PULL_CMD_RATES.champion) return "champion";
  if (r < FULL_PULL_CMD_RATES.champion + FULL_PULL_CMD_RATES.veteran) return "veteran";
  return "soldier";
}

// Re-export STAT_BASE for display
export { STAT_BASE };
