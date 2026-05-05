import { useState, useMemo } from "react";
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

// ── Design space: 700 wide × 660 tall ────────────────────────────────────
// 700 matches the game tile grid width.
// 660 = region area (625) + 35px southern peaks.
// Polygons match v8 markup exactly.
// Faction funnel layout:
//   Pirates:  Saltmere(top-left)   → Brinefields   → Shattered Shallows → Holy Grail
//   Merfolk:  Tidesreach(top-right) → Coralfen      → Shattered Shallows → Holy Grail
//   Marines:  Ironhaven(far-right)  → Stormwatch    → Bloodmarch         → Holy Grail
//   Orcs:     Grimhold(btm-right)   → Boneridge     → Bloodmarch         → Holy Grail
//   Dragons:  Emberpeak(far-left)   → Cinderplain   → Ashen Rift         → Holy Grail
//   Wizards:  Ashenveil(btm-left)   → Runemarks     → Ashen Rift         → Holy Grail

const DW = 700, DH = 660;

const POLYS = {
  // ── Top starts ──
  saltmere:          [[0,0],[220,0],[220,148],[140,155],[62,155],[0,118]],
  // Tidesreach — right edge pulled to x=640 so no overlap with ironhaven at top-right
  tidesreach:        [[480,0],[700,0],[700,118],[640,155],[560,155],[480,148]],

  // ── Top farms ──
  brinefields:       [[62,155],[140,155],[220,148],[287,168],[240,192],[160,198],[95,198],[62,155]],
  // Coralfen — right edge shared exactly with ironhaven: [640,155]→[540,198]
  coralfen:          [[480,148],[560,155],[640,155],[540,198],[460,192],[412,168],[480,148]],

  // ── Side starts ──
  // Emberpeak — inner edge pushed to x=202 exactly to avoid shatteredShallows overlap
  emberpeak:         [[0,118],[62,155],[95,198],[160,198],[202,198],[202,252],[122,305],[82,370],[0,370]],
  // Ironhaven — left edge at x=640 top matching coralfen
  ironhaven:         [[700,118],[700,370],[618,370],[578,305],[498,256],[540,198],[640,155],[700,118]],

  // ── Conflict top ──
  // ShatteredShallows — left edge starts at x=202 to match emberpeak exactly
  shatteredShallows: [[202,198],[240,192],[287,168],[350,160],[412,168],[460,192],[540,198],[498,256],[394,296],[350,296],[306,296],[202,256],[202,198]],

  // ── Farm mid ──
  cinderplain:       [[0,370],[82,370],[122,305],[202,256],[202,490],[128,490],[0,490]],
  stormwatch:        [[700,370],[618,370],[578,305],[498,256],[498,490],[572,490],[700,490]],

  // ── Holy Grail center ──
  holyGrail:         [[306,296],[394,296],[422,372],[422,442],[350,470],[278,442],[278,372]],

  // ── Conflict zones ──
  // AshenRift — bottom edge at y=460 to match ashenveil/runemarks tops exactly
  ashenRift:         [[202,256],[306,296],[278,372],[278,442],[350,470],[278,460],[202,460]],
  // Bloodmarch — bottom edge at y=460 to match boneridge/grimhold tops exactly
  bloodmarch:        [[498,256],[394,296],[422,372],[422,442],[350,470],[422,460],[498,460]],

  // ── Bottom farms ──
  runemarks:         [[230,460],[278,460],[350,470],[350,542],[302,572],[245,588],[230,580],[230,460]],
  boneridge:         [[470,460],[422,460],[350,470],[350,542],[398,572],[455,588],[470,580],[470,460]],

  // ── Bottom starts ──
  ashenveil:         [[0,490],[202,490],[202,460],[230,460],[230,560],[175,590],[80,605],[0,605]],
  grimhold:          [[470,460],[498,460],[498,490],[572,490],[700,490],[700,605],[620,605],[525,590],[470,580],[470,460]],
};

// Northern Sea fills gap between Saltmere/Tidesreach inner edges and top farms
const NORTH_SEA_POLY = [[220,0],[480,0],[480,148],[412,168],[350,160],[287,168],[220,148]];


// Southern border — fog/gradient silhouette (Option C)


// Southern border — fog/gradient silhouette (Option C)
// No MTN_ROWS or SNOW_TIPS needed — handled inline with SVG gradients


const REGION_TERRAIN = {
  saltmere:         { base:"#1e1e14", dark:"#141410" }, // Pirates — coastal scrub
  tidesreach:       { base:"#101e28", dark:"#081418" }, // Merfolk — dark coastal
  brinefields:      { base:"#241e0e", dark:"#181208" }, // Pirates farm — marsh
  coralfen:         { base:"#102028", dark:"#081418" }, // Merfolk farm — reef
  emberpeak:        { base:"#1e1010", dark:"#140808" }, // Dragons — volcanic
  ironhaven:        { base:"#081428", dark:"#040c18" }, // Marines — iron coast
  shatteredShallows:{ base:"#1e2e18", dark:"#141e10" }, // conflict — broken land
  cinderplain:      { base:"#1e1408", dark:"#140e04" }, // Dragons farm — ash plain
  stormwatch:       { base:"#081828", dark:"#040e18" }, // Marines farm — storm coast
  holyGrail:        { base:"#1e3018", dark:"#142010" }, // sacred grove
  ashenRift:        { base:"#281808", dark:"#1c1004" }, // conflict — ash rift
  bloodmarch:       { base:"#220808", dark:"#180404" }, // conflict — blood soil
  runemarks:        { base:"#141820", dark:"#0c1018" }, // Wizards farm — rune stone
  boneridge:        { base:"#18140c", dark:"#100e08" }, // Orcs farm — bone ridge
  ashenveil:        { base:"#120e1e", dark:"#0c0814" }, // Wizards — misty veil
  grimhold:         { base:"#0e1808", dark:"#080e04" }, // Orcs — dark fortress
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

export default function WorldMap({ tiles, onClose, onTeleport, panSt, zoom }) {
  const [selected, setSelected] = useState(null);

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

  // viewBox keeps full DW×DH design space visible; SVG scales to fill container.
  // sx/sy = 1 because all polygon coords are already in design space.
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
        @keyframes seaMove   { 0%{stroke-dashoffset:0} 100%{stroke-dashoffset:-44} }
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
            <pattern id="wm-sea" x="0" y="0" width={44*sx} height={22*sy} patternUnits="userSpaceOnUse">
              <path d={`M0,${11*sy} Q${11*sx},${2*sy} ${22*sx},${11*sy} Q${33*sx},${20*sy} ${44*sx},${11*sy}`}
                fill="none" stroke="#2a5a7a" strokeWidth={1.3} opacity=".7"
                strokeDasharray={44*sx} style={{animation:"seaMove 3s linear infinite"}}/>
            </pattern>
          </defs>

          {/* Base */}
          <rect width={DW} height={DH} fill="#0a1418"/>

          {/* ── Northern Sea ── */}
          <polygon points={scalePts(NORTH_SEA_POLY,sx,sy)} fill="#0a1e30" opacity=".95"/>
          <polygon points={scalePts(NORTH_SEA_POLY,sx,sy)} fill="url(#wm-sea)" opacity=".85"/>
          <text x={DW/2} y={82*sy} textAnchor="middle"
            fontSize={Math.max(7,9*sx)} fill="#2a6a8a" letterSpacing="3" opacity=".75"
            fontFamily="'Cinzel',serif" style={{pointerEvents:"none"}}>
            NORTHERN SEA
          </text>

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
                {/* Unowned: dark grey. Owned: faction color fill. HG: special. */}
                <polygon points={scalePts(poly,sx,sy)}
                  fill={isHG ? "rgba(240,192,64,0.08)" : facCol ? facCol : "#1e1e1e"}
                  opacity={isHG ? 1 : facCol ? 0.35 : 0.7}/>
                {isSel && <polygon points={scalePts(poly,sx,sy)} fill="white" opacity={0.07}/>}
                <polygon points={scalePts(poly,sx,sy)} fill="none"
                  stroke={facCol || (isHG ? "#f0c040" : "#3a3228")}
                  strokeWidth={isSel ? 2 : 0.8}
                  strokeOpacity={facCol ? 0.7 : (isHG ? 0.6 : 0.45)}
                  strokeDasharray={isHG ? "5 3" : undefined}/>
              </g>
            );
          })}

          {/* Holy Grail glow */}
          {(() => {
            const poly = POLYS["holyGrail"];
            if (!poly) return null;
            const [cx,cy] = centroid(poly);
            return <circle cx={cx*sx} cy={cy*sy} r={38*sx}
              fill="rgba(240,192,64,0.1)"
              style={{animation:"holyPulse 2.5s ease-in-out infinite"}}/>;
          })()}

          {/* ── Southern Border — Option C: Fog & Silhouette ── */}
          <defs>
            <linearGradient id="southFog" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#080c10" stopOpacity={0}/>
              <stop offset="55%" stopColor="#060810" stopOpacity={0.75}/>
              <stop offset="100%" stopColor="#040608" stopOpacity={1}/>
            </linearGradient>
            <linearGradient id="mtnGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2a2620"/>
              <stop offset="100%" stopColor="#0e0c0a"/>
            </linearGradient>
          </defs>
          {/* Distant jagged silhouette */}
          <polyline points="0,595 35,568 75,580 120,555 170,562 220,546 270,558 320,538 370,550 420,542 470,554 520,548 570,562 620,552 660,566 700,578 700,660 0,660"
            fill="url(#mtnGrad)" opacity={0.35} style={{pointerEvents:"none"}}/>
          {/* Closer silhouette */}
          <polyline points="0,618 40,605 90,612 140,600 200,608 260,596 320,604 370,594 420,602 480,608 540,598 600,608 660,614 700,618 700,660 0,660"
            fill="#141210" opacity={0.65} style={{pointerEvents:"none"}}/>
          {/* Fog overlay fading to black */}
          <rect x={0} y={540} width={DW} height={120} fill="url(#southFog)" style={{pointerEvents:"none"}}/>
          <text x={DW/2} y={DH-8} textAnchor="middle"
            fontSize={7} fill="#4a4030" letterSpacing={5} opacity={0.4}
            fontFamily="'Cinzel',serif" style={{pointerEvents:"none"}}>
            THE SOUTHERN PEAKS
          </text>

          {/* Vignette */}
          <rect width={DW} height={DH} fill="url(#wm-vig)"/>

          {/* ── Player viewport dot ── */}
          {panSt && zoom && (() => {
            // World-space pixel at screen centre
            const worldX = (screenW / 2 - panSt.x) / zoom;
            const worldY = (screenH / 2 - panSt.y) / zoom;
            // Invert iso formula: world px → tile (c, r)
            const u = worldX - ROWS * TW / 2;
            const v = worldY - TOP_PAD;
            const tileC = (u / (TW / 2) + v / (TH / 2)) / 2;
            const tileR = (v / (TH / 2) - u / (TW / 2)) / 2;
            // Tile (c,r) maps directly to SVG design space x=c, y=r*(660/700)
            const Y_SCALE = DH / 700;
            const dotX = tileC * sx;
            const dotY = tileR * Y_SCALE * sy;
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
                {/* Invisible expanded hit area for touch */}
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
