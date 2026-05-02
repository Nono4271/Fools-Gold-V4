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
  leader:   { n: "Leader",   icon: "⚑",  bonus: "Extra command capacity (+20% troop cap)",    synergy: "Command tree"  },
  attacker: { n: "Attacker", icon: "⚔",  bonus: "Extra might (+15% attack power)",             synergy: "Combat tree"   },
  support:  { n: "Support",  icon: "✦",  bonus: "Extra skill points (+5 bonus pool at Lv25)",  synergy: "Tactics tree"  },
  defender: { n: "Defender", icon: "🛡", bonus: "Extra garrison strength (+20% tile defense)", synergy: "Defense tree"  },
};

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

// Flavored skill names by faction_class
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
// rarity: soldier/veteran/champion (replaces star)
// cls: leader/attacker/support/defender (new)
// respectPoints: 0, respectLevel: 0 (new — starts at R0 regardless of rarity)

export const HDEFS = [
  // Pirates
  { id:"h1",  n:"Redwake Fynn",      faction:"pirates",        rarity:"champion", cls:"attacker", atk:185, foc:0,   spd:88, icon:"🏴‍☠️" },
  { id:"h2",  n:"Cutlass Mora",      faction:"pirates",        rarity:"veteran",  cls:"defender", atk:130, foc:0,   spd:78, icon:"🗡"  },
  { id:"h13", n:"Admiral Brine",     faction:"pirates",        rarity:"soldier",  cls:"leader",   atk:95,  foc:0,   spd:65, icon:"⚓"  },
  { id:"h14", n:"Saltwhisper",       faction:"pirates",        rarity:"soldier",  cls:"support",  atk:55,  foc:110, spd:72, icon:"🪝"  },
  // Marines
  { id:"h3",  n:"Admiral Stonewall", faction:"marines",        rarity:"champion", cls:"defender", atk:145, foc:0,   spd:60, icon:"⚓"  },
  { id:"h4",  n:"Sergeant Vael",     faction:"marines",        rarity:"veteran",  cls:"attacker", atk:140, foc:0,   spd:72, icon:"🪖"  },
  { id:"h15", n:"Captain Merrow",    faction:"marines",        rarity:"soldier",  cls:"leader",   atk:88,  foc:0,   spd:62, icon:"🛡"  },
  { id:"h16", n:"Field Medic Asha",  faction:"marines",        rarity:"soldier",  cls:"support",  atk:40,  foc:90,  spd:68, icon:"⛑"  },
  // Wizards
  { id:"h5",  n:"Solarius Vex",      faction:"bountyhunters",  rarity:"champion", cls:"support",  atk:20,  foc:230, spd:62, icon:"🔮"  },
  { id:"h6",  n:"Mira Ashveil",      faction:"bountyhunters",  rarity:"veteran",  cls:"attacker", atk:120, foc:150, spd:70, icon:"✨"  },
  { id:"h17", n:"Runekeeper Dov",    faction:"bountyhunters",  rarity:"soldier",  cls:"leader",   atk:75,  foc:80,  spd:58, icon:"📜"  },
  { id:"h18", n:"Hexblade Oren",     faction:"bountyhunters",  rarity:"soldier",  cls:"defender", atk:90,  foc:60,  spd:55, icon:"🔯"  },
  // MerFolk
  { id:"h7",  n:"Tidalborn Cael",    faction:"merfolk",        rarity:"champion", cls:"attacker", atk:165, foc:0,   spd:78, icon:"🌊"  },
  { id:"h8",  n:"Coralspine Nyra",   faction:"merfolk",        rarity:"veteran",  cls:"support",  atk:60,  foc:120, spd:68, icon:"🐚"  },
  { id:"h19", n:"Riptide Kael",      faction:"merfolk",        rarity:"soldier",  cls:"defender", atk:85,  foc:0,   spd:55, icon:"🪸"  },
  { id:"h20", n:"Deepwarden Syla",   faction:"merfolk",        rarity:"soldier",  cls:"leader",   atk:70,  foc:0,   spd:62, icon:"🐠"  },
  // Orcs
  { id:"h9",  n:"Grimtusk",          faction:"orcs",           rarity:"champion", cls:"attacker", atk:200, foc:0,   spd:60, icon:"⚔️"  },
  { id:"h10", n:"Ashgrip",           faction:"orcs",           rarity:"veteran",  cls:"defender", atk:135, foc:0,   spd:65, icon:"🪓"  },
  { id:"h21", n:"Warcroak",          faction:"orcs",           rarity:"soldier",  cls:"leader",   atk:80,  foc:0,   spd:58, icon:"🥁"  },
  { id:"h22", n:"Shaman Grix",       faction:"orcs",           rarity:"soldier",  cls:"support",  atk:30,  foc:100, spd:60, icon:"💀"  },
  // Dragons
  { id:"h11", n:"Emberclaw",         faction:"dragons",        rarity:"champion", cls:"attacker", atk:195, foc:0,   spd:75, icon:"🐉"  },
  { id:"h12", n:"Scaleveil Dusk",    faction:"dragons",        rarity:"veteran",  cls:"support",  atk:50,  foc:140, spd:80, icon:"🔥"  },
  { id:"h23", n:"Ashen Kraul",       faction:"dragons",        rarity:"soldier",  cls:"leader",   atk:78,  foc:0,   spd:68, icon:"🦎"  },
  { id:"h24", n:"Cinderfang",        faction:"dragons",        rarity:"soldier",  cls:"defender", atk:100, foc:0,   spd:58, icon:"🪨"  },
];

// ── Pull rates & pity ─────────────────────────────────────────────────────────
export const PULL_RATES = { soldier: 0.85, veteran: 0.12, champion: 0.03 };
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

  // +1 skill point per respect level gained (doc §4.3)
  const newSkillPoints = (cmd.unspentSkillPoints ?? 0) + levelsGained;

  return {
    ...cmd,
    ...statBump,
    rarity,
    respectPoints:      newTotal,
    respectLevel:       info.level,
    unspentSkillPoints: newSkillPoints,
    _justPromoted:      promoted ? rarity : null,   // consumed by Game.jsx for floaty
  };
}

// ── Backwards-compat shims ────────────────────────────────────────────────────
// SC used to take a star number — now takes a rarity string
export const SC = RC;
// SS used to return star glyphs — now returns rarity label
export const SS = (rarity) => RARITY[rarity]?.n ?? String(rarity);

export { ALIGNMENT, PLAYABLE_FACTIONS, getFactionAlignment, AI_FACTIONS } from "./factions.js";
