import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MapRenderer } from "./MapRenderer";

// Constants
import { ALIGNMENT, getFactionAlignment, PLAYABLE_FACTIONS } from "./constants/factions.js";
import { HDEFS, RC, RARITY, CLASS, rollGacha, addRespect, RESPECT_DUPE_POINTS, RESPECT_OVERFLOW_POINTS, RESPECT_MAX } from "./constants/heroes.js";
import { rollFullPull, rollGearSchematic, createRespectSchematic, GEAR_RARITY, GEAR_SLOTS, rollFullPullCmdRarity } from "./constants/gear.js";
import { HQP, AI_HQ_KEY, WIN_KEY, RKEYS, RSS, POWER_DEFS, SIEGE_BASE, calcSiegePower, hqSiegeValue } from "./constants/map.js";
import { TROOP, TROOP_KEYS, CMD_LVL_MAX, xpToNext } from "./constants/troops.js";
import { barracksCapacity, cmdCommand, upgCost, upgDuration, maxAvailLevel, trainRate, maxTrainBatch } from "./constants/buildings.js";
import { isoXY } from "./constants/geometry.js";

// Utils
import { genMap } from "./utils/mapGen.js";
import { bfsPath, adj, effectiveMarchSpd, marchStepMs } from "./utils/pathfinding.js";
import { applyGearToCmd } from "./utils/gearStats.js";
import { garrisonDefCmd } from "./utils/battle.js";

// Hooks
import { useResources } from "./hooks/useResources.js";
import { useAI } from "./hooks/useAI.js";
import { useTraining } from "./hooks/useTraining.js";
import { useMarch } from "./hooks/useMarch.js";
import { useUpgrades } from "./hooks/useUpgrades.js";

// Screens
import TitleScreen from "./components/screens/TitleScreen.jsx";
import FactionScreen from "./components/screens/FactionScreen.jsx";
import GachaScreen from "./components/screens/GachaScreen.jsx";

// Game components
import HUD from "./components/game/HUD.jsx";
import TilePopup from "./components/game/TilePopup.jsx";
import HQMenu from "./components/game/HQMenu.jsx";
import BattleLog from "./components/game/BattleLog.jsx";
import CommanderPicker from "./components/game/CommanderPicker.jsx";
import BottomPanel from "./components/game/BottomPanel.jsx";
import WinScreen from "./components/game/WinScreen.jsx";
import Minimap from "./components/game/Minimap.jsx";
import GameBar from "./components/game/GameBar.jsx";
import CommanderScreen from "./components/screens/CommanderScreen.jsx";
import GearScreen from "./components/screens/GearScreen.jsx";

// Backwards-compat shims
const SC = RC;
const SS = (rarity) => RARITY[rarity]?.n ?? String(rarity);

export default function RiseToWar() {
  // ── Screens ──
  const [screen,  setScreen]  = useState("title");
  const [facKey,  setFacKey]  = useState("pirates");
  const [facName, setFacName] = useState("Pirates");
  const playerAlignment = getFactionAlignment(facKey);

  // ── Game state ──
  const [tiles,  setTiles]   = useState({});
  const [mapReady, setMapReady] = useState(false);
  const [rss,    setRss]     = useState({ stone:300, wood:300, ore:300, gas:300 });
  const [gems,   setGems]    = useState(4400);
  const [cmds,   setCmds]    = useState(() => {
    const hqk = `${HQP.player.c},${HQP.player.r}`;
    const sol = HDEFS.find(h => h.faction === "pirates" && h.rarity === "soldier");
    const vet = HDEFS.find(h => h.faction === "pirates" && h.rarity === "veteran");
    return [sol, vet].filter(Boolean).map((h,i) => ({...h, uid:`p${i}`, owner:"player", troops:0, troopType:null, tk:hqk, lvl:5, xp:0, respectPoints:0, respectLevel:0, skillPoints:{}, unspentSkillPoints:5, gear:{helmet:null,armor:null,bracers:null,accessory:null}}));
  });
  const [coll,   setColl]    = useState(() => {
    const sol = HDEFS.find(h => h.faction === "pirates" && h.rarity === "soldier");
    const vet = HDEFS.find(h => h.faction === "pirates" && h.rarity === "veteran");
    return [sol, vet].filter(Boolean);
  });
  const [pityCounters,   setPityCounters]   = useState({ soldier:0, veteran:0, champion:0 });
  // ── Gear & schematic inventory ──
  const [gearInventory,       setGearInventory]       = useState([]);   // gear instances
  const [respectSchematics,   setRespectSchematics]   = useState([]);   // respect schematic items
  // Pull results now carry 3 slots
  const [pullResults,         setPullResults]         = useState([]);   // array of pull result objects
  // Daily free pull: store UTC date string of last free use ("2026-05-01" etc.)
  const [lastFreePull,   setLastFreePull]   = useState(null);
  const [dailyHalfUsed, setDailyHalfUsed]  = useState(false); // tracks the 200-gem 2nd daily pull
  const [bldgs,  setBldgs]   = useState({ hq:1, quarry:0, lumber:0, forge:0, refinery:0, barracks:0, training:0, commandcenter:0, healingtent:0, walls:0 });
  const [upgQueue, setUpgQueue] = useState({});

  // ── AI state ──
  const [aiFaction,      setAiFaction]      = useState(null);
  const [aiRss,          setAiRss]          = useState({ stone:300, wood:300, ore:300, gas:300 });
  const [aiBldgs,        setAiBldgs]        = useState({ hq:1, quarry:0, lumber:0, forge:0, refinery:0, barracks:0, training:0, commandcenter:0, healingtent:0, walls:0 });
  const [aiBarracksPool, setAiBarracksPool] = useState(barracksCapacity(0));
  const aiLastActionRef = useRef(0);

  // Refs for AI hooks
  const cmdsRef    = useRef([]);
  const tilesRef   = useRef({});
  const aiRssRef   = useRef({ stone:300, wood:300, ore:300, gas:300 });
  const aiBldgsRef = useRef({ hq:1, quarry:0, lumber:0, forge:0, refinery:0, barracks:0, training:0, commandcenter:0, healingtent:0, walls:0 });
  const aiPoolRef  = useRef(barracksCapacity(0));

  useEffect(() => { cmdsRef.current    = cmds;           }, [cmds]);
  useEffect(() => { tilesRef.current   = tiles;          }, [tiles]);
  useEffect(() => { aiRssRef.current   = aiRss;          }, [aiRss]);
  useEffect(() => { aiBldgsRef.current = aiBldgs;        }, [aiBldgs]);
  useEffect(() => { aiPoolRef.current  = aiBarracksPool; }, [aiBarracksPool]);

  // ── Bug 3 fix: reset dailyHalfUsed at 00:00 UTC ──
  useEffect(() => {
    const scheduleReset = () => {
      const now = new Date();
      const msUntilMidnightUTC = (
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
        - Date.now()
      );
      const t = setTimeout(() => {
        setDailyHalfUsed(false);
        scheduleReset(); // reschedule for the next midnight
      }, msUntilMidnightUTC);
      return t;
    };
    const t = scheduleReset();
    return () => clearTimeout(t);
  }, []);

  // ── Bug 4 fix: sync player and AI HQ siegeMax when walls level changes ──
  useEffect(() => {
    if (!mapReady) return;
    const playerHQKey = `${HQP.player.c},${HQP.player.r}`;
    const newPlayerSiegeMax = hqSiegeValue(bldgs.walls || 0);
    setTiles(p => {
      const tile = p[playerHQKey];
      if (!tile) return p;
      // Clamp current siege to new max (don't increase current siege beyond the cap, but allow it to stay if already below)
      const newSiege = Math.min(tile.siege ?? newPlayerSiegeMax, newPlayerSiegeMax);
      return { ...p, [playerHQKey]: { ...tile, siegeMax: newPlayerSiegeMax, siege: newSiege } };
    });
  }, [bldgs.walls, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    const newAiSiegeMax = hqSiegeValue(aiBldgs.walls || 0);
    setTiles(p => {
      const tile = p[AI_HQ_KEY];
      if (!tile) return p;
      const newSiege = Math.min(tile.siege ?? newAiSiegeMax, newAiSiegeMax);
      return { ...p, [AI_HQ_KEY]: { ...tile, siegeMax: newAiSiegeMax, siege: newSiege } };
    });
  }, [aiBldgs.walls, mapReady]);

  // ── Player army ──
  const [barracksPool,   setBarracks]      = useState(barracksCapacity(0));
  const [woundedTroops,  setWounded]       = useState(0);
  const [trainingQueue,  setTrainingQueue] = useState(null);
  const [trainSlider,    setTrainSlider]   = useState(100);

  // ── Battle log ──
  const [bLog,          setBLog]          = useState([]);
  const [battles,       setBattles]       = useState([]);
  const [unseenBattles, setUnseenBattles] = useState(0);
  const [showBattleLog, setShowBattleLog] = useState(false);

  // ── UI state ──
  const [mode,       setMode]      = useState("view");
  const [selKey,     setSelKey]    = useState(null);
  const [popupPos,   setPopupPos]  = useState(null);
  const [popupMode,  setPopupMode] = useState("main");
  const [editArmyCmd, setEditArmyCmd] = useState(null);
  const [atkKey,     setAtkKey]    = useState(null);
  const [mvCmd,      setMvCmd]     = useState(null);
  const [pickCmd,    setPick]      = useState(null);
  const [reinCmd,    setReinCmd]   = useState(null);
  const [reinMarches, setReinMarches] = useState([]);
  const [sliderVals, setSliderVals] = useState({});
  const [floats,     setFloats]    = useState([]);
  const [winner,     setWinner]    = useState(null);
  const [deletingTiles,    setDeletingTiles]    = useState({});
  const [deletingSecsLeft, setDeletingSecsLeft] = useState({});

  // Ticks every second so draw-rematch countdowns in TilePopup stay live
  const [nowTick, setNowTick] = useState(() => Date.now());

  // ── HQ menu ──
  const [hqOpen, setHqOpen] = useState(false);
  const [hqTab,  setHqTab]  = useState("overview");
  const [cmdScreenOpen,  setCmdScreenOpen]  = useState(false);
  const [cmdScreenUid,   setCmdScreenUid]   = useState(null);
  const [gearScreenOpen, setGearScreenOpen] = useState(false);

  // ── Map pan/zoom ──
  const panRef  = useRef({ x:4, y:4 });
  const [panSt, setPanSt] = useState({ x:4, y:4 });
  const [zoom,  setZoom]  = useState(1);
  const zoomRef = useRef(1);
  const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5];

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // ── Init map on game start ──
  useEffect(() => {
    if (screen==="game" && Object.keys(tiles).length===0) setTiles(genMap());
  }, [screen]);

  // ── Reset mapReady when leaving game ──
  useEffect(() => {
    if (screen !== "game") { setMapReady(false); setTiles({}); }
  }, [screen]);

  // ── Mark map ready once tiles are populated ──
  useEffect(() => {
    if (screen === "game" && Object.keys(tiles).length > 0) setMapReady(true);
  }, [tiles, screen]);

  // ── Floaty helper ──
  const floaty = useCallback((txt, col, k) => {
    const [fc, fr] = k.split(",").map(Number);
    const tile = tilesRef.current[k];
    const { cx, cy } = isoXY(fc, fr);
    const elev = tile?.isHQ ? 14 : tile?.isWin ? 10 : 4;
    const screenX = cx * zoomRef.current + panRef.current.x;
    const screenY = (cy - elev) * zoomRef.current + panRef.current.y + 38;
    const id = Date.now() + Math.random();
    setFloats(f => [...f, { id, txt, col, x:screenX, y:screenY }]);
    setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1800);
  }, []);

  // ── Hooks ──
  useResources({ screen, tiles, bldgs, setRss });

  useAI({
    screen, aiFaction,
    cmdsRef, tilesRef, aiRssRef, aiBldgsRef, aiPoolRef, aiLastActionRef,
    setCmds, setAiRss, setAiBldgs, setAiBarracksPool,
  });

  useTraining({ screen, bldgs, setTrainingQueue, setBarracks, setWounded });

  useUpgrades({ screen, setUpgQueue, setBldgs, setBarracks });

  useMarch({
    screen, tiles, bldgs, cmds,
    setCmds, setTiles, setWounded, setBarracks,
    setBattles, setBLog, setWinner, setUnseenBattles,
    tilesRef, floaty, gearInventory,
  });

  // ── Siege reset timer ──
  useEffect(() => {
    if (screen !== "game") return;
    const id = setInterval(() => {
      const now = Date.now();
      setNowTick(now);
      setTiles(prev => {
        let changed = false;
        const next = { ...prev };
        Object.values(next).forEach(tile => {
          if (tile.garrisonDefeated && tile.resetAt && now >= tile.resetAt) {
            changed = true;
            next[tile.k] = { ...tile, siege:tile.siegeMax, garrisonDefeated:false, resetAt:null };
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [screen]);

  // ── Reinforcement march tick ──
  useEffect(() => {
    if (screen !== "game") return;
    const id = setInterval(() => {
      const now = Date.now();
      setReinMarches(prev => {
        if (!prev.length) return prev;
        const next = [];
        prev.forEach(rm => {
          const elapsed = now - rm.lastStepTime;
          if (elapsed < rm.stepMs) { next.push(rm); return; }
          const nextStep = rm.step + 1;
          if (nextStep >= rm.path.length) {
            setCmds(cmds => cmds.map(c => c.uid===rm.cmdUid ? {...c, troops:(c.troops||0)+rm.amount} : c));
            floaty(`+${rm.amount} reinforcements arrived!`, "#88aaff", rm.path[rm.path.length-1]);
          } else {
            next.push({ ...rm, step:nextStep, lastStepTime:now });
          }
        });
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [screen, floaty]);

  // ── Tile deletion countdown ──
  useEffect(() => {
    if (Object.keys(deletingTiles).length===0) return;
    const id = setInterval(() => {
      const now = Date.now();
      const expired = [];
      const newSecs = {};
      Object.entries(deletingTiles).forEach(([key, startedAt]) => {
        const elapsed = now - startedAt;
        newSecs[key] = Math.max(0, Math.ceil((15000-elapsed)/1000));
        if (elapsed >= 15000) expired.push(key);
      });
      setDeletingSecsLeft(newSecs);
      if (expired.length > 0) {
        setTiles(p => {
          const next = { ...p };
          expired.forEach(key => {
            const t = next[key];
            if (!t || t.owner !== "player") return;
            const pl = t.powerLevel || 1;
            const pd = POWER_DEFS[pl];
            const npc2 = npcForPowerLevel(pl); next[key] = { ...t, owner:null, garrison:pd?pd.troops:50, siege:t.siegeMax??SIEGE_BASE, siegeMax:t.siegeMax??SIEGE_BASE, garrisonDefeated:false, resetAt:null, defCmd:pd?{n:npc2.n,icon:npc2.icon,cls:npc2.cls,faction:null,rarity:'soldier',lvl:pd.cmdLvl,troops:pd.troops,troopType:npc2.troopType,atk:npc2.atk*pd.cmdLvl,spd:npc2.spd+pd.cmdLvl*2}:null };
          });
          return next;
        });
        const hqKey = `${HQP.player.c},${HQP.player.r}`;
        setCmds(prev => prev.map(cmd => {
          if (cmd.owner!=="player" || !expired.includes(cmd.tk) || cmd.tk===hqKey) return cmd;
          if (cmd.march) return cmd;
          const retreatPath = bfsPath(cmd.tk, hqKey);
          const stepMs = marchStepMs(effectiveMarchSpd(applyGearToCmd(cmd, gearInventory).spd||60, null));
          if (retreatPath && retreatPath.length >= 2) {
            return { ...cmd, march:{ type:"move", path:retreatPath, step:0, dest:hqKey, origin:cmd.tk, stepMs, lastStepTime:Date.now() } };
          }
          return { ...cmd, tk:hqKey };
        }));
        expired.forEach(key => floaty("🏳 Tile abandoned", "#a08060", key));
        setDeletingTiles(prev => { const n={...prev}; expired.forEach(k=>delete n[k]); return n; });
        setDeletingSecsLeft(prev => { const n={...prev}; expired.forEach(k=>delete n[k]); return n; });
      }
    }, 250);
    return () => clearInterval(id);
  }, [deletingTiles, floaty]);

  // ── Computed ──
  const pKeys = useMemo(() => new Set(Object.keys(tiles).filter(k => tiles[k]?.owner==="player")), [tiles]);

  const cByTile = useMemo(() => {
    const m = {};
    cmds.forEach(c => { if (c.tk) { m[c.tk]=m[c.tk]||[]; m[c.tk].push(c); } });
    return m;
  }, [cmds]);

  const selTile = selKey ? tiles[selKey] : null;

  const cmdsOnSel = useMemo(() =>
    selKey ? (cByTile[selKey]||[]).filter(c => c.owner==="player") : [],
  [selKey, cByTile]);

  const selAdjToPlayer = useMemo(() => {
    if (!selTile || selTile.owner==="player") return false;
    return adj(selTile.c, selTile.r).some(ak => tiles[ak]?.owner==="player");
  }, [selTile, tiles]);

  const cmdsAdjToSel = useMemo(() => {
    if (!selAdjToPlayer) return [];
    return cmds.filter(cmd => cmd.owner==="player" && cmd.tk && (cmd.troops||0)>0 && !cmd.march);
  }, [selAdjToPlayer, cmds]);

  const canAtk = !!(selTile && selTile.owner!=="player" && selAdjToPlayer);

  const marchingToSel = useMemo(() =>
    selKey ? cmds.filter(c => c.march?.dest===selKey && c.owner==="player") : [],
  [selKey, cmds]);

  const panelOpen = (mode==="selectMarchDest" || mode==="reinforce") && !hqOpen;

  // ── Actions ──
  const startMarch = useCallback((cmd, destKey) => {
    if (!cmd || !destKey || cmd.march) return;
    if (!cmd.troops || cmd.troops < 1) { floaty("⚠ Assign troops first!", "#cc8030", cmd.tk); return; }
    const destTile = tiles[destKey];
    const type = destTile?.owner==="player" ? "move" : "attack";
    if (type==="move" && destTile?.owner!=="player") return;
    const path = bfsPath(cmd.tk, destKey);
    if (!path || path.length < 2) return;
    const boostedSpd = applyGearToCmd(cmd, gearInventory).spd || 60;
    const stepMs = marchStepMs(effectiveMarchSpd(boostedSpd, cmd.troopType));
    setCmds(p => p.map(c => c.uid===cmd.uid ? { ...c, march:{ type, path, step:0, dest:destKey, origin:cmd.tk, stepMs, lastStepTime:Date.now() } } : c));
    setMode("view"); setMvCmd(null); setSelKey(null); setPopupPos(null);
  }, [tiles, floaty, gearInventory]);

  const recallMarch = useCallback((uid) => {
    setCmds(prev => {
      const cmd = prev.find(c => c.uid===uid);
      if (!cmd?.march) return prev;
      const m = cmd.march;
      const reversePath = [...m.path.slice(0, m.step+1)].reverse();
      if (reversePath.length < 2) return prev.map(c => c.uid===uid ? { ...c, march:null } : c);
      return prev.map(c => c.uid===uid ? { ...c, march:{ type:"move", path:reversePath, step:0, dest:m.origin, origin:cmd.tk, stepMs:m.stepMs, lastStepTime:Date.now() } } : c);
    });
  }, []);

  const recallStationary = useCallback((uid) => {
    setCmds(prev => {
      const cmd = prev.find(c => c.uid===uid);
      if (!cmd || cmd.march) return prev;
      const hqKey = `${HQP.player.c},${HQP.player.r}`;
      if (cmd.tk===hqKey) return prev;
      const path = bfsPath(cmd.tk, hqKey);
      if (!path || path.length < 2) return prev;
      const stepMs = marchStepMs(effectiveMarchSpd(applyGearToCmd(cmd, gearInventory).spd||60, cmd.troopType));
      return prev.map(c => c.uid===uid ? { ...c,
        drawTimer:null, drawTile:null, drawOrigin:null,
        march:{ type:"move", path, step:0, dest:hqKey, origin:cmd.tk, stepMs, lastStepTime:Date.now() }
      } : c);
    });
  }, [gearInventory]);

  const startReinforcement = useCallback((cmd, amount) => {
    if (!cmd || amount <= 0) return;
    const hqKey = `${HQP.player.c},${HQP.player.r}`;
    const path = bfsPath(hqKey, cmd.tk);
    if (!path || path.length < 2) return;
    setBarracks(pool => Math.max(0, pool - amount));
    const effSpd = effectiveMarchSpd(applyGearToCmd(cmd, gearInventory).spd||60, cmd.troopType);
    const stepMs = Math.max(100, Math.floor(marchStepMs(effSpd)/2));
    setReinMarches(prev => [...prev, { uid:`rein_${Date.now()}`, cmdUid:cmd.uid, amount, path, step:0, stepMs, lastStepTime:Date.now() }]);
    setMode("view"); setReinCmd(null);
    setSliderVals(v => ({ ...v, [`rein_${cmd.uid}`]:undefined }));
  }, []);

  const canAfford = useCallback(c => Object.entries(c).every(([k,v]) => (rss[k]||0)>=v), [rss]);

  const queueTraining = useCallback((amount) => {
    if (trainingQueue) return;
    const cap = barracksCapacity(bldgs.barracks||0);
    if (barracksPool + amount > cap) return;
    const cost = { stone:amount*2, wood:amount*2, ore:amount, gas:Math.floor(amount*0.5) };
    if (!canAfford(cost)) return;
    setRss(p => ({ stone:p.stone-cost.stone, wood:p.wood-cost.wood, ore:p.ore-cost.ore, gas:p.gas-cost.gas }));
    setTrainingQueue({ amount, remaining:amount, total:amount, cost });
  }, [canAfford, bldgs.barracks, barracksPool, trainingQueue]);

  const assignTroops = useCallback((uid, troopType, newTotal) => {
    setCmds(prev => {
      const cmd = prev.find(c => c.uid===uid);
      if (!cmd) return prev;
      const commandCap = cmdCommand(cmd.lvl||5, bldgs.commandcenter||0, (cmd.cls==="leader"&&(cmd.lvl||5)>=25)?500:0);
      const oldTroops = (cmd.troopType && cmd.troopType!==troopType) ? 0 : (cmd.troops||0);
      const oldReturning = (cmd.troopType && cmd.troopType!==troopType) ? (cmd.troops||0) : 0;
      const capped = Math.min(newTotal, commandCap);
      const canDraw = barracksPool + oldReturning;
      const delta = capped - oldTroops;
      const finalTotal = delta > 0 ? oldTroops + Math.min(delta, canDraw) : capped;
      setBarracks(pool => {
        const poolAfterReturn = pool + oldReturning;
        const drawn = Math.max(0, finalTotal-oldTroops);
        const returned = Math.max(0, oldTroops-finalTotal);
        return poolAfterReturn - drawn + returned;
      });
      return prev.map(c => c.uid===uid ? { ...c, troopType, troops:finalTotal } : c);
    });
  }, [barracksPool, bldgs.commandcenter]);

  const returnTroops = useCallback((uid) => {
    setCmds(prev => {
      const cmd = prev.find(c => c.uid===uid);
      if (!cmd || !cmd.troops) return prev;
      setBarracks(pool => pool + (cmd.troops||0));
      return prev.map(c => c.uid===uid ? { ...c, troops:0, troopType:null } : c);
    });
  }, []);

  const upgrade = useCallback(type => {
    const lvl = bldgs[type]||0;
    const avail = maxAvailLevel(type, bldgs.hq||1);
    if (lvl >= avail || upgQueue[type]) return;
    const c = upgCost(type, lvl);
    if (!canAfford(c)) return;
    const dur = upgDuration(type, lvl+1);
    setRss(p => Object.fromEntries(Object.entries(p).map(([k,v]) => [k, v-(c[k]||0)])));
    setUpgQueue(q => ({ ...q, [type]:{ endsAt:Date.now()+dur, startedAt:Date.now(), newLvl:lvl+1, dur } }));
  }, [bldgs, canAfford, upgQueue]);

  // ── Pull pricing helpers (doc §6.1) ─────────────────────────────────────────
  // 1st daily pull: free. 2nd daily pull: 200 gems. All further: 400 gems.
  // "daily" resets at 00:00 UTC.
  const todayUTC = () => new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const isFreeAvailable  = lastFreePull !== todayUTC();
  const isHalfAvailable  = !isFreeAvailable && !dailyHalfUsed;

  const pullCost = (n) => {
    if (n === 10) return 4000; // 10× at full price
    if (isFreeAvailable)  return 0;    // 1st daily: free
    if (isHalfAvailable)  return 200;  // 2nd daily: half price
    return 400;                         // all further: full price
  };

  const pull = useCallback((n) => {
    const cost = pullCost(n);
    if (cost > 0 && gems < cost) return;

    if (cost > 0) setGems(g => g - cost);
    if (isFreeAvailable && n === 1)      setLastFreePull(todayUTC());
    else if (isHalfAvailable && n === 1) setDailyHalfUsed(true);

    const alignFactions    = ALIGNMENT[playerAlignment]?.factions;
    const playerAlignKey   = playerAlignment; // "humans"|"creatures"
    const hqk              = `${HQP.player.c},${HQP.player.r}`;
    const newPity          = { ...pityCounters };
    const newGear          = [];
    const newSchematics    = [];
    const allPullResults   = [];

    // Build commander pool for this alignment (for schematic targeting)
    const commanderPool = HDEFS.filter(h => alignFactions && alignFactions.includes(h.faction));

    // Each "pull" is 3 slots (doc §6.2). For x10 we do 10 × 3-slot pulls.
    for (let p = 0; p < n; p++) {
      const { slot1, slot2, slot3 } = rollFullPull(alignFactions, playerAlignKey, newPity, commanderPool);
      const slots = [slot1, slot2, slot3];

      const pullRow = { id: `pr_${Date.now()}_${p}`, slots: [] };

      slots.forEach(slot => {
        if (slot.type === "commander") {
          const forcedRarity = rollFullPullCmdRarity();
          const biasedCounters = { ...newPity };
          if (forcedRarity === "champion") biasedCounters.champion = 300;
          else if (forcedRarity === "veteran") biasedCounters.veteran = 100;
          else biasedCounters.soldier = 20;
          const [cmdResult] = rollGacha(1, alignFactions, biasedCounters);
          newPity[forcedRarity] = 0;
          pullRow.slots.push({ type: "commander", data: cmdResult });
        } else if (slot.type === "respectSchematic") {
          newSchematics.push(slot);
          pullRow.slots.push({ type: "respectSchematic", data: slot });
        } else {
          newGear.push(slot);
          pullRow.slots.push({ type: "gear", data: slot });
        }
      });

      allPullResults.push(pullRow);
    }

    setPityCounters(newPity);
    setPullResults(allPullResults);

    if (newGear.length) setGearInventory(prev => [...prev, ...newGear]);

    // Process commander results first so we know which are maxed before handling schematics
    const cmdResults = allPullResults
      .flatMap(pr => pr.slots)
      .filter(s => s.type === "commander")
      .map(s => s.data);

    // Schematics: commander-specific unless that commander is already r15 → becomes generic (+30)
    const processedSchematics = newSchematics.map(s => {
      if (s.isGeneric) return s; // already generic
      // Check if this commander is maxed in current collection
      // We can't read cmds state here synchronously, so we check via a snapshot passed in closure.
      // Instead we defer this check to the setCmds updater below and collect overflowed ones.
      return s; // will be checked after cmds update
    });
    if (processedSchematics.length) setRespectSchematics(prev => [...prev, ...processedSchematics]);

    if (cmdResults.length) {
      setCmds(prev => {
        const nx = [...prev];
        const overflowSchematics = [];
        cmdResults.forEach(h => {
          const existing = nx.find(x => x.id === h.id && x.owner === "player");
          if (!existing) {
            nx.push({ ...h, uid:h.uid, troops:0, troopType:null, tk:hqk, owner:"player", lvl:5, xp:0,
              respectPoints:0, respectLevel:0, skillPoints:{}, unspentSkillPoints:5,
              gear:{ helmet:null, armor:null, bracers:null, accessory:null } });
          } else {
            const points = existing.respectLevel >= RESPECT_MAX
              ? RESPECT_OVERFLOW_POINTS
              : RESPECT_DUPE_POINTS[h.rarity] ?? 120;
            const idx = nx.indexOf(existing);
            const updated = addRespect(existing, points);
            if (updated._justPromoted) floaty(`⬆ ${existing.n} → ${updated.rarity}!`, "#f0c040", hqk);
            nx[idx] = { ...updated, _justPromoted: null };
          }
        });
        // Convert commander-specific schematics targeting a maxed (r15) commander → generic (+30)
        if (processedSchematics.length) {
          const converted = processedSchematics.map(s => {
            if (s.isGeneric || !s.commanderId) return null; // already handled above
            const ownerCmd = nx.find(x => x.id === s.commanderId && x.owner === "player");
            if (ownerCmd && ownerCmd.respectLevel >= RESPECT_MAX) {
              // Commander is maxed → downgrade to generic schematic
              return { ...s, isGeneric: true, commanderId: null, commanderName: null,
                points: 30, n: `Generic ${s.rarity.charAt(0).toUpperCase() + s.rarity.slice(1)} Schematic` };
            }
            return null; // not maxed, leave as-is
          }).filter(Boolean);
          if (converted.length) {
            // Replace the converted ones in respectSchematics
            setRespectSchematics(prev => {
              const ids = new Set(converted.map(c => c.instanceId));
              return [...prev.filter(x => !ids.has(x.instanceId)), ...converted];
            });
          }
        }
        return nx;
      });
      setColl(prev => {
        const nx = [...prev];
        cmdResults.forEach(h => { if (!nx.find(x => x.id === h.id)) nx.push(h); });
        return nx;
      });
    }
  }, [gems, playerAlignment, pityCounters, isFreeAvailable, isHalfAvailable]);

  // ── Tile click ──
  const onTileClick = useCallback((k, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    const tile = tiles[k];
    if (!tile) return;

    if (mode==="selectMarchDest" && mvCmd) {
      if (k===mvCmd.tk) { setMode("view"); setMvCmd(null); return; }
      if (tile.owner!=="player") { floaty("⚠ Can only move to owned tiles", "#cc8030", k); return; }
      startMarch(mvCmd, k);
      return;
    }

    if (tile.isHQ && tile.owner==="player") {
      setHqOpen(true); setMode("view"); setSelKey(null); setPopupPos(null); setAtkKey(null); setPick(null); return;
    }

    const elev = tile.isHQ ? 14 : tile.isWin ? 10 : 4;
    const { cx, cy } = isoXY(tile.c, tile.r);
    const screenX = cx * zoom + panRef.current.x;
    const screenY = (cy - elev) * zoom + panRef.current.y + 38;
    const POPUP_W = 180, POPUP_H = 160;
    const px = Math.min(window.innerWidth-POPUP_W-8, Math.max(8, screenX-POPUP_W/2));
    const py = Math.max(46, screenY-POPUP_H-16);

    setSelKey(k); setPopupPos({ x:px, y:py }); setPopupMode("main"); setEditArmyCmd(null);
    setMode("view"); setAtkKey(null); setPick(null); setMvCmd(null); setReinCmd(null);
  }, [tiles, mode, mvCmd, startMarch, zoom, floaty]);

  // ── Screen routing ──
  if (screen==="title")   return <TitleScreen setScreen={setScreen} />;
  if (screen==="faction") return (
    <FactionScreen
      setScreen={setScreen} setFacKey={setFacKey} setFacName={setFacName}
      setAiFaction={setAiFaction} setAiRss={setAiRss} setAiBldgs={setAiBldgs}
      setAiBarracksPool={setAiBarracksPool} aiLastActionRef={aiLastActionRef}
      setCmds={setCmds} setColl={setColl} setTiles={setTiles}
    />
  );
  if (screen==="gacha")   return (
    <GachaScreen
      screen={screen} tiles={tiles} gems={gems} pull={pull}
      pullResults={pullResults} coll={coll}
      gearInventory={gearInventory} setGearInventory={setGearInventory}
      respectSchematics={respectSchematics}
      cmds={cmds} setCmds={setCmds}
      onSchematicUsed={(id) => setRespectSchematics(prev => prev.filter(s => s.instanceId !== id))}
      pityCounters={pityCounters}
      isFreeAvailable={isFreeAvailable}
      isHalfAvailable={isHalfAvailable}
      playerAlignment={playerAlignment} setScreen={setScreen}
    />
  );

  // ── Game screen ──
  return (
    <div style={{width:"100vw",height:"100vh",position:"relative",overflow:"hidden",background:"#0e1014",userSelect:"none",touchAction:"none"}}>


      {/* ── Loading overlay ── */}
      {!mapReady && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "#080704",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 18,
        }}>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes pulse { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
          `}</style>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            border: "3px solid #2a2010",
            borderTop: "3px solid #f0c040",
            animation: "spin 1s linear infinite",
          }} />
          <div style={{
            fontFamily: "'Cinzel',serif", fontSize: 13,
            color: "#8a6030", letterSpacing: ".2em",
            animation: "pulse 1.6s ease-in-out infinite",
          }}>LOADING</div>
        </div>
      )}
      <HUD facName={facName} pKeys={pKeys} rss={rss} gems={gems} />

      <MapRenderer
        tiles={tiles} cmds={cmds} reinMarches={reinMarches} selKey={selKey} mode={mode} mvCmd={mvCmd}
        panSt={panSt} zoom={zoom} ZOOM_LEVELS={ZOOM_LEVELS}
        onTileClick={onTileClick}
        onPanChange={np => { panRef.current=np; setPanSt(np); }}
        onZoomChange={setZoom}
      />

      {/* Zoom controls */}
      <div style={{position:"fixed",right:10,top:46,zIndex:190,display:"flex",flexDirection:"column",gap:4}}>
        <button className="btn" onClick={() => setZoom(prev => ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length-1,ZOOM_LEVELS.indexOf(prev)+1)])}
          style={{width:36,height:36,background:"rgba(8,10,14,.92)",border:"1px solid #2a2010",color:"#c8a060",fontSize:18,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6,boxShadow:"0 2px 8px rgba(0,0,0,.5)"}}>+</button>
        <div style={{textAlign:"center",fontSize:8,color:"#4a4a5a",fontFamily:"'Cinzel',serif",lineHeight:1.2,padding:"2px 0"}}>{Math.round(zoom*100)}%</div>
        <button className="btn" onClick={() => setZoom(prev => ZOOM_LEVELS[Math.max(0,ZOOM_LEVELS.indexOf(prev)-1)])}
          style={{width:36,height:36,background:"rgba(8,10,14,.92)",border:"1px solid #2a2010",color:"#c8a060",fontSize:18,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6,boxShadow:"0 2px 8px rgba(0,0,0,.5)"}}>−</button>

      </div>

      {/* Floaties */}
      {floats.map(f => (
        <div key={f.id} style={{position:"fixed",left:f.x,top:f.y,zIndex:600,pointerEvents:"none",fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:12,color:f.col,animation:"floatUp 1.8s ease forwards",textShadow:"0 1px 6px rgba(0,0,0,.9)",whiteSpace:"nowrap"}}>
          {f.txt}
        </div>
      ))}

      <TilePopup
        selKey={selKey} selTile={selTile} popupPos={popupPos}
        popupMode={popupMode} setPopupMode={setPopupMode}
        cmds={cmds} cmdsOnSel={cmdsOnSel} marchingToSel={marchingToSel} canAtk={canAtk}
        barracksPool={barracksPool} editArmyCmd={editArmyCmd} setEditArmyCmd={setEditArmyCmd}
        sliderVals={sliderVals} setSliderVals={setSliderVals}
        deletingTiles={deletingTiles} deletingSecsLeft={deletingSecsLeft}
        setDeletingTiles={setDeletingTiles} setDeletingSecsLeft={setDeletingSecsLeft}
        setSelKey={setSelKey} setPopupPos={setPopupPos}
        setAtkKey={setAtkKey} setMode={setMode} setPick={setPick}
        setMvCmd={setMvCmd} setReinCmd={setReinCmd}
        recallMarch={recallMarch} recallStationary={recallStationary}
        setBarracks={setBarracks} setCmds={setCmds}
        nowTick={nowTick}
      />

      {showBattleLog && (
        <BattleLog
          battles={battles} bLog={bLog} unseenBattles={unseenBattles}
          onClose={() => setShowBattleLog(false)}
        />
      )}

      {mode==="pickAttackCmd" && (
        <CommanderPicker
          atkKey={atkKey} tiles={tiles} cmdsAdjToSel={cmdsAdjToSel}
          pickCmd={pickCmd} setPick={setPick}
          setMode={setMode} setAtkKey={setAtkKey}
          setSelKey={setSelKey} setPopupPos={setPopupPos}
          startMarch={startMarch}
        />
      )}

      {panelOpen && (
        <BottomPanel
          mode={mode} mvCmd={mvCmd} setMvCmd={setMvCmd}
          reinCmd={reinCmd} setReinCmd={setReinCmd}
          cmdsOnSel={cmdsOnSel} barracksPool={barracksPool}
          bldgs={bldgs} sliderVals={sliderVals} setSliderVals={setSliderVals}
          startReinforcement={startReinforcement}
          setMode={setMode} setAtkKey={setAtkKey} setPick={setPick}
          setSelKey={setSelKey} setPopupPos={setPopupPos}
          gearInventory={gearInventory}
        />
      )}

      <HQMenu
        hqOpen={hqOpen} setHqOpen={setHqOpen} hqTab={hqTab} setHqTab={setHqTab}
        cmds={cmds} setCmds={setCmds} tiles={tiles} rss={rss} gems={gems} pKeys={pKeys}
        bldgs={bldgs} barracksPool={barracksPool} setBarracks={setBarracks}
        woundedTroops={woundedTroops} trainingQueue={trainingQueue}
        trainSlider={trainSlider} setTrainSlider={setTrainSlider}
        upgQueue={upgQueue} sliderVals={sliderVals} setSliderVals={setSliderVals}
        bLog={bLog} upgrade={upgrade} canAfford={canAfford}
        assignTroops={assignTroops} returnTroops={returnTroops} queueTraining={queueTraining}
        recallMarch={recallMarch} setScreen={setScreen}
        gearInventory={gearInventory}
      />

      {winner && (
        <WinScreen
          winner={winner} aiFaction={aiFaction}
          setWinner={setWinner} setTiles={setTiles} setCmds={setCmds}
          setMode={setMode} setSelKey={setSelKey} setUpgQueue={setUpgQueue}
          setBldgs={setBldgs} setBarracks={setBarracks}
          setAiRss={setAiRss} setAiBldgs={setAiBldgs} setAiBarracksPool={setAiBarracksPool}
          aiLastActionRef={aiLastActionRef} setScreen={setScreen}
        />
      )}

      <Minimap tiles={tiles} cmds={cmds} panSt={panSt} />

      {gearScreenOpen && (
        <GearScreen
          gearInventory={gearInventory}
          setGearInventory={setGearInventory}
          cmds={cmds}
          setCmds={setCmds}
          playerAlignment={playerAlignment}
          onClose={() => setGearScreenOpen(false)}
        />
      )}

      {cmdScreenOpen && (
        <CommanderScreen
          cmds={cmds}
          setCmds={setCmds}
          bldgs={bldgs}
          gearInventory={gearInventory}
          setGearInventory={setGearInventory}
          respectSchematics={respectSchematics}
          onSchematicUsed={(id) => setRespectSchematics(prev => prev.filter(s => s.instanceId !== id))}
          initialUid={cmdScreenUid}
          gems={gems}
          setGems={setGems}
          onClose={() => { setCmdScreenOpen(false); setCmdScreenUid(null); }}
        />
      )}

      <GameBar
        cmds={cmds}
        facName={facName}
        unseenBattles={unseenBattles}
        setHqOpen={setHqOpen} setHqTab={setHqTab}
        setScreen={setScreen}
        setShowBattleLog={setShowBattleLog}
        setUnseenBattles={setUnseenBattles}
        setCmdScreenOpen={setCmdScreenOpen}
        setCmdScreenUid={setCmdScreenUid}
        setGearScreenOpen={setGearScreenOpen}
        gearInventoryCount={gearInventory.length}
      />

    </div>
  );
}
