export const COLS = 700;
export const ROWS = 700;
export const TW = 52;
export const TH = 52;
export const SW = 10;
export const TOP_PAD = 60;
export const ISO_W = (COLS + 1) * TW + TW / 2;
export const ISO_H = ROWS * (TH / 2) + TH + SW + TOP_PAD + 40;

export function isoXY(c, r) {
  return {
    cx: c * TW + (r % 2 === 0 ? TW / 2 : TW),
    cy: r * (TH / 2) + TOP_PAD,
  };
}

export function topFacePts(cx, cy, elev) {
  const ey = cy - elev;
  return [
    [cx,        ey],
    [cx + TW/2, ey + TH/2],
    [cx,        ey + TH],
    [cx - TW/2, ey + TH/2],
  ];
}

export function leftWallPts(cx, cy, elev) {
  const ey = cy - elev;
  return [
    [cx - TW/2, ey + TH/2],
    [cx,        ey + TH],
    [cx,        ey + TH + SW],
    [cx - TW/2, ey + TH/2 + SW],
  ];
}

export function rightWallPts(cx, cy, elev) {
  const ey = cy - elev;
  return [
    [cx,        ey + TH],
    [cx + TW/2, ey + TH/2],
    [cx + TW/2, ey + TH/2 + SW],
    [cx,        ey + TH + SW],
  ];
}

export function ptsStr(pts) {
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}
