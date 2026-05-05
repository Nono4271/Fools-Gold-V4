// src/hooks/useGameLoop.js
// ─────────────────────────────────────────────────────────────────────────────
// Replaces the scattered setInterval calls in Game.jsx, useMarch.js,
// useAI.js, and useResources.js with a single Web Worker (gameLoop.worker.js).
//
// The worker owns all timing; this hook:
//   1. Spawns the worker once and keeps it alive for the session.
//   2. Sends a state snapshot whenever relevant state changes.
//   3. Dispatches each worker message to the correct handler callback.
//
// Callbacks supplied by Game.jsx (same signatures as before, so existing
// logic doesn't change — only the trigger moves off-main-thread):
//   onMarchStep(updates, now)     — apply commander position deltas
//   onDrawTick(expiredUids, now)  — run draw-timer rematch logic
//   onSiegeReset(changedKeys, now)— reset garrison on those tile keys
//   onReinStep(updates, now)      — apply reinforcement convoy deltas
//   onAiRssTick(now)              — increment AI resources
//   onAiMarchCheck(now)           — run AI march decision pass
//   onAiEconTick(now)             — run AI economy pass
//   onTick(now)                   — update nowTick (HUD countdowns)

import { useEffect, useRef } from 'react';

export function useGameLoop({
  screen,
  // snapshot pieces — only the fields the worker needs for timing
  cmds,
  tiles,           // pass tilesRef.current snapshot (shallow copy OK)
  reinMarches,
  aiFaction,
  // callbacks
  onMarchStep,
  onDrawTick,
  onSiegeReset,
  onReinStep,
  onAiRssTick,
  onAiMarchCheck,
  onAiEconTick,
  onTick,
}) {
  const workerRef   = useRef(null);
  const callbackRef = useRef({});

  // Keep callbacks current without re-creating the worker
  useEffect(() => {
    callbackRef.current = {
      onMarchStep, onDrawTick, onSiegeReset,
      onReinStep, onAiRssTick, onAiMarchCheck, onAiEconTick, onTick,
    };
  });

  // Spawn worker once
  useEffect(() => {
    const worker = new Worker(
      new URL('./gameLoop.worker.js', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e) => {
      const { type } = e.data;
      const cb = callbackRef.current;
      switch (type) {
        case 'marchStep':   cb.onMarchStep?.(e.data.updates, e.data.now);     break;
        case 'drawTick':    cb.onDrawTick?.(e.data.expiredUids, e.data.now);   break;
        case 'siegeReset':  cb.onSiegeReset?.(e.data.changedKeys, e.data.now); break;
        case 'reinStep':    cb.onReinStep?.(e.data.updates, e.data.now);       break;
        case 'aiRssTick':   cb.onAiRssTick?.(e.data.now);                      break;
        case 'aiMarchCheck':cb.onAiMarchCheck?.(e.data.now);                   break;
        case 'aiEconTick':  cb.onAiEconTick?.(e.data.now);                     break;
        case 'tick':        cb.onTick?.(e.data.now);                           break;
        default: break;
      }
    };

    worker.onerror = (err) => {
      console.error('[gameLoop worker]', err);
    };

    worker.postMessage({ type: 'init' });
    workerRef.current = worker;

    return () => {
      worker.postMessage({ type: 'pause' });
      worker.terminate();
      workerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause / resume when screen changes
  useEffect(() => {
    const w = workerRef.current;
    if (!w) return;
    if (screen === 'game') {
      w.postMessage({ type: 'resume' });
    } else {
      w.postMessage({ type: 'pause' });
    }
  }, [screen]);

  // Send snapshot whenever key state changes
  // Tiles is a huge map — we only need the keys/fields the worker uses for timing.
  // Build a lightweight snapshot to avoid transferring 3 MB of tile data on every
  // render: pull only the garrison-reset-relevant fields.
  useEffect(() => {
    const w = workerRef.current;
    if (!w || screen !== 'game') return;

    // Lightweight tile snapshot: only tiles with active garrison resets
    const tileSnapshot = {};
    if (tiles) {
      for (const [k, t] of Object.entries(tiles)) {
        if (t.garrisonDefeated && t.resetAt) {
          tileSnapshot[k] = { garrisonDefeated: true, resetAt: t.resetAt };
        }
      }
    }

    // Commander snapshot: only marching / draw-timer fields
    const cmdSnapshot = cmds
      ? cmds.map(c => ({
          uid:       c.uid,
          owner:     c.owner,
          tk:        c.tk,
          troops:    c.troops,
          drawTimer: c.drawTimer,
          march:     c.march
            ? {
                type:         c.march.type,
                path:         c.march.path,
                step:         c.march.step,
                stepMs:       c.march.stepMs,
                lastStepTime: c.march.lastStepTime,
                arrived:      c.march.arrived,
              }
            : null,
        }))
      : [];

    w.postMessage({
      type: 'snapshot',
      data: {
        screen,
        cmds:        cmdSnapshot,
        tiles:       tileSnapshot,
        reinMarches: reinMarches || [],
        aiFaction:   aiFaction || null,
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, cmds, tiles, reinMarches, aiFaction]);
}
