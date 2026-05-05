import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { flushSync } from "react-dom";
import { MapRenderer } from "./MapRenderer";

// Constants
import { CSS } from "./constants/css.js";
import { ALIGNMENT, getFactionAlignment, PLAYABLE_FACTIONS } from "./constants/factions.js";
import { HDEFS, RC, RARITY, CLASS, rollGacha, addRespect, RESPECT_DUPE_POINTS, RESPECT_OVERFLOW_POINTS, RESPECT_MAX, npcForPowerLevel } from "./constants/heroes.js";
import { rollFullPull, rollGearSchematic, createRespectSchematic, GEAR_RARITY, GEAR_SLOTS, rollFullPullCmdRarity } from "./constants/gear.js";
import { HQP, AI_HQ_KEY, WIN_KEY, RKEYS, RSS, POWER_DEFS, SIEGE_BASE, SIEGE_KEEP_BASE, calcSiegePower, hqSiegeValue } from "./constants/map.js";
import { TROOP, TROOP_KEYS, CMD_LVL_MAX, xpToNext } from "./constants/troops.js";
import { barracksCapacity, cmdCommand, upgCost, upgDuration, maxAvailLevel, trainRate, maxTrainBatch } from "./constants/buildings.js";
import { isoXY, TW, TH, ISO_W, ISO_H } from "./constants/geometry.js";
import { FACTION_REGIONS, REGION_LIST } from "./constants/regions.js";

// Utils
import { bfsPath, adj, effectiveMarchSpd, marchStepMs, setImpassableTiles } from "./utils/pathfinding.js";
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
import WorldMap from "./components/game/WorldMap.jsx";
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

  // ── Tiles — stored in a mutable ref to avoid 490k React reconciliation ──
  // Components read tilesRef.current directly. Re-renders are triggered by
  // incrementing tileVersion (a plain integer) when the map changes.
  const [tileVersion, setTileVersion] = useState(0);
  const tilesMapRef = useRef({});
  // 'tiles' alias so existing code reads work without change
  const tiles = tilesMapRef.current;
  // setTiles — for full map replacement (initial load, reset)
  const setTiles = useCallback((updater) => {
    if (typeof updater === "function") {
      tilesMapRef.current = updater(tilesMapRef.current);
    } else {
      tilesMapRef.current = updater;
    }
    setTileVersion(v => v + 1);
  }, []);

  // patchTile — O(1) single-tile update, avoids spreading 490k keys
  // Also maintains pKeys when ownership changes
  const patchTile = useCallback((key, patch) => {
    const t = tilesMapRef.current[key];
    if (!t) return;
    tilesMapRef.current[key] = { ...t, ...patch };
    // Maintain pKeys incrementally if ownership changed
    if ('owner' in patch && patch.owner !== t.owner) {
      const newSet = new Set(pKeysRef.current);
      if (patch.owner === "player") newSet.add(key);
      else newSet.delete(key);
      pKeysRef.current = newSet;
      setPKeys(newSet);
    }
    setTileVersion(v => v + 1);
  }, []);
  const [mapReady, setMapReady] = useState(false);
  const [loadPct,  setLoadPct]  = useState(0);
  const [loadLabel,setLoadLabel]= useState("Generating world...");
  const [playerHqKey, setPlayerHqKey] = useState(null); // dynamic per-game HQ tile
  const [rss,    setRss]     = useState({ stone:300, wood:300, ore:300, gas:300 });
  const [gems,   setGems]    = useState(4400);
  // Bug 6 fix: start empty — FactionScreen sets the correct faction's commanders before game screen mounts
  const [cmds,   setCmds]    = useState([]);
  const [coll,   setColl]    = useState([]);
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

  // ── AI state — 5 AI players (one per non-player faction) ──
  const [aiFaction,      setAiFaction]      = useState(null); // kept for backwards compat (primary AI)
  const [aiRss,          setAiRss]          = useState({ stone:300, wood:300, ore:300, gas:300 });
  const [aiBldgs,        setAiBldgs]        = useState({ hq:1, quarry:0, lumber:0, forge:0, refinery:0, barracks:0, training:0, commandcenter:0, healingtent:0, walls:0 });
  const [aiBarracksPool, setAiBarracksPool] = useState(barracksCapacity(0));
  const aiLastActionRef = useRef(0);
  // Per-AI faction HQ keys (keyed by faction string)
  const [aiHqKeys, setAiHqKeys] = useState({});

  // ── Refs for AI hooks ──
  const cmdsRef    = useRef([]);
  const tilesRef   = tilesMapRef; // tilesRef IS tilesMapRef — same object, always current
  const aiRssRef   = useRef({ stone:300, wood:300, ore:300, gas:300 });
  const aiBldgsRef = useRef({ hq:1, quarry:0, lumber:0, forge:0, refinery:0, barracks:0, training:0, commandcenter:0, healingtent:0, walls:0 });
  const aiPoolRef  = useRef(barracksCapacity(0));
  // Ref that always holds the current player HQ key for use in callbacks/intervals
  const playerHqRef = useRef(null);

  useEffect(() => { cmdsRef.current    = cmds;           }, [cmds]);
  // tilesRef always points to tilesMapRef.current — no sync needed
  useEffect(() => { aiRssRef.current   = aiRss;          }, [aiRss]);
  useEffect(() => { aiBldgsRef.current = aiBldgs;        }, [aiBldgs]);
  useEffect(() => { aiPoolRef.current  = aiBarracksPool; }, [aiBarracksPool]);
  useEffect(() => { playerHqRef.current = playerHqKey;   }, [playerHqKey]);

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
    const playerHQKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
    const newPlayerSiegeMax = hqSiegeValue(bldgs.walls || 0);
    const tile = tilesMapRef.current[playerHQKey];
    if (!tile) return;
    const newSiege = Math.min(tile.siege ?? newPlayerSiegeMax, newPlayerSiegeMax);
    patchTile(playerHQKey, { siegeMax: newPlayerSiegeMax, siege: newSiege });
  }, [bldgs.walls, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    const newAiSiegeMax = hqSiegeValue(aiBldgs.walls || 0);
    Object.values(tilesMapRef.current).filter(t => t.isHQ && t.owner === "ai").forEach(tile => {
      const newSiege = Math.min(tile.siege ?? newAiSiegeMax, newAiSiegeMax);
      patchTile(tile.k, { siegeMax: newAiSiegeMax, siege: newSiege });
    });
  }, [aiBldgs.walls, mapReady]);

  // ── Player army ──
  const [barracksPool,   setBarracks]      = useState(barracksCapacity(0));
  const [woundedTroops,  setWounded]       = useState(0);
  // Bug 8: healed troops that couldn't fit in barracksPool wait here until capacity opens up
  const [woundedQueue,   setWoundedQueue]  = useState(0);
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
  const reinMarchesRef = useRef([]);
  useEffect(() => { reinMarchesRef.current = reinMarches; }, [reinMarches]);
  const [sliderVals, setSliderVals] = useState({});
  const [floats,     setFloats]    = useState([]);
  const [winner,     setWinner]    = useState(null);
  const [deletingTiles,    setDeletingTiles]    = useState({});
  const [deletingSecsLeft, setDeletingSecsLeft] = useState({});

  // Ticks every second so draw-rematch countdowns in TilePopup stay live
  const [nowTick, setNowTick] = useState(() => Date.now());

  // ── Center view on player HQ ──
  const centerOnHQ = useCallback(() => {
    const hqKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
    const [hc, hr] = hqKey.split(",").map(Number);
    const { cx, cy } = isoXY(hc, hr);
    const z = zoomRef.current;
    const px = -cx * z + window.innerWidth / 2;
    const py = -cy * z + window.innerHeight / 2;
    panRef.current = { x: px, y: py };
    mapRendererRef.current?.teleport(px, py);
  }, []);

  const onPanChange = useCallback(np => { panRef.current = np; }, []);

  // ── Teleport to tile coordinate (used by WorldMap) ──
  const teleportTo = useCallback((tc, tr) => {
    const { cx, cy } = isoXY(tc, tr);
    const z = zoomRef.current;
    const px = -cx * z + window.innerWidth / 2;
    const py = -cy * z + window.innerHeight / 2;
    panRef.current = { x: px, y: py };
    mapRendererRef.current?.teleport(px, py);
  }, []);

  // ── HQ menu ──
  const [hqOpen, setHqOpen] = useState(false);
  const [worldMapOpen, setWorldMapOpen] = useState(false);
  const [worldMapPrompt, setWorldMapPrompt] = useState(false);
  const [hqTab,  setHqTab]  = useState("overview");
  const [cmdScreenOpen,  setCmdScreenOpen]  = useState(false);
  const [cmdScreenUid,   setCmdScreenUid]   = useState(null);
  const [gearScreenOpen, setGearScreenOpen] = useState(false);

  // ── Map pan/zoom ──
  const panRef  = useRef({ x:4, y:4 });
  const mapRendererRef = useRef(null);
  const [panSt, setPanSt] = useState({ x:4, y:4 });
  const [zoom,  setZoom]  = useState(1.25);
  const zoomRef = useRef(1);
  const modeRef = useRef("view");
  const mvCmdRef = useRef(null);
  const ZOOM_LEVELS = useMemo(() => [0.75, 1.0, 1.25, 1.5], []);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { mvCmdRef.current = mvCmd; }, [mvCmd]);

  // Clamp pan whenever zoom changes so the viewport never lands outside the tile grid.
  const handleZoomChange = useCallback((newZoom) => {
    if (newZoom < ZOOM_LEVELS[0]) { setWorldMapPrompt(true); return; }
    setZoom(newZoom);
    // MapRenderer's useEffect([zoom]) recomputes and applies the clamped pan position.
    // Do NOT call setPanSt here — it fires useEffect([panSt]) which overwrites
    // world.x/y with a value computed from a potentially stale panRef, causing the snap.
  }, []);

  // ── Init map on game start via Web Worker ──
  useEffect(() => {
    if (screen !== "game" || tiles.__ready) return;

    setLoadPct(0);
    setLoadLabel("Generating world...");

    const worker = new Worker(
      new URL("./workers/mapGen.worker.js", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (e) => {
      const { type, pct, label, map, spawnKeys } = e.data;

      if (type === "progress") {
        setLoadPct(pct);
        if (label) setLoadLabel(label);
        return;
      }

      if (type === "done") {
        worker.terminate();
        setLoadPct(100);
        setLoadLabel("Almost there...");

        const rawMap = map;

        // Place player HQ
        const playerSpawn = spawnKeys[facKey];
        if (playerSpawn && rawMap[playerSpawn]) {
          rawMap[playerSpawn] = {
            ...rawMap[playerSpawn],
            owner: "player", isHQ: true, garrison: 0,
            terrain: "grass", rss: null, defCmd: null,
            siege: hqSiegeValue(0), siegeMax: hqSiegeValue(0),
            garrisonDefeated: false, resetAt: null,
          };
          // 2x2 HQ footprint — mark adjacent tiles as visual HQ parts
          const [hc, hr] = playerSpawn.split(",").map(Number);
          [[1,0],[0,1],[1,1]].forEach(([dc,dr]) => {
            const fk = `${hc+dc},${hr+dr}`;
            if (rawMap[fk] && !rawMap[fk].isShore) {
              rawMap[fk] = { ...rawMap[fk], isHQPart: true, hqPrimaryKey: playerSpawn,
                terrain: "grass", rss: null, owner: "player" };
            }
          });
          setPlayerHqKey(playerSpawn);
          const { cx, cy } = isoXY(hc, hr);
          const initZoom = 1.25; // matches default zoom state
          const px = -cx * initZoom + window.innerWidth / 2;
          const py = -cy * initZoom + window.innerHeight / 2;
          panRef.current = { x: px, y: py };
          setPanSt({ x: px, y: py });
        }

        // Place AI HQs
        const allFactions = ["pirates","merfolk","marines","orcs","bountyhunters","dragons"];
        const aiFactions  = allFactions.filter(f => f !== facKey);
        const newAiHqKeys = {};
        aiFactions.forEach(aiFk => {
          const spawn = spawnKeys[aiFk];
          if (spawn && rawMap[spawn]) {
            rawMap[spawn] = {
              ...rawMap[spawn],
              owner: "ai", isHQ: true, garrison: 0,
              terrain: "grass", rss: null, defCmd: null,
              siege: hqSiegeValue(0), siegeMax: hqSiegeValue(0),
              garrisonDefeated: false, resetAt: null,
            };
            const [ahc, ahr] = spawn.split(",").map(Number);
            [[1,0],[0,1],[1,1]].forEach(([dc,dr]) => {
              const fk = `${ahc+dc},${ahr+dr}`;
              if (rawMap[fk] && !rawMap[fk].isShore) {
                rawMap[fk] = { ...rawMap[fk], isHQPart: true, hqPrimaryKey: spawn,
                  terrain: "grass", rss: null, owner: "ai" };
              }
            });
            newAiHqKeys[aiFk] = spawn;
          }
        });
        setAiHqKeys(newAiHqKeys);

        const oppAlign   = playerAlignment === "humans" ? "creatures" : "humans";
        const primaryAiFk = aiFactions.find(f =>
          (oppAlign === "humans"
            ? ["pirates","marines","bountyhunters"]
            : ["merfolk","orcs","dragons"]).includes(f)
        ) || aiFactions[0];
        setAiFaction(primaryAiFk);

        // Relocate commanders from placeholder to real HQ keys
        setCmds(prev => prev.map(cmd => {
          if (cmd.owner === "player") {
            const spawn = spawnKeys[facKey];
            return spawn ? { ...cmd, tk: spawn } : cmd;
          }
          if (cmd.owner === "ai" && cmd.faction) {
            const spawn = spawnKeys[cmd.faction];
            return spawn ? { ...cmd, tk: spawn } : cmd;
          }
          return cmd;
        }));

        rawMap.__ready = true; // flag checked by mapReady effect
        // Populate impassable set for pathfinding (ocean + border mountain tiles)
        const impassableKeys = Object.values(rawMap)
          .filter(t => t.isOcean || t.isBorderMtn)
          .map(t => t.k);
        setImpassableTiles(impassableKeys);
        setTiles(rawMap);
      }
    };

    worker.onerror = (err) => {
      console.error("mapGen worker error:", err);
      worker.terminate();
      setLoadLabel("Error generating map — please refresh");
    };

    worker.postMessage({ facKey });

    return () => worker.terminate();
  }, [screen]);

  // ── Reset mapReady when leaving game ──
  useEffect(() => {
    if (screen !== "game") {
      setMapReady(false);
      setTiles({});  // empty object, no __ready flag
      setLoadPct(0);
      setLoadLabel("Generating world...");
    }
  }, [screen]);

  // ── Mark map ready once tiles are populated ──
  useEffect(() => {
    if (screen === "game" && tilesMapRef.current.__ready) {
      setMapReady(true);
    }
  }, [tileVersion, screen]);

  // ── Floaty helper ──
  const floaty = useCallback((txt, col, k) => {
    const [fc, fr] = k.split(",").map(Number);
    const tile = tilesRef.current[k];
    const { cx, cy } = isoXY(fc, fr);
    const elev = tile?.isHQ ? 14 : tile?.isWin ? 10 : tile?.isKeep ? 8 : 4;
    const screenX = cx * zoomRef.current + panRef.current.x;
    const screenY = (cy - elev) * zoomRef.current + panRef.current.y + 38;
    const id = Date.now() + Math.random();
    setFloats(f => [...f, { id, txt, col, x:screenX, y:screenY }]);
    setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1800);
  }, []);

  // ── Hooks ──
  useResources({ screen, tilesRef, bldgs, setRss });

  useAI({
    screen, aiFaction,
    cmdsRef, tilesRef, aiRssRef, aiBldgsRef, aiPoolRef, aiLastActionRef,
    setCmds, setAiRss, setAiBldgs, setAiBarracksPool,
  });

  useTraining({ screen, bldgs, setTrainingQueue, setBarracks, setWounded, woundedQueue, setWoundedQueue });

  useUpgrades({ screen, setUpgQueue, setBldgs, setBarracks });

  useMarch({
    screen, tiles, tileVersion, bldgs, cmds,
    setCmds, setTiles, patchTile, setWounded, setBarracks,
    setBattles, setBLog, setWinner, setUnseenBattles,
    tilesRef, floaty, gearInventory,
    playerHqKey: playerHqKey || playerHqRef.current || `${HQP.player.c},${HQP.player.r}`,
    aiHqKeys,
  });

  // ── Siege reset timer ──
  useEffect(() => {
    if (screen !== "game") return;
    const id = setInterval(() => {
      const now = Date.now();
      setNowTick(now);
      // Mutate tilesMapRef directly — no 490k spread needed
      let changed = false;
      Object.values(tilesMapRef.current).forEach(tile => {
        if (tile.garrisonDefeated && tile.resetAt && now >= tile.resetAt) {
          tilesMapRef.current[tile.k] = { ...tile, siege:tile.siegeMax, garrisonDefeated:false, resetAt:null };
          changed = true;
        }
      });
      if (changed) setTileVersion(v => v + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [screen]);

  // ── Reinforcement march tick ──
  useEffect(() => {
    if (screen !== "game") return;
    const hqKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
    const id = setInterval(() => {
      const now = Date.now();
      setReinMarches(prev => {
        if (!prev.length) return prev;
        const next = [];
        prev.forEach(rm => {
          // Bug 31 fix: guard against a rein march with a null/empty path
          if (!rm.path || rm.path.length === 0) return;
          // ── Redirect: turn back if target commander is gone or tile flipped ──
          if (!rm.returning) {
            const targetCmd  = cmdsRef.current.find(c => c.uid === rm.cmdUid && c.owner === "player");
            const destKey    = rm.path[rm.path.length - 1];
            const destTile   = tilesRef.current[destKey];
            // Only consider commander gone if they have no troops AND aren't mid-march
            // (a marching commander with 0 troops is retreating — still valid destination)
            const cmdGone    = !targetCmd || (targetCmd.troops === 0 && !targetCmd.march && targetCmd.tk !== destKey);
            const tileFlipped = destTile && destTile.owner !== "player" && destKey !== hqKey;
            if (cmdGone || tileFlipped) {
              const currentPos  = rm.path[Math.min(rm.step, rm.path.length - 1)] ?? hqKey;
              const returnPath  = bfsPath(currentPos, hqKey);
              if (returnPath && returnPath.length >= 2) {
                next.push({ ...rm, returning: true, path: returnPath, step: 0, lastStepTime: now });
              } else {
                // No return path — refund directly to barracks rather than losing the troops
                setBarracks(pool => {
                  const cap   = barracksCapacity(bldgs.barracks || 0);
                  const space = Math.max(0, cap - pool);
                  return pool + Math.min(rm.amount, space);
                });
              }
              floaty(`⚠ Reinforcements redirected to base`, "#cc8030", currentPos);
              return;
            }
          }

          const elapsed = now - rm.lastStepTime;
          if (elapsed < rm.stepMs) { next.push(rm); return; }
          const nextStep = rm.step + 1;
          if (nextStep >= rm.path.length) {
            if (rm.returning) {
              // Return to barracks — restore up to current capacity; excess is lost
              setBarracks(pool => {
                const cap   = barracksCapacity(bldgs.barracks || 0);
                const space = Math.max(0, cap - pool);
                return pool + Math.min(rm.amount, space);
              });
              floaty(`🏰 ${rm.amount} reinforcements returned to barracks`, "#88aaff", hqKey);
            } else {
              // Arrived — cap to command capacity; return any overflow to barracks
              setCmds(cmds => cmds.map(c => {
                if (c.uid !== rm.cmdUid) return c;
                const cap       = cmdCommand(c.lvl||5, bldgs.commandcenter||0, (c.cls==="leader"&&(c.lvl||5)>=25)?500:0);
                const newTroops = Math.min(cap, (c.troops||0) + rm.amount);
                // Bug 22 fix: troops that don't fit go back to barracks
                const overflow  = ((c.troops||0) + rm.amount) - newTroops;
                if (overflow > 0) {
                  setBarracks(pool => {
                    const bCap  = barracksCapacity(bldgs.barracks || 0);
                    const space = Math.max(0, bCap - pool);
                    return pool + Math.min(overflow, space);
                  });
                  floaty(`↩ ${overflow} troops returned (cmd full)`, "#88aaff", rm.path[rm.path.length-1]);
                }
                return { ...c, troops: newTroops };
              }));
              floaty(`+${rm.amount} reinforcements arrived!`, "#88aaff", rm.path[rm.path.length-1]);
            }
          } else {
            next.push({ ...rm, step: nextStep, lastStepTime: now });
          }
        });
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [screen, floaty, bldgs.barracks, bldgs.commandcenter]);

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
        expired.forEach(key => {
          const t = tilesMapRef.current[key];
          if (!t || t.owner !== "player") return;
          const pl = t.powerLevel || 1;
          const pd = POWER_DEFS[pl];
          const npc2 = npcForPowerLevel(pl);
          patchTile(key, { owner:null, garrison:pd?pd.troops:50, siege:t.siegeMax??SIEGE_BASE, siegeMax:t.siegeMax??SIEGE_BASE, garrisonDefeated:false, resetAt:null, defCmd:pd?{n:npc2.n,icon:npc2.icon,cls:npc2.cls,faction:null,rarity:'soldier',lvl:pd.cmdLvl,troops:pd.troops,troopType:npc2.troopType,atk:npc2.atk*pd.cmdLvl,spd:npc2.spd+pd.cmdLvl*2}:null });
        });
        const hqKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
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
  // pKeys — Set of player-owned tile keys, maintained via patchTileOwner
  const pKeysRef = useRef(new Set());
  const [pKeys, setPKeys] = useState(() => new Set());

  // Full rebuild only at map load
  useEffect(() => {
    if (!tilesMapRef.current.__ready) return;
    const newSet = new Set(Object.keys(tilesMapRef.current).filter(k => tilesMapRef.current[k]?.owner === "player"));
    pKeysRef.current = newSet;
    setPKeys(newSet);
  }, [mapReady]); // only fires when map becomes ready, not on every tile update

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
  }, [selTile, tileVersion]);

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
    const destTile = tilesMapRef.current[destKey];
    const type = destTile?.owner==="player" ? "move" : "attack";
    if (type==="move" && destTile?.owner!=="player") return;
    const path = bfsPath(cmd.tk, destKey);
    if (!path || path.length < 2) return;
    const boostedSpd = applyGearToCmd(cmd, gearInventory).spd || 60;
    const stepMs = marchStepMs(effectiveMarchSpd(boostedSpd, cmd.troopType));
    setCmds(p => p.map(c => c.uid===cmd.uid ? { ...c, march:{ type, path, step:0, dest:destKey, origin:cmd.tk, stepMs, lastStepTime:Date.now() } } : c));
    setMode("view"); setMvCmd(null); setSelKey(null); setPopupPos(null);
  }, [floaty, gearInventory]);

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
      const hqKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
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
    const hqKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
    const path = bfsPath(hqKey, cmd.tk);
    if (!path || path.length < 2) return;
    // Bug 32 fix: only one active (non-returning) rein march per commander allowed
    setReinMarches(prev => {
      if (prev.some(r => r.cmdUid === cmd.uid && !r.returning)) return prev;
      setBarracks(pool => Math.max(0, pool - amount));
      return [...prev, { uid:`rein_${Date.now()}`, cmdUid:cmd.uid, amount, path, step:0, stepMs: Math.max(100, Math.floor(marchStepMs(effectiveMarchSpd(applyGearToCmd(cmd, gearInventory).spd||60, cmd.troopType))/2)), lastStepTime:Date.now() }];
    });
    setMode("view"); setReinCmd(null);
    setSliderVals(v => ({ ...v, [`rein_${cmd.uid}`]:undefined }));
  }, [gearInventory]);

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
    const hqk              = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
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
    const tile = tilesRef.current[k];
    if (!tile) return;
    if (tile.isShore || tile.isOcean || tile.isBorderMtn) return;

    const mode = modeRef.current;
    const mvCmd = mvCmdRef.current;
    const zoom = zoomRef.current;

    if (mode==="selectMarchDest" && mvCmd) {
      if (k===mvCmd.tk) { setMode("view"); setMvCmd(null); return; }
      if (tile.owner!=="player") { floaty("⚠ Can only move to owned tiles", "#cc8030", k); return; }
      startMarch(mvCmd, k);
      return;
    }

    if (tile.isHQ && tile.owner==="player") {
      const { cx: hqCx, cy: hqCy } = isoXY(tile.c, tile.r);
      const sX = hqCx * zoom + panRef.current.x;
      const sY = (hqCy - 14) * zoom + panRef.current.y + 38;
      const POPUP_W = 120, POPUP_H = 60;
      const hqPx = Math.min(window.innerWidth-POPUP_W-8, Math.max(8, sX-POPUP_W/2));
      const hqPy = Math.max(46, sY-POPUP_H-12);
      flushSync(() => {
        setSelKey(k); setPopupPos({ x:hqPx, y:hqPy }); setPopupMode("hqEnter");
        setMode("view"); setAtkKey(null); setPick(null); setMvCmd(null); setReinCmd(null);
      });
      return;
    }

    const elev = tile.isHQ ? 14 : tile.isWin ? 10 : tile.isKeep ? 8 : 4;
    const { cx, cy } = isoXY(tile.c, tile.r);
    const screenX = cx * zoom + panRef.current.x;
    const screenY = (cy - elev) * zoom + panRef.current.y + 38;
    const POPUP_W = 180, POPUP_H = 160;
    const px = Math.min(window.innerWidth-POPUP_W-8, Math.max(8, screenX-POPUP_W/2));
    const py = Math.max(46, screenY-POPUP_H-16);

    flushSync(() => {
      setSelKey(k); setPopupPos({ x:px, y:py }); setPopupMode("main"); setEditArmyCmd(null);
      setMode("view"); setAtkKey(null); setPick(null); setMvCmd(null); setReinCmd(null);
    });
  }, [floaty, startMarch]);

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
      <style>{CSS}</style>


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
            fontFamily: "'Cinzel Decorative',serif", fontSize: 15,
            background: "linear-gradient(135deg,#f0c040,#c03030,#f0c040)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "shimmer 3s linear infinite",
            letterSpacing: ".15em",
          }}>FOOLS GOLD</div>
          {/* Progress bar */}
          <div style={{ width: 220, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{
              width: "100%", height: 4,
              background: "#1a1508", borderRadius: 2,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${loadPct}%`,
                background: "linear-gradient(90deg,#8a4020,#f0c040)",
                borderRadius: 2,
                transition: "width .4s ease",
              }} />
            </div>
            <div style={{
              fontFamily: "'Cinzel',serif", fontSize: 9,
              color: "#6a5030", letterSpacing: ".12em",
              textAlign: "center",
              animation: "pulse 1.6s ease-in-out infinite",
            }}>{loadLabel}</div>
          </div>
        </div>
      )}
      <HUD facName={facName} pKeys={pKeys} rss={rss} gems={gems} />

      <MapRenderer
        ref={mapRendererRef}
        tiles={tiles} cmds={cmds} selKey={selKey} mode={mode} mvCmd={mvCmd}
        reinMarchesRef={reinMarchesRef}
        panSt={panSt} zoom={zoom} ZOOM_LEVELS={ZOOM_LEVELS}
        onTileClick={onTileClick}
        onPanChange={onPanChange}
        onZoomChange={handleZoomChange}
      />

      {/* Zoom controls */}
      <div style={{position:"fixed",right:10,top:46,zIndex:190,display:"flex",flexDirection:"column",gap:4}}>
        <button className="btn" onClick={() => { const nz = ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length-1,ZOOM_LEVELS.indexOf(zoom)+1)]; handleZoomChange(nz); }}
          style={{width:36,height:36,background:"rgba(8,10,14,.92)",border:"1px solid #2a2010",color:"#c8a060",fontSize:18,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6,boxShadow:"0 2px 8px rgba(0,0,0,.5)"}}>+</button>
        <div style={{textAlign:"center",fontSize:8,color:"#4a4a5a",fontFamily:"'Cinzel',serif",lineHeight:1.2,padding:"2px 0"}}>{Math.round(zoom*100)}%</div>
        <button className="btn" onClick={() => {
            const idx = ZOOM_LEVELS.indexOf(zoom);
            if (idx <= 0) { setWorldMapPrompt(true); return; }
            handleZoomChange(ZOOM_LEVELS[idx - 1]);
          }}
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
        onEnterHQ={() => { setHqOpen(true); setHqTab("overview"); setSelKey(null); setPopupPos(null); }}
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
        playerHqKey={playerHqKey}
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
          reinMarches={reinMarches}
          playerHqKey={playerHqKey}
        />
      )}

      <HQMenu
        hqOpen={hqOpen} setHqOpen={setHqOpen} hqTab={hqTab} setHqTab={setHqTab}
        cmds={cmds} setCmds={setCmds} tiles={tiles} rss={rss} gems={gems} pKeys={pKeys}
        bldgs={bldgs} barracksPool={barracksPool} setBarracks={setBarracks}
        woundedTroops={woundedTroops} woundedQueue={woundedQueue} trainingQueue={trainingQueue}
        trainSlider={trainSlider} setTrainSlider={setTrainSlider}
        upgQueue={upgQueue} sliderVals={sliderVals} setSliderVals={setSliderVals}
        bLog={bLog} upgrade={upgrade} canAfford={canAfford}
        assignTroops={assignTroops} returnTroops={returnTroops} queueTraining={queueTraining}
        recallMarch={recallMarch} setScreen={setScreen}
        gearInventory={gearInventory}
        playerHqKey={playerHqKey}
      />

      {winner && (
        <WinScreen
          winner={winner} aiFaction={aiFaction}
          setWinner={setWinner} setTiles={setTiles} setCmds={setCmds}
          setMode={setMode} setSelKey={setSelKey} setUpgQueue={setUpgQueue}
          setBldgs={setBldgs} setBarracks={setBarracks}
          setAiRss={setAiRss} setAiBldgs={setAiBldgs} setAiBarracksPool={setAiBarracksPool}
          aiLastActionRef={aiLastActionRef} setScreen={setScreen}
          setWounded={setWounded} setWoundedQueue={setWoundedQueue}
          setRss={setRss} setReinMarches={setReinMarches}
          setTrainingQueue={setTrainingQueue} setBLog={setBLog}
          setBattles={setBattles} setUnseenBattles={setUnseenBattles}
          setDeletingTiles={setDeletingTiles} setDeletingSecsLeft={setDeletingSecsLeft}
          setPlayerHqKey={setPlayerHqKey} setAiHqKeys={setAiHqKeys}
        />
      )}

      <Minimap tiles={tiles} panSt={panSt} zoom={zoom} />

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

      {/* World map prompt when zooming past minimum */}
      {worldMapPrompt && (
        <div style={{
          position:"fixed", inset:0, zIndex:700,
          background:"rgba(0,0,0,0.75)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }} onClick={() => setWorldMapPrompt(false)}>
          <div style={{
            background:"rgba(5,7,11,0.98)",
            border:"1px solid #8a6020",
            borderRadius:8,
            padding:"20px 24px",
            width:220,
            textAlign:"center",
            boxShadow:"0 8px 40px rgba(0,0,0,0.8)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:13,color:"#c8a060",marginBottom:8}}>
              🗺 World Map
            </div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:9,color:"#6a5a4a",marginBottom:16,lineHeight:1.6}}>
              You're at maximum zoom out.<br/>Open the world map?
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <button onClick={() => { setWorldMapPrompt(false); setWorldMapOpen(true); }}
                style={{
                  padding:"8px 16px",
                  background:"linear-gradient(160deg,#2a1e08,#120e04)",
                  border:"1px solid #8a6020", borderRadius:4,
                  color:"#f0c060", fontFamily:"'Cinzel',serif",
                  fontSize:10, cursor:"pointer",
                }}>Open Map</button>
              <button onClick={() => setWorldMapPrompt(false)}
                style={{
                  padding:"8px 16px",
                  background:"none",
                  border:"1px solid #2a2418", borderRadius:4,
                  color:"#6a5a4a", fontFamily:"'Cinzel',serif",
                  fontSize:10, cursor:"pointer",
                }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {worldMapOpen && (
        <WorldMap
          tiles={tiles}
          onClose={() => setWorldMapOpen(false)}
          onTeleport={teleportTo}
          panRef={panRef}
          zoom={zoom}
        />
      )}

      <GameBar
        cmds={cmds}
        facName={facName}
        unseenBattles={unseenBattles}
        setHqOpen={setHqOpen} setHqTab={setHqTab}
        onCenterHQ={centerOnHQ}
        onWorldMap={() => setWorldMapOpen(true)}
        setScreen={setScreen}
        setShowBattleLog={setShowBattleLog}
        setUnseenBattles={setUnseenBattles}
        setCmdScreenOpen={setCmdScreenOpen}
        setCmdScreenUid={setCmdScreenUid}
        setGearScreenOpen={setGearScreenOpen}
        gearInventoryCount={gearInventory.length}
        playerHqKey={playerHqKey}
        hidden={worldMapOpen}
      />

    </div>
  );
}
