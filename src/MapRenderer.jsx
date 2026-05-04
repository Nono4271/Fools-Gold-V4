import { useEffect, useRef, useCallback } from "react";
import * as PIXI from "pixi.js";
import { COLS, ROWS, TW, TH, TOP_PAD, SW, ISO_W, ISO_H } from "./constants/geometry.js";

/* ─── Tile geometry (imported from geometry.js) ─────────────────────────── */

function isoXY(c, r) {
  return {
    cx: (c - r) * (TW / 2) + (ROWS * TW / 2),
    cy: (c + r) * (TH / 2) + TOP_PAD,
  };
}

/* ─── Hex string → PIXI number ──────────────────────────────────────────── */
const hc = h => parseInt(h.slice(1), 16);

/* ─── Terrain visual palette ─────────────────────────────────────────────── */
// RTW-style: single base color per terrain, barely-visible directional shading.
// Low 'var' keeps adjacent tiles nearly identical so borders disappear.
const TV = {
  grass:    { base: hc('#4a6838'), lite: hc('#5a7a44'), shad: hc('#3a5428'), var: 0x060a04 },
  forest:   { base: hc('#2a5e2c'), lite: hc('#327034'), shad: hc('#1e4a20'), var: 0x040804 },
  mountain: { base: hc('#7a6e58'), lite: hc('#948264'), shad: hc('#5e5444'), var: 0x080806 },
  desert:   { base: hc('#c4a85a'), lite: hc('#d4b86a'), shad: hc('#a88e44'), var: 0x0a0804 },
  ruin:     { base: hc('#4a4440'), lite: hc('#585050'), shad: hc('#363030'), var: 0x060404 },
  shore:    { base: hc('#b09868'), lite: hc('#c0a878'), shad: hc('#907850'), var: 0x080604 },
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
  // Scale ISO dimensions by zoom so pan limits stay correct at all zoom levels.
  // Without this, zooming out shoves the viewport outside the tile grid (blue screen).
  const scaledW = ISO_W * zoom;
  const scaledH = ISO_H * zoom;
  return {
    x: Math.min(60, Math.max(-(scaledW - window.innerWidth + 60), x)),
    y: Math.min(60, Math.max(-(scaledH - (window.innerHeight - 40) + 60), y)),
  };
}

/* ─── World coords → tile key ────────────────────────────────────────────── */
function worldToKey(wx, wy, tiles) {
  // Inverse of: cx = (c-r)*TW/2 + ROWS*TW/2,  cy = (c+r)*TH/2 + TOP_PAD
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

/* ─── Dirty hash (skip redraws when nothing visual changed) ─────────────── */
function tileHash(tile, selKey, mode, hasCmds, mvCmdUid, zoom) {
  const k = `${tile.c},${tile.r}`;
  const zk = Math.round(zoom * 100);
  return `${tile.owner}|${tile.garrison}|${tile.hasAiCommander}|${tile.garrisonDefeated}|${tile.powerLevel}|${tile.isKeep||false}|${selKey === k}|${mode}|${hasCmds}|${mvCmdUid || ""}|${zk}`;
}

/* ══════════════════════════════════════════════════════════════════════════
   TILE DRAWING — RTW style: flat top face, no side walls, seamless terrain
══════════════════════════════════════════════════════════════════════════ */
function drawTile(gfx, tile, selKey, mode, hasCmds, mvCmdUid, zoom = 1) {
  const { c, r, terrain, owner, isHQ, isWin, isKeep, rss, powerLevel } = tile;
  const key = `${c},${r}`;
  const isSel = selKey === key;
  const isMvTgt = mode === "selectMarchDest" && mvCmdUid && owner === "player";
  const elev = isHQ ? 14 : isWin ? 10 : isKeep ? 8 : 4;
  const { cx, cy } = isoXY(c, r);
  const sy = cy - elev;
  const mid = sy + TH / 2;

  /* Diamond top face */
  const TOP = [cx, sy, cx+TW/2, mid, cx, sy+TH, cx-TW/2, mid];
  /* Upper-left and lower-right half diamonds for subtle directional shading */
  const TOP_UL = [cx, sy, cx-TW/2, mid, cx, sy+TH, cx+TW/2, mid]; // full but we overlay
  const SHADE_UL = [cx, sy,    cx-TW/2, mid, cx, mid];   // top-left triangle — highlight
  const SHADE_LR = [cx, mid,   cx+TW/2, mid, cx, sy+TH]; // bot-right triangle — shadow

  /* Per-tile deterministic color nudge — keeps adjacent tiles nearly identical
     so the eye reads continuous terrain rather than a grid */
  const rng = tileRng(c, r);
  const nudge = (rng() - 0.5) * 0.06; // ±3% brightness shift max

  const v = TV[terrain] || TV_DEF;

  /* Apply nudge to base color channels */
  const br = ((v.base >> 16) & 0xff), bg = ((v.base >> 8) & 0xff), bb = (v.base & 0xff);
  const nr = Math.max(0, Math.min(255, Math.round(br + br * nudge)));
  const ng = Math.max(0, Math.min(255, Math.round(bg + bg * nudge)));
  const nb = Math.max(0, Math.min(255, Math.round(bb + bb * nudge)));
  const baseCol = (nr << 16) | (ng << 8) | nb;

  gfx.clear();

  /* ── Top face: single flat fill + barely-visible directional shading ── */
  if (isWin && !owner) {
    gfx.beginFill(0x2a2000); gfx.drawPolygon(TOP); gfx.endFill();
    gfx.beginFill(0xf0c040, 0.55); gfx.drawPolygon(TOP); gfx.endFill();
    gfx.lineStyle(2, 0xf0c040, 0.8); gfx.drawPolygon(TOP); gfx.lineStyle(0);
  } else {
    /* Base fill — no stroke, no seam */
    gfx.beginFill(baseCol); gfx.drawPolygon(TOP); gfx.endFill();
    /* Subtle light from top-left */
    gfx.beginFill(0xffffff, 0.06); gfx.drawPolygon(SHADE_UL); gfx.endFill();
    /* Subtle shadow on bottom-right */
    gfx.beginFill(0x000000, 0.08); gfx.drawPolygon(SHADE_LR); gfx.endFill();
  }

  /* ── Ownership tint + border (RTW style: only border shows ownership) ── */
  if (owner) {
    const ot = owner === "player" ? 0x1ea0b4 : 0xdc3c28;
    gfx.beginFill(ot, 0.18); gfx.drawPolygon(TOP); gfx.endFill();
    if (!isSel) {
      gfx.lineStyle(2, ot, 0.95); gfx.drawPolygon(TOP); gfx.lineStyle(0);
    }
  }

  /* ── Move mode dim ── */
  if (mode === "selectMarchDest" && owner !== "player") {
    gfx.beginFill(0x000000, 0.45); gfx.drawPolygon(TOP); gfx.endFill();
  }

  /* ── Move target highlight ── */
  if (isMvTgt) {
    gfx.beginFill(0x28dc6e, 0.22); gfx.drawPolygon(TOP); gfx.endFill();
  }

  /* Props are drawn on a separate layer above all tiles (see drawPropsLayer)
     to prevent painter-order clipping. Nothing to do here. */

  /* ── Commander highlight border ── */
  if (hasCmds && !isSel) {
    gfx.lineStyle(2, 0xf0dc3c, 0.9); gfx.drawPolygon(TOP); gfx.lineStyle(0);
  }

  /* ── Keep tower ── */
  if (isKeep && !isHQ) {
    const fc  = owner === "player" ? 0x4dcc70 : owner === "ai" ? 0xdd4422 : 0xc8a060;
    const fc2 = owner === "player" ? 0x1a5228 : owner === "ai" ? 0x5c1008 : 0x6a5020;
    const bx = cx, by = sy - 2;
    gfx.beginFill(0x000000, 0.30); gfx.drawEllipse(bx, by+1, 11, 4); gfx.endFill();
    gfx.beginFill(fc2);
    gfx.drawPolygon([bx, by-14, bx+9, by-7, bx, by+1, bx-9, by-7]);
    gfx.endFill();
    gfx.beginFill(fc, 0.7);
    gfx.drawPolygon([bx, by-14, bx+9, by-7, bx+9, by-1, bx, by-8]);
    gfx.endFill();
    for (let dx = -6; dx <= 6; dx += 4) {
      gfx.beginFill(fc); gfx.drawRect(bx+dx-1, by-19, 2, 5); gfx.endFill();
    }
    if (isWin) {
      gfx.beginFill(0xf0c040, 0.9);
      gfx.drawPolygon([bx-5, by-22, bx-5, by-18, bx, by-20, bx+5, by-18, bx+5, by-22]);
      gfx.endFill();
    }
  }

  /* ── HQ castle ── */
  if (isHQ) {
    const fc  = owner === "player" ? 0x4dcc70 : owner === "ai" ? 0xdd4422 : 0xdddddd;
    const fc2 = owner === "player" ? 0x1a5228 : owner === "ai" ? 0x5c1008 : 0x333333;
    const bx = cx, by = sy - 2;
    gfx.beginFill(0x000000, 0.35); gfx.drawEllipse(bx, by+2, 14, 5); gfx.endFill();
    gfx.beginFill(fc2);
    gfx.drawPolygon([bx, by-20, bx+12, by-10, bx, by+2, bx-12, by-10]);
    gfx.endFill();
    gfx.beginFill(fc, 0.6);
    gfx.drawPolygon([bx, by-20, bx+12, by-10, bx+12, by-2, bx, by-12]);
    gfx.endFill();
    for (let dx = -8; dx <= 8; dx += 4) {
      gfx.beginFill(fc); gfx.drawRect(bx+dx-1.5, by-26, 3, 7); gfx.endFill();
    }
  }

  /* ── Selection border ── */
  if (isSel) {
    gfx.lineStyle(2.5, 0xffffff, 0.95); gfx.drawPolygon(TOP); gfx.lineStyle(0);
  }
}

/* ─── Resource props ─────────────────────────────────────────────────────── */
function drawRssProp(gfx, rss, cx, sy, c, r, pl) {
  const rnd = tileRng(c, r);
  const col = RC[rss] || RC.wood;
  const cy2 = sy + TH / 2 + 2;

  if (rss === "wood") {
    const n = Math.min(6, pl + 2);
    for (let i = 0; i < n; i++) {
      const dx = (rnd()-0.5)*TW*0.52, dy = (rnd()-0.5)*TH*0.50;
      const sz = 4 + rnd()*4 + pl*1.4;
      gfx.beginFill(col.c); gfx.drawEllipse(cx+dx, cy2+dy+sz*0.4, sz*0.45, sz*0.22); gfx.endFill();
      gfx.beginFill(col.a); gfx.drawEllipse(cx+dx, cy2+dy, sz*0.65, sz*1.05); gfx.endFill();
      gfx.beginFill(col.b, 0.65); gfx.drawEllipse(cx+dx-sz*0.14, cy2+dy-sz*0.2, sz*0.38, sz*0.45); gfx.endFill();
    }
  } else if (rss === "stone") {
    const n = Math.min(7, pl + 3);
    for (let i = 0; i < n; i++) {
      const dx = (rnd()-0.5)*TW*0.48, dy = (rnd()-0.5)*TH*0.44;
      const sz = 3 + rnd()*3 + pl;
      gfx.beginFill(col.c, 0.9); gfx.drawEllipse(cx+dx+1, cy2+dy+1, sz*0.78, sz*0.48); gfx.endFill();
      gfx.beginFill(col.a); gfx.drawEllipse(cx+dx, cy2+dy, sz*0.78, sz*0.48); gfx.endFill();
      gfx.beginFill(col.b, 0.55); gfx.drawEllipse(cx+dx-sz*0.18, cy2+dy-sz*0.1, sz*0.32, sz*0.18); gfx.endFill();
    }
  } else if (rss === "ore") {
    const n = Math.min(7, pl + 3);
    for (let i = 0; i < n; i++) {
      const dx = (rnd()-0.5)*TW*0.46, dy = (rnd()-0.5)*TH*0.38;
      const sz = 3 + rnd()*3 + pl*0.8;
      gfx.beginFill(col.c); gfx.drawEllipse(cx+dx, cy2+dy, sz*0.58, sz*0.38); gfx.endFill();
      gfx.beginFill(col.a); gfx.drawEllipse(cx+dx, cy2+dy-sz*0.28, sz*0.48, sz*0.68); gfx.endFill();
      gfx.beginFill(col.b, 0.55); gfx.drawEllipse(cx+dx-sz*0.12, cy2+dy-sz*0.48, sz*0.22, sz*0.28); gfx.endFill();
    }
  } else {
    const n = Math.min(6, pl + 2);
    for (let i = 0; i < n; i++) {
      const dx = (rnd()-0.5)*TW*0.44, dy = (rnd()-0.5)*TH*0.34;
      const sz = 3 + rnd()*3 + pl;
      gfx.beginFill(col.c, 0.65); gfx.drawEllipse(cx+dx, cy2+dy+sz*0.28, sz*0.48, sz*0.28); gfx.endFill();
      gfx.beginFill(col.a, 0.82); gfx.drawEllipse(cx+dx, cy2+dy, sz*0.58, sz*0.88); gfx.endFill();
      gfx.beginFill(col.b, 0.45); gfx.drawEllipse(cx+dx-sz*0.08, cy2+dy-sz*0.22, sz*0.28, sz*0.38); gfx.endFill();
    }
  }
}


/* ─── Ambient scatter — small tufts/pebbles on plain tiles ──────────────── */
// Draws subtle organic detail on tiles with no resource prop.
// This is what makes RTW terrain feel continuous rather than grid-like.
function drawAmbientScatter(gfx, tile, cx, sy) {
  const { c, r, terrain } = tile;
  const rnd = tileRng(c, r);
  const cy2 = sy + TH / 2;
  const v = TV[terrain] || TV_DEF;

  if (terrain === "grass" || terrain === "forest") {
    // Small grass tufts
    const n = 4 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const dx = (rnd()-0.5)*TW*0.72, dy = (rnd()-0.5)*TH*0.55;
      const sz = 1.5 + rnd()*2.5;
      const col = rnd() > 0.5 ? v.lite : v.base;
      gfx.beginFill(col, 0.55); gfx.drawEllipse(cx+dx, cy2+dy, sz*0.9, sz*0.5); gfx.endFill();
    }
  } else if (terrain === "mountain" || terrain === "ruin") {
    // Small pebbles
    const n = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const dx = (rnd()-0.5)*TW*0.68, dy = (rnd()-0.5)*TH*0.52;
      const sz = 1.5 + rnd()*2;
      gfx.beginFill(v.shad, 0.5); gfx.drawEllipse(cx+dx+0.5, cy2+dy+0.5, sz*0.9, sz*0.55); gfx.endFill();
      gfx.beginFill(v.lite, 0.6); gfx.drawEllipse(cx+dx, cy2+dy, sz*0.9, sz*0.55); gfx.endFill();
    }
  } else if (terrain === "desert" || terrain === "shore") {
    // Wind ripple dots
    const n = 5 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const dx = (rnd()-0.5)*TW*0.74, dy = (rnd()-0.5)*TH*0.56;
      const sz = 1 + rnd()*1.5;
      gfx.beginFill(v.lite, 0.35); gfx.drawEllipse(cx+dx, cy2+dy, sz*1.4, sz*0.6); gfx.endFill();
    }
  }
}

/* ─── Gap-fill: no longer needed with flat tiles — keep as no-op ─────────── */
function drawGapFills() {}

/* ─── Biome edge blending — viewport-aware ───────────────────────────────── */
function drawBlend(gfx, tiles, rMin, rMax, cMin, cMax) {
  gfx.clear();
  for (let r = rMin; r <= rMax; r++) {
    for (let c = cMin; c <= cMax; c++) {
      const tile = tiles[`${c},${r}`];
      if (!tile || tile.isShore || tile.isHQ) continue;
      const { terrain } = tile;
      const { cx, cy } = isoXY(c, r);
      const elev = tile.isWin ? 10 : tile.isKeep ? 8 : 4;
      const sy = cy - elev;
      const mid = sy + TH / 2;
      const nbrs = [
        { e:"TL", nc:c-1, nr:r   },
        { e:"TR", nc:c,   nr:r-1 },
        { e:"BL", nc:c,   nr:r+1 },
        { e:"BR", nc:c+1, nr:r   },
      ];
      for (const { e, nc, nr } of nbrs) {
        const nt = tiles[`${nc},${nr}`];
        if (!nt || nt.isShore || nt.terrain === terrain) continue;
        const nv = TV[nt.terrain] || TV_DEF;
        let pts;
        if      (e==="TL") pts = [cx,mid, cx,sy, cx-TW/2,mid];
        else if (e==="TR") pts = [cx,mid, cx,sy, cx+TW/2,mid];
        else if (e==="BL") pts = [cx,mid, cx-TW/2,mid, cx,sy+TH];
        else               pts = [cx,mid, cx+TW/2,mid, cx,sy+TH];
        gfx.beginFill(nv.mid, 0.24); gfx.drawPolygon(pts); gfx.endFill();
      }
    }
  }
}

/* ─── March lines ────────────────────────────────────────────────────────── */
function drawMarchLines(gfx, cmds, reinMarches, tiles) {
  gfx.clear();

  // Draw commander marches
  cmds.forEach(cmd => {
    if (!cmd.march || cmd.owner !== "player") return;
    const m = cmd.march;
    const path = m.path.slice(m.step);
    if (path.length < 2) return;
    const col = m.type === "attack" ? 0xff4444 : 0x44ff88;
    const pts = path.map(k => {
      const [tc, tr] = k.split(",").map(Number);
      const t = tiles[k];
      const elev = t?.isHQ ? 14 : t?.isWin ? 10 : t?.isKeep ? 8 : 4;
      const { cx, cy } = isoXY(tc, tr);
      return { x: cx, y: cy - elev + TH / 2 };
    });
    gfx.lineStyle(5, 0x000000, 0.32);
    gfx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => gfx.lineTo(p.x, p.y));
    gfx.lineStyle(2.5, col, 0.9);
    gfx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => gfx.lineTo(p.x, p.y));
    gfx.lineStyle(0);
    const last = pts[pts.length - 1];
    gfx.beginFill(col, 0.18); gfx.drawCircle(last.x, last.y, 8); gfx.endFill();
    gfx.beginFill(col, 0.85); gfx.drawCircle(last.x, last.y, 5); gfx.endFill();
    gfx.beginFill(0xffffff, 0.9); gfx.drawCircle(last.x, last.y, 2.5); gfx.endFill();
  });

  // Draw reinforcement marches (blue)
  (reinMarches || []).forEach(rm => {
    const path = rm.path.slice(rm.step);
    if (path.length < 2) return;
    const col = 0x88aaff;
    const pts = path.map(k => {
      const [tc, tr] = k.split(",").map(Number);
      const t = tiles[k];
      const elev = t?.isHQ ? 14 : t?.isWin ? 10 : t?.isKeep ? 8 : 4;
      const { cx, cy } = isoXY(tc, tr);
      return { x: cx, y: cy - elev + TH / 2 };
    });
    gfx.lineStyle(5, 0x000000, 0.32);
    gfx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => gfx.lineTo(p.x, p.y));
    gfx.lineStyle(2.5, col, 0.9);
    gfx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => gfx.lineTo(p.x, p.y));
    gfx.lineStyle(0);
    const last = pts[pts.length - 1];
    gfx.beginFill(col, 0.18); gfx.drawCircle(last.x, last.y, 8); gfx.endFill();
    gfx.beginFill(col, 0.85); gfx.drawCircle(last.x, last.y, 5); gfx.endFill();
    gfx.beginFill(0xffffff, 0.9); gfx.drawCircle(last.x, last.y, 2.5); gfx.endFill();
  });
}

/* ─── Commander icons (ellipse halos + emoji) ───────────────────────────── */
function drawCmdIcons(gfx, textCont, cmds, tiles) {
  gfx.clear();

  /* safely clear all previous text icons */
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
      /* halo ellipse */
      gfx.beginFill(col, 0.13);
      gfx.lineStyle(1.4, col, 1);
      gfx.drawEllipse(cx, ey, 15, 5);
      gfx.lineStyle(0);
      gfx.endFill();
      /* emoji icons for each commander (up to 3) */
      const visible = grp.slice(0, 3);
      const spacing = visible.length > 1 ? 14 : 0;
      visible.forEach((cmd, i) => {
        const dx = (i - (visible.length - 1) / 2) * spacing;
        gfx.beginFill(0x000000, 0.45);
        gfx.drawCircle(cx + dx + 1, ey - 10, 9);
        gfx.endFill();
        gfx.beginFill(col, 0.9);
        gfx.drawCircle(cx + dx, ey - 11, 9);
        gfx.endFill();
        gfx.beginFill(0x000000, 0.55);
        gfx.drawCircle(cx + dx, ey - 11, 7);
        gfx.endFill();
        if (textCont && cmd.icon) {
          const txt = new PIXI.Text(cmd.icon, { fontSize: 10, align: "center" });
          txt.anchor.set(0.5, 0.5);
          txt.x = cx + dx;
          txt.y = ey - 11;
          textCont.addChild(txt);
        }
      });
      if (grp.length > 3) {
        gfx.beginFill(col, 0.7);
        gfx.drawCircle(cx + 14, ey - 8, 5);
        gfx.endFill();
      }
    });
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   PROPS LAYER — drawn above ALL tiles so trees/rocks never get clipped
══════════════════════════════════════════════════════════════════════════ */
function drawPropsLayer(gfx, tiles, rMin, rMax, cMin, cMax) {
  gfx.clear();
  // Draw in painter's order so props also sort correctly
  const sorted = [];
  for (let r = rMin; r <= rMax; r++)
    for (let c = cMin; c <= cMax; c++)
      sorted.push({c, r});
  sorted.sort((a, b) => (a.c + a.r) - (b.c + b.r));

  for (const {c, r} of sorted) {
    const tile = tiles[`${c},${r}`];
    if (!tile || tile.isHQ || tile.isWin || tile.isKeep) continue;
    const { cx, cy } = isoXY(c, r);
    const elev = 4;
    const sy = cy - elev;
    if (tile.rss) {
      drawRssProp(gfx, tile.rss, cx, sy, c, r, tile.powerLevel || 1);
    } else if (!tile.owner) {
      drawAmbientScatter(gfx, tile, cx, sy);
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   MAP RENDERER COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export function MapRenderer({ tiles, cmds, reinMarches, selKey, mode, mvCmd, panSt, zoom, ZOOM_LEVELS, onTileClick, onPanChange, onZoomChange }) {
  const containerRef   = useRef(null);
  const appRef         = useRef(null);
  const worldRef       = useRef(null);
  const tileContRef    = useRef(null); // PIXI.Container for tiles
  const gapGfxRef      = useRef(null);
  const propsGfxRef    = useRef(null);
  const blendGfxRef    = useRef(null);
  const marchGfxRef    = useRef(null);
  const cmdGfxRef      = useRef(null);
  const cmdTextContRef = useRef(null);
  const tileGfxMap     = useRef(new Map()); // key → { gfx, hash }
  const needsFullRedraw = useRef(true);
  const lastCullRef    = useRef({ rMin:0, rMax:0, cMin:0, cMax:0 });

  /* live refs so init-effect callbacks always have fresh values */
  const panRef    = useRef(panSt);
  const zoomRef   = useRef(zoom);
  const tilesRef  = useRef(tiles);
  const cmdsRef   = useRef(cmds);
  const selRef    = useRef(selKey);
  const modeRef   = useRef(mode);
  const mvCmdRef  = useRef(mvCmd);
  const ZOOM_REF  = useRef(ZOOM_LEVELS);

  /* callbacks ref so init handlers don't stale-close */
  const onTileClickRef = useRef(onTileClick);
  const onPanChangeRef = useRef(onPanChange);
  const onZoomChangeRef = useRef(onZoomChange);

  useEffect(() => { tilesRef.current = tiles; }, [tiles]);
  useEffect(() => { cmdsRef.current  = cmds;  }, [cmds]);
  useEffect(() => { selRef.current   = selKey; }, [selKey]);
  useEffect(() => { modeRef.current  = mode;  }, [mode]);
  useEffect(() => { mvCmdRef.current = mvCmd; }, [mvCmd]);
  useEffect(() => { onTileClickRef.current  = onTileClick;  }, [onTileClick]);
  useEffect(() => { onPanChangeRef.current  = onPanChange;  }, [onPanChange]);
  useEffect(() => { onZoomChangeRef.current = onZoomChange; }, [onZoomChange]);
  useEffect(() => { ZOOM_REF.current = ZOOM_LEVELS; }, [ZOOM_LEVELS]);

  /* drag state — mutated directly for zero-rerender panning */
  const drag      = useRef(false);
  const didDrag   = useRef(false);
  const dragFrom  = useRef({ x: 0, y: 0 });
  const pinchDist0 = useRef(null);
  const pinchZoom0 = useRef(zoom);
  const tDragFrom  = useRef({ x: 0, y: 0 });
  const tDidDrag   = useRef(false);
  const isPanning  = useRef(false); // keep needsFullRedraw hot while panning
  const panCooldown = useRef(0);    // extra frames to redraw after pan ends

  /* ── INIT PIXI ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const w = Math.max(200, el.clientWidth || window.innerWidth);
    const h = Math.max(200, el.clientHeight || (window.innerHeight - 38));
    const baseOpts = {
      width: w, height: h,
      backgroundColor: 0x091e32,
      antialias: false,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    };
    let app;
    try { app = new PIXI.Application(baseOpts); }
    catch (_) {
      try { app = new PIXI.Application({ ...baseOpts, forceCanvas: true }); }
      catch (e2) { console.warn("PixiJS init failed:", e2); return; }
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

    /* layer order: tiles → gapFill → blend → marchLines → cmdIcons */
    const tileCont = new PIXI.Container();
    // No sortableChildren — we add tiles in painter order (c+r ascending)
    // and use addChildAt to insert new tiles at the correct position.
    world.addChild(tileCont);
    tileContRef.current = tileCont;

    const gapGfx = new PIXI.Graphics();
    world.addChild(gapGfx);
    gapGfxRef.current = gapGfx;

    const blendGfx = new PIXI.Graphics();
    world.addChild(blendGfx);
    blendGfxRef.current = blendGfx;

    const marchGfx = new PIXI.Graphics();
    world.addChild(marchGfx);
    marchGfxRef.current = marchGfx;

    const cmdGfx = new PIXI.Graphics();
    world.addChild(cmdGfx);
    cmdGfxRef.current = cmdGfx;

    const cmdTextCont = new PIXI.Container();
    world.addChild(cmdTextCont);
    cmdTextContRef.current = cmdTextCont;

    // Props layer sits above tiles but below march lines and cmd icons
    // Insert it between blendGfx and marchGfx
    const propsGfx = new PIXI.Graphics();
    world.addChildAt(propsGfx, world.children.indexOf(marchGfx));
    propsGfxRef.current = propsGfx;

    needsFullRedraw.current = true;

    /* ── Per-frame ticker: re-cull and draw tiles when pan/zoom changes ── */
    app.ticker.add(() => {
      // Only trigger tile-spawn/evict loop when viewport actually changed.
      // The PIXI world x/y is updated immediately in touch handlers so
      // visual panning is already smooth — we just need to cull/spawn tiles.
      if (isPanning.current) {
        panCooldown.current = 4;
      } else if (panCooldown.current > 0) {
        panCooldown.current--;
        needsFullRedraw.current = true;
      }
      if (!needsFullRedraw.current) return;
      needsFullRedraw.current = false;

      const pan  = panRef.current;
      const zoom = zoomRef.current;
      const vw   = window.innerWidth, vh = window.innerHeight;
      // At low zoom more world is visible, so we need a zoom-aware buffer
      // to ensure iso-staggered rows/cols are never clipped at screen edges.
      const zoomBuf   = Math.ceil(1 / zoom);            // grows as zoom shrinks
      const SPAWN_BUF = 3 + zoomBuf;
      const EVICT_BUF = 8 + zoomBuf;

      // Convert screen edges to world coordinates
      const wxL = (-pan.x) / zoom;
      const wxR = (-pan.x + vw) / zoom;
      const wyT = (-pan.y) / zoom;
      const wyB = (-pan.y + vh) / zoom;

      // Standard isometric inverse:  c = ((wx - ROWS*TW/2)/(TW/2) + (wy-TOP_PAD)/(TH/2)) / 2
      //                               r = ((wy-TOP_PAD)/(TH/2) - (wx - ROWS*TW/2)/(TW/2)) / 2
      const toC = (wx, wy) => ((wx - ROWS * TW / 2) / (TW / 2) + (wy - TOP_PAD) / (TH / 2)) / 2;
      const toR = (wx, wy) => ((wy - TOP_PAD) / (TH / 2) - (wx - ROWS * TW / 2) / (TW / 2)) / 2;
      // Sample all four screen corners to find the tightest tile bounds
      const cs = [toC(wxL,wyT), toC(wxR,wyT), toC(wxL,wyB), toC(wxR,wyB)];
      const rs = [toR(wxL,wyT), toR(wxR,wyT), toR(wxL,wyB), toR(wxR,wyB)];
      const rMin = Math.max(0,        Math.floor(Math.min(...rs)) - SPAWN_BUF);
      const rMax = Math.min(ROWS - 1, Math.ceil( Math.max(...rs)) + SPAWN_BUF);
      const cMin = Math.max(0,        Math.floor(Math.min(...cs)) - SPAWN_BUF);
      const cMax = Math.min(COLS - 1, Math.ceil( Math.max(...cs)) + SPAWN_BUF);

      const curTiles    = tilesRef.current;
      const curGfxMap   = tileGfxMap.current;
      const curTileCont = tileContRef.current;
      if (!curTileCont) return;

      // Evict tiles well outside viewport
      for (const [k, entry] of curGfxMap) {
        const comma = k.indexOf(",");
        const c = +k.slice(0, comma), r = +k.slice(comma + 1);
        if (r < rMin - EVICT_BUF || r > rMax + EVICT_BUF ||
            c < cMin - EVICT_BUF || c > cMax + EVICT_BUF) {
          curTileCont.removeChild(entry.gfx);
          entry.gfx.destroy();
          curGfxMap.delete(k);
        }
      }

      // Spawn / redraw visible tiles — zIndex = c+r ensures correct painter's order
      // (tiles with smaller c+r are further from viewer and drawn first)
      const cByTile = buildCByTile(cmdsRef.current);
      const selK  = selRef.current;
      const modV  = modeRef.current;
      const mvUid = mvCmdRef.current?.uid;

      for (let r = rMin; r <= rMax; r++) {
        for (let c = cMin; c <= cMax; c++) {
          const key  = `${c},${r}`;
          const tile = curTiles[key];
          if (!tile) continue;

          const hasCmds = Boolean(cByTile[key]?.length);
          const hash    = tileHash(tile, selK, modV, hasCmds, mvUid, zoom);
          const entry   = curGfxMap.get(key);

          if (!entry) {
            const gfx = new PIXI.Graphics();
            // Insert at correct painter position (c+r order) without sortableChildren
            const depth = c + r;
            let insertIdx = curTileCont.children.length;
            for (let i = curTileCont.children.length - 1; i >= 0; i--) {
              if ((curTileCont.children[i]._isoDepth || 0) <= depth) break;
              insertIdx = i;
            }
            gfx._isoDepth = depth;
            curTileCont.addChildAt(gfx, insertIdx);
            curGfxMap.set(key, { gfx, hash });
            drawTile(gfx, tile, selK, modV, hasCmds, mvUid, zoom);
          } else if (entry.hash !== hash) {
            entry.hash = hash;
            drawTile(entry.gfx, tile, selK, modV, hasCmds, mvUid, zoom);
          }
        }
      }

      // Viewport-bounded gap fills and blends (props drawn in React effect below)
      if (gapGfxRef.current)   drawGapFills(gapGfxRef.current,   curTiles, rMin, rMax, cMin, cMax);
      if (blendGfxRef.current) drawBlend(blendGfxRef.current,     curTiles, rMin, rMax, cMin, cMax);
      if (propsGfxRef.current) drawPropsLayer(propsGfxRef.current, curTiles, rMin, rMax, cMin, cMax);

      lastCullRef.current = { rMin, rMax, cMin, cMax };

      lastCullRef.current = { rMin, rMax, cMin, cMax };
    });

    /* resize observer */
    const ro = new ResizeObserver(() => {
      if (appRef.current) appRef.current.renderer.resize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);

    /* ── Wheel zoom ── */
    const onWheel = e => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;
      const levels = ZOOM_REF.current;
      const idx = levels.indexOf(zoomRef.current);
      const ni = Math.max(0, Math.min(levels.length - 1, idx + delta));
      if (levels[ni] !== zoomRef.current) {
        zoomRef.current = levels[ni];
        if (worldRef.current) worldRef.current.scale.set(levels[ni]);
        needsFullRedraw.current = true;
        panCooldown.current = 8;
        onZoomChangeRef.current(levels[ni]);
      }
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
        pinchDist0.current = Math.sqrt(dx*dx + dy*dy);
        pinchZoom0.current = zoomRef.current;
      }
    };
    const onTM = e => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - tDragFrom.current.x;
        const dy = e.touches[0].clientY - tDragFrom.current.y;
        if (Math.abs(dx)+Math.abs(dy) > 5) tDidDrag.current = true;
        tDragFrom.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (tDidDrag.current) {
          const np = clampPan(panRef.current.x+dx, panRef.current.y+dy, zoomRef.current);
          panRef.current = np;
          if (worldRef.current) { worldRef.current.x = np.x; worldRef.current.y = np.y; }
          needsFullRedraw.current = true;
        }
      } else if (e.touches.length === 2 && pinchDist0.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const levels = ZOOM_REF.current;
        const rz = Math.min(levels[levels.length-1], Math.max(levels[0], pinchZoom0.current*(dist/pinchDist0.current)));
        const nz = levels.reduce((a,b) => Math.abs(b-rz) < Math.abs(a-rz) ? b : a);
        if (nz !== zoomRef.current) {
          zoomRef.current = nz;
          if (worldRef.current) worldRef.current.scale.set(nz);
          needsFullRedraw.current = true;
          panCooldown.current = 8;
          onZoomChangeRef.current(nz);
        }
      }
    };
    const onTE = e => {
      if (e.touches.length < 2) pinchDist0.current = null;
      if (e.touches.length === 0) {
        isPanning.current = false;
        if (!tDidDrag.current) {
          const t = e.changedTouches[0];
          const rect = el.getBoundingClientRect();
          const wx = (t.clientX - rect.left - panRef.current.x) / zoomRef.current;
          const wy = (t.clientY - rect.top  - panRef.current.y) / zoomRef.current;
          const key = worldToKey(wx, wy, tilesRef.current);
          if (key) onTileClickRef.current(key, e);
        }
        // Fire pan change last so tile click handler runs without a React re-render in between
        onPanChangeRef.current(panRef.current);
        tDidDrag.current = false;
      }
    };
    el.addEventListener("touchstart",  onTS, { passive: false });
    el.addEventListener("touchmove",   onTM, { passive: false });
    el.addEventListener("touchend",    onTE, { passive: false });
    el.addEventListener("touchcancel", onTE, { passive: false });

    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTS);
      el.removeEventListener("touchmove", onTM);
      el.removeEventListener("touchend", onTE);
      el.removeEventListener("touchcancel", onTE);
      tileGfxMap.current.clear();
      app.destroy(true);
      appRef.current = null; worldRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Sync pan from props (zoom buttons, external pan changes) ── */
  useEffect(() => {
    panRef.current = panSt;
    if (worldRef.current) { worldRef.current.x = panSt.x; worldRef.current.y = panSt.y; }
    needsFullRedraw.current = true;
  }, [panSt]);

  useEffect(() => {
    zoomRef.current = zoom;
    if (worldRef.current) worldRef.current.scale.set(zoom);
    // Immediately spawn tiles for new zoom level to prevent blue flash.
    // We call the same cull logic the ticker uses, synchronously.
    needsFullRedraw.current = true;
    panCooldown.current = 8; // extra frames after zoom to keep spawning edge tiles
  }, [zoom]);

  /* ── Redraw tiles & overlays when React state changes ──
     The PIXI ticker handles pan/zoom culling every frame.
     This effect handles selection, commander, battle state changes. */
  useEffect(() => {
    const tileCont = tileContRef.current;
    if (!tileCont) return;

    // Use the last known cull bounds from the ticker
    const { rMin, rMax, cMin, cMax } = lastCullRef.current;
    const cByTile = buildCByTile(cmds);
    const gfxMap  = tileGfxMap.current;

    // Update hashes for visible tiles (selection changes, battle results, etc.)
    for (const [key, entry] of gfxMap) {
      const tile = tiles[key];
      if (!tile) continue;
      const hasCmds = Boolean(cByTile[key]?.length);
      const hash    = tileHash(tile, selKey, mode, hasCmds, mvCmd?.uid, zoom);
      if (entry.hash !== hash) {
        entry.hash = hash;
        drawTile(entry.gfx, tile, selKey, mode, hasCmds, mvCmd?.uid, zoom);
      }
    }

    // Mark for re-cull on next ticker frame (tiles may have changed)
    needsFullRedraw.current = true;

    /* march lines */
    if (marchGfxRef.current) drawMarchLines(marchGfxRef.current, cmds, reinMarches, tiles);

    /* commander icons */
    if (cmdGfxRef.current) drawCmdIcons(cmdGfxRef.current, cmdTextContRef.current, cmds, tiles);

  }, [tiles, cmds, reinMarches, selKey, mode, mvCmd, zoom]);

  /* ── Mouse handlers ── */
  const onMouseDown = useCallback(e => {
    if (e.button !== 0) return;
    drag.current = true; didDrag.current = false;
    isPanning.current = true;
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
      needsFullRedraw.current = true;
    }
  }, []);

  const onMouseUp = useCallback(e => {
    if (e.button !== 0 && e.type !== "mouseleave") return;
    const wasDrag = didDrag.current;
    drag.current = false; didDrag.current = false;
    isPanning.current = false;
    if (!wasDrag && e.type !== "mouseleave") {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const wx = (e.clientX - rect.left - panRef.current.x) / zoomRef.current;
        const wy = (e.clientY - rect.top  - panRef.current.y) / zoomRef.current;
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
        position: "absolute", inset: 0, top: 38,
        userSelect: "none", touchAction: "none",
        background: "#091e32", overflow: "hidden",
        cursor: "grab",
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    />
  );
}
