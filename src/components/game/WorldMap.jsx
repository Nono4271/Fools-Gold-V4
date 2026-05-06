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
    return { ...reg, owner: t?.owner||null, garrison: t?.garrison||0, siege: t?.siege||0, siegeMax: t?.siegeMax||0 };
  }), [tiles]);

  const selectedKeep = selected ? keeps.find(k => k.key === selected) : null;

  return (
    <div style={{position:"fixed", inset:0, zIndex:9999, background:"#080c10", display:"flex", flexDirection:"column", overflow:"hidden", fontFamily:"'Cinzel',serif"}}>
      <div style={{flexShrink:0, height:46, background:"rgba(0,0,0,0.85)", borderBottom:"1px solid rgba(200,160,64,0.25)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative"}}>
        <div style={{cursor:"pointer", position:"absolute", left:4, padding:"4px 10px", fontSize:20, color:"#c8a060"}} onClick={onClose}>‹</div>
        <span style={{color:"#c8a060", fontSize:15, letterSpacing:".14em"}}>WORLD MAP · OPTION B</span>
      </div>

      <div style={{flex:1, overflow:"hidden", position:"relative"}}>
        <svg viewBox="0 0 700 700" style={{width:"100%", height:"100%", display:"block"}}>
          <defs>
            <radialGradient id="vig" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="transparent"/>
              <stop offset="100%" stopColor="rgba(0,0,0,.45)"/>
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
                <polygon points={poly.map(p => p.join(',')).join(' ')}
                  fill={isHG ? "rgba(240,192,64,0.08)" : facCol ? facCol : "#1e1e1e"}
                  opacity={isHG ? 1 : facCol ? 0.35 : 0.75}
                  stroke={facCol || "#3a3228"} strokeWidth={isSel ? 2.5 : 1.2}
                  strokeOpacity={facCol ? 0.8 : 0.45}/>
                {isSel && <polygon points={poly.map(p => p.join(',')).join(' ')} fill="white" opacity="0.08"/>}
              </g>
            );
          })}

          {/* Holy Grail Glow */}
          <g>
            <polygon points={POLYS.holyGrail.map(p => p.join(',')).join(' ')} fill="rgba(240,192,64,0.08)" stroke="#8a6010" strokeWidth="1.8"/>
            <circle cx="350" cy="400" r="45" fill="rgba(240,192,64,0.15)" style={{animation:"holyPulse 2.8s infinite"}}/>
            <circle cx="350" cy="400" r="28" fill="rgba(240,192,64,0.08)" style={{animation:"holyPulse 2.8s infinite", animationDelay:"0.4s"}}/>
            <text x="350" y="435" textAnchor="middle" fontSize="9" fill="#f0c040" fontFamily="'Cinzel',serif" letterSpacing=".08em">HOLY GRAIL</text>
          </g>

          <rect width="700" height="700" fill="url(#vig)"/>
        </svg>
      </div>

      {selectedKeep && (
        <div style={{flexShrink:0, background:"rgba(4,6,10,0.98)", borderTop:"1px solid rgba(200,160,64,0.2)", padding:"12px 16px"}}>
          <div style={{color:"#c8a060", fontSize:13}}>{selectedKeep.keepName}</div>
          <button onClick={() => { onClose(); onTeleport(selectedKeep.cx, selectedKeep.cy); }} style={{marginTop:8, padding:"8px 20px", background:"#2a1e08", border:"1px solid #8a6020", color:"#f0c060", borderRadius:4}}>
            Teleport to Region
          </button>
        </div>
      )}
    </div>
  );
}
