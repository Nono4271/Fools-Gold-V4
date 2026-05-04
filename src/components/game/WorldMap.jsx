import { useState, useMemo } from "react";
import { REGION_LIST } from "../../constants/regions.js";
import { PLAYABLE_FACTIONS } from "../../constants/factions.js";

// ── Faction color palette ──────────────────────────────────────────────────
const FAC_COLOR = { player: "#44aaff" };
PLAYABLE_FACTIONS.forEach(f => { FAC_COLOR[f.key] = f.c; });

function keepColor(owner) {
  if (!owner) return "#b8a88a";
  if (owner === "player") return "#44aaff";
  return FAC_COLOR[owner] || "#cc8844";
}

// ── Hand-crafted polygon regions (700×700 coordinate space) ───────────────
const REGION_POLYGONS = {
  holyGrail:          [[315,305],[385,305],[415,335],[415,385],[385,405],[315,405],[285,385],[285,335]],
  shatteredShallows:  [[265,135],[435,135],[465,175],[465,235],[400,270],[300,270],[235,235],[235,175]],
  bloodmarch:         [[415,355],[495,355],[535,390],[535,455],[495,485],[415,465],[385,430],[385,380]],
  ashenRift:          [[205,355],[285,355],[315,380],[315,435],[285,465],[205,465],[165,435],[165,385]],
  brinefields:        [[155,105],[305,105],[335,145],[315,225],[235,255],[155,235],[115,195],[115,145]],
  coralfen:           [[395,105],[545,105],[585,145],[585,195],[535,255],[445,255],[385,225],[365,145]],
  stormwatch:         [[485,265],[605,265],[645,305],[645,385],[595,405],[485,395],[445,360],[445,295]],
  boneridge:          [[395,455],[515,455],[555,495],[555,565],[505,595],[395,585],[355,555],[355,485]],
  runemarks:          [[185,455],[305,455],[345,485],[345,555],[305,585],[195,585],[145,555],[145,485]],
  cinderplain:        [[55,265],[205,265],[245,305],[245,385],[195,415],[65,405],[25,365],[25,305]],
  saltmere:           [[25,165],[165,165],[205,205],[205,265],[155,295],[35,285],[5,255],[5,195]],
  tidesreach:         [[535,165],[665,165],[695,195],[695,275],[645,295],[535,285],[495,255],[495,195]],
  ironhaven:          [[485,85],[645,85],[685,125],[675,175],[595,195],[485,185],[445,155],[445,115]],
  grimhold:           [[215,575],[385,575],[425,605],[425,665],[375,695],[225,695],[180,665],[180,605]],
  ashenveil:          [[315,575],[485,575],[520,605],[520,665],[475,695],[325,695],[275,665],[275,605]],
  emberpeak:          [[55,85],[225,85],[265,115],[265,175],[215,205],[65,205],[25,168],[25,112]],
};

// ── Terrain background zones ───────────────────────────────────────────────
const TERRAIN_ZONES = [
  // Ocean surrounds
  { type:"ocean",   pts:[[0,0],[700,0],[700,70],[0,70]] },
  { type:"ocean",   pts:[[0,630],[0,700],[700,700],[700,630]] },
  { type:"ocean",   pts:[[0,0],[0,700],[55,700],[55,0]] },
  { type:"ocean",   pts:[[645,0],[700,0],[700,700],[645,700]] },
  // Core land mass
  { type:"grass",   pts:[[55,70],[645,70],[680,200],[680,500],[645,630],[55,630],[20,500],[20,200]] },
  // Forest regions
  { type:"forest",  pts:[[60,90],[240,90],[280,165],[215,225],[65,215],[30,170]] },
  { type:"forest",  pts:[[125,295],[255,295],[285,380],[225,435],[115,415],[80,360]] },
  { type:"forest",  pts:[[445,445],[560,445],[595,515],[535,575],[425,565],[385,495]] },
  { type:"forest",  pts:[[195,565],[360,565],[395,645],[310,690],[170,680],[135,615]] },
  // Mountain ranges top
  { type:"mountain",pts:[[290,80],[450,80],[485,135],[455,195],[380,225],[300,215],[255,170],[265,115]] },
  { type:"mountain",pts:[[480,75],[660,75],[695,180],[645,250],[555,265],[480,200],[448,148]] },
  // Mountain ranges bottom
  { type:"mountain",pts:[[55,575],[215,575],[260,625],[215,700],[55,700],[15,660]] },
  { type:"mountain",pts:[[440,565],[655,565],[680,630],[610,700],[445,700],[400,660]] },
  // Wetlands
  { type:"wetland", pts:[[480,245],[610,255],[650,315],[625,405],[560,395],[485,340]] },
  { type:"wetland", pts:[[50,245],[210,255],[245,320],[215,405],[75,395],[25,340]] },
  // Plains/central 
  { type:"plains",  pts:[[155,425],[370,425],[400,500],[360,580],[200,580],[135,515]] },
  { type:"plains",  pts:[[350,80],[510,80],[550,175],[490,255],[355,240],[315,170]] },
  // Sandy shore patches
  { type:"shore",   pts:[[55,70],[180,70],[210,110],[160,135],[60,120]] },
  { type:"shore",   pts:[[490,70],[645,70],[640,125],[565,130],[480,105]] },
];

const TERRAIN_FILL = {
  ocean:   "#0d2033",
  grass:   "#243d1a",
  forest:  "#182f15",
  mountain:"#3d3228",
  wetland: "#192e22",
  plains:  "#3d4a22",
  shore:   "#3e3218",
};

const TERRAIN_DARK = {
  ocean:   "#0a1a28",
  grass:   "#1d3314",
  forest:  "#112410",
  mountain:"#302820",
  wetland: "#12231a",
  plains:  "#323c1a",
  shore:   "#2e2512",
};

function scaledPoly(pts, sx, sy) {
  return pts.map(([x,y]) => `${x*sx},${y*sy}`).join(" ");
}

// ── Castle icon (SVG, coordinate-space agnostic) ───────────────────────────
function CastleIcon({ x, y, sz, owner, selected, isHolyGrail }) {
  const col = keepColor(owner);

  if (isHolyGrail) {
    return (
      <g transform={`translate(${x},${y})`}>
        {selected && <circle r={sz*2.2} fill="none" stroke="#f0c040" strokeWidth={1.5} opacity={0.6}/>}
        <circle r={sz*1.7} fill="rgba(240,192,64,0.1)" stroke="#f0c040" strokeWidth={1} opacity={0.7}/>
        <path d={`M${-sz*.5},${-sz*.45} L${sz*.5},${-sz*.45} L${sz*.35},${sz*.2} L${-sz*.35},${sz*.2}Z`}
          fill="#f0c040" opacity={0.92}/>
        <path d={`M${-sz*.2},${sz*.2} L${sz*.2},${sz*.2} L${sz*.1},${sz*.52} L${-sz*.1},${sz*.52}Z`}
          fill="#c8a020" opacity={0.92}/>
        <rect x={-sz*.42} y={sz*.52} width={sz*.84} height={sz*.14} rx={1} fill="#f0c040" opacity={0.9}/>
      </g>
    );
  }

  const bc = owner ? col : "#6a5a3a";
  const batW = sz * 1.12, batH = sz * 1.0;
  const bx = -batW / 2, by = -sz * 0.15;

  return (
    <g transform={`translate(${x},${y})`}>
      {owner && <circle r={sz*1.5} fill={col} opacity={0.18}/>}
      {selected && <circle r={sz*2} fill="none" stroke={col} strokeWidth={1.5} opacity={0.8}/>}
      {/* Base */}
      <rect x={bx} y={by} width={batW} height={batH} rx={1} fill={bc} opacity={0.92}/>
      {/* Battlement teeth */}
      {[-0.38,-0.12,0.12,0.38].map((dx,i) => (
        <rect key={i} x={dx*sz*2 - sz*.12} y={by - sz*.45} width={sz*.22} height={sz*.48} rx={1}
          fill={bc} opacity={0.92}/>
      ))}
      {/* Gate arch */}
      <path d={`M${-sz*.19},${by+batH} L${-sz*.19},${by+batH*.52} Q0,${by+batH*.28} ${sz*.19},${by+batH*.52} L${sz*.19},${by+batH}Z`}
        fill={owner ? "rgba(0,0,0,0.55)" : "#1e180e"}/>
      {/* Tower left */}
      <rect x={bx - sz*.02} y={by - sz*.4} width={sz*.3} height={sz*.42} rx={1} fill={bc} opacity={0.88}/>
      {/* Tower right */}
      <rect x={bx + batW - sz*.28} y={by - sz*.4} width={sz*.3} height={sz*.42} rx={1} fill={bc} opacity={0.88}/>
      {/* Flag */}
      {owner && (
        <>
          <line x1={0} y1={by-sz*.45} x2={0} y2={by-sz*1.35} stroke={col} strokeWidth={1.4}/>
          <polygon points={`0,${by-sz*1.35} ${sz*.48},${by-sz*1.15} 0,${by-sz*.95}`}
            fill={col} opacity={0.95}/>
        </>
      )}
    </g>
  );
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

  const screenW = typeof window !== "undefined" ? window.innerWidth  : 390;
  const screenH = typeof window !== "undefined" ? window.innerHeight : 844;

  // Scale factors from 700×700 design space
  const sx = screenW / 700;
  const sy = screenH / 700;

  function tx(c) { return c * sx; }
  function ty(r) { return r * sy; }

  const keeps = useMemo(() => {
    return REGION_LIST.map(reg => {
      const t = tiles[`${reg.cx},${reg.cy}`];
      return { ...reg, owner: t?.owner || null, garrison: t?.garrison || 0,
               siege: t?.siege || 0, siegeMax: t?.siegeMax || 0 };
    });
  }, [tiles]);

  const selectedKeep = selected ? keeps.find(k => k.key === selected) : null;
  const panelH = selectedKeep ? 168 : 32;
  const mapViewH = screenH - panelH;

  // River path helper: scale a "M x,y Q cx,cy ex,ey" string
  function scalePathD(d) {
    return d.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (_, a, b) => `${tx(+a)},${ty(+b)}`);
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:600,
      background:"#080c10",
      display:"flex", flexDirection:"column",
      overflow:"hidden",
      fontFamily:"'Cinzel',serif",
    }}>
      <style>{`
        @keyframes holyGlow { 0%,100%{opacity:.4} 50%{opacity:.75} }
        @keyframes castlePulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
      `}</style>

      {/* ── Full-screen SVG map ── */}
      <div style={{ position:"relative", width:screenW, height:mapViewH, flexShrink:0, overflow:"hidden" }}>
        <svg width={screenW} height={mapViewH} style={{ display:"block", position:"absolute", inset:0 }}>
          <defs>
            <filter id="wm-shadow">
              <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="rgba(0,0,0,0.8)"/>
            </filter>
            <filter id="wm-glow">
              <feGaussianBlur stdDeviation="4" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <radialGradient id="wm-vignette" cx="50%" cy="50%" r="68%">
              <stop offset="0%" stopColor="transparent"/>
              <stop offset="100%" stopColor="rgba(0,0,0,0.6)"/>
            </radialGradient>
            <radialGradient id="wm-holyGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(240,192,64,0.15)"/>
              <stop offset="100%" stopColor="transparent"/>
            </radialGradient>
          </defs>

          {/* Ocean base */}
          <rect width={screenW} height={mapViewH} fill="#0a1e30"/>

          {/* Terrain zones */}
          {TERRAIN_ZONES.map((z,i) => (
            <polygon key={i} points={scaledPoly(z.pts,sx,sy)} fill={TERRAIN_FILL[z.type]}/>
          ))}
          {/* Terrain shade variation */}
          {TERRAIN_ZONES.map((z,i) => (
            <polygon key={`d${i}`} points={scaledPoly(z.pts,sx,sy)} fill={TERRAIN_DARK[z.type]} opacity={0.28}/>
          ))}

          {/* Vignette */}
          <rect width={screenW} height={mapViewH} fill="url(#wm-vignette)"/>

          {/* Rivers */}
          {[
            "M 185,258 Q 255,296 315,352 Q 348,383 350,352",
            "M 515,258 Q 455,296 420,344 Q 395,362 350,352",
            "M 350,352 Q 335,420 318,482 Q 298,542 278,602",
            "M 350,352 Q 382,418 402,482 Q 422,548 422,600",
            "M 90,258 Q 130,295 155,330",
            "M 610,258 Q 570,295 545,330",
          ].map((d,i) => (
            <path key={i} d={scalePathD(d)}
              fill="none" stroke="#1a4a6a" strokeWidth={1.5} opacity={0.5}/>
          ))}

          {/* Mountain texture marks */}
          {[
            [308,118],[335,100],[365,108],[398,100],[428,114],
            [498,98],[528,88],[562,108],[590,98],[622,118],
            [78,592],[115,612],[148,582],[478,582],[518,592],[568,612],[600,582],
          ].map(([cx,cy],i) => (
            <polygon key={i}
              points={`${tx(cx)},${ty(cy-9)} ${tx(cx+7)},${ty(cy+5)} ${tx(cx-7)},${ty(cy+5)}`}
              fill="#3a3028" opacity={0.55}/>
          ))}

          {/* Forest tree dots */}
          {[
            [100,128],[132,112],[162,138],[112,162],[144,155],
            [158,328],[172,308],[194,344],[168,364],[148,352],
            [468,458],[488,472],[508,448],[494,492],[474,482],
            [218,588],[248,602],[228,622],[258,618],[208,612],
          ].map(([cx,cy],i) => (
            <circle key={i} cx={tx(cx)} cy={ty(cy)} r={3.2} fill="#1a3010" opacity={0.65}/>
          ))}

          {/* ── Region polygons ── */}
          {keeps.map(reg => {
            const poly = REGION_POLYGONS[reg.key];
            if (!poly) return null;
            if (reg.key === "holyGrail") {
              return (
                <g key={reg.key}>
                  <circle cx={tx(350)} cy={ty(350)} r={tx(55)} fill="url(#wm-holyGlow)"
                    style={{animation:"holyGlow 2.5s ease-in-out infinite"}}/>
                  <polygon points={scaledPoly(poly,sx,sy)}
                    fill="rgba(240,192,64,0.07)"
                    stroke="rgba(240,192,64,0.4)" strokeWidth={1.5} strokeDasharray="4 3"/>
                </g>
              );
            }
            const col = reg.owner
              ? (reg.owner === "player" ? "#44aaff" : (FAC_COLOR[reg.owner]||"#cc8844"))
              : "#000";
            const fillOp = reg.owner ? 0.26 : 0.38;
            const strokeCol = reg.owner
              ? (reg.owner === "player" ? "#44aaff" : (FAC_COLOR[reg.owner]||"#cc8844"))
              : "#4a3a28";
            const isSel = selected === reg.key;

            return (
              <g key={reg.key} style={{ cursor:"pointer" }}
                onClick={() => setSelected(isSel ? null : reg.key)}>
                <polygon points={scaledPoly(poly,sx,sy)}
                  fill={col} fillOpacity={fillOp}
                  stroke={strokeCol} strokeWidth={isSel ? 2.2 : 1.2}
                  strokeOpacity={reg.owner ? 0.8 : 0.4}
                  filter={isSel ? "url(#wm-glow)" : undefined}
                />
                {isSel && (
                  <polygon points={scaledPoly(poly,sx,sy)}
                    fill="white" fillOpacity={0.06}
                    stroke="white" strokeWidth={0.5} strokeOpacity={0.35}/>
                )}
              </g>
            );
          })}

          {/* ── Region labels ── */}
          {keeps.map(reg => {
            if (reg.key === "holyGrail") return null;
            const poly = REGION_POLYGONS[reg.key];
            if (!poly) return null;
            const lcx = poly.reduce((s,[x]) => s+x, 0) / poly.length;
            const lcy = poly.reduce((s,[,y]) => s+y, 0) / poly.length;
            const col = reg.owner
              ? (reg.owner === "player" ? "#88ccff" : (FAC_COLOR[reg.owner]||"#ddaa66"))
              : "rgba(178,158,118,0.5)";
            const fs = Math.max(6, Math.min(8.5, 7 * Math.min(sx,sy) * 1.3));
            return (
              <text key={`lbl_${reg.key}`}
                x={tx(lcx)} y={ty(lcy) + 4}
                textAnchor="middle" fontSize={fs}
                fill={col} fontFamily="'Cinzel',serif"
                letterSpacing=".03em"
                style={{ pointerEvents:"none", userSelect:"none" }}>
                {reg.name.replace("The ","").replace(" Keep","")}
              </text>
            );
          })}

          {/* ── Keep icons ── */}
          {keeps.map(reg => {
            const sz = reg.key === "holyGrail" ? Math.max(8, 8.5*Math.min(sx,sy))
              : reg.layer === "conflict"        ? Math.max(6, 7*Math.min(sx,sy))
              : Math.max(5, 5.8*Math.min(sx,sy));
            return (
              <g key={`icon_${reg.key}`} style={{ cursor:"pointer" }}
                onClick={() => setSelected(selected === reg.key ? null : reg.key)}>
                <CastleIcon
                  x={tx(reg.cx)} y={ty(reg.cy) - sz*.6}
                  sz={sz} owner={reg.owner}
                  selected={selected === reg.key}
                  isHolyGrail={reg.key === "holyGrail"}/>
              </g>
            );
          })}

          {/* Holy Grail label */}
          <text x={tx(350)} y={ty(350) + Math.max(20, 22*Math.min(sx,sy))}
            textAnchor="middle" fontSize={Math.max(6.5, 7*Math.min(sx,sy))}
            fill="rgba(240,192,64,0.82)" fontFamily="'Cinzel',serif"
            letterSpacing=".1em" style={{ pointerEvents:"none" }}>
            Holy Grail
          </text>

          {/* ── Top bar overlay ── */}
          <rect width={screenW} height={46} fill="rgba(0,0,0,0.72)"/>
          <line x1={0} y1={46} x2={screenW} y2={46}
            stroke="rgba(200,160,64,0.28)" strokeWidth={1}/>
          <text x={screenW/2} y={29} textAnchor="middle"
            fontSize={15} fill="#c8a060" fontFamily="'Cinzel',serif"
            letterSpacing=".14em">WORLD MAP</text>

          {/* Back button */}
          <g style={{ cursor:"pointer" }} onClick={onClose}>
            <rect x={4} y={9} width={38} height={28} rx={4} fill="rgba(0,0,0,0.55)"/>
            <text x={23} y={28} textAnchor="middle" fontSize={20}
              fill="#c8a060" style={{ pointerEvents:"none" }}>‹</text>
          </g>

          {/* ── Legend bar ── */}
          <rect x={0} y={mapViewH-36} width={screenW} height={36} fill="rgba(0,0,0,0.72)"/>
          {[
            { col:"#b8a88a", label:"Unoccupied" },
            { col:"#44aaff", label:"Allied" },
            { col:"#cc5533", label:"Enemy" },
            { col:"#f0c040", label:"⚜ Holy Ring" },
          ].map(({ col, label }, i) => {
            const lx = (screenW / 4) * (i + 0.5);
            const ly = mapViewH - 20;
            const sz2 = 5;
            return (
              <g key={label}>
                <rect x={lx-sz2} y={ly-sz2*1.7} width={sz2*2} height={sz2*1.7} rx={1} fill={col} opacity={0.88}/>
                {[-sz2*.7, sz2*.7].map((dx,j) => (
                  <rect key={j} x={lx+dx-sz2*.22} y={ly-sz2*2.6} width={sz2*.42} height={sz2} fill={col} opacity={0.88}/>
                ))}
                <text x={lx} y={ly+7} textAnchor="middle" fontSize={6.5}
                  fill={col} opacity={0.75} fontFamily="'Cinzel',serif"
                  style={{ pointerEvents:"none", userSelect:"none" }}>
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Keep detail panel ── */}
      {selectedKeep ? (
        <div style={{
          flexShrink:0,
          background:"rgba(4,6,10,0.98)",
          borderTop:"1px solid rgba(200,160,64,0.22)",
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
                  : selectedKeep.owner === "player" ? "Your Faction" : "Enemy"}
                {selectedKeep.garrison > 0 && ` · ${garrisonLabel(selectedKeep.garrison)} garrison`}
              </div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button onClick={() => { onTeleport(selectedKeep.cx, selectedKeep.cy); onClose(); }}
                style={{
                  padding:"7px 18px",
                  background:"linear-gradient(160deg,#2a1e08,#100c02)",
                  border:"1px solid #8a6020", borderRadius:4,
                  color:"#f0c060", fontFamily:"'Cinzel',serif",
                  fontSize:11, letterSpacing:".06em", cursor:"pointer",
                }}>Go →</button>
              <button onClick={() => setSelected(null)} style={{
                background:"none", border:"none",
                color:"#4a4030", fontSize:16, cursor:"pointer", padding:0,
              }}>✕</button>
            </div>
          </div>

          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{
              padding:"3px 8px", borderRadius:3,
              background: selectedKeep.layer==="ring"     ? "rgba(240,192,64,0.12)"
                        : selectedKeep.layer==="conflict" ? "rgba(220,60,40,0.12)"
                        : "rgba(60,80,60,0.12)",
              border:`1px solid ${
                selectedKeep.layer==="ring"     ? "#7a5010"
                : selectedKeep.layer==="conflict" ? "#6a2010" : "#2a3a2a"
              }`,
              color: selectedKeep.layer==="ring"     ? "#c8a040"
                   : selectedKeep.layer==="conflict" ? "#cc5040" : "#4a6a4a",
              fontSize:8,
            }}>
              {selectedKeep.layer==="ring"     ? "⚜ Holy Ring"
               : selectedKeep.layer==="conflict" ? "⚔ Conflict Zone"
               : selectedKeep.layer==="farm"     ? "🌾 Farm Region" : "🏰 Starting Region"}
            </div>
            {selectedKeep.siegeMax > 0 && (
              <div style={{ flex:1 }}>
                <div style={{ background:"#0a0c10", borderRadius:2, height:5, overflow:"hidden" }}>
                  <div style={{
                    height:"100%",
                    width:`${Math.round((selectedKeep.siege/selectedKeep.siegeMax)*100)}%`,
                    background:"linear-gradient(90deg,#882020,#dd3030)",
                    borderRadius:2,
                  }}/>
                </div>
                <div style={{ color:"#6a4040", fontSize:7, textAlign:"right", marginTop:1 }}>
                  Siege: {selectedKeep.siege.toLocaleString()} / {selectedKeep.siegeMax.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          flexShrink:0, padding:"8px 0",
          textAlign:"center", color:"#3a3020", fontSize:9,
        }}>
          Tap a region or keep to view details
        </div>
      )}
    </div>
  );
}
