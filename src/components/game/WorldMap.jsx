import { useState, useMemo } from "react";
import { REGION_LIST } from "../../constants/regions.js";
import { PLAYABLE_FACTIONS } from "../../constants/factions.js";

const MAP_W = 700, MAP_H = 700;

// Voronoi-computed region polygons (generated from keep positions)
const REGION_POLY = {
  holyGrail:         "406.0,350.0 398.3,362.9 393.3,375.0 385.4,385.4 378.0,398.5 368.4,418.6 350.0,448.0 331.6,418.6 322.0,398.5 314.6,385.4 306.7,375.0 301.7,362.9 294.0,350.0 284.3,332.4 265.1,301.0 301.9,301.9 322.0,301.5 337.1,301.7 350.0,300.0 362.9,301.7 378.0,301.5 398.1,301.9 434.9,301.0 415.7,332.4",
  shatteredShallows: "427.0,250.0 441.8,274.6 434.9,299.0 398.1,298.1 378.0,298.5 362.9,298.3 350.0,300.0 337.1,298.3 322.0,298.5 301.9,298.1 265.1,299.0 258.2,274.6 273.0,250.0 281.4,231.6 291.1,216.0 299.8,199.8 308.5,178.1 323.1,149.5 350.0,98.0 376.9,149.5 391.5,178.1 400.2,199.8 408.9,216.0 418.6,231.6",
  bloodmarch:        "511.0,400.0 528.8,424.6 529.7,453.5 491.4,454.4 469.5,456.3 452.3,457.0 437.0,459.0 421.0,459.9 401.5,461.5 374.1,462.9 352.1,449.0 371.3,417.6 381.0,400.0 388.7,387.1 393.7,375.0 401.6,364.6 409.0,351.5 418.6,331.4 437.0,302.0 457.7,322.7 471.0,341.1 480.8,356.2 490.7,369.0 499.8,383.2",
  ashenRift:         "319.0,400.0 328.7,417.6 347.9,449.0 325.9,462.9 298.5,461.5 279.0,459.9 263.0,459.0 247.7,457.0 230.5,456.3 208.6,454.4 170.3,453.5 171.2,424.6 189.0,400.0 200.2,383.2 209.3,369.0 219.2,356.2 229.0,341.1 242.3,322.7 263.0,302.0 281.4,331.4 291.0,351.5 298.4,364.6 306.3,375.0 311.3,387.1",
  brinefields:       "302.0,185.0 293.6,203.4 283.9,219.0 275.2,235.2 266.5,256.9 251.1,282.6 225.0,271.0 204.3,262.3 186.5,251.7 170.6,239.4 176.5,213.0 179.6,197.2 181.0,185.0 182.5,173.6 184.3,161.5 187.5,147.5 191.0,126.1 197.3,81.6 225.0,0 274.4,0.5 331.0,1.4 349.5,60.5 338.4,119.5 316.8,160.4",
  coralfen:          "519.0,185.0 520.4,197.2 523.5,213.0 529.4,239.4 513.5,251.7 495.7,262.3 475.0,271.0 448.9,282.6 433.5,256.9 424.8,235.2 416.1,219.0 406.4,203.4 398.0,185.0 383.2,160.4 361.6,119.5 350.5,60.5 369.0,1.4 425.6,0.5 475.0,0 502.7,81.6 509.0,126.1 512.5,147.5 515.7,161.5 517.5,173.6",
  stormwatch:        "614.0,330.0 643.4,357.7 697.6,421.0 698.4,488.4 635.5,495.4 576.2,465.2 540.0,440.0 519.3,407.3 506.0,388.9 496.2,373.8 486.3,361.0 477.2,346.8 466.0,330.0 448.2,305.4 455.1,281.0 481.3,271.3 501.5,263.3 519.3,252.7 540.0,259.0 555.3,273.0 566.5,284.1 575.4,294.6 585.9,303.5 597.0,314.7",
  boneridge:         "681.0,520.0 699.0,588.1 698.7,666.5 554.6,629.6 492.5,602.3 463.4,588.6 445.0,582.0 430.5,574.1 417.0,568.5 401.2,563.8 383.5,555.5 356.1,543.8 350.0,520.0 350.3,494.6 352.3,466.5 390.6,465.6 412.5,463.7 429.7,463.0 445.0,461.0 461.0,460.1 480.5,458.5 507.9,457.1 553.3,457.5 597.6,479.1",
  runemarks:         "350.0,520.0 343.9,543.8 316.5,555.5 298.8,563.8 283.0,568.5 269.5,574.1 255.0,582.0 236.6,588.6 207.5,602.3 145.4,629.6 1.3,666.5 1.0,588.1 19.0,520.0 102.4,479.1 146.7,457.5 192.1,457.1 219.5,458.5 239.0,460.1 255.0,461.0 270.3,463.0 287.5,463.7 309.4,465.6 347.7,466.5 349.7,494.6",
  cinderplain:       "234.0,330.0 222.8,346.8 213.7,361.0 203.8,373.8 194.0,388.9 180.7,407.3 160.0,440.0 123.8,465.2 64.5,495.4 1.6,488.4 2.4,421.0 56.6,357.7 86.0,330.0 103.0,314.7 114.1,303.5 124.6,294.6 133.5,284.1 144.7,273.0 160.0,259.0 180.7,252.7 198.5,263.3 218.7,271.3 244.9,281.0 251.8,305.4",
  saltmere:          "161.0,254.0 144.0,269.3 132.9,280.5 122.4,289.4 113.5,299.9 102.3,311.0 87.0,325.0 60.9,351.6 0.5,403.8 0.7,340.3 2.1,303.0 1.0,277.0 1.0,254.0 1.0,231.0 2.1,205.0 0.7,167.7 38.0,169.1 69.4,188.3 87.0,198.0 99.9,205.7 110.5,213.3 122.4,218.6 135.5,226.0 152.7,236.4",
  tidesreach:        "699.0,254.0 699.0,277.0 697.9,303.0 699.3,340.3 699.5,403.8 639.1,351.6 613.0,325.0 597.7,311.0 586.5,299.9 577.6,289.4 567.1,280.5 556.0,269.3 539.0,254.0 547.3,236.4 564.5,226.0 577.6,218.6 589.5,213.3 600.1,205.7 613.0,198.0 630.6,188.3 662.0,169.1 699.3,167.7 697.9,205.0 699.0,231.0",
  ironhaven:         "659.0,170.0 629.7,187.6 612.5,198.0 599.4,205.4 587.5,210.7 576.9,218.3 564.0,226.0 546.4,235.7 530.0,228.9 526.5,207.5 523.3,193.5 521.5,181.4 520.0,170.0 518.6,157.8 515.5,142.0 509.6,115.6 500.0,59.1 519.2,2.9 564.0,0 608.8,2.9 661.0,2.0 699.1,34.9 698.2,92.5 699.2,133.8",
  grimhold:          "348.0,626.0 349.3,638.9 349.5,654.0 349.1,674.1 342.5,697.9 320.2,697.5 301.0,700 281.8,697.5 259.5,697.9 227.5,699.5 174.6,699.0 26.7,699.5 158.0,626.0 212.1,602.2 239.5,590.5 257.2,582.2 273.0,577.5 286.5,571.9 301.0,564.0 319.4,557.4 348.5,543.7 349.1,577.9 349.5,598.0 349.3,613.1",
  ashenveil:         "542.0,626.0 673.3,699.5 525.4,699.0 472.5,699.5 440.5,697.9 418.2,697.5 399.0,700 379.8,697.5 357.5,697.9 350.9,674.1 350.5,654.0 350.7,638.9 352.0,626.0 350.7,613.1 350.5,598.0 350.9,577.9 351.5,543.7 380.6,557.4 399.0,564.0 413.5,571.9 427.0,577.5 442.8,582.2 460.5,590.5 487.9,602.2",
  emberpeak:         "180.0,170.0 178.5,181.4 176.7,193.5 173.5,207.5 170.0,228.9 153.6,235.7 136.0,226.0 123.1,218.3 112.5,210.7 100.6,205.4 87.5,198.0 70.3,187.6 41.0,170.0 0.8,133.8 1.8,92.5 0.9,34.9 39.0,2.0 91.2,2.9 136.0,0 180.8,2.9 200.0,59.1 190.4,115.6 184.5,142.0 181.4,157.8",
};

// Faction colors — muted, earthy, like RTW
const FAC_COLOR = {
  player:        "#4488cc",
  pirates:       "#c47830",
  marines:       "#3868a8",
  bountyhunters: "#8844aa",
  merfolk:       "#28a0a0",
  orcs:          "#5a8820",
  dragons:       "#a83020",
};
PLAYABLE_FACTIONS.forEach(f => { if (!FAC_COLOR[f.key]) FAC_COLOR[f.key] = f.c; });

function regionHomeFaction(reg) { return reg.factions?.[0] || null; }

function scalePoly(pts, mapW, mapH) {
  return pts.split(" ").map(p => {
    const [x, y] = p.split(",").map(Number);
    return `${(x / MAP_W * mapW).toFixed(1)},${(y / MAP_H * mapH).toFixed(1)}`;
  }).join(" ");
}

function keepTriPts(x, y, sz) {
  return `${x},${y-sz} ${x+sz*0.82},${y+sz*0.58} ${x-sz*0.82},${y+sz*0.58}`;
}

function keepColor(owner) {
  if (!owner) return "#ddd8c0";
  if (owner === "player") return "#44bbff";
  return "#ff5544";
}

function garrisonLabel(g) {
  if (!g)        return "Empty";
  if (g >= 5000) return "Massive";
  if (g >= 2000) return "Large";
  if (g >= 500)  return "Medium";
  return "Small";
}

function Row({ label, value, valueColor }) {
  return (
    <div>
      <div style={{ color:"#6a5a3a", fontSize:8, fontFamily:"'Cinzel',serif", letterSpacing:".04em", marginBottom:1 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ color: valueColor || "#c8b890", fontSize:10, fontFamily:"'Cinzel',serif" }}>
        {value}
      </div>
    </div>
  );
}

export default function WorldMap({ tiles, onClose, onTeleport }) {
  const [selected, setSelected] = useState(null);

  const W = window.innerWidth;
  const H = window.innerHeight;
  const mapW = W;
  const mapH = selected ? Math.round(H * 0.50) : Math.round(H * 0.76);

  function tx(c) { return (c / MAP_W) * mapW; }
  function ty(r) { return (r / MAP_H) * mapH; }

  const keeps = useMemo(() => REGION_LIST.map(reg => {
    const t = tiles[`${reg.cx},${reg.cy}`];
    return { ...reg, owner: t?.owner || null, garrison: t?.garrison || 0,
             siege: t?.siege || 0, siegeMax: t?.siegeMax || 0 };
  }), [tiles]);

  const sel = selected ? keeps.find(k => k.key === selected) : null;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:600,
      background:"#07090c",
      display:"flex", flexDirection:"column",
      overflow:"hidden",
    }}>
      {/* Header */}
      <div style={{
        display:"flex", alignItems:"center",
        padding:"10px 14px 7px",
        flexShrink:0,
        borderBottom:"1px solid #16120a",
      }}>
        <button onClick={onClose} style={{
          background:"none", border:"none", color:"#c8a060",
          fontSize:26, cursor:"pointer", padding:"0 10px 0 0",
          lineHeight:1,
        }}>‹</button>
        <div style={{
          flex:1, textAlign:"center",
          fontFamily:"'Cinzel',serif", fontSize:14, color:"#c8a060",
          letterSpacing:".14em",
          textShadow:"0 0 14px rgba(200,160,64,0.3)",
        }}>WORLD MAP</div>
        <div style={{ width:36 }}/>
      </div>

      {/* Map SVG */}
      <div style={{ flexShrink:0, height: mapH, overflow:"hidden" }}>
        <svg width={mapW} height={mapH} style={{ display:"block" }}>

          {/* Ocean base */}
          <rect width={mapW} height={mapH} fill="#0e1a26"/>

          {/* ── Region fills — unowned: dark neutral, owned: faction color ── */}
          {keeps.map(reg => {
            const poly = REGION_POLY[reg.key];
            if (!poly) return null;
            const scaled = scalePoly(poly, mapW, mapH);
            const homeFac = regionHomeFaction(reg);
            // Unowned: very dark tint of home faction so geography is readable
            const col = reg.owner
              ? (reg.owner === "player" ? FAC_COLOR.player : FAC_COLOR[reg.owner] || "#666")
              : (homeFac ? FAC_COLOR[homeFac] : "#2a2a20");
            const alpha = reg.owner ? 0.55 : 0.12;
            return (
              <polygon key={`fill_${reg.key}`}
                points={scaled}
                fill={col} opacity={alpha}
              />
            );
          })}

          {/* ── Region outlines ── */}
          {keeps.map(reg => {
            const poly = REGION_POLY[reg.key];
            if (!poly) return null;
            const scaled = scalePoly(poly, mapW, mapH);
            const isRing = reg.layer === "ring";
            const strokeCol = isRing ? "#c8a040" : reg.owner ? "rgba(255,255,255,0.5)" : "rgba(180,160,100,0.3)";
            const strokeW = isRing ? 1.2 : 0.6;
            return (
              <polygon key={`border_${reg.key}`}
                points={scaled}
                fill="none"
                stroke={strokeCol}
                strokeWidth={strokeW}
              />
            );
          })}

          {/* ── Region name labels ── */}
          {keeps.map(reg => {
            if (reg.layer === "ring") return null;
            const x = tx(reg.cx), y = ty(reg.cy);
            const fontSize = Math.max(6, Math.min(9, mapW * 0.013));
            return (
              <text key={`lbl_${reg.key}`}
                x={x} y={y + tx(9)}
                textAnchor="middle"
                fontSize={fontSize}
                fill={reg.owner ? "rgba(255,255,255,0.7)" : "rgba(200,180,130,0.45)"}
                fontFamily="'Cinzel',serif"
                style={{ pointerEvents:"none", userSelect:"none" }}
              >
                {reg.name.replace("The ","")}
              </text>
            );
          })}

          {/* ── Keep triangles ── */}
          {keeps.map(reg => {
            const x = tx(reg.cx), y = ty(reg.cy);
            const sz = reg.layer === "ring" ? tx(7) : reg.layer === "conflict" ? tx(5.5) : tx(4.5);
            const col = keepColor(reg.owner);
            const isSel = selected === reg.key;
            return (
              <g key={reg.key} style={{ cursor:"pointer" }}
                onClick={() => setSelected(isSel ? null : reg.key)}>
                {/* Shadow */}
                <polygon points={keepTriPts(x+0.8, y+0.8, sz)} fill="rgba(0,0,0,0.6)"/>
                {/* Main */}
                <polygon points={keepTriPts(x, y, sz)} fill={col} opacity={isSel ? 1 : 0.92}/>
                {/* Holy Ring gold outline */}
                {reg.layer === "ring" && (
                  <polygon points={keepTriPts(x, y, sz)}
                    fill="none" stroke="#f0c040" strokeWidth={1.2}/>
                )}
                {/* Selection ring */}
                {isSel && (
                  <circle cx={x} cy={y + sz*0.1} r={sz + 4}
                    fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1.2}/>
                )}
              </g>
            );
          })}

          {/* Holy Grail label */}
          <text x={tx(350)} y={ty(350) + tx(12)}
            textAnchor="middle" fontSize={Math.max(7, mapW * 0.014)}
            fill="rgba(240,192,64,0.75)" fontFamily="'Cinzel',serif"
            style={{ pointerEvents:"none" }}>
            Holy Grail
          </text>

        </svg>
      </div>

      {/* Legend */}
      <div style={{
        display:"flex", gap:10, justifyContent:"center",
        padding:"5px 0 3px", flexShrink:0,
        fontSize:8, fontFamily:"'Cinzel',serif", color:"#5a4a38",
      }}>
        {[
          { col:"#ddd8c0", label:"Unoccupied" },
          { col:"#44bbff", label:"Allied" },
          { col:"#ff5544", label:"Enemy" },
          { col:"#f0c040", label:"⚜ Holy Ring", outline:true },
        ].map(({ col, label, outline }) => (
          <div key={label} style={{ display:"flex", alignItems:"center", gap:3 }}>
            <svg width={9} height={9}>
              <polygon points="4.5,0.5 8.5,8 0.5,8"
                fill={col} opacity={0.9}
                stroke={outline ? "#f0c040" : "none"} strokeWidth={outline ? 0.8 : 0}/>
            </svg>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Keep detail panel */}
      {sel ? (
        <div style={{
          margin:"4px 8px 8px", flexShrink:0,
          background:"rgba(5,7,10,0.97)",
          border:"1px solid #2a2010",
          borderRadius:6, padding:"10px 12px 10px",
        }}>
          <div style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            borderBottom:"1px solid #1e1808", paddingBottom:6, marginBottom:8,
          }}>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:11, color:"#c8a060", letterSpacing:".05em" }}>
              {sel.keepName}
            </div>
            <button onClick={() => setSelected(null)} style={{
              background:"none", border:"none", color:"#4a3a28",
              fontSize:14, cursor:"pointer", padding:0,
            }}>✕</button>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"6px 10px", marginBottom:8 }}>
            <Row label="Region" value={sel.name}/>
            <Row label="Faction" value={
              !sel.owner ? "Unoccupied" : sel.owner === "player" ? "Your Faction" : "Enemy"
            } valueColor={!sel.owner ? "#a09070" : sel.owner === "player" ? "#44bbff" : "#ff6644"}/>
            <Row label="Garrison" value={sel.garrison > 0 ? `${garrisonLabel(sel.garrison)} (${sel.garrison.toLocaleString()})` : "None"}/>
          </div>

          {sel.siegeMax > 0 && (
            <div style={{ marginBottom:8 }}>
              <div style={{ color:"#6a5a3a", fontSize:8, fontFamily:"'Cinzel',serif", marginBottom:2 }}>SIEGE INTEGRITY</div>
              <div style={{ background:"#0a0c10", borderRadius:2, height:5 }}>
                <div style={{
                  height:"100%", borderRadius:2,
                  width:`${Math.round(sel.siege / sel.siegeMax * 100)}%`,
                  background:"linear-gradient(90deg,#882020,#dd3030)",
                }}/>
              </div>
              <div style={{ color:"#5a3030", fontSize:7, textAlign:"right", marginTop:1 }}>
                {sel.siege.toLocaleString()} / {sel.siegeMax.toLocaleString()}
              </div>
            </div>
          )}

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{
              padding:"3px 8px", borderRadius:3, fontSize:8,
              fontFamily:"'Cinzel',serif",
              background: sel.layer==="ring" ? "rgba(240,192,64,0.1)" : sel.layer==="conflict" ? "rgba(200,50,30,0.1)" : "rgba(50,70,40,0.15)",
              border:`1px solid ${sel.layer==="ring" ? "#7a5010" : sel.layer==="conflict" ? "#6a2010" : "#2a3a20"}`,
              color: sel.layer==="ring" ? "#c8a030" : sel.layer==="conflict" ? "#cc4030" : "#4a6040",
            }}>
              {sel.layer==="ring" ? "⚜ Holy Ring" : sel.layer==="conflict" ? "⚔ Conflict Zone" : sel.layer==="farm" ? "🌾 Farm Region" : "🏰 Starting Region"}
            </div>
            <button onClick={() => { onTeleport(sel.cx, sel.cy); onClose(); }} style={{
              padding:"7px 18px",
              background:"linear-gradient(160deg,#2a1e08,#120e04)",
              border:"1px solid #8a6020", borderRadius:4,
              color:"#f0c060", fontFamily:"'Cinzel',serif",
              fontSize:11, letterSpacing:".06em", cursor:"pointer",
            }}>Go →</button>
          </div>
        </div>
      ) : (
        <div style={{
          textAlign:"center", padding:"10px 0", flexShrink:0,
          color:"#2a2418", fontFamily:"'Cinzel',serif", fontSize:9,
        }}>Tap a keep to view details</div>
      )}
    </div>
  );
}
