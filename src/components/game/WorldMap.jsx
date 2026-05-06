import { useState, useMemo, useEffect } from "react";
import { REGION_LIST, POLYS } from "../../constants/regions.js";
import { PLAYABLE_FACTIONS } from "../../constants/factions.js";

const FAC_COLOR = { player: "#44aaff" };
PLAYABLE_FACTIONS.forEach(f => { FAC_COLOR[f.key] = f.c; });

export default function WorldMap({ tiles, onClose, onTeleport, panRef, zoom }) {
  const [selected, setSelected] = useState(null);
  const [dotPos, setDotPos] = useState(() => panRef?.current || { x:4, y:4 });

  useEffect(() => {
    const id = setInterval(() => {
      if (panRef?.current) setDotPos({ ...panRef.current });
    }, 100);
    return () => clearInterval(id);
  }, [panRef]);

  const keeps = useMemo(() => REGION_LIST.map(reg => {
    const t = tiles[`${reg.cx},${reg.cy}`];
    return { ...reg, owner: t?.owner||null, garrison: t?.garrison||0 };
  }), [tiles]);

  return (
    <div style={{position:"fixed", inset:0, zIndex:9999, background:"#080c10", display:"flex", flexDirection:"column", fontFamily:"'Cinzel',serif"}}>
      <div style={{height:46, background:"rgba(0,0,0,0.85)", borderBottom:"1px solid rgba(200,160,64,0.25)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative"}}>
        <div onClick={onClose} style={{position:"absolute", left:12, color:"#c8a060", fontSize:24, cursor:"pointer"}}>‹</div>
        <span style={{color:"#c8a060", letterSpacing:".12em"}}>WORLD MAP · OPTION B</span>
      </div>

      <div style={{flex:1, position:"relative"}}>
        <svg viewBox="0 0 700 700" style={{width:"100%", height:"100%"}}>
          <defs>
            <radialGradient id="vig" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="transparent"/>
              <stop offset="100%" stopColor="rgba(0,0,0,.5)"/>
            </radialGradient>
          </defs>
          <rect width="700" height="700" fill="#07100a"/>

          {REGION_LIST.map(reg => {
            const poly = POLYS[reg.key];
            if (!poly) return null;
            const isSel = selected === reg.key;
            const owned = reg.owner;
            const facCol = owned ? (owned==="player" ? "#44aaff" : FAC_COLOR[owned] || "#cc8844") : null;
            const isHG = reg.key === "holyGrail";

            return (
              <g key={reg.key} onClick={() => setSelected(isSel ? null : reg.key)} style={{cursor:"pointer"}}>
                <polygon points={poly.map(p => p.join(",")).join(" ")}
                  fill={isHG ? "rgba(240,192,64,0.08)" : facCol ? facCol : "#1e1e1e"}
                  opacity={isHG ? 1 : 0.75} stroke={facCol || "#3a3228"} strokeWidth={isSel ? 3 : 1.2}/>
              </g>
            );
          })}

          {/* Holy Grail Glow */}
          <g>
            <circle cx="350" cy="400" r="45" fill="rgba(240,192,64,0.15)" />
            <text x="350" y="435" textAnchor="middle" fontSize="11" fill="#f0c040">HOLY GRAIL</text>
          </g>

          <rect width="700" height="700" fill="url(#vig)"/>
        </svg>
      </div>

      {selected && <div style={{padding:12, background:"rgba(0,0,0,0.9)", color:"#c8a060"}}>Selected: {selected}</div>}
    </div>
  );
}
