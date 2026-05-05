import { useState, useMemo, useEffect } from "react";
import { REGION_LIST } from "../../constants/regions.js";
import { PLAYABLE_FACTIONS } from "../../constants/factions.js";
import { ISO_W, ISO_H, TW, TH, TOP_PAD, ROWS } from "../../constants/geometry.js";
import { ICON_SCALE, HIT_PAD } from "../../constants/device.js";

const FAC_COLOR = { player: "#44aaff" };
PLAYABLE_FACTIONS.forEach(f => { FAC_COLOR[f.key] = f.c; });

function keepColor(owner) {
  if (!owner) return "#b8a88a";
  if (owner === "player") return "#44aaff";
  return FAC_COLOR[owner] || "#cc8844";
}

// ── Design space: 700×700 matching the tile grid ─────────────────────────────
const DW = 700, DH = 700;

const POLYS = {
  saltmere:          [[0,0],[200,0],[170,200],[0,200]],
  tidesreach:        [[700,0],[500,0],[530,200],[700,200]],
  emberpeak:         [[0,200],[170,200],[170,402],[0,402]],
  ironhaven:         [[700,200],[530,200],[530,402],[700,402]],
  ashenveil:         [[0,532],[170,532],[170,573],[215,573],[215,700],[0,700]],
  grimhold:          [[700,532],[530,532],[530,573],[485,573],[485,700],[700,700]],
  brinefields:       [[200,0],[295,0],[250,200],[250,261],[170,261],[170,200]],
  coralfen:          [[500,0],[405,0],[450,200],[450,261],[530,261],[530,200]],
  cinderplain:       [[0,402],[170,402],[170,532],[0,532]],
  stormwatch:        [[700,402],[530,402],[530,532],[700,532]],
  runemarks:         [[170,573],[350,573],[350,700],[215,700],[170,573]],
  boneridge:         [[530,573],[350,573],[350,700],[485,700],[530,573]],
  shatteredShallows: [[295,0],[405,0],[450,200],[450,261],[250,261],[250,200]],
  ashenRift:         [[170,261],[350,261],[350,319],[275,319],[265,399],[275,479],[350,479],[350,573],[170,573]],
  bloodmarch:        [[530,261],[350,261],[350,319],[425,319],[435,399],[425,479],[350,479],[350,573],[530,573]],
  holyGrail:         [[275,319],[425,319],[435,399],[425,479],[275,479],[265,399]],
};

const REGION_TERRAIN = {
  saltmere:         { base:"#1e1e14", dark:"#141410" },
  tidesreach:       { base:"#101e28", dark:"#081418" },
  brinefields:      { base:"#241e0e", dark:"#181208" },
  coralfen:         { base:"#102028", dark:"#081418" },
  emberpeak:        { base:"#1e1010", dark:"#140808" },
  ironhaven:        { base:"#081428", dark:"#040c18" },
  shatteredShallows:{ base:"#1e2e18", dark:"#141e10" },
  cinderplain:      { base:"#1e1408", dark:"#140e04" },
  stormwatch:       { base:"#081828", dark:"#040e18" },
  holyGrail:        { base:"#1e3018", dark:"#142010" },
  ashenRift:        { base:"#281808", dark:"#1c1004" },
  bloodmarch:       { base:"#220808", dark:"#180404" },
  runemarks:        { base:"#141820", dark:"#0c1018" },
  boneridge:        { base:"#18140c", dark:"#100e08" },
  ashenveil:        { base:"#120e1e", dark:"#0c0814" },
  grimhold:         { base:"#0e1808", dark:"#080e04" },
};

function scalePts(pts, sx, sy) {
  return pts.map(([x,y]) => `${(x*sx).toFixed(1)},${(y*sy).toFixed(1)}`).join(" ");
}

function centroid(pts) {
  return [
    pts.reduce((s,[x])=>s+x,0)/pts.length,
    pts.reduce((s,[,y])=>s+y,0)/pts.length,
  ];
}

function garrisonLabel(g) {
  if (!g)        return "Empty";
  if (g >= 5000) return "Massive";
  if (g >= 2000) return "Large";
  if (g >= 500)  return "Medium";
  return "Small";
}

export default function WorldMap({ tiles, onClose, onTeleport, panRef, zoom }) {
  const [selected, setSelected] = useState(null);
  const [dotPos, setDotPos] = useState(() => panRef?.current || { x:4, y:4 });

  useEffect(() => {
    const id = setInterval(() => {
      if (panRef?.current) setDotPos({ ...panRef.current });
    }, 100);
    return () => clearInterval(id);
  }, [panRef]);

  const screenW = typeof window !== "undefined" ? window.innerWidth  : 390;
  const screenH = typeof window !== "undefined" ? window.innerHeight : 844;

  const keeps = useMemo(() => {
    return REGION_LIST.map(reg => {
      const t = tiles[`${reg.cx},${reg.cy}`];
      return { ...reg, owner: t?.owner||null, garrison: t?.garrison||0,
               siege: t?.siege||0, siegeMax: t?.siegeMax||0 };
    });
  }, [tiles]);

  const selectedKeep = selected ? keeps.find(k => k.key === selected) : null;

  const sx = 1, sy = 1;
  const iconMult = ICON_SCALE;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"#080c10",
      display:"flex", flexDirection:"column",
      overflow:"hidden",
      fontFamily:"'Cinzel',serif",
    }}>
      <style>{`
        @keyframes holyPulse { 0%,100%{opacity:.3} 50%{opacity:.6} }
      `}</style>

      {/* Top bar */}
      <div style={{
        flexShrink:0, height:46,
        background:"rgba(0,0,0,0.85)",
        borderBottom:"1px solid rgba(200,160,64,0.25)",
        display:"flex", alignItems:"center", justifyContent:"center",
        position:"relative",
      }}>
        <div style={{cursor:"pointer", position:"absolute", left:4,
          padding:"4px 10px", fontSize:20, color:"#c8a060"}}
          onClick={onClose}>‹</div>
        <span style={{color:"#c8a060", fontSize:15, fontFamily:"'Cinzel',serif", letterSpacing:".14em"}}>
          WORLD MAP
        </span>
      </div>

      {/* Map area */}
      <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
        <svg viewBox={`0 0 ${DW} ${DH}`} preserveAspectRatio="none"
          style={{ display:"block", width:"100%", height:"100%" }}>
          <defs>
            <filter id="wm-drop">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.9)"/>
            </filter>
            <radialGradient id="wm-vig" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="transparent"/>
              <stop offset="100%" stopColor="rgba(0,0,0,0.45)"/>
            </radialGradient>
          </defs>

          {/* Base */}
          <rect width={DW} height={DH} fill="#0a1418"/>

          {/* ── Region polygons ── */}
          {keeps.map(reg => {
            const poly = POLYS[reg.key];
            if (!poly) return null;
            const isSel   = selected === reg.key;
            const owned   = reg.owner;
            const facCol  = owned ? (owned==="player" ? "#44aaff" : (FAC_COLOR[owned]||"#cc8844")) : null;
            const isHG    = reg.key === "holyGrail";

            return (
              <g key={reg.key} style={{cursor:"pointer"}}
                onClick={() => setSelected(isSel ? null : reg.key)}>
                <polygon points={scalePts(poly,sx,sy)}
                  fill={isHG ? "rgba(240,192,64,0.08)" : facCol ? facCol : "#1e1e1e"}
                  opacity={isHG ? 1 : facCol ? 0.35 : 0.7}/>
                {isSel && <polygon points={scalePts(poly,sx,sy)} fill="white" opacity={0.07}/>}
                {!isHG && (
                  <polygon points={scalePts(poly,sx,sy)} fill="none"
                    stroke={facCol || "#3a3228"}
                    strokeWidth={isSel ? 2 : 0.8}
                    strokeOpacity={facCol ? 0.7 : 0.45}/>
                )}
              </g>
            );
          })}

          {/* Holy Grail glow */}
          {(() => {
            const poly = POLYS["holyGrail"];
            if (!poly) return null;
            const [cx,cy] = centroid(poly);
            return <circle cx={cx*sx} cy={cy*sy} r={22*sx}
              fill="rgba(240,192,64,0.1)"
              style={{animation:"holyPulse 2.5s ease-in-out infinite"}}/>;
          })()}

          {/* Vignette */}
          <rect width={DW} height={DH} fill="url(#wm-vig)"/>

          {/* ── Player viewport dot ── */}
          {dotPos && zoom && (() => {
            const worldX = (screenW / 2 - dotPos.x) / zoom;
            const worldY = (screenH / 2 - dotPos.y) / zoom;
            const u = worldX - ROWS * TW / 2;
            const v = worldY - TOP_PAD;
            const tileC = (u / (TW / 2) + v / (TH / 2)) / 2;
            const tileR = (v / (TH / 2) - u / (TW / 2)) / 2;
            const dotX = tileC * sx;
            const dotY = tileR * sy;
            if (dotX < 0 || dotX > DW || dotY < 0 || dotY > DH) return null;
            return (
              <g style={{pointerEvents:"none"}}>
                <circle cx={dotX} cy={dotY} r={6*sx} fill="rgba(68,170,255,0.18)" stroke="#44aaff" strokeWidth={1.2}/>
                <circle cx={dotX} cy={dotY} r={2.5*sx} fill="#44aaff" opacity={0.95}/>
              </g>
            );
          })()}

          {/* ── Region labels ── */}
          {keeps.map(reg => {
            if (reg.key === "holyGrail") return null;
            const poly = POLYS[reg.key];
            if (!poly) return null;
            const [lcx,lcy] = centroid(poly);
            const owned = reg.owner;
            const col = owned
              ? (owned==="player" ? "#88ccff" : (FAC_COLOR[owned]||"#ddaa66"))
              : "rgba(160,140,100,0.45)";
            const fs = Math.max(6, Math.min(9, 7.5*sx));
            if (lcy*sy > DH - 20) return null;
            return (
              <text key={`lbl_${reg.key}`}
                x={lcx*sx} y={lcy*sy+3}
                textAnchor="middle" fontSize={fs}
                fill={col} fontFamily="'Cinzel',serif"
                letterSpacing=".02em"
                style={{pointerEvents:"none",userSelect:"none"}}>
                {reg.name.replace("The ","").replace(" Keep","").replace("Shattered ","Sh. ")}
              </text>
            );
          })}

          {/* ── Keep icons ── */}
          {keeps.map(reg => {
            const poly = POLYS[reg.key];
            if (!poly) return null;
            const [lcx,lcy] = centroid(poly);
            const cx = lcx*sx, cy = lcy*sy;
            if (cy > DH - 15) return null;

            const owned = reg.owner;
            const col   = keepColor(owned);
            const isHG  = reg.key === "holyGrail";
            const sz    = (isHG ? 14*sx : reg.layer==="conflict" ? 11*sx : 10*sx) * iconMult;
            const isSel = selected === reg.key;
            const by    = cy - sz*1.2;
            const hitPad = HIT_PAD * sx;

            if (isHG) return (
              <g key={`icon_${reg.key}`} style={{cursor:"pointer"}}
                onClick={() => setSelected(isSel ? null : reg.key)}>
                {isSel && <circle cx={cx} cy={cy} r={sz*2.5} fill="none" stroke="#f0c040" strokeWidth={1.5} opacity={0.7}/>}
                <circle cx={cx} cy={cy} r={sz*1.8} fill="rgba(240,192,64,0.12)" stroke="#f0c040" strokeWidth={0.8} opacity={0.7}/>
                <path d={`M${cx-sz*.5},${cy-sz*.5} L${cx+sz*.5},${cy-sz*.5} L${cx+sz*.35},${cy+sz*.15} L${cx-sz*.35},${cy+sz*.15}Z`}
                  fill="#f0c040" opacity={0.9}/>
                <path d={`M${cx-sz*.2},${cy+sz*.15} L${cx+sz*.2},${cy+sz*.15} L${cx+sz*.1},${cy+sz*.5} L${cx-sz*.1},${cy+sz*.5}Z`}
                  fill="#c8a020" opacity={0.9}/>
                <text x={cx} y={cy+sz*1.5} textAnchor="middle" fontSize={Math.max(5.5,sz*.85)}
                  fill="rgba(240,192,64,0.85)" fontFamily="'Cinzel',serif" letterSpacing=".06em"
                  style={{pointerEvents:"none"}}>Holy Grail</text>
              </g>
            );

            return (
              <g key={`icon_${reg.key}`} style={{cursor:"pointer"}}
                onClick={() => setSelected(isSel ? null : reg.key)}>
                <rect x={cx-sz-hitPad} y={by-sz*1.4-hitPad} width={sz*2+hitPad*2} height={sz*2.8+hitPad*2} fill="transparent"/>
                {owned && <circle cx={cx} cy={by} r={sz*1.6} fill={col} opacity={0.15}/>}
                {isSel && <circle cx={cx} cy={by} r={sz*2.1} fill="none" stroke={col} strokeWidth={1.4} opacity={0.8}/>}
                <rect x={cx-sz*.58} y={by} width={sz*1.16} height={sz} rx={1}
                  fill={owned?col:"#5a4a30"} opacity={0.92}/>
                {[-0.4,-0.13,0.13,0.4].map((dx,i) => (
                  <rect key={i} x={cx+dx*sz*2-sz*.13} y={by-sz*.48} width={sz*.24} height={sz*.52} rx={1}
                    fill={owned?col:"#5a4a30"} opacity={0.92}/>
                ))}
                <path d={`M${cx-sz*.2},${by+sz} L${cx-sz*.2},${by+sz*.5} Q${cx},${by+sz*.28} ${cx+sz*.2},${by+sz*.5} L${cx+sz*.2},${by+sz}Z`}
                  fill={owned?"rgba(0,0,0,0.55)":"#1e1408"}/>
                {owned && <>
                  <line x1={cx} y1={by-sz*.48} x2={cx} y2={by-sz*1.4} stroke={col} strokeWidth={1.3}/>
                  <polygon points={`${cx},${by-sz*1.4} ${cx+sz*.5},${by-sz*1.18} ${cx},${by-sz*.95}`}
                    fill={col} opacity={0.95}/>
                </>}
              </g>
            );
          })}

        </svg>
      </div>

      {/* ── Detail panel ── */}
      {selectedKeep && (
        <div style={{
          flexShrink:0,
          background:"rgba(4,6,10,0.98)",
          borderTop:"1px solid rgba(200,160,64,0.2)",
          padding:"10px 14px 14px",
        }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div>
              <div style={{color:"#c8a060",fontSize:12,letterSpacing:".06em"}}>
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
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={() => { onClose(); requestAnimationFrame(() => onTeleport(selectedKeep.cx,selectedKeep.cy)); }}
                style={{
                  padding:"7px 18px",
                  background:"linear-gradient(160deg,#2a1e08,#100c02)",
                  border:"1px solid #8a6020", borderRadius:4,
                  color:"#f0c060", fontFamily:"'Cinzel',serif",
                  fontSize:11, letterSpacing:".06em", cursor:"pointer",
                }}>Go →</button>
              <button onClick={() => setSelected(null)}
                style={{background:"none",border:"none",color:"#4a4030",fontSize:16,cursor:"pointer",padding:0}}>
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
            {selectedKeep.layer==="ring"     ? "⚜ Holy Ring"
             : selectedKeep.layer==="conflict" ? "⚔ Conflict Zone"
             : selectedKeep.layer==="farm"     ? "🌾 Farm Region" : "🏰 Starting Region"}
          </div>
          {selectedKeep.siegeMax>0 && (
            <div style={{marginTop:6}}>
              <div style={{background:"#0a0c10",borderRadius:2,height:5,overflow:"hidden"}}>
                <div style={{
                  height:"100%",
                  width:`${Math.round((selectedKeep.siege/selectedKeep.siegeMax)*100)}%`,
                  background:"linear-gradient(90deg,#882020,#dd3030)",borderRadius:2,
                }}/>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
