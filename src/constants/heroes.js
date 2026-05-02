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

// Main branch skill names (10 nodes per tree — named milestones every 2 pts)
export const MAIN_BRANCH_NAMES = {
  combat:  ["Grit","Weapon Mastery","Battle Fury","Iron Resolve","Blood Rush","War Cry","Killing Blow","Unstoppable","Wrath","Supreme Might"],
  defense: ["Fortify","Shield Training","Stalwart","Iron Skin","Hold the Line","Bulwark","Impenetrable","Stone Will","Last Stand","Citadel"],
  command: ["Rally","March Discipline","Vanguard","Supply Lines","Force March","Tactical Advance","Strategic Mind","Grand March","Legion's Pride","War Council"],
  tactics: ["Cunning","Feint","Ambush","Debilitating Strike","Hex","Battle Scheme","Masterstroke","Siege Craft","Shadow Gambit","Grand Tactics"],
};

// Flavored skill names by faction_class (sub-branches)
export const SKILL_NAMES = {
  pirates_attacker: { combat:["Sea Reaver","Plunder Strike","Blood Wake"],         defense:["Iron Hull","Tar Barricade","Storm Guard"],       command:["Corsair Banner","Pack Marauder","Tide March"],   tactics:["Ambush Cove","Pirate's Gambit","Broadside Mastery"] },
  pirates_defender: { combat:["Cutlass Wall","Boarding Surge","Cannon Volley"],    defense:["Reinforced Deck","Sea Bulwark","Anchor Hold"],   command:["Crew Command","Fleet Discipline","Fog March"],   tactics:["Smuggler's Trick","Harbor Feint","Siege Breach"]    },
  pirates_leader:   { combat:["Captain's Blade","Raid Strike","Wave Crusher"],     defense:["Iron Rigging","Storm Shield","Deep Keel"],       command:["Admiral's Banner","Fleet Rally","Trade Winds"],  tactics:["Privateer Gambit","Fog of War","Plunder Mastery"]   },
  pirates_support:  { combat:["Grapple Strike","Scallywag Rush","Wake Slash"],     defense:["Rope Ward","Tide Armor","Salt Skin"],            command:["Muster Crew","First Mate's Call","Drift Step"],  tactics:["Mending Tide","Rum Tonic","Healing Wake"]           },
  marines_attacker: { combat:["Naval Strike","Shore Assault","Broadside Blast"],   defense:["Deck Plating","Bulkhead Guard","Wave Break"],    command:["Officer's Order","March Drill","Combat Stride"], tactics:["Flanking Run","Admiral's Gambit","Siege Protocol"]  },
  marines_defender: { combat:["Shield Bash","Formation Strike","Rank Fire"],       defense:["Shield Wall","Rampart Hold","Iron Discipline"],  command:["Standard Bearer","Drill Sergeant","Iron March"], tactics:["Tactical Retreat","Parry Mastery","Fort Breaker"]   },
  marines_leader:   { combat:["Commander's Strike","Naval Volley","Order Fire"],   defense:["Fortify Lines","Defensive Post","Aegis Hold"],   command:["Command Deck","Legion Banner","Force March"],    tactics:["Fleet Tactics","Coordinated Strike","Siege Orders"] },
  marines_support:  { combat:["Salvo Shot","Covering Fire","Barrage"],             defense:["Field Dressing","Medic Shield","Guard Post"],    command:["Logistics Order","Supply Line","Rally Step"],    tactics:["Field Triage","Morale Boost","Support Protocol"]    },
  bountyhunters_attacker: { combat:["Arcane Strike","Void Bolt","Mana Surge"],     defense:["Arcane Ward","Spell Shield","Ethereal Guard"],   command:["Arcane Banner","Rune March","Ley Walk"],         tactics:["Arcane Tempest","Wizard's Gambit","Siege Glyph"]    },
  bountyhunters_defender: { combat:["Force Push","Crystal Lance","Prism Burst"],   defense:["Stone Skin","Mana Barrier","Crystal Ward"],      command:["Arcane Order","Ley Line Pull","Shimmer Step"],   tactics:["Dispel Field","Counter Hex","Barrier Mastery"]      },
  bountyhunters_leader:   { combat:["Elder Strike","Arcane Bolt","Staff Smite"],   defense:["Ward Barrier","Ancient Seal","Runic Hold"],      command:["Wizard's Council","Arcane Rally","Astral March"],tactics:["Grand Arcana","Seer's Gambit","Ley Mastery"]        },
  bountyhunters_support:  { combat:["Magic Missile","Hex Bolt","Arcane Dart"],     defense:["Mend Ward","Healing Rune","Restore Glyph"],      command:["Familiar Call","Arcane Supply","Blink Step"],    tactics:["Mending Light","Arcane Remedy","Restoration"]       },
  merfolk_attacker: { combat:["Tidal Strike","Whirlpool Slash","Depth Surge"],     defense:["Coral Guard","Tidal Shell","Sea Skin"],          command:["Current Banner","Tide March","Deep Stride"],     tactics:["Tidal Wave","Merfolk's Gambit","Siege Flood"]       },
  merfolk_defender: { combat:["Trident Wall","Coral Barricade","Depth Bash"],      defense:["Shell Armor","Reef Bastion","Pearl Ward"],       command:["School Leader","Stream Order","Drift March"],    tactics:["Root Bind","Undertow","Siege Reef"]                 },
  merfolk_leader:   { combat:["Sea King's Strike","Tsunami Blow","Leviathan Fang"],defense:["Ancient Coral","Abyssal Shield","Deep Ward"],    command:["Abyssal Banner","Tide Council","Current Rush"],  tactics:["Depth Charge","Ocean Gambit","Siege Torrent"]       },
  merfolk_support:  { combat:["Bubble Burst","Water Whip","Spray Shot"],           defense:["Healing Waters","Brine Shield","Mist Guard"],    command:["Shoal Signal","Kelp Line","Swift Current"],      tactics:["Mending Current","Brine Tonic","Deep Restore"]      },
  orcs_attacker:    { combat:["Orc Smash","Berserker Rage","Blood Frenzy"],        defense:["Iron Hide","War Drum","Fortress Skin"],          command:["War Banner","Pack Leader","Iron March"],         tactics:["Ambush","Warchief's Gambit","Siege Mastery"]        },
  orcs_defender:    { combat:["Skull Crush","Bone Breaker","Tusk Gore"],           defense:["Warboss Guard","Stone Hide","Orc Bastion"],      command:["Warchief's Call","Mob Leader","Stomp March"],    tactics:["Warcry Hex","Dirty Trick","Rampart Smash"]          },
  orcs_leader:      { combat:["Warlord Strike","Cleave","Battle Fury"],            defense:["Warchief's Hide","Siege Bone","Iron Will"],      command:["Warlord Banner","Horde Leader","Forced March"],  tactics:["Warlord's Gambit","Fear Strike","Siege Terror"]     },
  orcs_support:     { combat:["Shaman Bolt","Hex Strike","Curse Slam"],            defense:["Spirit Ward","Bone Guard","Shaman Shield"],      command:["Totem Call","Spirit Line","Shaman Step"],        tactics:["Blood Hex","Curse Mend","Spirit Restore"]           },
  dragons_attacker: { combat:["Inferno Strike","Claw Rend","Ember Slash"],         defense:["Scale Armor","Flame Ward","Dragon Hide"],        command:["Draconic Banner","Wing March","Fire Step"],       tactics:["Breath Weapon","Dragon's Gambit","Siege Inferno"]   },
  dragons_defender: { combat:["Tail Whip","Wing Bash","Claw Crush"],               defense:["Dragonsteel Guard","Ember Ward","Wyrm Bastion"], command:["Dragon Lord Order","Clutch Leader","Sky March"],  tactics:["Fear Aura","Dragon Wall","Siege Crush"]             },
  dragons_leader:   { combat:["Dragon King Strike","Ancient Claw","Wrath Flame"],  defense:["Ancient Scale","Elder Guard","Lore Shield"],     command:["Ancient Banner","Dragon Council","Lore March"],  tactics:["Elder's Gambit","Draconic Will","Siege Dominance"]  },
  dragons_support:  { combat:["Ember Bolt","Smoke Whip","Ash Dart"],               defense:["Healing Flame","Ember Shield","Smoke Guard"],    command:["Hoard Signal","Clutch Line","Swift Wing"],        tactics:["Mending Ember","Flame Tonic","Ancient Restore"]     },
};

export function getSkillNames(faction, cls, tree) {
  const key = `${faction}_${cls}`;
  return SKILL_NAMES[key]?.[tree] ?? [`${tree} Strike`, `${tree} Guard`, `${tree} Mastery`];
}

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

// ── Flavored tree display names (4 per commander, matching faction+class) ─────
// Format: [branch1Name, branch2Name, branch3Name (R3), secondaryTreeName (R5)]
// Branch 1 & 2 unlock at R0, branch 3 at R3, secondary at R5
export const TREE_DISPLAY_NAMES = {
  // ── Pirates ──
  pirates_attacker: ["Reaver's Edge", "Plunder Arts", "Blood Wake Mastery", "Corsair's Command"],
  pirates_defender: ["Boarding Wall", "Iron Deck", "Anchor Hold Mastery", "Pirate Tactics"],
  pirates_leader:   ["Captain's Banner", "Fleet Discipline", "Trade Wind Mastery", "Smuggler's Tactics"],
  pirates_support:  ["Mending Tide", "Crew Muster", "Healing Wake Mastery", "Corsair Command"],
  // ── Marines ──
  marines_attacker: ["Naval Strike Arts", "Shore Assault", "Broadside Mastery", "Admiral's Tactics"],
  marines_defender: ["Shield Wall Arts", "Iron Discipline", "Rampart Mastery", "Fleet Tactics"],
  marines_leader:   ["Commander's Banner", "Legion Drill", "Force March Mastery", "Strategic Tactics"],
  marines_support:  ["Field Triage Arts", "Supply Line", "Morale Mastery", "Siege Tactics"],
  // ── Bounty Hunters ──
  bountyhunters_attacker: ["Arcane Strike Arts", "Void Arts", "Mana Surge Mastery", "Elder Tactics"],
  bountyhunters_defender: ["Crystal Ward Arts", "Stone Skin", "Mana Barrier Mastery", "Dispel Tactics"],
  bountyhunters_leader:   ["Elder's Banner", "Arcane Rally", "Ley Walk Mastery", "Grand Arcana Tactics"],
  bountyhunters_support:  ["Mending Light Arts", "Arcane Supply", "Restoration Mastery", "Seer's Tactics"],
  // ── Merfolk ──
  merfolk_attacker: ["Tidal Strike Arts", "Depth Surge", "Whirlpool Mastery", "Siege Flood Tactics"],
  merfolk_defender: ["Trident Wall Arts", "Reef Bastion", "Shell Armor Mastery", "Undertow Tactics"],
  merfolk_leader:   ["Sea King's Banner", "Current Command", "Tide Council Mastery", "Ocean Tactics"],
  merfolk_support:  ["Healing Waters Arts", "Kelp Line", "Mending Current Mastery", "Deep Restore Tactics"],
  // ── Orcs ──
  orcs_attacker:    ["Berserker Arts", "Orc Smash", "Blood Frenzy Mastery", "Warchief Tactics"],
  orcs_defender:    ["Skull Guard Arts", "Stone Hide", "Orc Bastion Mastery", "Warcry Tactics"],
  orcs_leader:      ["Warlord's Banner", "Horde Command", "Forced March Mastery", "Siege Terror Tactics"],
  orcs_support:     ["Shaman Arts", "Spirit Ward", "Hex Mastery", "Blood Tactics"],
  // ── Dragons ──
  dragons_attacker: ["Inferno Strike Arts", "Claw Rend", "Ember Slash Mastery", "Dragonfire Tactics"],
  dragons_defender: ["Scale Armor Arts", "Flame Ward", "Dragon Hide Mastery", "Fear Aura Tactics"],
  dragons_leader:   ["Draconic Banner", "Dragon Council", "Wing March Mastery", "Elder Tactics"],
  dragons_support:  ["Healing Ember Arts", "Clutch Line", "Ancient Restore Mastery", "Hoard Tactics"],
};

export function getTreeDisplayNames(faction, cls) {
  const key = `${faction}_${cls}`;
  return TREE_DISPLAY_NAMES[key] ?? ["Branch I", "Branch II", "Branch III", "Secondary Branch"];
}
