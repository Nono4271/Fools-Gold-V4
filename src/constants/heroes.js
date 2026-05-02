// ── V4 Rarity ────────────────────────────────────────────────────────────────
export const RARITY = {
  soldier:  { n: "Soldier",  color: "#4488cc", border: "#2a66aa" },
  veteran:  { n: "Veteran",  color: "#a855f7", border: "#7c22d4" },
  champion: { n: "Champion", color: "#f0c040", border: "#c89010" },
};

export const RC = (rarity) => RARITY[rarity]?.color ?? "#6b7280";

export const PROMO = {
  soldier:  { to: "veteran",  respectRequired: 7  },
  veteran:  { to: "champion", respectRequired: 12 },
  champion: { to: null,       respectRequired: null },
};

// ── V4 Classes ───────────────────────────────────────────────────────────────
export const CLASS = {
  leader:   {
    n: "Leader",   icon: "⚑",
    desc: "Masters of logistics and morale. Leaders extend command range and accelerate marches.",
    bonus: "Iron Will — At Lv25: +20% troop capacity, all friendly marches within 2 tiles gain +15% speed.",
    synergy: "Command tree",
    primaryTree: "command",
  },
  attacker: {
    n: "Attacker", icon: "⚔",
    desc: "Frontline destroyers built for overwhelming offensive power and rapid conquest.",
    bonus: "Bloodlust — At Lv25: +15% attack power, each tile conquered in a single march chain restores 5% troop losses.",
    synergy: "Combat tree",
    primaryTree: "combat",
  },
  support:  {
    n: "Support",  icon: "✦",
    desc: "Tactical specialists who amplify allies, heal troops, and turn the tide through cunning.",
    bonus: "Grand Strategy — At Lv25: +5 bonus skill points, all skill tree effects increased by 10%.",
    synergy: "Tactics tree",
    primaryTree: "tactics",
  },
  defender: {
    n: "Defender", icon: "🛡",
    desc: "Unyielding fortresses. Defenders make held tiles nearly impregnable.",
    bonus: "Bastion — At Lv25: +20% tile defense garrison strength, sieges against held tiles deal 15% less damage.",
    synergy: "Defense tree",
    primaryTree: "defense",
  },
};

// ── Class → which 3 trees they get (primary x3) + 1 random secondary ─────────
// The 4th tree per commander is seeded from their ID so it's static across runs
export const CLASS_TREES = {
  attacker: ["combat", "combat", "combat"],     // 3 combat branches + 1 random
  defender: ["defense", "defense", "defense"],  // 3 defense branches + 1 random
  leader:   ["command", "command", "command"],  // 3 command branches + 1 random
  support:  ["tactics", "tactics", "tactics"],  // 3 tactics branches + 1 random
};

// Secondary tree options per class (the 4th tree, randomized but static per commander)
export const CLASS_SECONDARY_OPTIONS = {
  attacker: ["command", "defense", "tactics"],
  defender: ["command", "combat", "tactics"],
  leader:   ["combat", "defense", "tactics"],
  support:  ["combat", "defense", "command"],
};

// Get a commander's 4 trees: 3 of their class + 1 static secondary
export function getCommanderTrees(cmd) {
  const primary = CLASS_TREES[cmd.cls] ?? ["combat","combat","combat"];
  const secondaryOptions = CLASS_SECONDARY_OPTIONS[cmd.cls] ?? ["command","defense","tactics"];
  // Use commander id as seed so it's deterministic/static
  const seed = cmd.id?.split("").reduce((a,c) => a + c.charCodeAt(0), 0) ?? 0;
  const secondary = secondaryOptions[seed % secondaryOptions.length];
  return { primary, secondary, all: [...primary, secondary] };
}

// ── V4 Respect ───────────────────────────────────────────────────────────────
export const RESPECT_MAX = 15;

export function respectCost(fromLevel) {
  return Math.round(300 * Math.pow(1.65, fromLevel));
}

export function respectTotalFor(level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += respectCost(i);
  return total;
}

export const RESPECT_DUPE_POINTS = { soldier: 120, veteran: 300, champion: 800 };
export const RESPECT_SCHEMATIC_POINTS = { soldier: 200, veteran: 500, champion: 1000 };
export const RESPECT_OVERFLOW_POINTS = 150;

export function respectLevelFromPoints(totalPoints) {
  let lvl = 0;
  let spent = 0;
  while (lvl < RESPECT_MAX) {
    const needed = respectCost(lvl);
    if (spent + needed > totalPoints) break;
    spent += needed;
    lvl++;
  }
  return { level: lvl, pointsIntoLevel: totalPoints - spent, pointsNeeded: respectCost(Math.min(lvl, RESPECT_MAX - 1)) };
}

export const RESPECT_GATES = {
  3:  "command",
  5:  "tactics",
  7:  "promo_sv",
  12: "promo_vc",
};

// ── V4 Skill Trees ────────────────────────────────────────────────────────────
export const SKILL_TREES = {
  combat:  { n: "Combat",  icon: "⚔",  unlocksAt: 0, desc: "Raw damage, attack buffs, offensive power"          },
  defense: { n: "Defense", icon: "🛡", unlocksAt: 0, desc: "Garrison strength, troop survival, damage reduction" },
  command: { n: "Command", icon: "📡", unlocksAt: 3, desc: "Troop capacity, march speed, logistics"              },
  tactics: { n: "Tactics", icon: "✦",  unlocksAt: 5, desc: "Special effects, debuffs, healing, siege bonuses"   },
};

// Skill naming and mechanic tables live in skills.js — re-exported here for backward compat
export { MAIN_BRANCH_NAMES, FACTION_MAIN_NAMES, getMainBranchNames, SKILL_NAMES, getSkillNames, TREE_DISPLAY_NAMES, getTreeDisplayNames, SKILL_MECHANICS, SKILLS, getBranchMechanicKey, getBranchMechanic } from "./skills.js";

// DEAD_CODE_START — kept so this marker is findable, replaced by skills.js re-export above
const _MAIN_BRANCH_NAMES_UNUSED = {
  combat:  ["Grit","Weapon Mastery","Battle Fury","Iron Resolve","Blood Rush","War Cry","Killing Blow","Unstoppable","Wrath","Supreme Might"],
  defense: ["Fortify","Shield Training","Stalwart","Iron Skin","Hold the Line","Bulwark","Impenetrable","Stone Will","Last Stand","Citadel"],
  command: ["Rally","March Discipline","Vanguard","Supply Lines","Force March","Tactical Advance","Strategic Mind","Grand March","Legion's Pride","War Council"],
  tactics: ["Cunning","Feint","Ambush","Debilitating Strike","Hex","Battle Scheme","Masterstroke","Siege Craft","Shadow Gambit","Grand Tactics"],
};
// DEAD_CODE_END

// Old SKILL_NAMES and getSkillNames removed — now in skills.js

// ── V4 Commander Definitions ─────────────────────────────────────────────────
export const HDEFS = [
  // Pirates
  { id:"h1",  n:"Redwake Fynn",      faction:"pirates",        rarity:"veteran",  cls:"attacker", atk:130, foc:0,   spd:88, icon:"🏴‍☠️" },
  { id:"h2",  n:"Cutlass Mora",      faction:"pirates",        rarity:"veteran",  cls:"defender", atk:105, foc:0,   spd:78, icon:"🗡"  },
  { id:"h13", n:"Admiral Brine",     faction:"pirates",        rarity:"soldier",  cls:"leader",   atk:95,  foc:0,   spd:65, icon:"⚓"  },
  { id:"h14", n:"Saltwhisper",       faction:"pirates",        rarity:"soldier",  cls:"support",  atk:55,  foc:110, spd:72, icon:"🪝"  },
  // Marines
  { id:"h3",  n:"Admiral Stonewall", faction:"marines",        rarity:"veteran",  cls:"defender", atk:115, foc:0,   spd:60, icon:"⚓"  },
  { id:"h4",  n:"Sergeant Vael",     faction:"marines",        rarity:"veteran",  cls:"attacker", atk:120, foc:0,   spd:72, icon:"🪖"  },
  { id:"h15", n:"Captain Merrow",    faction:"marines",        rarity:"soldier",  cls:"leader",   atk:88,  foc:0,   spd:62, icon:"🛡"  },
  { id:"h16", n:"Field Medic Asha",  faction:"marines",        rarity:"soldier",  cls:"support",  atk:40,  foc:90,  spd:68, icon:"⛑"  },
  // Bounty Hunters
  { id:"h5",  n:"Solarius Vex",      faction:"bountyhunters",  rarity:"veteran",  cls:"support",  atk:20,  foc:180, spd:62, icon:"🔮"  },
  { id:"h6",  n:"Mira Ashveil",      faction:"bountyhunters",  rarity:"veteran",  cls:"attacker", atk:120, foc:100, spd:70, icon:"✨"  },
  { id:"h17", n:"Runekeeper Dov",    faction:"bountyhunters",  rarity:"soldier",  cls:"leader",   atk:75,  foc:80,  spd:58, icon:"📜"  },
  { id:"h18", n:"Hexblade Oren",     faction:"bountyhunters",  rarity:"soldier",  cls:"defender", atk:90,  foc:60,  spd:55, icon:"🔯"  },
  // MerFolk
  { id:"h7",  n:"Tidalborn Cael",    faction:"merfolk",        rarity:"veteran",  cls:"attacker", atk:135, foc:0,   spd:78, icon:"🌊"  },
  { id:"h8",  n:"Coralspine Nyra",   faction:"merfolk",        rarity:"veteran",  cls:"support",  atk:60,  foc:120, spd:68, icon:"🐚"  },
  { id:"h19", n:"Riptide Kael",      faction:"merfolk",        rarity:"soldier",  cls:"defender", atk:85,  foc:0,   spd:55, icon:"🪸"  },
  { id:"h20", n:"Deepwarden Syla",   faction:"merfolk",        rarity:"soldier",  cls:"leader",   atk:70,  foc:0,   spd:62, icon:"🐠"  },
  // Orcs
  { id:"h9",  n:"Grimtusk",          faction:"orcs",           rarity:"veteran",  cls:"attacker", atk:155, foc:0,   spd:60, icon:"⚔️"  },
  { id:"h10", n:"Ashgrip",           faction:"orcs",           rarity:"veteran",  cls:"defender", atk:115, foc:0,   spd:65, icon:"🪓"  },
  { id:"h21", n:"Warcroak",          faction:"orcs",           rarity:"soldier",  cls:"leader",   atk:80,  foc:0,   spd:58, icon:"🥁"  },
  { id:"h22", n:"Shaman Grix",       faction:"orcs",           rarity:"soldier",  cls:"support",  atk:30,  foc:100, spd:60, icon:"💀"  },
  // Dragons
  { id:"h11", n:"Emberclaw",         faction:"dragons",        rarity:"veteran",  cls:"attacker", atk:155, foc:0,   spd:75, icon:"🐉"  },
  { id:"h12", n:"Scaleveil Dusk",    faction:"dragons",        rarity:"veteran",  cls:"support",  atk:50,  foc:140, spd:80, icon:"🔥"  },
  { id:"h23", n:"Ashen Kraul",       faction:"dragons",        rarity:"soldier",  cls:"leader",   atk:78,  foc:0,   spd:68, icon:"🦎"  },
  { id:"h24", n:"Cinderfang",        faction:"dragons",        rarity:"soldier",  cls:"defender", atk:100, foc:0,   spd:58, icon:"🪨"  },
];

// ── Pull rates & pity ─────────────────────────────────────────────────────────
export const PULL_RATES = { soldier: 0.80, veteran: 0.17, champion: 0.03 };
export const PITY       = { soldier: 20,   veteran: 100,  champion: 300  };
export const PULL_COST  = { x1: 160, x10: 1400 };

export function rollGacha(n, alignFactions, pityCounters = { soldier:0, veteran:0, champion:0 }) {
  const results = [];
  for (let i = 0; i < n; i++) {
    pityCounters.soldier++;
    pityCounters.veteran++;
    pityCounters.champion++;

    let rarity;
    if (pityCounters.champion >= PITY.champion) { rarity = "champion"; pityCounters.champion = 0; }
    else if (pityCounters.veteran >= PITY.veteran) { rarity = "veteran"; pityCounters.veteran = 0; }
    else if (pityCounters.soldier >= PITY.soldier) { rarity = "soldier"; pityCounters.soldier = 0; }
    else {
      const r = Math.random();
      if (r < PULL_RATES.champion) { rarity = "champion"; pityCounters.champion = 0; }
      else if (r < PULL_RATES.champion + PULL_RATES.veteran) { rarity = "veteran"; pityCounters.veteran = 0; }
      else { rarity = "soldier"; pityCounters.soldier = 0; }
    }

    const pool = HDEFS.filter(h => h.rarity === rarity && (alignFactions ? alignFactions.includes(h.faction) : true));
    const src  = pool.length ? pool : HDEFS.filter(h => h.rarity === rarity);
    const picked = src[Math.floor(Math.random() * src.length)];
    results.push({ ...picked, uid: `g${Date.now()}${i}` });
  }
  return results;
}

// ── Stat bumps on promotion ───────────────────────────────────────────────────
const RARITY_MULT = { soldier: 1.0, veteran: 1.25, champion: 1.55 };

export function promotedStats(cmd, toRarity) {
  const m = RARITY_MULT[toRarity];
  return {
    atk: Math.round(cmd.atk * m),
    foc: cmd.foc > 0 ? Math.round(cmd.foc * m) : 0,
  };
}

export function addRespect(cmd, points) {
  const prevLevel = cmd.respectLevel ?? 0;
  const newTotal  = (cmd.respectPoints ?? 0) + points;
  const info      = respectLevelFromPoints(newTotal);
  const levelsGained = Math.max(0, info.level - prevLevel);

  let rarity   = cmd.rarity;
  let statBump = {};
  let promoted = false;

  if (rarity === "soldier" && info.level >= PROMO.soldier.respectRequired) {
    rarity = "veteran";
    statBump = promotedStats(cmd, "veteran");
    promoted = true;
  } else if (rarity === "veteran" && info.level >= PROMO.veteran.respectRequired) {
    rarity = "champion";
    statBump = promotedStats(cmd, "champion");
    promoted = true;
  }

  const newSkillPoints = (cmd.unspentSkillPoints ?? 0) + levelsGained;

  return {
    ...cmd,
    ...statBump,
    rarity,
    respectPoints:      newTotal,
    respectLevel:       info.level,
    unspentSkillPoints: newSkillPoints,
    _justPromoted:      promoted ? rarity : null,
  };
}

// ── Backwards-compat shims ────────────────────────────────────────────────────
export const SC = RC;
export const SS = (rarity) => RARITY[rarity]?.n ?? String(rarity);

export { ALIGNMENT, PLAYABLE_FACTIONS, getFactionAlignment, AI_FACTIONS } from "./factions.js";
// TREE_DISPLAY_NAMES and getTreeDisplayNames are re-exported above from skills.js
