import { useEffect } from "react";
import { barracksCapacity, trainRate } from "../constants/buildings.js";

export function useTraining({ screen, bldgs, setTrainingQueue, setBarracks, setWounded }) {
// Healing tent tick
useEffect(() => {
if (screen !== "game") return;
const id = setInterval(() => {
const tentLvl = bldgs.healingtent || 0;
if (tentLvl < 1) return;
const healRate = tentLvl * 5;
setWounded(w => {
if (w <= 0) return 0;
const healed = Math.min(w, healRate);
setBarracks(pool => Math.min(barracksCapacity(bldgs.barracks || 0), pool + healed));
return Math.max(0, w - healed);
});
}, 1000);
return () => clearInterval(id);
}, [screen, bldgs.healingtent, bldgs.barracks, setBarracks, setWounded]);

// Training queue tick
useEffect(() => {
if (screen !== "game") return;
const id = setInterval(() => {
setTrainingQueue(q => {
if (!q) return null;
const rate = trainRate(bldgs.training || 0);
const delivered = Math.min(q.remaining, rate);
const newRemaining = q.remaining - delivered;
setBarracks(pool => Math.min(barracksCapacity(bldgs.barracks || 0), pool + delivered));
if (newRemaining <= 0) return null;
return { ...q, remaining: newRemaining };
});
}, 1000);
return () => clearInterval(id);
}, [screen, bldgs.training, bldgs.barracks, setTrainingQueue, setBarracks]);
}
