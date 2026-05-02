/* ─────────────────────────────────────────────────────────────────────────────
   skills.js — All skill mechanics + per-faction/class unique naming
   ~50% of total skill entries have mechanically distinct effects.
   Branch names, main-node names, and sub-branch names are all unique
   per faction × class combination.
───────────────────────────────────────────────────────────────────────────── */

// ── Core mechanics pool ───────────────────────────────────────────────────────
export const SKILL_MECHANICS = {
  crushing_blow:    { round:1,  desc:"Crushing blow — troops deal 40% bonus damage this round.",              troopMult:1.40, cmdMult:1.0   },
  blood_frenzy:     { round:2,  desc:"Battle frenzy — troops deal 25% bonus damage rounds 2-10.",             troopBuff:0.25, cmdMult:1.0   },
  rend_armor:       { round:3,  desc:"Rend armor — troops deal 30% bonus damage this round.",                 troopMult:1.30, cmdMult:1.0   },
  double_strike:    { round:2,  desc:"Double strike — commander strikes twice this round.",                   cmdHits:2,      troopMult:1.0 },
  anchor_blow:      { round:6,  desc:"Powerful blow — commander deals 60% bonus damage.",                    cmdMult:1.60,   troopMult:1.0 },
  killing_edge:     { round:5,  desc:"Killing edge — commander deals 80% bonus damage this round.",          cmdMult:1.80,   troopMult:1.0 },
  mass_assault:     { round:3,  desc:"Mass assault — troops attack twice this round.",                       troopHits:2,    cmdMult:1.0   },
  arcane_burst:     { round:2,  desc:"Arcane burst — magical damage hits all enemies for 35% bonus.",        troopMult:1.35, cmdMult:1.1   },
  inferno_surge:    { round:4,  desc:"Inferno surge — troops deal 50% bonus damage this round.",             troopMult:1.50, cmdMult:1.0   },
  tide_crash:       { round:1,  desc:"Tidal crash — troops deal 45% bonus damage this round.",               troopMult:1.45, cmdMult:1.0   },
  war_shout:        { round:1,  desc:"War shout — all damage increased by 20% for 3 rounds.",                troopBuff:0.20, cmdMult:1.0   },
  serpent_bite:     { round:3,  desc:"Serpent bite — commander strikes three times this round.",              cmdHits:3,      troopMult:1.0 },
  shield_wall:      { round:3,  desc:"Shield wall — reduces incoming damage by 35% this round.",             defBuff:0.35,   cmdMult:1.0   },
  iron_bastion:     { round:2,  desc:"Iron bastion — reduces all incoming damage by 25% for 4 rounds.",      defBuff:0.25,   cmdMult:1.0   },
  rally_ranks:      { round:4,  desc:"Rally ranks — restores 15% of lost troops this round.",                healPct:0.15,   cmdMult:1.0   },
  mending_light:    { round:1,  desc:"Mending light — restores 20% of lost troop HP each round.",            healPct:0.20,   cmdMult:1.0   },
  soul_drain:       { round:1,  desc:"Soul drain — heals commander HP equal to damage dealt.",               cmdMult:1.20,   drain:true    },
  bulwark_stance:   { round:5,  desc:"Bulwark stance — immune to all damage this round.",                    immuneRound:true,cmdMult:1.0  },
  lifesteal_wave:   { round:3,  desc:"Lifesteal wave — troops heal for 30% of damage dealt.",                troopMult:1.0,  troopDrain:0.30 },
  ember_shield:     { round:2,  desc:"Ember shield — reflects 20% of incoming damage back to the attacker.", reflect:0.20,   defBuff:0.15  },
  coral_ward:       { round:4,  desc:"Coral ward — reduces incoming troop damage by 40% this round.",        defBuff:0.40,   cmdMult:1.0   },
  root_bind:        { round:4,  desc:"Root bind — slows enemy, reducing their damage by 25% rounds 4-10.",   rootDebuff:0.25              },
  void_bolt:        { round:5,  desc:"Void bolt — piercing strike ignores 50% of enemy defense.",            pierce:0.50,    troopMult:1.0 },
  foresight:        { round:5,  desc:"Foresight — nullifies enemy skill effect this round.",                 nullifyEnemy:true            },
  hex_curse:        { round:2,  desc:"Hex curse — reduces enemy attack by 30% for 3 rounds.",               enemyAtkDebuff:0.30          },
  blind_strike:     { round:3,  desc:"Blind strike — enemy misses 40% of attacks this round.",              enemyMissChance:0.40         },
  terror_aura:      { round:1,  desc:"Terror aura — reduces enemy morale, cutting their damage by 20% for 5 rounds.", enemyAtkDebuff:0.20 },
  undertow:         { round:4,  desc:"Undertow — enemy troop speed halved, damage reduced 30% for 3 rounds.", rootDebuff:0.30            },
  dispel_field:     { round:3,  desc:"Dispel field — removes all active enemy buffs this round.",            dispelEnemy:true             },
  phantom_step:     { round:5,  desc:"Phantom step — dodge all incoming attacks this round.",                dodge:true,     cmdMult:1.0  },
  blood_hex:        { round:2,  desc:"Blood hex — enemy bleeds for 15% HP loss per round for 4 rounds.",    bleedDot:0.15                },
  eagle_eye:        { round:2,  desc:"Eagle eye — 50% chance to score a critical hit (+50% dmg).",          crit:0.50,      troopMult:1.0 },
  shadow_clone:     { round:3,  desc:"Shadow clone — troops attack twice this round.",                       troopHits:2,    cmdMult:1.0  },
  siege_protocol:   { round:6,  desc:"Siege protocol — ignores all garrison bonuses this round.",            ignoreFort:true, troopMult:1.20 },
  forced_march:     { round:1,  desc:"Forced march — troops deal 20% more damage and take 10% less.",        troopMult:1.20, defBuff:0.10 },
  plunder_rush:     { round:2,  desc:"Plunder rush — if winning, troops deal 35% extra damage.",             conditionalWin:0.35          },
  dark_pact:        { round:4,  desc:"Dark pact — sacrifice 10% of own troops to deal triple damage.",       sacrifice:0.10, troopMult:3.0 },
  tide_turn:        { round:5,  desc:"Tide turn — if losing, troops deal 60% bonus damage.",                 conditionalLose:0.60         },
  warchief_roar:    { round:3,  desc:"Warchief roar — all friendly units gain +25% attack for 4 rounds.",   troopBuff:0.25, cmdMult:1.15 },
  supply_cut:       { round:4,  desc:"Supply cut — enemy cannot heal for 3 rounds.",                        blockHeal:true,  troopMult:1.10 },
  grand_strategy:   { round:6,  desc:"Grand strategy — troops deal 70% bonus damage this round.",           troopMult:1.70, cmdMult:1.0  },
};

export const SKILLS = SKILL_MECHANICS;

// ── Per-faction/class sub-branch label pairs ──────────────────────────────────
export const SKILL_NAMES = {
  pirates_attacker: { combat:["Sea Reaver's Edge","Blood Wake Drive"],        defense:["Tar Barricade Hold","Storm Iron Guard"],       command:["Corsair Pack Banner","Plunder Tide March"],   tactics:["Ambush Cove Strike","Broadside Gambit"]       },
  pirates_defender: { combat:["Cutlass Wall Surge","Cannon Boarding Volley"], defense:["Reinforced Deck Plating","Anchor Sea Bulwark"], command:["Crew Fog Discipline","Fleet Shadow March"],   tactics:["Smuggler's Harbor Feint","Siege Breach Trick"] },
  pirates_leader:   { combat:["Captain's Raid Blade","Wave Crusher Strike"],  defense:["Iron Rigging Deep Keel","Storm Shield Hold"],   command:["Admiral's Fleet Rally","Trade Wind Advance"], tactics:["Privateer Fog Gambit","Plunder War Mastery"]   },
  pirates_support:  { combat:["Grapple Scallywag Rush","Wake Slash Frenzy"],  defense:["Rope Tide Ward","Salt Skin Shield"],            command:["First Mate's Muster","Drift Step Signal"],    tactics:["Mending Rum Tide","Healing Wake Tonic"]        },

  marines_attacker: { combat:["Naval Shore Assault","Broadside Blast Drive"],   defense:["Bulkhead Deck Guard","Wave Break Plating"],      command:["Officer's Combat Stride","March Drill Advance"],  tactics:["Flanking Admiral's Run","Siege Protocol Order"]  },
  marines_defender: { combat:["Shield Bash Formation","Rank Fire Surge"],       defense:["Rampart Iron Discipline","Shield Hold Wall"],    command:["Standard Drill Bearer","Iron Parade March"],      tactics:["Parry Tactical Mastery","Fort Breaker Retreat"]  },
  marines_leader:   { combat:["Commander's Naval Volley","Order Fire Strike"],  defense:["Fortify Aegis Lines","Defensive Post Hold"],     command:["Command Legion Deck","Force Banner March"],       tactics:["Coordinated Fleet Strike","Siege Order Advance"] },
  marines_support:  { combat:["Salvo Covering Fire","Barrage Shot Wave"],       defense:["Field Dressing Guard","Medic Post Shield"],      command:["Logistics Supply Order","Rally Step Line"],       tactics:["Field Triage Protocol","Morale Support Boost"]   },

  bountyhunters_attacker: { combat:["Arcane Void Strike","Mana Surge Bolt"],   defense:["Arcane Spell Ward","Ethereal Rune Guard"],  command:["Arcane Ley Banner","Rune March Walk"],       tactics:["Arcane Tempest Gambit","Siege Glyph Protocol"] },
  bountyhunters_defender: { combat:["Crystal Force Lance","Prism Burst Push"], defense:["Stone Mana Barrier","Crystal Rune Ward"],   command:["Arcane Ley Order","Shimmer Blink Step"],     tactics:["Dispel Counter Field","Barrier Hex Mastery"]   },
  bountyhunters_leader:   { combat:["Elder Arcane Bolt","Staff Runic Smite"],  defense:["Ancient Ward Seal","Runic Hold Barrier"],   command:["Wizard's Arcane Council","Astral Rally March"], tactics:["Grand Seer's Arcana","Ley Line Mastery"]      },
  bountyhunters_support:  { combat:["Magic Hex Missile","Arcane Dart Bolt"],   defense:["Mend Healing Rune","Restore Ward Glyph"],   command:["Familiar Arcane Call","Blink Supply Step"],  tactics:["Mending Arcane Light","Restoration Remedy"]    },

  merfolk_attacker: { combat:["Tidal Depth Surge","Whirlpool Slash Drive"],   defense:["Coral Sea Guard","Tidal Shell Skin"],        command:["Current Deep Banner","Tide Stride March"],    tactics:["Merfolk Tidal Gambit","Siege Flood Wave"]      },
  merfolk_defender: { combat:["Trident Coral Bash","Depth Barricade Wall"],   defense:["Shell Reef Armor","Pearl Bastion Ward"],     command:["School Stream Order","Drift Current March"],  tactics:["Undertow Root Bind","Siege Reef Strike"]       },
  merfolk_leader:   { combat:["Sea King Tsunami Blow","Leviathan Tide Fang"], defense:["Ancient Abyssal Coral","Deep Shield Ward"],  command:["Abyssal Current Banner","Tide Council Rush"], tactics:["Ocean Depth Gambit","Siege Torrent Charge"]    },
  merfolk_support:  { combat:["Bubble Water Burst","Spray Whip Shot"],        defense:["Healing Brine Waters","Mist Guard Shield"],  command:["Shoal Kelp Signal","Swift Current Step"],     tactics:["Mending Brine Current","Deep Restore Tonic"]   },

  orcs_attacker: { combat:["Berserker Blood Rage","Orc Smash Frenzy"],        defense:["War Drum Iron Hide","Fortress Skin Guard"],    command:["War Pack Banner","Iron Leader March"],           tactics:["Ambush Warchief Gambit","Siege Mastery Terror"] },
  orcs_defender: { combat:["Skull Bone Crusher","Tusk Gore Smash"],           defense:["Warboss Stone Guard","Orc Iron Bastion"],      command:["Warchief Mob Leader","Stomp Forced March"],      tactics:["Warcry Dirty Hex","Rampart Smash Trick"]        },
  orcs_leader:   { combat:["Warlord Battle Cleave","Horde Fury Strike"],      defense:["Warchief Siege Bone","Iron Will Hide"],        command:["Warlord Horde Banner","Forced War March"],       tactics:["Fear Strike Gambit","Siege Terror Will"]        },
  orcs_support:  { combat:["Shaman Hex Bolt","Curse Slam Strike"],            defense:["Spirit Bone Ward","Shaman Totem Shield"],      command:["Totem Spirit Call","Shaman Step Line"],          tactics:["Blood Curse Hex","Spirit Restore Mend"]         },

  dragons_attacker: { combat:["Inferno Claw Rend","Ember Slash Surge"],          defense:["Scale Flame Ward","Dragon Ember Hide"],          command:["Draconic Wing Banner","Fire Step March"],         tactics:["Breath Dragon Gambit","Siege Inferno Protocol"]   },
  dragons_defender: { combat:["Tail Wing Bash","Claw Wyrm Crush"],               defense:["Dragonsteel Ember Ward","Wyrm Dragon Bastion"],  command:["Dragon Lord Clutch Order","Sky Wing March"],      tactics:["Fear Dragon Wall","Siege Crush Aura"]             },
  dragons_leader:   { combat:["Dragon King Ancient Claw","Wrath Elder Flame"],   defense:["Ancient Elder Scale","Lore Dragon Shield"],      command:["Ancient Lore Banner","Dragon Elder Council"],     tactics:["Elder Draconic Gambit","Siege Lore Dominance"]    },
  dragons_support:  { combat:["Ember Smoke Bolt","Ash Dart Whip"],               defense:["Healing Ancient Flame","Smoke Ember Guard"],     command:["Hoard Clutch Signal","Swift Ash Wing"],           tactics:["Mending Ancient Ember","Flame Restore Tonic"]     },
};

export function getSkillNames(faction, cls, tree) {
  const key = `${faction}_${cls}`;
  return SKILL_NAMES[key]?.[tree] ?? [`${tree} Sub I`, `${tree} Sub II`];
}

// ── Per-faction/class main branch node names (10 per tree key) ───────────────
export const MAIN_BRANCH_NAMES = {
  combat:  ["Grit","Weapon Mastery","Battle Fury","Iron Resolve","Blood Rush","War Cry","Killing Blow","Unstoppable","Wrath","Supreme Might"],
  defense: ["Fortify","Shield Training","Stalwart","Iron Skin","Hold the Line","Bulwark","Impenetrable","Stone Will","Last Stand","Citadel"],
  command: ["Rally","March Discipline","Vanguard","Supply Lines","Force March","Tactical Advance","Strategic Mind","Grand March","Legion's Pride","War Council"],
  tactics: ["Cunning","Feint","Ambush","Debilitating Strike","Hex","Battle Scheme","Masterstroke","Siege Craft","Shadow Gambit","Grand Tactics"],
};

export const FACTION_MAIN_NAMES = {
  pirates_attacker: { combat:  ["Sea Legs","Cutlass Form","Reaver's Edge","Wave Rider","Corsair Rush","Blood Sea","Plunder Strike","Storm Fury","Scourge Tide","Pirate's Wrath"]                  },
  pirates_defender: { defense: ["Sea Brace","Deck Plating","Anchor Hold","Iron Hull","Boarding Wall","Sea Bastion","Storm Guard","Corsair Keep","Tidal Fortress","Pirate Citadel"]                  },
  pirates_leader:   { command: ["Crew Muster","Flag Bearer","Trade Route","Fleet Signal","Fog Cover","Admiral's Eye","Tide Command","War Fleet","Corsair's Pride","Fleet Sovereign"]                },
  pirates_support:  { tactics: ["Salt Trick","Rum Tonic","Mending Wake","Sea Hex","Tide Mend","Brine Cure","Wave Remedy","Salt Restore","Healing Tide","Sea's Embrace"]                             },

  marines_attacker: { combat:  ["Drill Form","Bayonet Charge","Naval Assault","Volley Fire","Shock Troop","Advance Guard","Officer's Push","Combat Stride","Line Breaker","Naval Supremacy"]        },
  marines_defender: { defense: ["Shield Brace","Rank Hold","Formation Guard","Bulkhead","Iron Discipline","Rampart Wall","Siege Resist","Iron Bastion","Stone Formation","Marine Citadel"]           },
  marines_leader:   { command: ["Parade Order","Standard Bearer","March Drill","Force Deploy","Tactical Rally","Combat Logistics","Legion Order","Grand Drill","Admiral's Banner","Naval Command"]   },
  marines_support:  { tactics: ["Field Stitch","Triage Kit","Morale Patch","Cover Fire","Medic Rush","Supply Aid","Guard Post","Resupply","Logistic Mend","Field Command"]                          },

  bountyhunters_attacker: { combat:  ["Hex Blade","Arcane Slash","Void Step","Mana Edge","Rune Strike","Arcane Fury","Ley Blade","Elder Force","Arcane Surge","Grand Hexblade"]                    },
  bountyhunters_defender: { defense: ["Crystal Skin","Mana Ward","Arcane Shell","Stone Barrier","Rune Plate","Ethereal Guard","Spell Bastion","Arcane Keep","Ancient Ward","Grand Aegis"]           },
  bountyhunters_leader:   { command: ["Ley Signal","Arcane Rally","Rune March","Mystic Order","Elder Banner","Arcane Legion","Wizard's Eye","Ley Command","Grand Arcane","Arcane Sovereignty"]      },
  bountyhunters_support:  { tactics: ["Hex Mend","Arcane Balm","Rune Remedy","Mending Glyph","Ward Restore","Arcane Tonic","Ley Cure","Elder Mend","Arcane Restoration","Grand Healing"]            },

  merfolk_attacker: { combat:  ["Current Edge","Depth Slash","Tidal Fury","Reef Strike","Sea Surge","Whirlpool Rush","Coral Blade","Abyssal Drive","Tidal Wrath","Ocean's Fury"]                   },
  merfolk_defender: { defense: ["Shell Brace","Coral Ward","Reef Hold","Tide Bastion","Pearl Armor","Sea Bulwark","Tidal Fortress","Abyssal Keep","Deep Citadel","Ocean Sovereign"]                  },
  merfolk_leader:   { command: ["Shoal Signal","Current Order","Kelp Banner","Tide March","Depth Rally","Sea King's Eye","Abyssal Command","Current Sovereign","Tidal Legion","Ocean's Pride"]      },
  merfolk_support:  { tactics: ["Brine Mend","Healing Waters","Coral Tonic","Tidal Cure","Sea Remedy","Kelp Restore","Ocean Mend","Abyssal Heal","Deep Restoration","Sea's Grace"]                  },

  orcs_attacker: { combat:  ["Raw Fury","Orc Rush","Blood Smash","Berserker Step","Tusk Drive","War Rage","Skull Crush","Battle Fury","Unstoppable Force","Orc Supremacy"]                          },
  orcs_defender: { defense: ["Hide Brace","Bone Ward","Orc Wall","Tusk Guard","War Drum","Stone Hide","Iron Tusks","Warboss Keep","Orc Bastion","Orc Citadel"]                                       },
  orcs_leader:   { command: ["Pack Howl","War Banner","Mob Leader","Horde Signal","Warchief Eye","Forced Drive","Orc Legion","War Sovereign","Horde Pride","Warlord's Domain"]                      },
  orcs_support:  { tactics: ["Bone Hex","Blood Mend","Shaman Balm","Spirit Tonic","Curse Remedy","Totem Cure","Warcry Mend","Spirit Restore","Hex Restoration","Shaman's Rite"]                     },

  dragons_attacker: { combat:  ["Ember Claw","Fire Rend","Draconic Strike","Inferno Rush","Flame Surge","Wyrm Fury","Ancient Fire","Elder Claw","Draconic Wrath","Dragon's Supremacy"]              },
  dragons_defender: { defense: ["Scale Ward","Ember Hold","Dragon Shell","Flame Plate","Wyrm Guard","Ancient Scale","Dragon Bastion","Elder Guard","Draconic Keep","Dragon Citadel"]                  },
  dragons_leader:   { command: ["Clutch Signal","Wing March","Hoard Banner","Flame Order","Dragon Eye","Ancient Rally","Draconic Legion","Elder Command","Dragon Sovereign","Ancient Dominion"]      },
  dragons_support:  { tactics: ["Ember Mend","Ash Tonic","Smoke Cure","Flame Remedy","Ancient Heal","Draconic Balm","Elder Mend","Wyrm Restore","Flame Restoration","Dragon's Grace"]                },
};

export function getMainBranchNames(faction, cls, tree) {
  const key = `${faction}_${cls}`;
  return FACTION_MAIN_NAMES[key]?.[tree] ?? MAIN_BRANCH_NAMES[tree] ?? Array.from({length:10},(_,i)=>`Node ${i+1}`);
}

// ── Branch display names (4 per commander) ────────────────────────────────────
export const TREE_DISPLAY_NAMES = {
  pirates_attacker:       ["Reaver's Edge",        "Blood Wake Arts",        "Corsair's Fury",           "Plunder Command"        ],
  pirates_defender:       ["Boarding Iron",         "Anchor Hold Arts",       "Sea Bulwark",              "Pirate Tactics"         ],
  pirates_leader:         ["Captain's Banner",      "Fleet Discipline",       "Trade Wind Mastery",       "Smuggler's Arts"        ],
  pirates_support:        ["Mending Tide",           "Crew Muster Arts",       "Healing Wake",             "Corsair Cunning"        ],
  marines_attacker:       ["Naval Strike Arts",      "Shore Assault",          "Broadside Mastery",        "Admiral's Tactics"      ],
  marines_defender:       ["Shield Wall Arts",       "Iron Discipline",        "Rampart Mastery",          "Fleet Tactics"          ],
  marines_leader:         ["Commander's Banner",     "Legion Drill",           "Force March Mastery",      "Strategic Arts"         ],
  marines_support:        ["Field Triage Arts",      "Supply Line",            "Morale Mastery",           "Siege Support"          ],
  bountyhunters_attacker: ["Arcane Strike Arts",     "Void Mastery",           "Mana Surge",               "Elder Tactics"          ],
  bountyhunters_defender: ["Crystal Ward Arts",      "Stone Skin",             "Mana Barrier Mastery",     "Dispel Arts"            ],
  bountyhunters_leader:   ["Elder's Banner",         "Arcane Rally",           "Ley Walk Mastery",         "Grand Arcana"           ],
  bountyhunters_support:  ["Mending Light Arts",     "Arcane Supply",          "Restoration Mastery",      "Seer's Arts"            ],
  merfolk_attacker:       ["Tidal Strike Arts",      "Depth Surge",            "Whirlpool Mastery",        "Siege Flood Arts"       ],
  merfolk_defender:       ["Trident Wall Arts",      "Reef Bastion",           "Shell Armor Mastery",      "Undertow Arts"          ],
  merfolk_leader:         ["Sea King's Banner",      "Current Command",        "Tide Council Mastery",     "Ocean Arts"             ],
  merfolk_support:        ["Healing Waters Arts",    "Kelp Line",              "Mending Current Mastery",  "Deep Arts"              ],
  orcs_attacker:          ["Berserker Arts",         "Blood Frenzy",           "Orc Smash Mastery",        "Warchief Tactics"       ],
  orcs_defender:          ["Skull Guard Arts",       "Stone Hide",             "Orc Bastion Mastery",      "Warcry Arts"            ],
  orcs_leader:            ["Warlord's Banner",       "Horde Command",          "Forced March Mastery",     "Siege Terror"           ],
  orcs_support:           ["Shaman Arts",            "Spirit Ward",            "Hex Mastery",              "Blood Tactics"          ],
  dragons_attacker:       ["Inferno Strike Arts",    "Claw Rend",              "Ember Slash Mastery",      "Dragonfire Arts"        ],
  dragons_defender:       ["Scale Armor Arts",       "Flame Ward",             "Dragon Hide Mastery",      "Fear Aura Arts"         ],
  dragons_leader:         ["Draconic Banner",        "Dragon Council",         "Wing March Mastery",       "Elder Arts"             ],
  dragons_support:        ["Healing Ember Arts",     "Clutch Line",            "Ancient Restore Mastery",  "Hoard Arts"             ],
};

export function getTreeDisplayNames(faction, cls) {
  const key = `${faction}_${cls}`;
  return TREE_DISPLAY_NAMES[key] ?? ["Branch I", "Branch II", "Branch III", "Legacy Branch"];
}

// ── Mechanic assignment pools by class ────────────────────────────────────────
const MECHANIC_BY_ROLE = {
  attacker_main: ["crushing_blow","blood_frenzy","rend_armor","double_strike","anchor_blow","killing_edge","mass_assault","arcane_burst","inferno_surge","tide_crash"],
  attacker_sub1: ["war_shout","serpent_bite","eagle_eye","shadow_clone","plunder_rush","dark_pact","warchief_roar","forced_march","grand_strategy","inferno_surge"],
  attacker_sub2: ["supply_cut","blind_strike","void_bolt","hex_curse","tide_turn","terror_aura","blood_hex","dispel_field","foresight","siege_protocol"],
  defender_main: ["shield_wall","iron_bastion","rally_ranks","mending_light","soul_drain","bulwark_stance","lifesteal_wave","ember_shield","coral_ward","iron_bastion"],
  defender_sub1: ["root_bind","phantom_step","dispel_field","iron_bastion","coral_ward","bulwark_stance","ember_shield","mending_light","lifesteal_wave","shield_wall"],
  defender_sub2: ["undertow","blood_hex","hex_curse","terror_aura","forced_march","warchief_roar","supply_cut","blind_strike","void_bolt","foresight"],
  leader_main:   ["war_shout","forced_march","warchief_roar","rally_ranks","grand_strategy","blood_frenzy","shield_wall","iron_bastion","mending_light","siege_protocol"],
  leader_sub1:   ["eagle_eye","supply_cut","foresight","dispel_field","blind_strike","phantom_step","tide_turn","plunder_rush","dark_pact","mass_assault"],
  leader_sub2:   ["root_bind","undertow","hex_curse","terror_aura","blood_hex","shadow_clone","serpent_bite","void_bolt","anchor_blow","killing_edge"],
  support_main:  ["mending_light","rally_ranks","soul_drain","lifesteal_wave","ember_shield","coral_ward","shield_wall","iron_bastion","bulwark_stance","foresight"],
  support_sub1:  ["dispel_field","phantom_step","root_bind","undertow","hex_curse","terror_aura","blood_hex","supply_cut","blind_strike","void_bolt"],
  support_sub2:  ["war_shout","forced_march","warchief_roar","grand_strategy","plunder_rush","dark_pact","tide_turn","mass_assault","shadow_clone","serpent_bite"],
};

export function getBranchMechanicKey(cls, branchIndex, nodeIndex, isSub = false, subIndex = 0) {
  const role = cls ?? "attacker";
  let pool;
  if (!isSub) {
    pool = MECHANIC_BY_ROLE[`${role}_main`] ?? MECHANIC_BY_ROLE.attacker_main;
  } else {
    pool = subIndex === 0
      ? (MECHANIC_BY_ROLE[`${role}_sub1`] ?? MECHANIC_BY_ROLE.attacker_sub1)
      : (MECHANIC_BY_ROLE[`${role}_sub2`] ?? MECHANIC_BY_ROLE.attacker_sub2);
  }
  const offset = branchIndex * 3;
  return pool[(nodeIndex + offset) % pool.length];
}

export function getBranchMechanic(cls, branchIndex, nodeIndex, isSub = false, subIndex = 0) {
  const key = getBranchMechanicKey(cls, branchIndex, nodeIndex, isSub, subIndex);
  return { key, ...SKILL_MECHANICS[key] };
}
