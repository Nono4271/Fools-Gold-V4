import { COLS, ROWS } from "../constants/geometry.js";
import { TROOP } from "../constants/troops.js";

export function isShore(c, r) {
  return c === 0 || r === 0 || c === COLS - 1 || r === ROWS - 1;
}

export function adj(c, r) {
  const isEven = r % 2 === 0;
  const nbrs = isEven
    ? [[c-1,r],[c+1,r],[c-1,r-1],[c,r-1],[c-1,r+1],[c,r+1]]
    : [[c-1,r],[c+1,r],[c,r-1],[c+1,r-1],[c,r+1],[c+1,r+1]];
  return nbrs
    .filter(([tc,tr]) => tc >= 0 && tr >= 0 && tc < COLS && tr < ROWS && !isShore(tc, tr))
    .map(([tc,tr]) => `${tc},${tr}`);
}

export function bfsPath(fromKey, toKey) {
  if (fromKey === toKey) return [fromKey];
  const queue = [[fromKey, [fromKey]]];
  const visited = new Set([fromKey]);
  while (queue.length) {
    const [cur, path] = queue.shift();
    const [cc, cr] = cur.split(",").map(Number);
    for (const nk of adj(cc, cr)) {
      if (visited.has(nk)) continue;
      visited.add(nk);
      const newPath = [...path, nk];
      if (nk === toKey) return newPath;
      queue.push([nk, newPath]);
    }
  }
  return null;
}

export function effectiveMarchSpd(cmdSpd, troopType) {
  if (!troopType || !TROOP[troopType]) return cmdSpd || 60;
  const tSpd = TROOP[troopType].spd;
  return Math.round(tSpd * 0.80 + (cmdSpd || 60) * 0.20);
}

export function marchStepMs(effSpd) {
  return Math.max(200, 1400 - (effSpd || 60) * 10);
}
