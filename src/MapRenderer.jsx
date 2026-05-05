import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, memo } from "react";
import * as PIXI from "pixi.js";
import { COLS, ROWS, TW, TH, TOP_PAD, ISO_W, ISO_H } from "./constants/geometry.js";

/* ─── Tile geometry ──────────────────────────────────────────────────────── */
function isoXY(c, r) {
  return {
    cx: (c - r) * (TW / 2) + (ROWS * TW / 2),
    cy: (c + r) * (TH / 2) + TOP_PAD,
  };
}

/* ─── Hex string → number ────────────────────────────────────────────────── */
const hc = h => parseInt(h.slice(1), 16);

/* ─── Terrain palette ────────────────────────────────────────────────────── */
const TV = {
  grass:    { base: hc('#4a6838'), lite: hc('#5a7a44'), shad: hc('#3a5428') },
  forest:   { base: hc('#2a5e2c'), lite: hc('#327034'), shad: hc('#1e4a20') },
  mountain: { base: hc('#7a6e58'), lite: hc('#948264'), shad: hc('#5e5444') },
  desert:   { base: hc('#c4a85a'), lite: hc('#d4b86a'), shad: hc('#a88e44') },
  ruin:     { base: hc('#4a4440'), lite: hc('#585050'), shad: hc('#363030') },
  shore:    { base: hc('#b09868'), lite: hc('#c0a878'), shad: hc('#907850') },
};
const TV_DEF = TV.grass;

/* ─── Resource prop colors ───────────────────────────────────────────────── */
const RC = {
  wood:  { a: 0x2a5a1e, b: 0x3a7a2a, c: 0x1a4010 },
  stone: { a: 0x7a7a8a, b: 0xa0a0b0, c: 0x4a4a5a },
  ore:   { a: 0x4a6a8a, b: 0x5a8aaa, c: 0x2a4a6a },
  gas:   { a: 0x4a8a50, b: 0x6aaa70, c: 0x2a6030 },
};

/* ─── Pan clamping ───────────────────────────────────────────────────────── */
function clampPan(x, y, zoom = 1) {
  const scaledW = ISO_W * zoom;
  const scaledH = ISO_H * zoom;
  return {
    x: Math.min(60, Math.max(-(scaledW - window.innerWidth + 60), x)),
    y: Math.min(60, Math.max(-(scaledH - (window.innerHeight - 40) + 60), y)),
  };
}

/* ─── World coords to tile key ───────────────────────────────────────────── */
function worldToKey(wx, wy, tiles) {
  const u = wx - ROWS * TW / 2;
  const v = wy - TOP_PAD;
  const cEst = Math.round((u / (TW / 2) + v / (TH / 2)) / 2);
  const rEst = Math.round((v / (TH / 2) - u / (TW / 2)) / 2);
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const c = cEst + dc, r = rEst + dr;
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
      const key = `${c},${r}`;
      if (!tiles[key]) continue;
      const tile = tiles[key];
      const { cx, cy } = isoXY(c, r);
      const elev = tile.isHQ ? 14 : tile.isWin ? 10 : tile.isKeep ? 8 : 4;
      const sy = cy - elev;
      if (Math.abs(wx - cx) / (TW / 2) + Math.abs(wy - (sy + TH / 2)) / (TH / 2) <= 1.08) return key;
    }
  }
  return null;
}

/* ─── Deterministic per-tile RNG ─────────────────────────────────────────── */
function tileRng(c, r) {
  let s = (((c + 1) * 73856093) ^ ((r + 1) * 19349663)) | 0;
  return () => { s = (Math.imul(s, 1103515245) + 12345) | 0; return ((s >>> 16) & 0x7fff) / 0x7fff; };
}

/* ─── Commander tile index ───────────────────────────────────────────────── */
function buildCByTile(cmds) {
  const m = {};
  cmds.forEach(c => { if (!c.tk) return; (m[c.tk] = m[c.tk] || []).push(c); });
  return m;
}

/* ─── Pre-compute per-tile base color (cached) ───────────────────────────── */
const tileColorCache = new Map();
function getTileBaseColor(c, r, terrain) {
  const key = `${c},${r}`;
  if (tileColorCache.has(key)) return tileColorCache.get(key);
  const v = TV[terrain] || TV_DEF;
  const rng = tileRng(c, r);
  const nudge = (rng() - 0.5) * 0.06;
  const br = (v.base >> 16) & 0xff, bg = (v.base >> 8) & 0xff, bb = v.base & 0xff;
  const col = (Math.max(0, Math.min(255, Math.round(br + br * nudge))) << 16) |
              (Math.max(0, Math.min(255, Math.round(bg + bg * nudge))) << 8)  |
               Math.max(0, Math.min(255, Math.round(bb + bb * nudge)));
  tileColorCache.set(key, col);
  return col;
}

/* ══════════════════════════════════════════════════════════════════════════
   SINGLE-PASS DRAW FUNCTIONS
   All visible tiles drawn into ONE Graphics object per layer.
   No per-tile scene graph nodes. Camera moves = zero draw calls.
══════════════════════════════════════════════════════════════════════════ */

function drawAllTiles(gfx, tiles, rMin, rMax, cMin, cMax, selKey, mode, cByTile, mvCmdUid, zoom = 1) {
  gfx.clear();
  const dMin = cMin + rMin, dMax = cMax + rMax;
  for (let d = dMin; d <= dMax; d++) {
    const cLo = Math.max(cMin, d - rMax);
    const cHi = Math.min(cMax, d - rMin);
    for (let c = cLo; c <= cHi; c++) {
      const r = d - c;
      if (r < rMin || r > rMax) continue;
      const tile = tiles[`${c},${r}`];
      if (!tile) continue;

      const { terrain, owner, isHQ, isWin, isKeep, isKeepPart, isHQPart, isShore, isBorderMtn } = tile;

      // Draw shore/ocean tiles as water
      if (isShore) {
        const { cx, cy } = isoXY(c, r);
        const isOcean = tile.isOcean;
        const mid = cy + TH / 2;
        const TOP = [cx, cy, cx+TW/2, mid, cx, cy+TH, cx-TW/2, mid];
        // Ocean tiles (northern sea) get deeper color + subtle highlight
        if (isOcean) {
          gfx.beginFill(0x0d2a44); gfx.drawPolygon(TOP); gfx.endFill();
          // Ripple highlight on upper face
          gfx.beginFill(0x1a4a6e, 0.55); gfx.drawPolygon([cx, cy, cx+TW/2, mid, cx, mid]); gfx.endFill();
          // Wave glint line
          const rng = tileRng(c, r); const rx = rng();
          if (rx > 0.55) {
            const wx1 = cx - TW*0.25 + rx*TW*0.5, wy1 = cy + TH*0.3 + rx*TH*0.2;
            gfx.lineStyle(0.8, 0x4a9abf, 0.45);
            gfx.moveTo(wx1, wy1); gfx.lineTo(wx1 + TW*0.18, wy1 + TH*0.09);
            gfx.lineStyle(0);
          }
        } else {
          gfx.beginFill(0x1a3a5c); gfx.drawPolygon(TOP); gfx.endFill();
        }
        continue;
      }

      // Southern border mountains — impassable, render as tall jagged peaks
      if (isBorderMtn) {
        const { cx, cy } = isoXY(c, r);
        const rng = tileRng(c, r);
        const elev = 10 + rng() * 8; // varied height
        const sy = cy - elev;
        const mid = sy + TH / 2;
        const TOP      = [cx, sy,   cx+TW/2, mid,  cx, sy+TH, cx-TW/2, mid];
        const FACE_L   = [cx, mid,  cx-TW/2, mid,  cx, sy+TH];
        const FACE_R   = [cx, mid,  cx+TW/2, mid,  cx, sy+TH];
        gfx.beginFill(0x3a3228); gfx.drawPolygon(TOP); gfx.endFill();
        gfx.beginFill(0x000000, 0.4); gfx.drawPolygon(FACE_L); gfx.endFill();
        gfx.beginFill(0x000000, 0.2); gfx.drawPolygon(FACE_R); gfx.endFill();
        // Snow cap on taller peaks
        if (elev > 14) {
          const capH = elev * 0.35;
          const capMid = (sy + capH/2 + TH/2) - capH*0.3;
          gfx.beginFill(0xe8e4de, 0.65);
          gfx.drawPolygon([cx, sy, cx+TW*0.22, capMid, cx, sy+capH, cx-TW*0.22, capMid]);
          gfx.endFill();
        }
        continue;
      }
      const key = `${c},${r}`;
      const isSel    = selKey === key;
      const isMvTgt  = mode === "selectMarchDest" && mvCmdUid && owner === "player";
      const hasCmds  = Boolean(cByTile[key]?.length);
      const elev     = (isHQ||isHQPart) ? 14 : isWin ? 10 : (isKeep||isKeepPart) ? 8 : 4;
      const { cx, cy } = isoXY(c, r);
      const sy  = cy - elev;
      const mid = sy + TH / 2;

      const TOP      = [cx, sy,      cx+TW/2, mid,     cx, sy+TH, cx-TW/2, mid];
      const SHADE_UL = [cx, sy,      cx-TW/2, mid,     cx, mid];
      const SHADE_LR = [cx, mid,     cx+TW/2, mid,     cx, sy+TH];

      // Treat part tiles identically to their primary for visual purposes
      const drawAsKeep = isKeep || isKeepPart;
      const drawAsHQ   = isHQ   || isHQPart;

      if (isWin && !owner) {
        gfx.beginFill(0x2a2000);       gfx.drawPolygon(TOP); gfx.endFill();
        gfx.beginFill(0xf0c040, 0.55); gfx.drawPolygon(TOP); gfx.endFill();
        if (zoom >= 0.75) { gfx.lineStyle(2, 0xf0c040, 0.8); gfx.drawPolygon(TOP); gfx.lineStyle(0); }
      } else {
        gfx.beginFill(getTileBaseColor(c, r, terrain)); gfx.drawPolygon(TOP); gfx.endFill();
        // Only draw shading overlays when zoomed in enough to see them
        if (zoom >= 0.75) {
          gfx.beginFill(0xffffff, 0.06); gfx.drawPolygon(SHADE_UL); gfx.endFill();
          gfx.beginFill(0x000000, 0.08); gfx.drawPolygon(SHADE_LR); gfx.endFill();
        }
      }

      if (owner) {
        const ot = owner === "player" ? 0x1ea0b4 : 0xdc3c28;
        gfx.beginFill(ot, 0.18); gfx.drawPolygon(TOP); gfx.endFill();
        if (!isSel) { gfx.lineStyle(2, ot, 0.95); gfx.drawPolygon(TOP); gfx.lineStyle(0); }
      }

      if (mode === "selectMarchDest" && owner !== "player") {
        gfx.beginFill(0x000000, 0.45); gfx.drawPolygon(TOP); gfx.endFill();
      }
      if (isMvTgt) {
        gfx.beginFill(0x28dc6e, 0.22); gfx.drawPolygon(TOP); gfx.endFill();
      }
      if (hasCmds && !isSel) {
        gfx.lineStyle(2, 0xf0dc3c, 0.9); gfx.drawPolygon(TOP); gfx.lineStyle(0);
      }

      if (isKeep && !isHQ && !isKeepPart && zoom >= 0.75) {
        const fc  = owner === "player" ? 0x4dcc70 : owner === "ai" ? 0xdd4422 : 0xc8a060;
        const fc2 = owner === "player" ? 0x1a5228 : owner === "ai" ? 0x5c1008 : 0x6a5020;
        const bx = cx, by = sy - 2;
        gfx.beginFill(0x000000, 0.30); gfx.drawEllipse(bx, by+1, 11, 4); gfx.endFill();
        gfx.beginFill(fc2); gfx.drawPolygon([bx,by-14, bx+9,by-7, bx,by+1, bx-9,by-7]); gfx.endFill();
        gfx.beginFill(fc, 0.7); gfx.drawPolygon([bx,by-14, bx+9,by-7, bx+9,by-1, bx,by-8]); gfx.endFill();
        for (let dx = -6; dx <= 6; dx += 4) { gfx.beginFill(fc); gfx.drawRect(bx+dx-1,by-19,2,5); gfx.endFill(); }
        if (isWin) { gfx.beginFill(0xf0c040,0.9); gfx.drawPolygon([bx-5,by-22,bx-5,by-18,bx,by-20,bx+5,by-18,bx+5,by-22]); gfx.endFill(); }
      }

      if (isHQ && !isHQPart && zoom >= 0.75) {
        const fc  = owner === "player" ? 0x4dcc70 : owner === "ai" ? 0xdd4422 : 0xdddddd;
        const fc2 = owner === "player" ? 0x1a5228 : owner === "ai" ? 0x5c1008 : 0x333333;
        const bx = cx, by = sy - 2;
        gfx.beginFill(0x000000, 0.35); gfx.drawEllipse(bx, by+2, 14, 5); gfx.endFill();
        gfx.beginFill(fc2); gfx.drawPolygon([bx,by-20, bx+12,by-10, bx,by+2, bx-12,by-10]); gfx.endFill();
        gfx.beginFill(fc, 0.6); gfx.drawPolygon([bx,by-20, bx+12,by-10, bx+12,by-2, bx,by-12]); gfx.endFill();
        for (let dx = -8; dx <= 8; dx += 4) { gfx.beginFill(fc); gfx.drawRect(bx+dx-1.5,by-26,3,7); gfx.endFill(); }
      }

      if (isSel) {
        gfx.lineStyle(2.5, 0xffffff, 0.95); gfx.drawPolygon(TOP); gfx.lineStyle(0);
      }
    }
  }
}

function drawAllProps(gfx, tiles, rMin, rMax, cMin, cMax) {
  gfx.clear();
  const dMin = cMin + rMin, dMax = cMax + rMax;
  for (let d = dMin; d <= dMax; d++) {
    const cLo = Math.max(cMin, d - rMax);
    const cHi = Math.min(cMax, d - rMin);
    for (let c = cLo; c <= cHi; c++) {
      const r = d - c;
      if (r < rMin || r > rMax) continue;
      const tile = tiles[`${c},${r}`];
      if (!tile || tile.isHQ || tile.isWin || tile.isKeep || tile.isKeepPart || tile.isHQPart || tile.isShore || tile.isBorderMtn) continue;
      const { cx, cy } = isoXY(c, r);
      const sy = cy - 4;
      if (tile.rss) {
        drawRssProp(gfx, tile.rss, cx, sy, c, r, tile.powerLevel || 1);
      } else if (!tile.owner) {
        drawAmbientScatter(gfx, tile, cx, sy);
      }
    }
  }
}

function drawRssProp(gfx, rss, cx, sy, c, r, pl) {
  const rnd = tileRng(c, r);
  const col = RC[rss] || RC.wood;
  const cy2 = sy + TH / 2 + 2;
  if (rss === "wood") {
    const n = Math.min(6, pl + 2);
    for (let i = 0; i < n; i++) {
      const dx = (rnd()-0.5)*TW*0.52, dy = (rnd()-0.5)*TH*0.50, sz = 4+rnd()*4+pl*1.4;
      gfx.beginFill(col.c); gfx.drawEllipse(cx+dx,cy2+dy+sz*0.4,sz*0.45,sz*0.22); gfx.endFill();
      gfx.beginFill(col.a); gfx.drawEllipse(cx+dx,cy2+dy,sz*0.65,sz*1.05); gfx.endFill();
      gfx.beginFill(col.b,0.65); gfx.drawEllipse(cx+dx-sz*0.14,cy2+dy-sz*0.2,sz*0.38,sz*0.45); gfx.endFill();
    }
  } else if (rss === "stone") {
    const n = Math.min(7, pl + 3);
    for (let i = 0; i < n; i++) {
      const dx = (rnd()-0.5)*TW*0.48, dy = (rnd()-0.5)*TH*0.44, sz = 3+rnd()*3+pl;
      gfx.beginFill(col.c,0.9); gfx.drawEllipse(cx+dx+1,cy2+dy+1,sz*0.78,sz*0.48); gfx.endFill();
      gfx.beginFill(col.a); gfx.drawEllipse(cx+dx,cy2+dy,sz*0.78,sz*0.48); gfx.endFill();
      gfx.beginFill(col.b,0.55); gfx.drawEllipse(cx+dx-sz*0.18,cy2+dy-sz*0.1,sz*0.32,sz*0.18); gfx.endFill();
    }
  } else if (rss === "ore") {
    const n = Math.min(7, pl + 3);
    for (let i = 0; i < n; i++) {
      const dx = (rnd()-0.5)*TW*0.46, dy = (rnd()-0.5)*TH*0.38, sz = 3+rnd()*3+pl*0.8;
      gfx.beginFill(col.c); gfx.drawEllipse(cx+dx,cy2+dy,sz*0.58,sz*0.38); gfx.endFill();
      gfx.beginFill(col.a); gfx.drawEllipse(cx+dx,cy2+dy-sz*0.28,sz*0.48,sz*0.68); gfx.endFill();
      gfx.beginFill(col.b,0.55); gfx.drawEllipse(cx+dx-sz*0.12,cy2+dy-sz*0.48,sz*0.22,sz*0.28); gfx.endFill();
    }
  } else {
    const n = Math.min(6, pl + 2);
    for (let i = 0; i < n; i++) {
      const dx = (rnd()-0.5)*TW*0.44, dy = (rnd()-0.5)*TH*0.34, sz = 3+rnd()*3+pl;
      gfx.beginFill(col.c,0.65); gfx.drawEllipse(cx+dx,cy2+dy+sz*0.28,sz*0.48,sz*0.28); gfx.endFill();
      gfx.beginFill(col.a,0.82); gfx.drawEllipse(cx+dx,cy2+dy,sz*0.58,sz*0.88); gfx.endFill();
      gfx.beginFill(col.b,0.45); gfx.drawEllipse(cx+dx-sz*0.08,cy2+dy-sz*0.22,sz*0.28,sz*0.38); gfx.endFill();
    }
  }
}

function drawAmbientScatter(gfx, tile, cx, sy) {
  const { c, r, terrain } = tile;
  const rnd = tileRng(c, r);
  const cy2 = sy + TH / 2;
  const v = TV[terrain] || TV_DEF;
  if (terrain === "grass" || terrain === "forest") {
    const n = 4 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const dx = (rnd()-0.5)*TW*0.72, dy = (rnd()-0.5)*TH*0.55, sz = 1.5+rnd()*2.5;
      gfx.beginFill(rnd()>0.5?v.lite:v.base, 0.55); gfx.drawEllipse(cx+dx,cy2+dy,sz*0.9,sz*0.5); gfx.endFill();
    }
  } else if (terrain === "mountain" || terrain === "ruin") {
    const n = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const dx = (rnd()-0.5)*TW*0.68, dy = (rnd()-0.5)*TH*0.52, sz = 1.5+rnd()*2;
      gfx.beginFill(v.shad,0.5); gfx.drawEllipse(cx+dx+0.5,cy2+dy+0.5,sz*0.9,sz*0.55); gfx.endFill();
      gfx.beginFill(v.lite,0.6); gfx.drawEllipse(cx+dx,cy2+dy,sz*0.9,sz*0.55); gfx.endFill();
    }
  } else {
    const n = 5 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const dx = (rnd()-0.5)*TW*0.74, dy = (rnd()-0.5)*TH*0.56, sz = 1+rnd()*1.5;
      gfx.beginFill(v.lite,0.35); gfx.drawEllipse(cx+dx,cy2+dy,sz*1.4,sz*0.6); gfx.endFill();
    }
  }
}

function drawMarchLines(gfx, cmds, reinMarches, tiles) {
  gfx.clear();
  const drawPath = (path, col) => {
    if (path.length < 2) return;
    const pts = path.map(k => {
      const [tc, tr] = k.split(",").map(Number);
      const t = tiles[k];
      const elev = t?.isHQ ? 14 : t?.isWin ? 10 : t?.isKeep ? 8 : 4;
      const { cx, cy } = isoXY(tc, tr);
      return { x: cx, y: cy - elev + TH / 2 };
    });
    gfx.lineStyle(5, 0x000000, 0.32);
    gfx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach(p => gfx.lineTo(p.x, p.y));
    gfx.lineStyle(2.5, col, 0.9);
    gfx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach(p => gfx.lineTo(p.x, p.y));
    gfx.lineStyle(0);
    const last = pts[pts.length-1];
    gfx.beginFill(col,0.18); gfx.drawCircle(last.x,last.y,8); gfx.endFill();
    gfx.beginFill(col,0.85); gfx.drawCircle(last.x,last.y,5); gfx.endFill();
    gfx.beginFill(0xffffff,0.9); gfx.drawCircle(last.x,last.y,2.5); gfx.endFill();
  };
  cmds.forEach(cmd => {
    if (!cmd.march || cmd.owner !== "player") return;
    const m = cmd.march;
    drawPath(m.path.slice(m.step), m.type === "attack" ? 0xff4444 : 0x44ff88);
  });
  (reinMarches || []).forEach(rm => drawPath(rm.path.slice(rm.step), 0x88aaff));
}

function drawCmdIcons(gfx, textCont, cmds, tiles) {
  gfx.clear();
  if (textCont) {
    const toDestroy = [...textCont.children];
    toDestroy.forEach(c => { textCont.removeChild(c); c.destroy(); });
  }
  const byTile = buildCByTile(cmds);
  for (const [key, tileCmds] of Object.entries(byTile)) {
    const tile = tiles[key];
    if (!tile) continue;
    const { cx, cy } = isoXY(tile.c, tile.r);
    const elev = tile.isHQ ? 14 : tile.isWin ? 10 : tile.isKeep ? 8 : 4;
    const sy = cy - elev;
    const playerG = tileCmds.filter(c => c.owner === "player");
    const aiG = tileCmds.filter(c => c.owner !== "player");
    const groups = [];
    if (playerG.length) groups.push({ cmds: playerG, col: 0xf0dc3c });
    if (aiG.length)     groups.push({ cmds: aiG,     col: 0xdd3322 });
    groups.forEach(({ cmds: grp, col }, gi) => {
      const ey = sy + TH * 0.72 - gi * 6;
      gfx.beginFill(col, 0.13); gfx.lineStyle(1.4, col, 1); gfx.drawEllipse(cx,ey,15,5); gfx.lineStyle(0); gfx.endFill();
      const visible = grp.slice(0, 3);
      const spacing = visible.length > 1 ? 14 : 0;
      visible.forEach((cmd, i) => {
        const dx = (i - (visible.length-1)/2) * spacing;
        gfx.beginFill(0x000000,0.45); gfx.drawCircle(cx+dx+1,ey-10,9); gfx.endFill();
        gfx.beginFill(col,0.9);       gfx.drawCircle(cx+dx,  ey-11,9); gfx.endFill();
        gfx.beginFill(0x000000,0.55); gfx.drawCircle(cx+dx,  ey-11,7); gfx.endFill();
        if (textCont && cmd.icon) {
          const txt = new PIXI.Text(cmd.icon, { fontSize: 10, align: "center" });
          txt.anchor.set(0.5, 0.5); txt.x = cx+dx; txt.y = ey-11;
          textCont.addChild(txt);
        }
      });
      if (grp.length > 3) { gfx.beginFill(col,0.7); gfx.drawCircle(cx+14,ey-8,5); gfx.endFill(); }
    });
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   MAP RENDERER COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export const MapRenderer = memo(forwardRef(function MapRenderer({ tiles, cmds, selKey, mode, mvCmd, reinMarchesRef, panSt, zoom, ZOOM_LEVELS, onTileClick, onPanChange, onZoomChange }, ref) {
  const containerRef   = useRef(null);
  const appRef         = useRef(null);
  const worldRef       = useRef(null);

  // Double-buffered tile layer — draw into back, swap with front, no flash
  const tileFrontRef   = useRef(null);
  const tileBackRef    = useRef(null);
  const propsFrontRef  = useRef(null);
  const propsBackRef   = useRef(null);
  const marchGfxRef    = useRef(null);
  const cmdGfxRef      = useRef(null);
  const cmdTextContRef = useRef(null);

  // Track last rendered bounds to skip redraws when viewport unchanged
  const lastBoundsRef  = useRef(null);
  const redrawRef      = useRef(null);

  // Live refs
  const panRef   = useRef(panSt);
  const zoomRef  = useRef(zoom);
  const tilesRef = useRef(tiles);
  const cmdsRef  = useRef(cmds);
  const fallbackReinRef = useRef([]);
  const reinRef = reinMarchesRef || fallbackReinRef;
  const selRef   = useRef(selKey);
  const modeRef  = useRef(mode);
  const mvCmdRef = useRef(mvCmd);
  const ZOOM_REF = useRef(ZOOM_LEVELS);

  const onTileClickRef  = useRef(onTileClick);
  const onPanChangeRef  = useRef(onPanChange);
  const onZoomChangeRef = useRef(onZoomChange);

  useEffect(() => {
    selRef.current = selKey;
    // selGfx is managed directly in touch handler for instant response
    // Clear it when React deselects (selKey=null) or changes selection
    if (!selKey) redrawRef.current?.clearSel?.();
  }, [selKey]);
  useEffect(() => { modeRef.current  = mode; },        [mode]);
  useEffect(() => { mvCmdRef.current = mvCmd; },       [mvCmd]);
  useEffect(() => { onTileClickRef.current  = onTileClick; },  [onTileClick]);
  useEffect(() => { onPanChangeRef.current  = onPanChange; },  [onPanChange]);
  useEffect(() => { onZoomChangeRef.current = onZoomChange; }, [onZoomChange]);
  useEffect(() => { ZOOM_REF.current = ZOOM_LEVELS; }, [ZOOM_LEVELS]);

  // Expose teleport() so Game.jsx can move the PIXI world instantly without a React re-render
  useImperativeHandle(ref, () => ({
    teleport(px, py) {
      panRef.current = { x: px, y: py };
      if (worldRef.current) { worldRef.current.x = px; worldRef.current.y = py; }
      lastBoundsRef.current = null;
      redrawRef.current?.redraw(true);
    },
  }), []);

  // Touch/drag state — mutated directly, never triggers re-render
  const tDragFrom   = useRef({ x: 0, y: 0 });
  const tDidDrag    = useRef(false);
  const pinchDist0  = useRef(null);
  const pinchZoom0  = useRef(zoom);
  const drag        = useRef(false);
  const didDrag     = useRef(false);
  const dragFrom    = useRef({ x: 0, y: 0 });
  const isPanning   = useRef(false);   // suppress redraws while finger is moving
  const panEndTimer = useRef(null);    // used by mouse drag handler

  /* ── INIT PIXI ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const w = Math.max(200, el.clientWidth  || window.innerWidth);
    const h = Math.max(200, el.clientHeight || (window.innerHeight - 38));
    let app;
    try {
      app = new PIXI.Application({ width:w, height:h, backgroundColor:0x080c10,
        antialias:false, resolution:Math.min(window.devicePixelRatio||1,2), autoDensity:true });
    } catch(_) {
      try { app = new PIXI.Application({ width:w, height:h, backgroundColor:0x080c10, forceCanvas:true }); }
      catch(e2) { console.warn("PixiJS init failed:", e2); return; }
    }
    app.view.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%";
    el.appendChild(app.view);
    appRef.current = app;

    const world = new PIXI.Container();
    app.stage.addChild(world);
    worldRef.current = world;
    world.x = panRef.current.x;
    world.y = panRef.current.y;
    world.scale.set(zoomRef.current);

    // Double-buffered tile layers — back draws while front stays visible, then swap
    const tileFront = new PIXI.Graphics(); world.addChild(tileFront); tileFrontRef.current = tileFront;
    const tileBack  = new PIXI.Graphics(); world.addChild(tileBack);  tileBackRef.current  = tileBack;
    tileBack.visible = false;
    const propsFront = new PIXI.Graphics(); world.addChild(propsFront); propsFrontRef.current = propsFront;
    const propsBack  = new PIXI.Graphics(); world.addChild(propsBack);  propsBackRef.current  = propsBack;
    propsBack.visible = false;
    const selGfx = new PIXI.Graphics(); world.addChild(selGfx); // selection overlay — instant, no full redraw
    const marchGfx = new PIXI.Graphics(); world.addChild(marchGfx); marchGfxRef.current = marchGfx;
    const cmdGfx = new PIXI.Graphics(); world.addChild(cmdGfx); cmdGfxRef.current = cmdGfx;
    const cmdTextCont = new PIXI.Container(); world.addChild(cmdTextCont); cmdTextContRef.current = cmdTextCont;

    function drawSelection(key) {
      selGfx.clear();
      if (!key) return;
      const [sc, sr] = key.split(",").map(Number);
      const tile = tilesRef.current[key];
      if (!tile) return;
      const elev = (tile.isHQ||tile.isHQPart) ? 14 : tile.isWin ? 10 : (tile.isKeep||tile.isKeepPart) ? 8 : 4;
      const { cx, cy } = isoXY(sc, sr);
      const sy2 = cy - elev;
      const mid = sy2 + TH / 2;
      const TOP = [cx, sy2, cx+TW/2, mid, cx, sy2+TH, cx-TW/2, mid];
      selGfx.lineStyle(2.5, 0xffffff, 0.9);
      selGfx.drawPolygon(TOP);
      selGfx.lineStyle(0);
    }

    /* ── Compute viewport bounds ── */
    function getViewBounds(buf = 6) {
      const pan = panRef.current, zoom = zoomRef.current;
      const vw = window.innerWidth, vh = window.innerHeight;
      const wxL = (-pan.x)/zoom, wxR = (-pan.x+vw)/zoom;
      const wyT = (-pan.y)/zoom, wyB = (-pan.y+vh)/zoom;
      const toC = (wx,wy) => ((wx-ROWS*TW/2)/(TW/2)+(wy-TOP_PAD)/(TH/2))/2;
      const toR = (wx,wy) => ((wy-TOP_PAD)/(TH/2)-(wx-ROWS*TW/2)/(TW/2))/2;
      const cs = [toC(wxL,wyT),toC(wxR,wyT),toC(wxL,wyB),toC(wxR,wyB)];
      const rs = [toR(wxL,wyT),toR(wxR,wyT),toR(wxL,wyB),toR(wxR,wyB)];
      return {
        rMin: Math.max(0,       Math.floor(Math.min(...rs))-buf),
        rMax: Math.min(ROWS-1,  Math.ceil( Math.max(...rs))+buf),
        cMin: Math.max(0,       Math.floor(Math.min(...cs))-buf),
        cMax: Math.min(COLS-1,  Math.ceil( Math.max(...cs))+buf),
      };
    }

    /* ── Full scene redraw — double-buffered to prevent flash ── */
    function redraw(force = false) {
      const b = getViewBounds();
      const last = lastBoundsRef.current;
      const boundsChanged = !last ||
        b.rMin!==last.rMin || b.rMax!==last.rMax ||
        b.cMin!==last.cMin || b.cMax!==last.cMax;

      if (!force && !boundsChanged) return;
      lastBoundsRef.current = b;

      const curTiles = tilesRef.current;
      const cByTile  = buildCByTile(cmdsRef.current);
      const z = zoomRef.current;

      // Draw into back buffer (old front stays visible — no flash)
      const back  = tileBackRef.current;
      const front = tileFrontRef.current;
      drawAllTiles(back, curTiles, b.rMin, b.rMax, b.cMin, b.cMax,
        selRef.current, modeRef.current, cByTile, mvCmdRef.current?.uid, z);
      // Swap: show back, hide front, then swap refs for next frame
      back.visible  = true;
      front.visible = false;
      front.clear();
      tileBackRef.current  = front;
      tileFrontRef.current = back;

      // Props double-buffer
      if (z >= 1.0) {
        const pb = propsBackRef.current;
        const pf = propsFrontRef.current;
        drawAllProps(pb, curTiles, b.rMin, b.rMax, b.cMin, b.cMax);
        pb.visible = true; pf.visible = false; pf.clear();
        propsBackRef.current  = pf;
        propsFrontRef.current = pb;
      } else {
        propsFrontRef.current?.clear();
        propsBackRef.current?.clear();
      }
    }

    function redrawOverlays() {
      drawMarchLines(marchGfxRef.current, cmdsRef.current, reinRef.current, tilesRef.current);
      drawCmdIcons(cmdGfxRef.current, cmdTextContRef.current, cmdsRef.current, tilesRef.current);
    }

    redrawRef.current = { redraw, redrawOverlays, clearSel: () => selGfx.clear() };

    // Initial draw
    redraw(true);
    redrawOverlays();

    /* ── Ticker: continuous render loop. Skips while panning (world moves via x/y).
          Handles initial draw, post-pan edge tiles, and state-driven redraws. ── */
    app.ticker.add(() => {
      if (!isPanning.current) redraw();
    });

    /* ── Resize ── */
    const ro = new ResizeObserver(() => {
      if (appRef.current) {
        appRef.current.renderer.resize(el.clientWidth, el.clientHeight);
        lastBoundsRef.current = null;
        redraw(true);
      }
    });
    ro.observe(el);

    /* ── Zoom toward screen center — keeps the viewed area stable ── */
    function applyZoom(newZoom) {
      const oldZoom = zoomRef.current;
      const cx = window.innerWidth  / 2;
      const cy = window.innerHeight / 2;
      const oldPan = panRef.current;
      const np = clampPan(
        cx - (cx - oldPan.x) * (newZoom / oldZoom),
        cy - (cy - oldPan.y) * (newZoom / oldZoom),
        newZoom
      );
      zoomRef.current = newZoom;
      panRef.current  = np;
      world.x = np.x;
      world.y = np.y;
      lastBoundsRef.current = null;
      redraw(true);
      world.scale.set(newZoom);
      onZoomChangeRef.current(newZoom);
      onPanChangeRef.current(np);
    }

    /* ── Wheel zoom ── */
    const onWheel = e => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;
      const levels = ZOOM_REF.current;
      const idx = levels.indexOf(zoomRef.current);
      const ni = Math.max(0, Math.min(levels.length-1, idx+delta));
      if (levels[ni] !== zoomRef.current) applyZoom(levels[ni]);
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    /* ── Touch ── */
    const onTS = e => {
      e.preventDefault();
      if (e.touches.length === 1) {
        tDragFrom.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        tDidDrag.current = false;
        isPanning.current = true;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchDist0.current = Math.sqrt(dx*dx+dy*dy);
        pinchZoom0.current = zoomRef.current;
      }
    };
    const onTM = e => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - tDragFrom.current.x;
        const dy = e.touches[0].clientY - tDragFrom.current.y;
        if (Math.abs(dx)+Math.abs(dy) > 4) tDidDrag.current = true;
        tDragFrom.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (tDidDrag.current) {
          const np = clampPan(panRef.current.x+dx, panRef.current.y+dy, zoomRef.current);
          panRef.current = np;
          world.x = np.x; world.y = np.y;
          isPanning.current = true;
        }
      } else if (e.touches.length === 2 && pinchDist0.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx*dx+dy*dy);
        const levels = ZOOM_REF.current;
        const rz = Math.min(levels[levels.length-1], Math.max(levels[0], pinchZoom0.current*(dist/pinchDist0.current)));
        const nz = levels.reduce((a,b) => Math.abs(b-rz)<Math.abs(a-rz)?b:a);
        if (nz !== zoomRef.current) applyZoom(nz);
      }
    };
    const onTE = e => {
      if (e.touches.length < 2) pinchDist0.current = null;
      if (e.touches.length === 0) {
        if (!tDidDrag.current) {
          const t = e.changedTouches[0];
          const rect = el.getBoundingClientRect();
          const wx = (t.clientX-rect.left-panRef.current.x)/zoomRef.current;
          const wy = (t.clientY-rect.top -panRef.current.y)/zoomRef.current;
          const key = worldToKey(wx, wy, tilesRef.current);
          if (key) {
            selRef.current = key;
            drawSelection(key); // instant — just draws outline on separate layer
            onTileClickRef.current(key, e);
          }
        }
        isPanning.current = false;
        tDidDrag.current = false;
        lastBoundsRef.current = null; // ticker picks up next frame
        onPanChangeRef.current(panRef.current);
      }
    };
    el.addEventListener("touchstart",  onTS, { passive: false });
    el.addEventListener("touchmove",   onTM, { passive: false });
    el.addEventListener("touchend",    onTE, { passive: false });
    el.addEventListener("touchcancel", onTE, { passive: false });

    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart",  onTS);
      el.removeEventListener("touchmove",   onTM);
      el.removeEventListener("touchend",    onTE);
      el.removeEventListener("touchcancel", onTE);
      app.destroy(true);
      appRef.current = null; worldRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Sync pan from props (teleport, HQ center) ── */
  // IMPORTANT: depend on panSt.x and panSt.y as primitives, NOT the panSt object.
  // Depending on the object causes spurious fires every time Game.jsx re-renders
  // (even with same values) because a new object is passed each render — which
  // resets world.x/y to the initial {4,4} and snaps the camera back on every tick.
  useEffect(() => {
    panRef.current = panSt;
    if (worldRef.current) { worldRef.current.x = panSt.x; worldRef.current.y = panSt.y; }
    lastBoundsRef.current = null;
    redrawRef.current?.redraw(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panSt.x, panSt.y]);

  /* ── Sync zoom from props (zoom buttons) ── */
  useEffect(() => {
    if (!worldRef.current) return;
    const oldZoom = zoomRef.current;
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    const oldPan = panRef.current;
    const np = clampPan(
      cx - (cx - oldPan.x) * (zoom / oldZoom),
      cy - (cy - oldPan.y) * (zoom / oldZoom),
      zoom
    );
    zoomRef.current = zoom;
    panRef.current  = np;
    worldRef.current.x = np.x;
    worldRef.current.y = np.y;
    lastBoundsRef.current = null;
    redrawRef.current?.redraw(true);
    worldRef.current.scale.set(zoom);
    onPanChangeRef.current(np);
  }, [zoom]);

  /* ── Redraw on UI state changes (selection, mode, zoom) ── */
  useEffect(() => {
    lastBoundsRef.current = null;
    if (panEndTimer.current) { clearTimeout(panEndTimer.current); panEndTimer.current = null; }
    redrawRef.current?.redraw(true);
    redrawRef.current?.redrawOverlays();
  }, [selKey, mode, mvCmd, zoom]);

  /* ── Invalidate tile cache when map state changes — ticker redraws next frame ── */
  useEffect(() => {
    tilesRef.current = tiles;
    lastBoundsRef.current = null;
  }, [tiles]);

  useEffect(() => {
    cmdsRef.current = cmds;
    lastBoundsRef.current = null;
  }, [cmds]);

  /* ── Mouse (desktop) ── */
  const onMouseDown = useCallback(e => {
    if (e.button !== 0) return;
    drag.current = true; didDrag.current = false;
    dragFrom.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);

  const onMouseMove = useCallback(e => {
    if (!drag.current) return;
    const dx = e.clientX - dragFrom.current.x;
    const dy = e.clientY - dragFrom.current.y;
    if (Math.abs(dx)+Math.abs(dy) > 4) didDrag.current = true;
    dragFrom.current = { x: e.clientX, y: e.clientY };
    if (didDrag.current) {
      const np = clampPan(panRef.current.x+dx, panRef.current.y+dy, zoomRef.current);
      panRef.current = np;
      if (worldRef.current) { worldRef.current.x = np.x; worldRef.current.y = np.y; }
      isPanning.current = true;
      if (panEndTimer.current) clearTimeout(panEndTimer.current);
      panEndTimer.current = setTimeout(() => { isPanning.current = false; redrawRef.current?.redraw(); }, 80);
    }
  }, []);

  const onMouseUp = useCallback(e => {
    if (e.button !== 0 && e.type !== "mouseleave") return;
    const wasDrag = didDrag.current;
    drag.current = false; didDrag.current = false;
    if (!wasDrag && e.type !== "mouseleave") {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const wx = (e.clientX-rect.left-panRef.current.x)/zoomRef.current;
        const wy = (e.clientY-rect.top -panRef.current.y)/zoomRef.current;
        const key = worldToKey(wx, wy, tilesRef.current);
        if (key) onTileClickRef.current(key, e);
      }
    }
    onPanChangeRef.current(panRef.current);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position:"absolute", inset:0, top:38,
        userSelect:"none", touchAction:"none",
        background:"#080c10", overflow:"hidden",
        cursor:"grab",
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    />
  );
}));
