import { useEffect } from "react";
import { RKEYS } from "../constants/map.js";

export function useResources({ screen, tiles, setRss }) {
useEffect(() => {
if (screen !== "game") return;
const id = setInterval(() => {
setRss(p => {
const n = { stone: p.stone + 5, wood: p.wood + 5, ore: p.ore + 5, gas: p.gas + 5 };
Object.values(tiles).forEach(t => {
if (t.owner === "player" && t.rss) n[t.rss] += 50;
});
return {
stone: Math.min(99999, n.stone),
wood:  Math.min(99999, n.wood),
ore:   Math.min(99999, n.ore),
gas:   Math.min(99999, n.gas),
};
});
}, 1000);
return () => clearInterval(id);
}, [screen, tiles, setRss]);
}
