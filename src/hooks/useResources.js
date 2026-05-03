import { useEffect } from "react";
import { rssRate } from "../constants/buildings.js";

export function useResources({ screen, tiles, bldgs, setRss }) {
useEffect(() => {
if (screen !== "game") return;
const id = setInterval(() => {
setRss(p => {
const n = { stone: p.stone + 5, wood: p.wood + 5, ore: p.ore + 5, gas: p.gas + 5 };
Object.values(tiles).forEach(t => {
if (t.owner === "player" && t.rss) {
  const bldgKey = t.rss === "stone" ? "quarry" : t.rss === "wood" ? "lumber" : t.rss === "ore" ? "forge" : "refinery";
  const lvl = bldgs[bldgKey] || 0;
  n[t.rss] += rssRate(lvl);
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
}, [screen, tiles, bldgs, setRss]);
}
