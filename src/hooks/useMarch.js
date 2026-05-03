import { useEffect } from "react";
import { TROOP, TROOP_KEYS } from "../constants/troops.js";
import { POWER_DEFS, HQP, AI_HQ_KEY, WIN_KEY, SIEGE_BASE } from "../constants/map.js";
import { CMD_LVL_MAX, xpToNext } from "../constants/troops.js";
import { barracksCapacity } from "../constants/buildings.js";
import { adj, bfsPath, effectiveMarchSpd, marchStepMs } from "../utils/pathfinding.js";
import { simBattle, garrisonDefCmd } from "../utils/battle.js";
import { calcSiegePower } from "../constants/map.js";
import { applyGearToCmd } from "../utils/gearStats.js";
import { getPassiveBonuses } from "../constants/skills.js";

// Per-class stat growth per level
const CLASS_GROWTH = {
  attacker: { atk: 1.5, foc: 0.2, spd: 0.6 },
  defender: { atk: 0.7, foc: 1.1, spd: 0.3 },
  support:  { atk: 0.2, foc: 1.3, spd: 0.8 },
  leader:   { atk: 0.8, foc: 0.8, spd: 0.8 },
};

function applyXp(cmd, xpGain, floaty) {
let newXp  = (cmd.xp  || 0) + xpGain;
let newLvl = (cmd.lvl || 5);
let levelsGained = 0;
while (newLvl < CMD_LVL_MAX) {
  const needed = xpToNext(newLvl);
  if (newXp >= needed) { newXp -= needed; newLvl++; levelsGained++; } else break;
}
if (newLvl >= CMD_LVL_MAX) newXp = 0;
if (levelsGained > 0 && floaty) floaty(`⬆ Lv${newLvl}!`, "#f0c040", cmd.tk);
// +1 skill point per level gained (doc §4.3)
const newSkillPoints = (cmd.unspentSkillPoints ?? 0) + levelsGained;
// Apply per-class stat growth for each level gained
const growth = CLASS_GROWTH[cmd.cls] ?? CLASS_GROWTH.leader;
const newAtk = Math.round((cmd.atk || 0) + growth.atk * levelsGained);
const newFoc = Math.round((cmd.foc || 0) + growth.foc * levelsGained);
const newSpd = Math.round((cmd.spd || 0) + growth.spd * levelsGained);
return { xp: newXp, lvl: newLvl, unspentSkillPoints: newSkillPoints, atk: newAtk, foc: newFoc, spd: newSpd };
}

export function useMarch({
screen, tiles, bldgs, cmds,
setCmds, setTiles, setWounded, setBarracks,
setBattles, setBLog, setWinner, setUnseenBattles,
tilesRef, floaty, gearInventory,
}) {
const hqKey = `${HQP.player.c},${HQP.player.r}`;

// March step tick
useEffect(() => {
if (screen !== "game") return;
const id = setInterval(() => {
const now = Date.now();
setCmds(prev => {
let changed = false;
const next = prev.map(cmd => {
if (!cmd.march) return cmd;
const m = cmd.march;
if (now - m.lastStepTime < m.stepMs) return cmd;
const nextStep = m.step + 1;
if (nextStep >= m.path.length) {
changed = true;
const dest = m.path[m.path.length - 1];
if (m.type === "attack") {
return { ...cmd, tk:dest, march:{ ...m, step:nextStep, arrived:true } };
}
return { ...cmd, tk:dest, march:null };
}
changed = true;
return { ...cmd, tk:m.path[nextStep], march:{ ...m, step:nextStep, lastStepTime:now } };
});
return changed ? next : prev;
});
}, 100);
return () => clearInterval(id);
}, [screen, setCmds]);

// Player attack arrival
useEffect(() => {
if (screen !== "game") return;
const arrivedAttackers = cmds.filter(c => c.owner === "player" && c.march?.arrived && c.march?.type === "attack");
if (!arrivedAttackers.length) return;

arrivedAttackers.forEach(cmd => {
  const destKey = cmd.tk;
  const defTile = tiles[destKey];
  if (!defTile || defTile.owner === "player") {
    setCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null } : c));
    return;
  }

  const [dc, dr] = destKey.split(",").map(Number);
  const hasFoothold = adj(dc, dr).some(k => tiles[k]?.owner === "player");
  if (!hasFoothold) {
    const boostedCmd0 = applyGearToCmd(cmd, gearInventory);
    const stepMs = marchStepMs(effectiveMarchSpd(boostedCmd0.spd || 60, cmd.troopType));
    const retreatPath = bfsPath(destKey, hqKey);
    setCmds(p => p.map(c => {
      if (c.uid !== cmd.uid) return c;
      if (retreatPath && retreatPath.length >= 2) {
        return { ...c, march:{ type:"move", path:retreatPath, step:0, dest:hqKey, origin:destKey, stepMs, lastStepTime:Date.now() } };
      }
      return { ...c, tk:hqKey, march:null };
    }));
    floaty("⚠ No foothold — retreating", "#cc8030", destKey);
    return;
  }

  const originKey = cmd.march?.origin || hqKey;
  const wallLvl   = bldgs.walls || 0;

  // Garrison-defeated path: apply siege only
  if (defTile.garrisonDefeated) {
    const newTroops  = cmd.troops || 0;
    const siegePower = calcSiegePower(newTroops, cmd.troopType);
    const currentSiege = defTile.siege ?? SIEGE_BASE;
    let siegeCaptured = false;
    if (siegePower >= currentSiege) {
      siegeCaptured = true;
      setTiles(p => ({ ...p, [destKey]:{ ...p[destKey], owner:"player", garrison:0, siege:defTile.siegeMax??SIEGE_BASE, garrisonDefeated:false, resetAt:null } }));
      floaty("⚔ CAPTURED!", "#3daa60", destKey);
      if (destKey === WIN_KEY) setWinner("player");
    } else {
      setTiles(p => ({ ...p, [destKey]:{ ...p[destKey], siege:currentSiege-siegePower, resetAt:Date.now()+60000 } }));
      floaty(`🔨 SIEGE ${currentSiege-siegePower}/${defTile.siegeMax??SIEGE_BASE}`, "#d0a030", destKey);
    }
    setCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null, tk:siegeCaptured?destKey:originKey } : c));
    return;
  }

  // Check live AI commander presence
  const hasAiCmd = cmds.some(c => c.owner === "ai" && c.tk === destKey && !c.march);
  const effectiveDefTile = hasAiCmd ? defTile : { ...defTile, defCmd:garrisonDefCmd(defTile) };

  // Stage 1 battle
  const boostedCmd = applyGearToCmd(cmd, gearInventory);
  const res = simBattle(boostedCmd, cmd.troops || 50, effectiveDefTile, wallLvl);
  const troopsAfterS1 = res.won ? Math.max(0, (cmd.troops||0) - res.lost) : 0;

  if (res.report) {
      const passiveSummary = getPassiveBonuses(boostedCmd);
      const enriched = { ...res.report, timestamp: Date.now(), cmdCls: cmd.cls, passiveSummary };
      setBattles(p => [enriched, ...p].slice(0, 99)); setUnseenBattles(n => n + 1);
    }

  if (!res.won) {
    floaty("💀 DEFEATED — retreating", "#cc3030", destKey);
    setCmds(p => p.map(c => {
      if (c.uid !== cmd.uid) return c;
      const retreatPath = bfsPath(originKey, hqKey);
      const stepMs = marchStepMs(effectiveMarchSpd(boostedCmd.spd||60, null));
      let updated = { ...c, troops:0, tk:originKey, march:null };
      if (retreatPath && retreatPath.length >= 2) {
        updated = { ...updated, march:{ type:"move", path:retreatPath, step:0, dest:hqKey, origin:originKey, stepMs, lastStepTime:Date.now() } };
      } else { updated = { ...updated, tk:hqKey }; }
      return { ...updated, ...applyXp(updated, res.xpGain, floaty) };
    }));
    setBLog(p => [`❌ ${cmd.n} Lv${cmd.lvl||5} defeated — retreating · ${res.modLabel}`, ...p].slice(0, 99));
    return;
  }

  // Stage 2: if AI commander was present, fight garrison
  let finalTroops = troopsAfterS1;
  let res2 = null;
  if (hasAiCmd) {
    floaty("⚔ Commander routed — garrison defends!", "#d0a030", destKey);
    const plvl = defTile.powerLevel || 1;
    const pd2  = POWER_DEFS[plvl] || POWER_DEFS[1];
    const garrisonTile = { ...defTile, defCmd:{ lvl:pd2.cmdLvl, troops:defTile.garrisonTroops||pd2.troops, troopType:defTile.troopType, atk:80+pd2.cmdLvl*8, spd:30+pd2.cmdLvl*3 } };
    res2 = simBattle({ ...boostedCmd, troops:troopsAfterS1 }, troopsAfterS1, garrisonTile, wallLvl);
    finalTroops = res2.won ? Math.max(0, troopsAfterS1 - res2.lost) : 0;

    if (res2.report) {
      const passiveSummary2 = getPassiveBonuses(boostedCmd);
      const enriched2 = { ...res2.report, timestamp: Date.now(), cmdCls: cmd.cls, passiveSummary: passiveSummary2, isStage2: true };
      setBattles(p => [enriched2, ...p].slice(0, 99)); setUnseenBattles(n => n + 1);
    }

    if (!res2.won) {
      floaty("💀 DEFEATED by garrison — retreating", "#cc3030", destKey);
      setTiles(p => ({ ...p, [destKey]:{ ...p[destKey], defCmd:null, hasAiCommander:false, garrisonDefeated:true, resetAt:Date.now()+60000 } }));
      setCmds(p => p.map(c => {
        if (c.uid !== cmd.uid) return c;
        const retreatPath = bfsPath(originKey, hqKey);
        const stepMs = marchStepMs(effectiveMarchSpd(boostedCmd.spd||60, null));
        let updated = { ...c, troops:0, tk:originKey, march:null };
        if (retreatPath && retreatPath.length >= 2) {
          updated = { ...updated, march:{ type:"move", path:retreatPath, step:0, dest:hqKey, origin:originKey, stepMs, lastStepTime:Date.now() } };
        } else { updated = { ...updated, tk:hqKey }; }
        return { ...updated, ...applyXp(updated, res2.xpGain, floaty) };
      }));
      setBLog(p => [`❌ ${cmd.n} defeated by garrison · ${res2.modLabel}`, ...p].slice(0, 99));
      return;
    }
  }

  // Both stages won — check siege
  const siegePower   = calcSiegePower(finalTroops, cmd.troopType);
  const currentSiege = defTile.siege ?? SIEGE_BASE;
  let tileCaptured = false;

  if (siegePower >= currentSiege) {
    tileCaptured = true;
    setTiles(p => ({ ...p, [destKey]:{ ...p[destKey], owner:"player", garrison:0, siege:defTile.siegeMax??SIEGE_BASE, garrisonDefeated:false, resetAt:null, defCmd:null, hasAiCommander:false } }));
    floaty("⚔ CAPTURED!", "#3daa60", destKey);
    if (destKey === WIN_KEY) setWinner("player");
  } else {
    setTiles(p => ({ ...p, [destKey]:{ ...p[destKey], siege:currentSiege-siegePower, garrisonDefeated:true, resetAt:Date.now()+60000, defCmd:null, hasAiCommander:false } }));
    floaty(`⚔ SIEGE ${currentSiege-siegePower}/${defTile.siegeMax??SIEGE_BASE} — not captured`, "#d0a030", destKey);
  }

  const wc = Math.floor(((cmd.troops||0) - finalTroops) * 0.30);
  if (wc > 0) { setWounded(w => w + wc); floaty(`🏥 +${wc} wounded`, "#88aaff", destKey); }

  const finalTk   = tileCaptured ? destKey : originKey;
  const xpSrc     = res2 || res;
  setCmds(p => p.map(c => {
    if (c.uid !== cmd.uid) return c;
    const updated = { ...c, troops:finalTroops, tk:finalTk, march:null };
    return { ...updated, ...applyXp(updated, xpSrc.xpGain, floaty) };
  }));
  const stageLabel = hasAiCmd ? " (2-stage)" : "";
  setBLog(p => [`✅ ${cmd.n} Lv${cmd.lvl||5}${stageLabel} ${tileCaptured?"captured":"siege dealt"} · ${res.modLabel}`, ...p].slice(0, 99));
});

}, [cmds, screen]);

// AI attack arrival
useEffect(() => {
if (screen !== "game") return;
const arrivedAI = cmds.filter(c => c.owner === "ai" && c.march?.arrived && c.march?.type === "attack");
if (!arrivedAI.length) return;

arrivedAI.forEach(cmd => {
  const destKey = cmd.tk;
  const defTile = tiles[destKey];
  if (!defTile || defTile.owner === "ai") {
    setCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null } : c));
    return;
  }
  const [dc2, dr2] = destKey.split(",").map(Number);
  const hasFoothold = adj(dc2, dr2).some(k => tiles[k]?.owner === "ai");
  if (!hasFoothold) {
    setCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null, tk:AI_HQ_KEY } : c));
    return;
  }

  const originKey = cmd.march?.origin || AI_HQ_KEY;

  if (defTile.garrisonDefeated) {
    const siegePower = calcSiegePower(cmd.troops||0, cmd.troopType);
    const currentSiege = defTile.siege ?? SIEGE_BASE;
    if (siegePower >= currentSiege) {
      const isPlayerHQ = defTile.isHQ && defTile.owner === "player";
      setTiles(p => ({ ...p, [destKey]:{ ...p[destKey], owner:"ai", garrison:0, siege:defTile.siegeMax??SIEGE_BASE, garrisonDefeated:false, resetAt:null,
        defCmd:{ lvl:cmd.lvl||5, troops:Math.floor((cmd.troops||0)*0.6), troopType:cmd.troopType||TROOP_KEYS[0], atk:cmd.atk||150, spd:cmd.spd||60 } } }));
      floaty("⚠ ENEMY CAPTURED TILE!", "#dd3322", destKey);
      if (destKey === WIN_KEY || isPlayerHQ) setWinner("ai");
      setCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null } : c));
    } else {
      setTiles(p => ({ ...p, [destKey]:{ ...p[destKey], siege:currentSiege-siegePower, resetAt:Date.now()+60000 } }));
      setCmds(p => p.map(c => c.uid === cmd.uid ? { ...c, march:null, tk:originKey } : c));
    }
    return;
  }

  const wallLvl = defTile.owner === "player" && defTile.isHQ ? (bldgs.walls||0) : 0;
  const boostedCmd2 = applyGearToCmd(cmd, gearInventory);
  const res = simBattle(boostedCmd2, cmd.troops||50, defTile, wallLvl);
  const newTroops = res.won ? Math.max(0, (cmd.troops||0) - res.lost) : 0;
  let tileCaptured = false;

  if (res.won) {
    const siegePower = calcSiegePower(newTroops, cmd.troopType);
    const currentSiege = defTile.siege ?? SIEGE_BASE;
    if (siegePower >= currentSiege) {
      tileCaptured = true;
      const isPlayerHQ = defTile.isHQ && defTile.owner === "player";
      setTiles(p => ({ ...p, [destKey]:{ ...p[destKey], owner:"ai", garrison:0, siege:300, siegeMax:300, garrisonDefeated:false, resetAt:null, hasAiCommander:true,
        defCmd:{ lvl:cmd.lvl||5, troops:Math.floor(newTroops*0.6), troopType:cmd.troopType||TROOP_KEYS[0], atk:cmd.atk||150, spd:cmd.spd||60 } } }));
      floaty("⚠ ENEMY CAPTURED TILE!", "#dd3322", destKey);
      if (destKey === WIN_KEY || isPlayerHQ) setWinner("ai");
    } else {
      setTiles(p => ({ ...p, [destKey]:{ ...p[destKey], siege:currentSiege-siegePower, garrisonDefeated:true, resetAt:Date.now()+60000 } }));
    }
  }

  const finalTk = tileCaptured ? destKey : originKey;
  setCmds(p => p.map(c => {
    if (c.uid !== cmd.uid) return c;
    let updated = { ...c, troops:newTroops, tk:finalTk, march:null };
    if (!res.won) {
      const retreatPath = bfsPath(finalTk, AI_HQ_KEY);
      if (retreatPath && retreatPath.length >= 2) {
        const stepMs = marchStepMs(effectiveMarchSpd(c.spd||60, null));
        updated = { ...updated, march:{ type:"move", path:retreatPath, step:0, dest:AI_HQ_KEY, origin:finalTk, stepMs, lastStepTime:Date.now() } };
      } else { updated = { ...updated, tk:AI_HQ_KEY }; }
    }
    let newXp = (updated.xp||0) + res.xpGain, newLvl = updated.lvl||5;
    while (newLvl < CMD_LVL_MAX) { const needed = xpToNext(newLvl); if (newXp >= needed) { newXp -= needed; newLvl++; } else break; }
    if (newLvl >= CMD_LVL_MAX) newXp = 0;
    return { ...updated, xp:newXp, lvl:newLvl };
  }));
  setBLog(p => [`${res.won?"🔴":"✅"} ENEMY ${cmd.n} Lv${cmd.lvl||5} ${res.won?"captured":"repelled"} tile`, ...p].slice(0, 99));
});

}, [cmds, screen, tiles, bldgs.walls]);
}
