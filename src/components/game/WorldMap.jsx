import { useState, useMemo } from "react";
import { REGION_LIST } from "../../constants/regions.js";
import { PLAYABLE_FACTIONS } from "../../constants/factions.js";
import { ISO_W, ISO_H } from "../../constants/geometry.js";

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
  // Saltmere (Pirates) top-left — right edge x=220 flush with Northern Sea left edge
  saltmere:          [[0,0],[220,0],[220,148],[140,155],[62,155],[0,118]],
  // Tidesreach (Merfolk) top-right — left edge x=480 flush with Northern Sea right edge
  tidesreach:        [[480,0],[700,0],[700,118],[638,155],[560,155],[480,148]],

  // ── Top farms ──
  // Brinefields (Pirates) — top-left edge shares x=220 with Saltmere, no gap
  brinefields:       [[62,155],[140,155],[220,148],[287,168],[240,192],[160,198],[95,198],[62,155]],
  // Coralfen (Merfolk) — top-right edge shares x=480 with Tidesreach, no gap
  coralfen:          [[560,155],[638,155],[700,155],[700,198],[605,198],[460,192],[412,168],[480,148],[560,155]],

  // ── Side starts ──
  // Emberpeak (Dragons) far-left — tall, bordered by Brinefields(NE), Cinderplain(S)
  emberpeak:         [[0,118],[62,155],[95,198],[160,198],[202,252],[122,305],[82,370],[0,370]],
  // Ironhaven (Marines) far-right — tall, bordered by Coralfen(NW), Stormwatch(S)
  ironhaven:         [[700,118],[700,370],[618,370],[578,305],[498,256],[540,198],[638,155],[700,118]],

  // ── Conflict top (Pirates × Merfolk) ──
  // Shattered Shallows — fills upper center between all four top regions
  shatteredShallows: [[160,198],[240,192],[287,168],[350,160],[412,168],[460,192],[540,198],[498,256],[394,296],[350,296],[306,296],[202,256],[160,198]],

  // ── Farm mid ──
  // Cinderplain (Dragons) left strip — between Emberpeak and Ashen Rift
  cinderplain:       [[0,370],[82,370],[122,305],[202,256],[202,490],[128,490],[0,490]],
  // Stormwatch (Marines) right strip — between Ironhaven and Bloodmarch
  stormwatch:        [[700,370],[618,370],[578,305],[498,256],[498,490],[572,490],[700,490]],

  // ── Holy Grail center ──
  holyGrail:         [[306,296],[394,296],[422,372],[422,442],[350,470],[278,442],[278,372]],

  // ── Conflict zones (left and right of Holy Grail) ──
  // Ashen Rift (Dragons × Wizards) — left of HG, top touches Shattered Shallows at y=256
  ashenRift:         [[202,256],[306,296],[278,372],[278,442],[350,470],[278,490],[202,490]],
  // Bloodmarch (Marines × Orcs) — right of HG, top touches Shattered Shallows at y=256
  bloodmarch:        [[498,256],[394,296],[422,372],[422,442],[350,470],[422,490],[498,490]],

  // ── Bottom farms ──
  // Runemarks (Wizards) — right of Ashenveil, below Ashen Rift
  runemarks:         [[230,460],[278,490],[350,470],[350,542],[302,572],[245,588],[188,570],[175,560],[230,560],[230,460]],
  // Boneridge (Orcs) — left of Grimhold, below Bloodmarch
  boneridge:         [[470,460],[422,490],[350,470],[350,542],[398,572],[455,588],[512,570],[525,560],[470,560],[470,460]],

  // ── Bottom starts ──
  // Ashenveil (Wizards) bottom-left — grows inward to x=230
  ashenveil:         [[0,490],[202,490],[230,460],[230,560],[175,590],[80,605],[0,605]],
  // Grimhold (Orcs) bottom-right — grows inward to x=470
  grimhold:          [[470,460],[498,490],[572,490],[700,490],[700,605],[620,605],[525,590],[470,560],[470,460]],
};

// Northern Sea fills gap between Saltmere/Tidesreach inner edges and top farms
const NORTH_SEA_POLY = [[220,0],[480,0],[480,148],[412,168],[350,160],[287,168],[220,148]];

// Southern Peaks fills gap below bottom farms between Ashenveil and Grimhold
// Row boundary: y=605 (bottom of Ashenveil/Grimhold) down to y=660 (canvas bottom)
const SOUTH_FILL_POLY = [[0,605],[80,605],[175,590],[188,570],[245,588],[302,572],[350,542],[398,572],[455,588],[512,570],[525,590],[620,605],[700,605],[700,660],[0,660]];

// Mountain peaks for southern area — [tipX, tipY, baseLeft, baseRight, baseY]
const MTN_ROWS = [
  // Row 1 — right at region border
  [[68,582],[52,605],[84,605]],[[102,578],[84,605],[120,605]],
  [[148,574],[128,598],[168,598]],[[192,566],[174,588],[210,588]],
  [[228,558],[210,582],[246,582]],[[264,552],[246,575],[282,575]],
  [[300,548],[280,572],[320,572]],[[338,550],[318,574],[358,574]],
  [[376,548],[356,572],[396,572]],[[414,556],[394,578],[434,578]],
  [[452,562],[432,585],[472,585]],[[494,568],[474,590],[514,590]],
  [[538,574],[516,596],[560,596]],[[582,580],[560,602],[604,602]],
  [[626,582],[604,605],[648,605]],
  // Row 2 — deeper
  [[42,628],[20,660],[64,660]],[[86,624],[62,660],[110,660]],
  [[134,622],[108,660],[160,660]],[[184,624],[158,660],[210,660]],
  [[234,620],[208,660],[260,660]],[[284,622],[258,660],[310,660]],
  [[334,618],[308,660],[360,660]],[[384,620],[358,660],[410,660]],
  [[434,622],[408,660],[460,660]],[[484,624],[458,660],[510,660]],
  [[534,622],[508,660],[560,660]],[[584,624],[558,660],[610,660]],
  [[634,626],[608,660],[660,660]],
  // Row 3 — partial peeks
  [[18,642],[0,660],[36,660]],[[58,638],[35,660],[81,660]],
  [[198,634],[172,660],[224,660]],[[356,632],[330,660],[382,660]],
  [[514,635],[488,660],[540,660]],[[668,640],[646,660],[690,660]],
];

const SNOW_TIPS = [
  [102,578],[148,574],[228,558],[264,552],[300,548],
  [338,550],[376,548],[414,556],[452,562],[494,568],[582,580],[626,582],
];

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

  // Fill full screen: scale so map fills available space
  const topBar = 46;
  const detailH = selectedKeep ? 165 : 0;
  const availH = screenH - topBar - detailH;
  const scale  = Math.max(screenW / DW, availH / DH);
  const mapW   = Math.round(DW * scale);
  const mapH   = Math.round(DH * scale);
  const sx = scale, sy = scale;

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

      {/* Map area */}
      <div style={{ flex:1, overflow:"hidden", position:"relative", display:"flex", justifyContent:"center" }}>
        <svg width={mapW} height={mapH} style={{ display:"block" }}>
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
          <rect width={mapW} height={mapH} fill="#0a1418"/>

          {/* ── Northern Sea ── */}
          <polygon points={scalePts(NORTH_SEA_POLY,sx,sy)} fill="#0a1e30" opacity=".95"/>
          <polygon points={scalePts(NORTH_SEA_POLY,sx,sy)} fill="url(#wm-sea)" opacity=".85"/>
          <text x={mapW/2} y={82*sy} textAnchor="middle"
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

          {/* ── Southern Peaks ── */}
          <polygon points={scalePts(SOUTH_FILL_POLY,sx,sy)} fill="#181410" opacity=".95"/>
          {MTN_ROWS.map(([tip,bl,br],i) => (
            <polygon key={i}
              points={`${tip[0]*sx},${tip[1]*sy} ${br[0]*sx},${br[1]*sy} ${bl[0]*sx},${bl[1]*sy}`}
              fill={i%2===0?"#2a2418":"#242018"} stroke="#3a3028" strokeWidth={0.7} opacity=".9"/>
          ))}
          {SNOW_TIPS.map(([tx,ty],i) => (
            <polygon key={i}
              points={`${tx*sx},${ty*sy} ${(tx+2)*sx},${(ty+6)*sy} ${(tx-2)*sx},${(ty+6)*sy}`}
              fill="#7a7268" opacity=".65"/>
          ))}
          <text x={mapW/2} y={(DH-10)*sy} textAnchor="middle"
            fontSize={Math.max(6,8*sx)} fill="#3a3020" letterSpacing="4" opacity=".6"
            fontFamily="'Cinzel',serif" style={{pointerEvents:"none"}}>
            THE SOUTHERN PEAKS
          </text>

          {/* Vignette */}
          <rect width={mapW} height={mapH} fill="url(#wm-vig)"/>

          {/* ── Player viewport dot ── */}
          {panSt && zoom && (() => {
            // World-space pixel at screen centre
            const worldX = (screenW / 2 - panSt.x) / zoom;
            const worldY = (screenH / 2 - panSt.y) / zoom;
            // ISO_W/ISO_H is the full pixel extent of the isometric canvas.
            // The WorldMap SVG design space (DW×DH) maps linearly to that same extent.
            const dotX = (worldX / ISO_W) * DW * sx;
            const dotY = (worldY / ISO_H) * DH * sy;
            if (dotX < 0 || dotX > mapW || dotY < 0 || dotY > mapH) return null;
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
            if (lcy*sy > mapH - 20) return null;
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
            if (cy > mapH - 15) return null;

            const owned = reg.owner;
            const col   = keepColor(owned);
            const isHG  = reg.key === "holyGrail";
            const sz    = isHG ? 14*sx : reg.layer==="conflict" ? 11*sx : 10*sx;
            const isSel = selected === reg.key;
            const by    = cy - sz*1.2;

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

          {/* ── Top bar — rendered last so it's always on top ── */}
          <rect width={mapW} height={46} fill="rgba(0,0,0,0.75)"/>
          <line x1={0} y1={46} x2={mapW} y2={46} stroke="rgba(200,160,64,0.25)" strokeWidth={1}/>
          <text x={mapW/2} y={29} textAnchor="middle" fontSize={15}
            fill="#c8a060" fontFamily="'Cinzel',serif" letterSpacing=".14em">
            WORLD MAP
          </text>
          <g style={{cursor:"pointer"}} onClick={onClose}>
            <rect x={4} y={9} width={38} height={28} rx={4} fill="rgba(0,0,0,0.5)"/>
            <text x={23} y={28} textAnchor="middle" fontSize={20}
              fill="#c8a060" style={{pointerEvents:"none"}}>‹</text>
          </g>
        </svg>
      </div>

      {/* ── Detail panel ── */}
      {selectedKeep ? (
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
