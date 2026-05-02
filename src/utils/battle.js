import { TROOP } from "../constants/troops.js";
import { TERR } from "../constants/terrain.js";
import { POWER_DEFS } from "../constants/map.js";
import { SKILLS } from "../constants/skills.js";
import { troopModifier } from "../constants/troops.js";

export function garrisonDefCmd(tile) {
const plvl = tile.powerLevel || 1;
const pd   = POWER_DEFS[plvl] || POWER_DEFS[1];
return {
lvl:      pd.cmdLvl,
troops:   tile.garrisonTroops || pd.troops,
troopType: tile.troopType,
atk:  80 + pd.cmdLvl * 8,
spd:  30 + pd.cmdLvl * 3,
};
}

export function resolvedDefTile(tile) {
if (tile.owner === "ai" && !tile.hasAiCommander) {
return { ...tile, defCmd: garrisonDefCmd(tile) };
}
return tile;
}

export function simBattle(cmd, attackerTroops, defTile, wallLvl) {
const terrDef = TERR[defTile.terrain]?.def || 0;
const fort    = defTile.isHQ ? (wallLvl || 0) * 10 : 0;
const dc      = defTile.defCmd;
const mod     = troopModifier(cmd.troopType, dc?.troopType || defTile.troopType || null);
const modLabel = mod === 1.1 ? "⚔ STRONG" : mod === 0.9 ? "🛡 WEAK" : "◆ NEUTRAL";

const atkLvl    = cmd.lvl || 5;
const atkCmdAtk = (cmd.atk || 150) * Math.pow(1.20, atkLvl - 5);
const atkCmdSpd = cmd.spd || 60;
const atkSkill  = cmd.skill || "";
const atkSkillDef = SKILLS[atkSkill] || null;

const defLvl    = dc ? dc.lvl : 2;
const defTroops = dc ? dc.troops : (defTile.garrison || defTile.garrisonTroops || 30);
const defCmdAtk = (dc ? dc.atk : 80) * Math.pow(1.20, Math.max(0, defLvl - 2));
const defCmdSpd = dc ? (dc.spd || 40) : 40;
const defTerrBonus = 1 + (terrDef + fort) / 100;

const atkTT  = cmd.troopType ? TROOP[cmd.troopType] : null;
const defTT  = (dc?.troopType || defTile.troopType) ? TROOP[dc?.troopType || defTile.troopType] : null;
const atkTroopSpd = atkTT ? atkTT.spd : 50;
const defTroopSpd = defTT ? defTT.spd : 50;

const atkTroopHpPer = atkTT ? atkTT.hp : 10;
const defTroopHpPer = defTT ? defTT.hp : 10;
let atkTroopHp = attackerTroops * atkTroopHpPer;
let defTroopHp = defTroops * defTroopHpPer;
const atkTroopHpStart = atkTroopHp;

const calcPhysAtk = (tt, count, lvlMult, terrMult = 1) => {
if (!tt || count <= 0) return 0;
const surviving = Math.max(1, Math.ceil(count));
const raw = surviving * tt.atk * lvlMult * terrMult * (0.85 + Math.random() * 0.30);
return Math.max(1, Math.round(raw / 10));
};
const calcPhysDef = (tt) => tt ? tt.def : 30;
const calcMagAtk = (tt, count, lvlMult, terrMult = 1) => {
if (!tt || count <= 0) return 0;
const surviving = Math.max(1, Math.ceil(count));
const raw = surviving * tt.focus * lvlMult * terrMult * (0.85 + Math.random() * 0.30);
return Math.max(1, Math.round(raw / 10));
};
const calcMagRes = (tt) => tt ? tt.focus : 20;

const applyTroopDmg = (atkTroopType, defTroopType, atkCount, defHP, lvlMult, terrMult = 1) => {
const aTT = TROOP[atkTroopType];
const dTT = TROOP[defTroopType] || null;
if (!aTT) return { dmg:0, newHp:defHP };
let raw, resist;
if (aTT.dmgType === "magical") {
raw    = calcMagAtk(aTT, atkCount, lvlMult, terrMult);
resist = calcMagRes(dTT);
} else {
raw    = calcPhysAtk(aTT, atkCount, lvlMult, terrMult);
resist = calcPhysDef(dTT);
}
const dmgReduction = Math.max(0, 1 - resist / (resist + 80));
const dmg = Math.max(1, Math.round(raw * dmgReduction * mod));
return { dmg, newHp: Math.max(0, defHP - dmg) };
};

const atkLvlMult = Math.pow(1.20, atkLvl - 5);
const defLvlMult = Math.pow(1.20, Math.max(0, defLvl - 2));
let atkTroopBuff  = 1.0;
let defRootDebuff = 1.0;

const report = {
atkName:cmd.n, atkIcon:cmd.icon||"⚔", atkLvl, atkTroopType:cmd.troopType,
atkTroopsStart:attackerTroops, defTroopsStart:defTroops, defLvl,
defCmdName:`Garrison Lv${defLvl}`, defCmdIcon:"🛡",
terrain:defTile.terrain, modLabel,
rounds:[], atkTroopsEnd:attackerTroops, defTroopsEnd:defTroops, won:false, xpGain:0,
};

for (let round = 1; round <= 10; round++) {
const roundLog = { round, actions: [] };
if (atkTroopHp <= 0 && defTroopHp <= 0) break;
if (atkTroopHp <= 0) { roundLog.actions.push({ actor:"SYSTEM", action:"Attackers routed!", dmg:0 }); report.rounds.push(roundLog); break; }
if (defTroopHp <= 0) { roundLog.actions.push({ actor:"SYSTEM", action:"Defenders defeated!", dmg:0 }); report.rounds.push(roundLog); break; }

const skillFires = atkSkillDef && atkSkillDef.round === round;
let skillNullified = false, thisCmdMult = 1.0, thisTroopMult = atkTroopBuff;
let cmdHitsThisRound = 1, troopHitsThisRound = 1, critChance = 0;

if (skillFires) {
const sk = atkSkillDef;
roundLog.actions.push({ actor:cmd.n, action:`✨ ${atkSkill} — ${sk.desc}`, dmg:0, isSkill:true });
if (sk.troopMult)    thisTroopMult  *= sk.troopMult;
if (sk.troopBuff)    { atkTroopBuff += sk.troopBuff; thisTroopMult = atkTroopBuff; }
if (sk.cmdMult)      thisCmdMult     = sk.cmdMult;
if (sk.cmdHits)      cmdHitsThisRound = sk.cmdHits;
if (sk.troopHits)    troopHitsThisRound = sk.troopHits;
if (sk.crit)         critChance      = sk.crit;
if (sk.defBuff)      thisCmdMult    *= (1 - sk.defBuff);
if (sk.rootDebuff)   defRootDebuff   = 1 - sk.rootDebuff;
if (sk.nullifyEnemy) skillNullified  = true;
}

const defDmgMult = defRootDebuff;
const entities = [
{ id:"atkCmd",   spd:atkCmdSpd,   side:"atk" },
{ id:"atkTroop", spd:atkTroopSpd, side:"atk" },
{ id:"defCmd",   spd:defCmdSpd,   side:"def" },
{ id:"defTroop", spd:defTroopSpd, side:"def" },
].sort((a, b) => b.spd - a.spd || (a.side === "atk" ? -1 : 1));

for (const entity of entities) {
if (atkTroopHp <= 0 && defTroopHp <= 0) break;

if (entity.id === "atkCmd") {
if (defTroopHp <= 0) continue;
for (let h = 0; h < cmdHitsThisRound; h++) {
const isCrit = Math.random() < critChance;
const defRes = defTT ? calcPhysDef(defTT) : 30;
const dmgReduction = Math.max(0, 1 - defRes / (defRes + 80));
const raw = atkCmdAtk * thisCmdMult * (isCrit ? 1.5 : 1.0) * (0.85 + Math.random() * 0.30) * defTerrBonus;
const dmg = Math.max(1, Math.round(raw * dmgReduction));
defTroopHp = Math.max(0, defTroopHp - dmg);
roundLog.actions.push({ actor:cmd.n, action:`${cmd.n} struck enemy troops${isCrit ? " (CRITICAL!)" : ""}`, dmg, isPlayer:true });
}
} else if (entity.id === "atkTroop") {
if (!atkTT || atkTroopHp <= 0 || defTroopHp <= 0) continue;
for (let h = 0; h < troopHitsThisRound; h++) {
const atkCount = Math.ceil(atkTroopHp / atkTroopHpPer);
const res = applyTroopDmg(cmd.troopType, dc?.troopType || defTile.troopType, atkCount * thisTroopMult, defTroopHp, atkLvlMult);
defTroopHp = res.newHp;
roundLog.actions.push({ actor:"Troops", action:`${atkTT?.icon||"⚔"} ${atkTT?.label||"Troops"} attacked enemy soldiers`, dmg:res.dmg, isPlayer:true });
}
} else if (entity.id === "defCmd") {
if (skillNullified || atkTroopHp <= 0) continue;
const atkRes = atkTT ? calcPhysDef(atkTT) : 30;
const dmgReduction = Math.max(0, 1 - atkRes / (atkRes + 80));
const raw = defCmdAtk * defDmgMult * defTerrBonus * (0.85 + Math.random() * 0.30) * 0.8;
const dmg = Math.max(1, Math.round(raw * dmgReduction));
atkTroopHp = Math.max(0, atkTroopHp - dmg);
roundLog.actions.push({ actor:"Enemy Cmd", action:"Enemy commander struck your troops", dmg, isPlayer:false });
} else if (entity.id === "defTroop") {
if (skillNullified || !defTT || defTroopHp <= 0 || atkTroopHp <= 0) continue;
const defCount = Math.ceil(defTroopHp / defTroopHpPer);
const res = applyTroopDmg(dc?.troopType || defTile.troopType, cmd.troopType, defCount * defDmgMult, atkTroopHp, defLvlMult, defTerrBonus);
atkTroopHp = res.newHp;
roundLog.actions.push({ actor:"Defenders", action:`${defTT.icon} ${defTT.label} attacked your soldiers`, dmg:res.dmg, isPlayer:false });
}
}
report.rounds.push(roundLog);

}

const won = atkTroopHp > 0 || (atkTroopHp <= 0 && defTroopHp <= 0);
const defTroopsLeft = Math.max(0, Math.round(defTroopHp / defTroopHpPer));
const finalAtkLost = won
? Math.min(attackerTroops - 1, Math.max(1, Math.round((atkTroopHpStart - Math.max(0, atkTroopHp)) / atkTroopHpPer)))
: Math.min(attackerTroops, Math.round(attackerTroops * (0.35 + Math.random() * 0.20)));

const xpGain = won ? (POWER_DEFS[defTile.powerLevel || 1]?.xpReward || 30) : 0;
const atkPow = attackerTroops * Math.pow(1.20, atkLvl - 5) * mod;
const defPow = defTroops * Math.pow(1.20, Math.max(0, defLvl - 2)) * defTerrBonus;
const powerRatio = atkPow / Math.max(1, defPow);
const pct = Math.round(Math.min(99, Math.max(1, 100 / (1 + Math.pow(Math.max(0.00001, 1 / powerRatio), 3.5)))));

report.won = won;
report.atkTroopsEnd = Math.max(0, attackerTroops - finalAtkLost);
report.defTroopsEnd = defTroopsLeft;
report.xpGain = xpGain;
report.pct = pct;

return { won, lost:finalAtkLost, atk:Math.round(atkPow), def:Math.round(defPow), pct, mod, modLabel, xpGain, report };
}
