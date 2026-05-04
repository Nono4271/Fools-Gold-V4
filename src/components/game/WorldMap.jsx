import { useState, useMemo } from "react";
import { REGION_LIST } from "../../constants/regions.js";
import { PLAYABLE_FACTIONS } from "../../constants/factions.js";

const FAC_COLOR = { player: "#44aaff" };
PLAYABLE_FACTIONS.forEach(f => { FAC_COLOR[f.key] = f.c; });

function keepColor(owner) {
  if (!owner) return "#b8a88a";
  if (owner === "player") return "#44aaff";
  return FAC_COLOR[owner] || "#cc8844";
}

const FINAL = (() => {
  const b0=0, b1=108, b2=228, b3=342, b4=452, b5=562, b6=700;

  const ss = [
    [92,b1],[162,b1],[258,b1],[328,b1],
    [338,b2],[342,b3],
    [278,b3],[142,b3],
    [78,b3],[82,b2],
  ];

  return {
    emberpeak:         [[0,b0],[130,b0],[92,b1],[0,b1]],
    brinefields:       [[130,b0],[210,b0],[162,b1],[92,b1]],
    coralfen:          [[210,b0],[290,b0],[328,b1],[258,b1],[162,b1]],
    ironhaven:         [[290,b0],[420,b0],[420,b1],[328,b1]],

    saltmere:          [[0,b1],[92,b1],[82,b2],[0,b2]],
    shatteredShallows: ss,
    tidesreach:        [[328,b1],[420,b1],[420,b2],[338,b2]],

    cinderplain:       [[0,b2],[82,b2],[78,b3],[0,b3]],
    stormwatch:        [[338,b2],[420,b2],[420,b3],[342,b3]],

    ashenRift:         [[0,b3],[78,b3],[142,b3],[140,b4],[0,b4]],
    holyGrail:         [[142,b3],[278,b3],[280,b4],[140,b4]],
    bloodmarch:        [[278,b3],[342,b3],[420,b3],[420,b4],[280,b4]],

    runemarks:         [[0,b4],[140,b4],[152,b5],[0,b5]],
    boneridge:         [[280,b4],[420,b4],[420,b5],[268,b5]],

    grimhold:          [[0,b5],[152,b5],[268,b5],[210,b6],[0,b6]],
    ashenveil:         [[268,b5],[420,b5],[420,b6],[210,b6]],
  };
})();

const REGION_TERRAIN = {
  emberpeak:        { base:"#2a3d1e", dark:"#1e2e14" },
  brinefields:      { base:"#2e4822", dark:"#223614" },
  coralfen:         { base:"#1e3830", dark:"#162a22" },
  ironhaven:        { base:"#3a3828", dark:"#2a2a1a" },
  saltmere:         { base:"#1a2e3a", dark:"#101e28" },
  shatteredShallows:{ base:"#253820", dark:"#1a2a16" },
  tidesreach:       { base:"#1a2e3a", dark:"#101e28" },
  cinderplain:      { base:"#2e2e1e", dark:"#1e1e12" },
  stormwatch:       { base:"#223028", dark:"#18221e" },
  ashenRift:        { base:"#2a2420", dark:"#1a1814" },
  holyGrail:        { base:"#2a3820", dark:"#1e2a18" },
  bloodmarch:       { base:"#2a1e1e", dark:"#1e1414" },
  runemarks:        { base:"#1e2e20", dark:"#141e16" },
  boneridge:        { base:"#302820", dark:"#221c16" },
  grimhold:         { base:"#22201e", dark:"#161412" },
  ashenveil:        { base:"#2a2828", dark:"#1a1818" },
};

function scalePtStr(pts, sx, sy) {
  return pts.map(([x,y]) => `${(x*sx).toFixed(1)},${(y*sy).toFixed(1)}`).join(" ");
}

function centroid(pts) {
  const cx = pts.reduce((s,[x]) => s+x, 0) / pts.length;
  const cy = pts.reduce((s,[,y]) => s+y, 0) / pts.length;
  return [cx, cy];
}

function garrisonLabel(g) {
  if (!g) return "Empty";
  if (g >= 5000) return "Massive";
  if (g >= 2000) return "Large";
  if (g >= 500)  return "Medium";
  return "Small";
}

export default function WorldMap({ tiles, onClose, onTeleport }) {
  const [selected, setSelected] = useState(null);

  const W_DESIGN = 420, H_DESIGN = 700;
  const screenW = typeof window !== "undefined" ? window.innerWidth  : 390;
  const screenH = typeof window !== "undefined" ? window.innerHeight : 844;

  const sx = screenW  / W_DESIGN;
  const sy = screenH / H_DESIGN;

  const keeps = useMemo(() => {
    return REGION_LIST.map(reg => {
      const t = tiles[`${reg.cx},${reg.cy}`];
      return { ...reg, owner: t?.owner||null, garrison: t?.garrison||0,
               siege: t?.siege||0, siegeMax: t?.siegeMax||0 };
    });
  }, [tiles]);

  const selectedKeep = selected ? keeps.find(k => k.key === selected) : null;
  const panelH = selectedKeep ? 165 : 30;
  const mapH = screenH - panelH;
  const mapHDesign = mapH / sy;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"#080c10",
      display:"flex", flexDirection:"column",
      overflow:"hidden",
      fontFamily:"'Cinzel',serif",
    }}>
      <style>{`
        @keyframes holyPulse { 0%,100%{opacity:.35} 50%{opacity:.65} }
      `}</style>

      <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
        <svg width={screenW} height={mapH} style={{ display:"block" }}>
          <defs>
            <filter id="wm-drop">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.9)"/>
            </filter>
            <radialGradient id="wm-vig" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="transparent"/>
              <stop offset="100%" stopColor="rgba(0,0,0,0.5)"/>
            </radialGradient>
          </defs>

          <rect width={screenW} height={mapH} fill="#0a1820"/>

          {keeps.map(reg => {
            const poly = FINAL[reg.key];
            if (!poly) return null;
            const terrain = REGION_TERRAIN[reg.key] || { base:"#243820", dark:"#182810" };
            const isSel = selected === reg.key;
            const owned = reg.owner;
            const factionCol = owned
              ? (owned==="player" ? "#44aaff" : (FAC_COLOR[owned]||"#cc8844"))
              : null;

            return (
              <g key={reg.key} style={{ cursor:"pointer" }}
                onClick={() => setSelected(isSel ? null : reg.key)}>
                <polygon points={scalePtStr(poly, sx, sy)} fill={terrain.base}/>
                <polygon points={scalePtStr(poly, sx, sy)} fill={terrain.dark} opacity={0.4}/>
                {factionCol && (
                  <polygon points={scalePtStr(poly, sx, sy)} fill={factionCol} opacity={0.3}/>
                )}
                {!owned && reg.key !== "holyGrail" && (
                  <polygon points={scalePtStr(poly, sx, sy)} fill="#000" opacity={0.35}/>
                )}
                {isSel && (
                  <polygon points={scalePtStr(poly, sx, sy)} fill="white" opacity={0.08}/>
                )}
                <polygon
                  points={scalePtStr(poly, sx, sy)}
                  fill="none"
                  stroke={factionCol || (reg.key==="holyGrail" ? "#f0c040" : "#4a3a20")}
                  strokeWidth={isSel ? 2 : 0.8}
                  strokeOpacity={factionCol ? 0.7 : (reg.key==="holyGrail" ? 0.6 : 0.35)}
                  strokeDasharray={reg.key==="holyGrail" ? "5 3" : undefined}
                />
              </g>
            );
          })}

          {(() => {
            const poly = FINAL["holyGrail"];
            if (!poly) return null;
            const [cx,cy] = centroid(poly);
            return (
              <circle cx={cx*sx} cy={cy*sy} r={40*Math.min(sx,sy)}
                fill="rgba(240,192,64,0.12)"
                style={{ animation:"holyPulse 2.5s ease-in-out infinite" }}/>
            );
          })()}

          <rect width={screenW} height={mapH} fill="url(#wm-vig)"/>

          {keeps.map(reg => {
            if (reg.key === "holyGrail") return null;
            const poly = FINAL[reg.key];
            if (!poly) return null;
            const [cx,cy] = centroid(poly);
            const owned = reg.owner;
            const col = owned
              ? (owned==="player" ? "#88ccff" : (FAC_COLOR[owned]||"#ddaa66"))
              : "rgba(160,140,100,0.5)";
            const fs = Math.max(6, Math.min(9, 7.5*Math.min(sx,sy)));
            if (cy*sy > mapH - 20) return null;
            return (
              <text key={`lbl_${reg.key}`}
                x={cx*sx} y={cy*sy + 3}
                textAnchor="middle" fontSize={fs}
                fill={col} fontFamily="'Cinzel',serif"
                letterSpacing=".02em"
                style={{ pointerEvents:"none", userSelect:"none" }}>
                {reg.name.replace("The ","").replace(" Keep","").replace("Shattered ","Sh. ")}
              </text>
            );
          })}

          {keeps.map(reg => {
            const poly = FINAL[reg.key];
            if (!poly) return null;
            const [lcx, lcy] = centroid(poly);
            const cx = lcx * sx, cy = lcy * sy;
            if (cy > mapH - 15) return null;

            const owned = reg.owner;
            const col = keepColor(owned);
            const isHG = reg.key === "holyGrail";
            const sz = isHG ? 9*Math.min(sx,sy) : reg.layer==="conflict" ? 7*Math.min(sx,sy) : 6*Math.min(sx,sy);
            const isSel = selected === reg.key;
            const by = cy - sz*1.2;

            if (isHG) {
              return (
                <g key={`icon_${reg.key}`} style={{ cursor:"pointer" }}
                  onClick={() => setSelected(isSel ? null : reg.key)}>
                  {isSel && <circle cx={cx} cy={cy} r={sz*2.5} fill="none" stroke="#f0c040" strokeWidth={1.5} opacity={0.7}/>}
                  <circle cx={cx} cy={cy} r={sz*1.8} fill="rgba(240,192,64,0.12)" stroke="#f0c040" strokeWidth={0.8} opacity={0.7}/>
                  <path d={`M${cx-sz*.5},${cy-sz*.5} L${cx+sz*.5},${cy-sz*.5} L${cx+sz*.35},${cy+sz*.15} L${cx-sz*.35},${cy+sz*.15}Z`}
                    fill="#f0c040" opacity={0.9}/>
                  <path d={`M${cx-sz*.2},${cy+sz*.15} L${cx+sz*.2},${cy+sz*.15} L${cx+sz*.1},${cy+sz*.5} L${cx-sz*.1},${cy+sz*.5}Z`}
                    fill="#c8a020" opacity={0.9}/>
                  <text x={cx} y={cy+sz*1.5} textAnchor="middle" fontSize={Math.max(5.5, sz*.85)}
                    fill="rgba(240,192,64,0.85)" fontFamily="'Cinzel',serif" letterSpacing=".06em"
                    style={{ pointerEvents:"none" }}>Holy Grail</text>
                </g>
              );
            }

            return (
              <g key={`icon_${reg.key}`} style={{ cursor:"pointer" }}
                onClick={() => setSelected(isSel ? null : reg.key)}>
                {owned && <circle cx={cx} cy={by} r={sz*1.6} fill={col} opacity={0.15}/>}
                {isSel && <circle cx={cx} cy={by} r={sz*2.1} fill="none" stroke={col} strokeWidth={1.4} opacity={0.8}/>}
                <rect x={cx-sz*.58} y={by} width={sz*1.16} height={sz} rx={1}
                  fill={owned ? col : "#5a4a30"} opacity={0.92}/>
                {[-0.4,-0.13,0.13,0.4].map((dx,i) => (
                  <rect key={i} x={cx+dx*sz*2-sz*.13} y={by-sz*.48} width={sz*.24} height={sz*.52} rx={1}
                    fill={owned ? col : "#5a4a30"} opacity={0.92}/>
                ))}
                <path d={`M${cx-sz*.2},${by+sz} L${cx-sz*.2},${by+sz*.5} Q${cx},${by+sz*.28} ${cx+sz*.2},${by+sz*.5} L${cx+sz*.2},${by+sz}Z`}
                  fill={owned ? "rgba(0,0,0,0.55)" : "#1e1408"}/>
                {owned && <>
                  <line x1={cx} y1={by-sz*.48} x2={cx} y2={by-sz*1.4} stroke={col} strokeWidth={1.3}/>
                  <polygon points={`${cx},${by-sz*1.4} ${cx+sz*.5},${by-sz*1.18} ${cx},${by-sz*.95}`}
                    fill={col} opacity={0.95}/>
                </>}
              </g>
            );
          })}

          <rect width={screenW} height={46} fill="rgba(0,0,0,0.75)"/>
          <line x1={0} y1={46} x2={screenW} y2={46} stroke="rgba(200,160,64,0.25)" strokeWidth={1}/>
          <text x={screenW/2} y={29} textAnchor="middle" fontSize={15}
            fill="#c8a060" fontFamily="'Cinzel',serif" letterSpacing=".14em">
            WORLD MAP
          </text>
          <g style={{ cursor:"pointer" }} onClick={onClose}>
            <rect x={4} y={9} width={38} height={28} rx={4} fill="rgba(0,0,0,0.5)"/>
            <text x={23} y={28} textAnchor="middle" fontSize={20}
              fill="#c8a060" style={{ pointerEvents:"none" }}>‹</text>
          </g>

          <rect x={0} y={mapH-34} width={screenW} height={34} fill="rgba(0,0,0,0.75)"/>
          {[
            { col:"#b8a88a", label:"Unoccupied" },
            { col:"#44aaff", label:"Allied" },
            { col:"#cc5533", label:"Enemy" },
            { col:"#f0c040", label:"⚜ Holy Ring" },
          ].map(({ col, label }, i) => {
            const lx = (screenW/4)*(i+0.5);
            const ly = mapH - 19;
            return (
              <g key={label}>
                <rect x={lx-5} y={ly-8} width={10} height={7} rx={1} fill={col} opacity={0.85}/>
                {[-3.5,3.5].map((dx,j) => (
                  <rect key={j} x={lx+dx-2} y={ly-13} width={3.5} height={5.5} fill={col} opacity={0.85}/>
                ))}
                <text x={lx} y={ly+5} textAnchor="middle" fontSize={6.5}
                  fill={col} opacity={0.72} fontFamily="'Cinzel',serif"
                  style={{ pointerEvents:"none", userSelect:"none" }}>
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selectedKeep ? (
        <div style={{
          flexShrink:0,
          background:"rgba(4,6,10,0.98)",
          borderTop:"1px solid rgba(200,160,64,0.2)",
          padding:"10px 14px 14px",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
            <div>
              <div style={{ color:"#c8a060", fontSize:12, letterSpacing:".06em" }}>
                {selectedKeep.keepName}
              </div>
              <div style={{
                color: selectedKeep.owner
                  ? (selectedKeep.owner==="player" ? "#88ccff" : (FAC_COLOR[selectedKeep.owner]||"#cc8844"))
                  : "#7a6a50",
                fontSize:10, marginTop:2,
              }}>
                {!selectedKeep.owner ? "Unoccupied"
                  : selectedKeep.owner==="player" ? "Your Faction" : "Enemy"}
                {selectedKeep.garrison>0 && ` · ${garrisonLabel(selectedKeep.garrison)} garrison`}
              </div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button onClick={() => { onTeleport(selectedKeep.cx,selectedKeep.cy); onClose(); }}
                style={{
                  padding:"7px 18px",
                  background:"linear-gradient(160deg,#2a1e08,#100c02)",
                  border:"1px solid #8a6020", borderRadius:4,
                  color:"#f0c060", fontFamily:"'Cinzel',serif",
                  fontSize:11, letterSpacing:".06em", cursor:"pointer",
                }}>Go →</button>
              <button onClick={() => setSelected(null)}
                style={{ background:"none",border:"none",color:"#4a4030",fontSize:16,cursor:"pointer",padding:0 }}>
                ✕
              </button>
            </div>
          </div>
          <div style={{
            padding:"3px 8px", borderRadius:3, display:"inline-block",
            background: selectedKeep.layer==="ring"     ? "rgba(240,192,64,0.12)"
                      : selectedKeep.layer==="conflict" ? "rgba(220,60,40,0.12)"
                      : "rgba(60,80,60,0.12)",
            border:`1px solid ${
              selectedKeep.layer==="ring" ? "#7a5010"
              : selectedKeep.layer==="conflict" ? "#6a2010" : "#2a3a2a"
            }`,
            color: selectedKeep.layer==="ring" ? "#c8a040"
                 : selectedKeep.layer==="conflict" ? "#cc5040" : "#4a6a4a",
            fontSize:8,
          }}>
            {selectedKeep.layer==="ring" ? "⚜ Holy Ring"
             : selectedKeep.layer==="conflict" ? "⚔ Conflict Zone"
             : selectedKeep.layer==="farm" ? "🌾 Farm Region" : "🏰 Starting Region"}
          </div>
          {selectedKeep.siegeMax>0 && (
            <div style={{ marginTop:6 }}>
              <div style={{ background:"#0a0c10", borderRadius:2, height:5, overflow:"hidden" }}>
                <div style={{
                  height:"100%",
                  width:`${Math.round((selectedKeep.siege/selectedKeep.siegeMax)*100)}%`,
                  background:"linear-gradient(90deg,#882020,#dd3030)", borderRadius:2,
                }}/>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          flexShrink:0, padding:"7px 0",
          textAlign:"center", color:"#2e2818", fontSize:9,
        }}>
          Tap a region to view details
        </div>
      )}
    </div>
  );
}
