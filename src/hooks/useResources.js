import { useEffect, useRef } from "react";
import { rssRate } from "../constants/buildings.js";

export function useResources({ screen, tiles, bldgs, setRss }) {
// Bug 26 fix: keep tiles/bldgs in refs so the interval is created once per screen mount
// instead of being torn down and recreated on every tile change.
const tilesRef = useRef(tiles);
const bldgsRef = useRef(bldgs);
useEffect(() => { tilesRef.current = tiles; }, [tiles]);
useEffect(() => { bldgsRef.current = bldgs; }, [bldgs]);

useEffect(() => {
if (screen !== "game") return;
const id = setInterval(() => {
setRss(p => {
const t = tilesRef.current;
const b = bldgsRef.current;
const n = { stone: p.stone + 5, wood: p.wood + 5, ore: p.ore + 5, gas: p.gas + 5 };
Object.values(t).forEach(tile => {
if (tile.owner === "player" && tile.rss) {
  const bldgKey = tile.rss === "stone" ? "quarry" : tile.rss === "wood" ? "lumber" : tile.rss === "ore" ? "forge" : "refinery";
  const lvl = b[bldgKey] || 0;
  n[tile.rss] += rssRate(lvl);
}
});
return {
stone: Math.min(9990000, n.stone),
wood:  Math.min(9990000, n.wood),
ore:   Math.min(9990000, n.ore),
gas:   Math.min(9990000, n.gas),
};
});
}, 1000);
return () => clearInterval(id);
}, [screen, setRss]);
}
