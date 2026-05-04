import { useState, useMemo } from "react";
import { REGION_LIST } from "../../constants/regions.js";
import { PLAYABLE_FACTIONS } from "../../constants/factions.js";

const MAP_W = 700, MAP_H = 700;

// Faction color lookup
const FAC_COLOR = { player: "#3daa60" };
PLAYABLE_FACTIONS.forEach(f => { FAC_COLOR[f.key] = f.c; });

function keepColor(owner) {
  if (!owner) return "#e8e0cc";
  if (owner === "player") return "#44aaff";
  return "#ff5544";
}

function keepTri(x, y, sz) {
  return `${x},${y - sz} ${x + sz * 0.85},${y + sz * 0.55} ${x - sz * 0.85},${y + sz * 0.55}`;
}

function garrisonLabel(g) {
  if (!g)       return "Empty";
  if (g >= 5000) return "Massive";
  if (g >= 2000) return "Large";
  if (g >= 500)  return "Medium";
  return "Small";
}

function Row({ label, value, valueColor }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
      <div style={{ color:"#6a5a4a", fontSize:8, fontFamily:"'Cinzel',serif", letterSpacing:".04em" }}>
        {label.toUpperCase()}
      </div>
      <div style={{ color: valueColor || "#c8b090", fontSize:10, fontFamily:"'Cinzel',serif" }}>
        {value}
      </div>
    </div>
  );
}

export default function WorldMap({ tiles, onClose, onTeleport }) {
  const [selected, setSelected] = useState(null);

  // Screen dimensions — map fills most of screen
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  // Map SVG takes full width, leaves room for panel below on mobile
  const mapW = screenW - 16;
  const mapH = Math.min(mapW, screenH * 0.55);

  function tx(c) { return (c / MAP_W) * mapW; }
  function ty(r) { return (r / MAP_H) * mapH; }

  const keeps = useMemo(() => {
    return REGION_LIST.map(reg => {
      const t = tiles[`${reg.cx},${reg.cy}`];
      return { ...reg, owner: t?.owner || null, garrison: t?.garrison || 0,
               siege: t?.siege || 0, siegeMax: t?.siegeMax || 0 };
    });
  }, [tiles]);

  const selectedKeep = selected ? keeps.find(k => k.key === selected) : null;

  // Group regions by owner for ownership overlay
  const ownedRegions = useMemo(() => keeps.filter(k => k.owner), [keeps]);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:600,
      background:"#080c12",
      display:"flex", flexDirection:"column",
      overflowY:"auto",
    }}>
      {/* Top bar */}
      <div style={{
        display:"flex", alignItems:"center",
        padding:"10px 12px 8px",
        borderBottom:"1px solid #1a1608",
        flexShrink:0,
      }}>
        <button onClick={onClose} style={{
          background:"none", border:"none",
          color:"#c8a060", fontSize:24,
          cursor:"pointer", padding:"0 10px 0 0",
          lineHeight:1, fontWeight:300,
        }}>‹</button>
        <div style={{
          flex:1, textAlign:"center",
          fontFamily:"'Cinzel',serif", fontSize:15, color:"#c8a060",
          letterSpacing:".12em",
          textShadow:"0 0 12px rgba(200,160,64,0.4)",
        }}>WORLD MAP</div>
        <div style={{ width:34 }}/>{/* spacer to center title */}
      </div>

      {/* Map SVG */}
      <div style={{
        margin:"8px auto 0",
        border:"1px solid #1e1a10",
        borderRadius:4,
        overflow:"hidden",
        flexShrink:0,
        width: mapW,
        height: mapH,
      }}>
        <svg width={mapW} height={mapH} style={{ display:"block" }}>
          {/* Terrain background */}
          <rect width={mapW} height={mapH} fill="#1a2a1a"/>

          {/* Subtle terrain texture — diagonal stripes */}
          <rect width={mapW} height={mapH}
            fill="url(#terrain)" opacity={0.04}/>

          {/* Ownership region fills — only when owned */}
          {ownedRegions.map(reg => {
            const col = reg.owner === "player"
              ? "#44aaff"
              : FAC_COLOR[reg.owner] || "#888";
            return (
              <circle key={`own_${reg.key}`}
                cx={tx(reg.cx)} cy={ty(reg.cy)}
                r={tx(52)}
                fill={col} opacity={0.22}/>
            );
          })}

          {/* Holy Grail center glow — always visible */}
          <circle cx={tx(350)} cy={ty(350)} r={tx(40)}
            fill="rgba(240,192,64,0.06)"
            stroke="rgba(240,192,64,0.18)" strokeWidth={0.8}/>

          {/* Region name labels */}
          {keeps.map(reg => {
            if (reg.layer === "ring") return null; // Holy Grail gets special treatment
            return (
              <text key={`lbl_${reg.key}`}
                x={tx(reg.cx)} y={ty(reg.cy) + tx(10)}
                textAnchor="middle"
                fontSize={Math.max(5, tx(5))}
                fill="rgba(220,200,160,0.45)"
                fontFamily="'Cinzel',serif"
                style={{ pointerEvents:"none", userSelect:"none" }}
              >
                {reg.name.replace(" Keep","").replace("The ","")}
              </text>
            );
          })}

          {/* Keep triangles */}
          {keeps.map(reg => {
            const x = tx(reg.cx), y = ty(reg.cy);
            const sz = reg.layer === "ring" ? tx(8)
              : reg.layer === "conflict"    ? tx(6)
              : tx(5);
            const col = keepColor(reg.owner);
            const isSel = selected === reg.key;
            return (
              <g key={reg.key} style={{ cursor:"pointer" }}
                onClick={() => setSelected(isSel ? null : reg.key)}>
                {/* Drop shadow */}
                <polygon points={keepTri(x+1, y+1, sz)}
                  fill="rgba(0,0,0,0.55)"/>
                {/* Main triangle */}
                <polygon points={keepTri(x, y, sz)}
                  fill={col} opacity={isSel ? 1 : 0.92}/>
                {/* Holy Ring gold outline */}
                {reg.layer === "ring" && (
                  <polygon points={keepTri(x, y, sz)}
                    fill="none" stroke="#f0c040" strokeWidth={1}/>
                )}
                {/* Selection highlight */}
                {isSel && (
                  <circle cx={x} cy={y + sz * 0.1} r={sz + 4}
                    fill="none" stroke="rgba(255,255,255,0.6)"
                    strokeWidth={1.2}/>
                )}
              </g>
            );
          })}

          {/* Holy Grail label */}
          <text x={tx(350)} y={ty(350) + tx(14)}
            textAnchor="middle"
            fontSize={Math.max(6, tx(6))}
            fill="rgba(240,192,64,0.7)"
            fontFamily="'Cinzel',serif"
            style={{ pointerEvents:"none" }}>
            Holy Grail
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div style={{
        display:"flex", gap:12, justifyContent:"center",
        padding:"6px 0 2px",
        fontSize:8, fontFamily:"'Cinzel',serif", color:"#6a5a4a",
        flexShrink:0,
      }}>
        {[
          { col:"#e8e0cc", label:"Unoccupied" },
          { col:"#44aaff", label:"Allied" },
          { col:"#ff5544", label:"Enemy" },
          { col:"#f0c040", label:"⚜ Holy Ring", outline:true },
        ].map(({ col, label, outline }) => (
          <div key={label} style={{ display:"flex", alignItems:"center", gap:3 }}>
            <svg width={9} height={9}>
              <polygon points="4.5,0.5 8.5,8 0.5,8"
                fill={col} opacity={0.9}
                stroke={outline ? "#f0c040" : "none"}
                strokeWidth={outline ? 0.8 : 0}/>
            </svg>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Keep detail panel — shows below map */}
      {selectedKeep ? (
        <div style={{
          margin:"6px 8px 12px",
          background:"rgba(5,7,11,0.97)",
          border:"1px solid #2a2418",
          borderRadius:6,
          padding:"10px 12px 12px",
          flexShrink:0,
        }}>
          {/* Header row */}
          <div style={{
            display:"flex", justifyContent:"space-between",
            alignItems:"flex-start",
            borderBottom:"1px solid #1e1810",
            paddingBottom:7, marginBottom:8,
          }}>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:11, color:"#c8a060", letterSpacing:".05em" }}>
              {selectedKeep.keepName}
            </div>
            <button onClick={() => setSelected(null)} style={{
              background:"none", border:"none",
              color:"#4a4030", fontSize:13, cursor:"pointer", padding:0,
            }}>✕</button>
          </div>

          {/* Info grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px 12px", marginBottom:8 }}>
            <Row label="Region" value={selectedKeep.name}/>
            <Row label="Faction" value={
              !selectedKeep.owner ? "Unoccupied"
              : selectedKeep.owner === "player" ? "Your Faction"
              : "Enemy"
            } valueColor={
              !selectedKeep.owner ? "#a09070"
              : selectedKeep.owner === "player" ? "#44aaff"
              : "#ff6644"
            }/>
            <Row label="Garrison" value={
              selectedKeep.garrison > 0
                ? `${garrisonLabel(selectedKeep.garrison)}\n(${selectedKeep.garrison.toLocaleString()})`
                : "None"
            }/>
          </div>

          {/* Siege bar */}
          {selectedKeep.siegeMax > 0 && (
            <div style={{ marginBottom:10 }}>
              <div style={{ color:"#6a5a4a", fontSize:8, fontFamily:"'Cinzel',serif", marginBottom:3 }}>
                SIEGE INTEGRITY
              </div>
              <div style={{ background:"#0a0c10", borderRadius:2, height:6, overflow:"hidden" }}>
                <div style={{
                  height:"100%",
                  width:`${Math.round((selectedKeep.siege / selectedKeep.siegeMax) * 100)}%`,
                  background:"linear-gradient(90deg,#882020,#dd3030)",
                  borderRadius:2,
                }}/>
              </div>
              <div style={{ color:"#6a4040", fontSize:7, textAlign:"right", marginTop:2 }}>
                {selectedKeep.siege.toLocaleString()} / {selectedKeep.siegeMax.toLocaleString()}
              </div>
            </div>
          )}

          {/* Layer + Go row */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{
              padding:"3px 8px", borderRadius:3,
              background: selectedKeep.layer === "ring"     ? "rgba(240,192,64,0.12)"
                        : selectedKeep.layer === "conflict" ? "rgba(220,60,40,0.12)"
                        : "rgba(60,80,60,0.15)",
              border:`1px solid ${
                selectedKeep.layer === "ring"     ? "#7a5010"
                : selectedKeep.layer === "conflict" ? "#6a2010"
                : "#2a3a2a"
              }`,
              color: selectedKeep.layer === "ring"     ? "#c8a040"
                   : selectedKeep.layer === "conflict" ? "#cc5040"
                   : "#4a6a4a",
              fontSize:8, fontFamily:"'Cinzel',serif",
            }}>
              {selectedKeep.layer === "ring"     ? "⚜ Holy Ring"
               : selectedKeep.layer === "conflict" ? "⚔ Conflict Zone"
               : selectedKeep.layer === "farm"     ? "🌾 Farm Region"
               : "🏰 Starting Region"}
            </div>

            <button onClick={() => { onTeleport(selectedKeep.cx, selectedKeep.cy); onClose(); }}
              style={{
                padding:"8px 20px",
                background:"linear-gradient(160deg,#2a1e08,#120e04)",
                border:"1px solid #8a6020", borderRadius:4,
                color:"#f0c060", fontFamily:"'Cinzel',serif",
                fontSize:11, letterSpacing:".06em",
                cursor:"pointer",
                boxShadow:"inset 0 1px 0 rgba(255,255,255,0.06)",
              }}>
              Go →
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          textAlign:"center", padding:"14px 0",
          color:"#3a3020", fontFamily:"'Cinzel',serif", fontSize:9,
        }}>
          Tap a keep to view details
        </div>
      )}
    </div>
  );
}
