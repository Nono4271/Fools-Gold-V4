/* ─────────────────────────────────────────────────────────────────────────────
   skills.js — V4 Skill System
   Main branch skills: 10 levels each
   Side branch skills: 5 levels each
───────────────────────────────────────────────────────────────────────────── */

// ── Main branch skills (10 levels, 1 point per level) ────────────────────────
export const MAIN_SKILLS = {
  // Combat tree
  crushing_blow: {
    name: "Crushing Blow", icon: "⚔", tree: "combat",
    desc: "Troops deal bonus damage on round 1 of battle.",
    base: 1.05, perLevel: 0.05,
    nextDesc: (lvl) => `Troop damage ×${(1.05 + lvl * 0.05).toFixed(2)} on round 1`,
  },
  blood_frenzy: {
    name: "Blood Frenzy", icon: "🩸", tree: "combat",
    desc: "Troops gain a persistent attack bonus from round 2 onward.",
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.03 + lvl * 0.03) * 100)}% troop attack rounds 2+`,
  },
  double_strike: {
    name: "Double Strike", icon: "⚡", tree: "combat",
    desc: "Your commander strikes with increased force each battle.",
    base: 1.08, perLevel: 0.08,
    nextDesc: (lvl) => `Commander ×${(1.08 + lvl * 0.08).toFixed(2)} damage`,
  },
  killing_edge: {
    name: "Killing Edge", icon: "🗡", tree: "combat",
    desc: "Commander deals a devastating strike on round 5.",
    base: 1.10, perLevel: 0.10,
    nextDesc: (lvl) => `Commander ×${(1.10 + lvl * 0.10).toFixed(2)} damage on round 5`,
  },
  war_shout: {
    name: "War Shout", icon: "📣", tree: "combat",
    desc: "All damage increased at the start of battle for 3 rounds.",
    base: 0.04, perLevel: 0.04,
    nextDesc: (lvl) => `+${Math.round((0.04 + lvl * 0.04) * 100)}% all damage for 3 rounds`,
  },
  // Defense tree
  shield_wall: {
    name: "Shield Wall", icon: "🛡", tree: "defense",
    desc: "Reduces incoming troop damage on round 3.",
    base: 0.04, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.04 + lvl * 0.04) * 100)}% incoming damage on round 3`,
  },
  iron_bastion: {
    name: "Iron Bastion", icon: "🏰", tree: "defense",
    desc: "Reduces all incoming damage for several rounds.",
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.03 + lvl * 0.03) * 100)}% incoming damage for 4 rounds`,
  },
  mending_light: {
    name: "Mending Light", icon: "✨", tree: "defense",
    desc: "Restores lost troops at the start of each round.",
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `Heal ${Math.round((0.02 + lvl * 0.02) * 100)}% lost troops per round`,
  },
  bulwark_stance: {
    name: "Bulwark Stance", icon: "⚜", tree: "defense",
    desc: "Massively reduces damage taken on round 5.",
    base: 0.10, perLevel: 0.05,
    nextDesc: (lvl) => `-${Math.round((0.10 + lvl * 0.05) * 100)}% damage taken on round 5`,
  },
  rally_ranks: {
    name: "Rally Ranks", icon: "🚩", tree: "defense",
    desc: "Recovers a portion of lost troops mid-battle on round 4.",
    base: 0.02, perLevel: 0.015,
    nextDesc: (lvl) => `Restore ${Math.round((0.02 + lvl * 0.015) * 100)}% lost troops on round 4`,
  },
  // Command tree
  forced_march: {
    name: "Forced March", icon: "💨", tree: "command",
    desc: "Troops deal more damage and take less at battle start.",
    base: 1.03, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round(lvl * 0.03 * 100)}% troop attack, -${Math.round(lvl * 0.01 * 100)}% damage taken`,
  },
  warchief_roar: {
    name: "Warchief's Roar", icon: "📡", tree: "command",
    desc: "All friendly units gain an attack bonus for several rounds.",
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `+${Math.round((0.03 + lvl * 0.03) * 100)}% attack for 4 rounds`,
  },
  grand_strategy: {
    name: "Grand Strategy", icon: "🗺", tree: "command",
    desc: "Troops unleash a powerful surge on round 6.",
    base: 1.08, perLevel: 0.08,
    nextDesc: (lvl) => `Troops ×${(1.08 + lvl * 0.08).toFixed(2)} damage on round 6`,
  },
  supply_cut: {
    name: "Supply Cut", icon: "✂", tree: "command",
    desc: "Prevents the enemy from healing for several rounds.",
    base: 1, perLevel: 0.5,
    nextDesc: (lvl) => `Block enemy healing for ${Math.floor(1 + lvl * 0.5)} rounds`,
  },
  siege_protocol: {
    name: "Siege Protocol", icon: "🪨", tree: "command",
    desc: "Troops ignore a portion of garrison fortification bonuses.",
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `Ignore ${Math.round((0.05 + lvl * 0.05) * 100)}% of garrison bonuses`,
  },
  // Tactics tree
  hex_curse: {
    name: "Hex Curse", icon: "🔮", tree: "tactics",
    desc: "Reduces enemy attack for several rounds.",
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `-${Math.round((0.03 + lvl * 0.03) * 100)}% enemy attack for 3 rounds`,
  },
  blind_strike: {
    name: "Blind Strike", icon: "👁", tree: "tactics",
    desc: "Enemy troops miss a portion of their attacks on round 3.",
    base: 0.04, perLevel: 0.04,
    nextDesc: (lvl) => `${Math.round((0.04 + lvl * 0.04) * 100)}% enemy miss chance on round 3`,
  },
  eagle_eye: {
    name: "Eagle Eye", icon: "🦅", tree: "tactics",
    desc: "Chance to score a critical hit for bonus damage.",
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `${Math.round((0.05 + lvl * 0.05) * 100)}% crit chance (+50% dmg)`,
  },
  dark_pact: {
    name: "Dark Pact", icon: "💀", tree: "tactics",
    desc: "Sacrifice a portion of your troops for massive bonus damage.",
    base: 1.30, perLevel: 0.30,
    nextDesc: (lvl) => `Sacrifice 10% troops → ×${(1.30 + lvl * 0.30).toFixed(1)} damage`,
  },
  foresight: {
    name: "Foresight", icon: "🔭", tree: "tactics",
    desc: "Chance to nullify the enemy's active skill on round 5.",
    base: 0.50, perLevel: 0.05,
    nextDesc: (lvl) => `${Math.round((0.50 + lvl * 0.05) * 100)}% chance to nullify enemy skill`,
  },
};

// ── Side branch skills (5 levels each) ───────────────────────────────────────
export const SIDE_SKILLS = {
  mass_assault: {
    name: "Mass Assault", icon: "⚔",
    desc: "Troops strike with increased force on round 3.",
    base: 1.10, perLevel: 0.10,
    nextDesc: (lvl) => `Troops deal ×${(1.10 + lvl * 0.10).toFixed(2)} damage on round 3`,
  },
  serpent_bite: {
    name: "Serpent Bite", icon: "🐍",
    desc: "Commander strikes with extra power on round 3.",
    base: 1.15, perLevel: 0.15,
    nextDesc: (lvl) => `Commander ×${(1.15 + lvl * 0.15).toFixed(2)} damage on round 3`,
  },
  inferno_surge: {
    name: "Inferno Surge", icon: "🔥",
    desc: "Troops unleash a surge of damage on round 4.",
    base: 1.12, perLevel: 0.12,
    nextDesc: (lvl) => `Troops ×${(1.12 + lvl * 0.12).toFixed(2)} damage on round 4`,
  },
  plunder_rush: {
    name: "Plunder Rush", icon: "💰",
    desc: "When winning, troops deal bonus damage.",
    base: 0.07, perLevel: 0.07,
    nextDesc: (lvl) => `+${Math.round((0.07 + lvl * 0.07) * 100)}% damage while winning`,
  },
  ember_shield: {
    name: "Ember Shield", icon: "🔆",
    desc: "Reflects a portion of incoming damage back to the attacker.",
    base: 0.04, perLevel: 0.04,
    nextDesc: (lvl) => `Reflect ${Math.round((0.04 + lvl * 0.04) * 100)}% of incoming damage`,
  },
  lifesteal_wave: {
    name: "Lifesteal Wave", icon: "💚",
    desc: "Troops heal for a portion of the damage they deal.",
    base: 0.06, perLevel: 0.06,
    nextDesc: (lvl) => `Heal ${Math.round((0.06 + lvl * 0.06) * 100)}% of troop damage dealt`,
  },
  coral_ward: {
    name: "Coral Ward", icon: "🪸",
    desc: "Reduces incoming troop damage by a large margin on round 4.",
    base: 0.08, perLevel: 0.08,
    nextDesc: (lvl) => `-${Math.round((0.08 + lvl * 0.08) * 100)}% troop damage taken on round 4`,
  },
  root_bind: {
    name: "Root Bind", icon: "🌿",
    desc: "Slows the enemy, reducing their damage for several rounds.",
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `-${Math.round((0.05 + lvl * 0.05) * 100)}% enemy damage rounds 4-10`,
  },
  terror_aura: {
    name: "Terror Aura", icon: "👻",
    desc: "Reduces enemy morale, cutting their damage for 5 rounds.",
    base: 0.04, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.04 + lvl * 0.04) * 100)}% enemy damage for 5 rounds`,
  },
  phantom_step: {
    name: "Phantom Step", icon: "👤",
    desc: "Chance to dodge incoming attacks on round 5.",
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `${Math.round((0.10 + lvl * 0.10) * 100)}% dodge chance on round 5`,
  },
  void_bolt: {
    name: "Void Bolt", icon: "🌑",
    desc: "Piercing strike ignores a portion of enemy defense.",
    base: 0.08, perLevel: 0.08,
    nextDesc: (lvl) => `Ignore ${Math.round((0.08 + lvl * 0.08) * 100)}% of enemy defense`,
  },
  tide_turn: {
    name: "Tide Turn", icon: "🌊",
    desc: "When losing, troops deal massive bonus damage.",
    base: 0.12, perLevel: 0.12,
    nextDesc: (lvl) => `+${Math.round((0.12 + lvl * 0.12) * 100)}% troop damage while losing`,
  },
  blind_strike_side: {
    name: "Blind Strike", icon: "👁",
    desc: "Enemy troops miss a portion of their attacks.",
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `${Math.round((0.05 + lvl * 0.05) * 100)}% enemy miss chance`,
  },
  hex_curse_side: {
    name: "Hex Curse", icon: "🔮",
    desc: "Reduces enemy attack power.",
    base: 0.04, perLevel: 0.04,
    nextDesc: (lvl) => `-${Math.round((0.04 + lvl * 0.04) * 100)}% enemy attack`,
  },
};

// ── Per-tree skill layout ─────────────────────────────────────────────────────
const TREE_SKILL_MAP = {
  combat:  { main: ["crushing_blow","blood_frenzy","double_strike","killing_edge","war_shout"],     side1: ["mass_assault","serpent_bite","inferno_surge","plunder_rush"],  side2: ["ember_shield","lifesteal_wave","root_bind","terror_aura"]  },
  defense: { main: ["shield_wall","iron_bastion","mending_light","bulwark_stance","rally_ranks"],    side1: ["coral_ward","lifesteal_wave","ember_shield","root_bind"],       side2: ["phantom_step","tide_turn","void_bolt","terror_aura"]       },
  command: { main: ["forced_march","warchief_roar","grand_strategy","supply_cut","siege_protocol"], side1: ["mass_assault","inferno_surge","plunder_rush","serpent_bite"],   side2: ["root_bind","blind_strike_side","hex_curse_side","void_bolt"] },
  tactics: { main: ["hex_curse","blind_strike","eagle_eye","dark_pact","foresight"],               side1: ["phantom_step","tide_turn","void_bolt","terror_aura"],           side2: ["plunder_rush","inferno_surge","mass_assault","serpent_bite"] },
};

export function getBranchMainSkill(tree, branchIndex) {
  const map = TREE_SKILL_MAP[tree] ?? TREE_SKILL_MAP.combat;
  const key = map.main[branchIndex % map.main.length];
  return { key, ...(MAIN_SKILLS[key] ?? {}) };
}

export function getBranchSideSkills(tree, branchIndex) {
  const map = TREE_SKILL_MAP[tree] ?? TREE_SKILL_MAP.combat;
  const k1 = map.side1[branchIndex % map.side1.length];
  const k2 = map.side2[branchIndex % map.side2.length];
  return [
    { key: k1, ...(SIDE_SKILLS[k1] ?? {}) },
    { key: k2, ...(SIDE_SKILLS[k2] ?? {}) },
  ];
}

export function skillValue(skillDef, level) {
  if (!skillDef || level <= 0) return skillDef?.base ?? 0;
  return skillDef.base + skillDef.perLevel * level;
}

// ── Branch display names ──────────────────────────────────────────────────────
export const TREE_DISPLAY_NAMES = {
  pirates_attacker:       ["Reaver's Edge","Blood Wake Arts","Corsair's Fury","Plunder Command"],
  pirates_defender:       ["Boarding Iron","Anchor Hold Arts","Sea Bulwark","Pirate Tactics"],
  pirates_leader:         ["Captain's Banner","Fleet Discipline","Trade Wind Mastery","Smuggler's Arts"],
  pirates_support:        ["Mending Tide","Crew Muster Arts","Healing Wake","Corsair Cunning"],
  marines_attacker:       ["Naval Strike Arts","Shore Assault","Broadside Mastery","Admiral's Tactics"],
  marines_defender:       ["Shield Wall Arts","Iron Discipline","Rampart Mastery","Fleet Tactics"],
  marines_leader:         ["Commander's Banner","Legion Drill","Force March Mastery","Strategic Arts"],
  marines_support:        ["Field Triage Arts","Supply Line","Morale Mastery","Siege Support"],
  bountyhunters_attacker: ["Arcane Strike Arts","Void Mastery","Mana Surge","Elder Tactics"],
  bountyhunters_defender: ["Crystal Ward Arts","Stone Skin","Mana Barrier Mastery","Dispel Arts"],
  bountyhunters_leader:   ["Elder's Banner","Arcane Rally","Ley Walk Mastery","Grand Arcana"],
  bountyhunters_support:  ["Mending Light Arts","Arcane Supply","Restoration Mastery","Seer's Arts"],
  merfolk_attacker:       ["Tidal Strike Arts","Depth Surge","Whirlpool Mastery","Siege Flood Arts"],
  merfolk_defender:       ["Trident Wall Arts","Reef Bastion","Shell Armor Mastery","Undertow Arts"],
  merfolk_leader:         ["Sea King's Banner","Current Command","Tide Council Mastery","Ocean Arts"],
  merfolk_support:        ["Healing Waters Arts","Kelp Line","Mending Current Mastery","Deep Arts"],
  orcs_attacker:          ["Berserker Arts","Blood Frenzy","Orc Smash Mastery","Warchief Tactics"],
  orcs_defender:          ["Skull Guard Arts","Stone Hide","Orc Bastion Mastery","Warcry Arts"],
  orcs_leader:            ["Warlord's Banner","Horde Command","Forced March Mastery","Siege Terror"],
  orcs_support:           ["Shaman Arts","Spirit Ward","Hex Mastery","Blood Tactics"],
  dragons_attacker:       ["Inferno Strike Arts","Claw Rend","Ember Slash Mastery","Dragonfire Arts"],
  dragons_defender:       ["Scale Armor Arts","Flame Ward","Dragon Hide Mastery","Fear Aura Arts"],
  dragons_leader:         ["Draconic Banner","Dragon Council","Wing March Mastery","Elder Arts"],
  dragons_support:        ["Healing Ember Arts","Clutch Line","Ancient Restore Mastery","Hoard Arts"],
};

export function getTreeDisplayNames(faction, cls) {
  const key = `${faction}_${cls}`;
  return TREE_DISPLAY_NAMES[key] ?? ["Branch I","Branch II","Branch III","Legacy Branch"];
}

// ── Backward-compat stubs ─────────────────────────────────────────────────────
export const SKILL_MECHANICS = {};
export const SKILLS = {};
export const SKILL_NAMES = {};
export const FACTION_MAIN_NAMES = {};
export const MAIN_BRANCH_NAMES = {
  combat:  ["Grit","Weapon Mastery","Battle Fury","Iron Resolve","Blood Rush","War Cry","Killing Blow","Unstoppable","Wrath","Supreme Might"],
  defense: ["Fortify","Shield Training","Stalwart","Iron Skin","Hold the Line","Bulwark","Impenetrable","Stone Will","Last Stand","Citadel"],
  command: ["Rally","March Discipline","Vanguard","Supply Lines","Force March","Tactical Advance","Strategic Mind","Grand March","Legion's Pride","War Council"],
  tactics: ["Cunning","Feint","Ambush","Debilitating Strike","Hex","Battle Scheme","Masterstroke","Siege Craft","Shadow Gambit","Grand Tactics"],
};
export function getMainBranchNames() { return []; }
export function getSkillNames()      { return ["Sub I","Sub II"]; }
export function getBranchMechanicKey() { return "crushing_blow"; }
export function getBranchMechanic()    { return { key:"crushing_blow", ...MAIN_SKILLS.crushing_blow }; }
