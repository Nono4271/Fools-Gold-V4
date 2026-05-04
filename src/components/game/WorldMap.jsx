import { useState, useMemo } from "react";
import { REGION_LIST } from "../../constants/regions.js";
import { PLAYABLE_FACTIONS } from "../../constants/factions.js";

// Map bounds (tile coords)
const MAP_W = 700, MAP_H = 700;
const SVG_W = 320, SVG_H = 320;

function tx(c) { return (c / MAP_W) * SVG_W; }
function ty(r) { return (r / MAP_H) * SVG_H; }

function keepTri(x, y, sz) {
  return `${x},${y - sz} ${x + sz * 0.85},${y + sz * 0.55} ${x - sz * 0.85},${y + sz * 0.55}`;
}

// Faction color lookup
const FAC_COLOR = {};
PLAYABLE_FACTIONS.forEach(f => { FAC_COLOR[f.key] = f.c; });
FAC_COLOR["player"] = "#3daa60";

function keepColor(owner) {
  if (!owner) return "#ffffff";
  if (owner === "player") return "#44aaff";
  return "#ff4444";
}

function garrisonLabel(garrison) {
  if (!garrison) return "Empty";
  if (garrison >= 5000) return "Massive";
  if (garrison >= 2000) return "Large";
  if (garrison >= 500)  return "Medium";
  return "Small";
}

export default function WorldMap({ tiles, onClose, onTeleport }) {
  const [selected, setSelected] = useState(null); // selected region key

  // Enrich keeps with live tile data
  const keeps = useMemo(() => {
    return REGION_LIST.map(reg => {
      const t = tiles[`${reg.cx},${reg.cy}`];
      return {
        ...reg,
        owner:    t?.owner    || null,
        garrison: t?.garrison || 0,
        siege:    t?.siege    || 0,
        siegeMax: t?.siegeMax || 0,
      };
    });
  }, [tiles]);

  const selectedKeep = selected ? keeps.find(k => k.key === selected) : null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 600,
      background: "rgba(0,0,0,0.88)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Top bar with back arrow + title */}
      <div style={{
        display: "flex", alignItems: "center",
        width: SVG_W + 170, marginBottom: 10,
        position: "relative",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", left: 0,
          background: "none", border: "none",
          color: "#c8a060", fontSize: 20,
          cursor: "pointer", padding: "0 8px",
          lineHeight: 1,
        }}>‹</button>
        <div style={{
          flex: 1, textAlign: "center",
          fontFamily: "'Cinzel',serif", fontSize: 16, color: "#c8a060",
          letterSpacing: ".1em",
          textShadow: "0 0 12px rgba(200,160,64,0.5)",
        }}>WORLD MAP</div>
      </div>

      {/* Map + popup side by side */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>

        {/* SVG Map */}
        <div style={{
          background: "#0a0e14",
          border: "1px solid #3a2c10",
          borderRadius: 6,
          boxShadow: "0 0 40px rgba(0,0,0,0.8)",
          overflow: "hidden",
          position: "relative",
        }}>
          <svg width={SVG_W} height={SVG_H} style={{ display: "block" }}>
            {/* Ocean */}
            <rect width={SVG_W} height={SVG_H} fill="#0d1f33"/>

            {/* Region blobs — soft circles colored by home faction */}
            {keeps.map(reg => {
              if (!reg.factions?.length) return null;
              const fac = reg.factions[0];
              const col = FAC_COLOR[reg.owner] || FAC_COLOR[fac] || "#44443a";
              const alpha = reg.owner ? "55" : "28";
              return (
                <circle key={`blob_${reg.key}`}
                  cx={tx(reg.cx)} cy={ty(reg.cy)} r={tx(50)}
                  fill={col + alpha}/>
              );
            })}

            {/* Holy Grail center glow */}
            <circle cx={tx(350)} cy={ty(350)} r={tx(55)}
              fill="rgba(240,192,64,0.08)"
              stroke="rgba(240,192,64,0.2)" strokeWidth={0.6}/>

            {/* Keep triangles */}
            {keeps.map(reg => {
              const x = tx(reg.cx), y = ty(reg.cy);
              const sz = reg.layer === "ring" ? 8 : reg.layer === "conflict" ? 6 : 5;
              const col = keepColor(reg.owner);
              const isSel = selected === reg.key;
              return (
                <g key={reg.key}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelected(isSel ? null : reg.key)}
                >
                  {/* Shadow */}
                  <polygon points={keepTri(x + 0.8, y + 0.8, sz)}
                    fill="rgba(0,0,0,0.5)"/>
                  {/* Triangle */}
                  <polygon points={keepTri(x, y, sz)}
                    fill={col} opacity={isSel ? 1 : 0.9}/>
                  {/* Ring keep gold outline */}
                  {reg.layer === "ring" && (
                    <polygon points={keepTri(x, y, sz)}
                      fill="none" stroke="#f0c040" strokeWidth={1}/>
                  )}
                  {/* Selection ring */}
                  {isSel && (
                    <circle cx={x} cy={y} r={sz + 3}
                      fill="none" stroke="#ffffff" strokeWidth={1} opacity={0.7}/>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Keep info panel */}
        <div style={{
          width: 160,
          minHeight: 200,
          background: "rgba(5,7,11,0.96)",
          border: "1px solid #2a2418",
          borderRadius: 6,
          padding: "10px 10px 12px",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          {!selectedKeep ? (
            <div style={{
              color: "#4a4030", fontFamily: "'Cinzel',serif",
              fontSize: 9, textAlign: "center", marginTop: 20,
              lineHeight: 1.6,
            }}>
              Tap a keep<br/>to view details
            </div>
          ) : (
            <>
              {/* Keep name */}
              <div style={{
                fontFamily: "'Cinzel',serif", fontSize: 10,
                color: "#c8a060", letterSpacing: ".05em",
                borderBottom: "1px solid #1e1810", paddingBottom: 6,
              }}>
                {selectedKeep.keepName}
              </div>

              {/* Region */}
              <Row label="Region" value={selectedKeep.name}/>

              {/* Faction */}
              <Row label="Faction" value={
                !selectedKeep.owner ? "Unoccupied"
                : selectedKeep.owner === "player" ? "Your Faction"
                : selectedKeep.owner === "ai" ? "Enemy"
                : selectedKeep.owner
              } valueColor={
                !selectedKeep.owner ? "#a09070"
                : selectedKeep.owner === "player" ? "#44aaff"
                : "#ff6644"
              }/>

              {/* Garrison */}
              <Row label="Garrison" value={
                selectedKeep.garrison > 0
                  ? `${garrisonLabel(selectedKeep.garrison)} (${selectedKeep.garrison.toLocaleString()})`
                  : "None"
              }/>

              {/* Siege */}
              {selectedKeep.siegeMax > 0 && (
                <div>
                  <div style={{ color: "#6a5a4a", fontSize: 8, fontFamily: "'Cinzel',serif", marginBottom: 2 }}>
                    SIEGE
                  </div>
                  <div style={{ background: "#0a0c10", borderRadius: 2, height: 5, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.round((selectedKeep.siege / selectedKeep.siegeMax) * 100)}%`,
                      background: "linear-gradient(90deg, #cc3030, #ff5050)",
                      borderRadius: 2,
                    }}/>
                  </div>
                  <div style={{ color: "#6a4040", fontSize: 7, textAlign: "right", marginTop: 1 }}>
                    {selectedKeep.siege} / {selectedKeep.siegeMax}
                  </div>
                </div>
              )}

              {/* Layer badge */}
              <div style={{
                display: "inline-block",
                padding: "2px 6px",
                borderRadius: 3,
                background: selectedKeep.layer === "ring" ? "rgba(240,192,64,0.15)"
                  : selectedKeep.layer === "conflict" ? "rgba(220,60,40,0.15)"
                  : "rgba(60,80,60,0.2)",
                border: `1px solid ${
                  selectedKeep.layer === "ring" ? "#8a6020"
                  : selectedKeep.layer === "conflict" ? "#6a2010"
                  : "#2a3a2a"
                }`,
                color: selectedKeep.layer === "ring" ? "#c8a040"
                  : selectedKeep.layer === "conflict" ? "#cc5040"
                  : "#4a6a4a",
                fontSize: 8,
                fontFamily: "'Cinzel',serif",
                letterSpacing: ".04em",
                alignSelf: "flex-start",
                marginTop: 2,
              }}>
                {selectedKeep.layer === "ring"     ? "⚜ Holy Ring"
                 : selectedKeep.layer === "conflict" ? "⚔ Conflict Zone"
                 : selectedKeep.layer === "farm"     ? "🌾 Farm Region"
                 : "🏰 Starting Region"}
              </div>

              {/* Go button */}
              <button
                onClick={() => {
                  onTeleport(selectedKeep.cx, selectedKeep.cy);
                  onClose();
                }}
                style={{
                  marginTop: "auto",
                  padding: "8px 0",
                  background: "linear-gradient(160deg,#2a1e08,#120e04)",
                  border: "1px solid #8a6020",
                  borderRadius: 4,
                  color: "#f0c060",
                  fontFamily: "'Cinzel',serif",
                  fontSize: 11,
                  letterSpacing: ".08em",
                  cursor: "pointer",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                Go →
              </button>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 14, marginTop: 10,
        fontSize: 8, fontFamily: "'Cinzel',serif",
        color: "#6a5a4a",
      }}>
        <LegendItem color="#ffffff" label="Unoccupied"/>
        <LegendItem color="#44aaff" label="Allied"/>
        <LegendItem color="#ff4444" label="Enemy"/>
        <LegendItem color="#f0c040" label="⚜ Holy Ring" outline/>
      </div>


    </div>
  );
}

function Row({ label, value, valueColor }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <div style={{ color: "#6a5a4a", fontSize: 8, fontFamily: "'Cinzel',serif", letterSpacing: ".04em" }}>
        {label.toUpperCase()}
      </div>
      <div style={{ color: valueColor || "#c8b090", fontSize: 9, fontFamily: "'Cinzel',serif" }}>
        {value}
      </div>
    </div>
  );
}

function LegendItem({ color, label, outline }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <svg width={10} height={10}>
        <polygon
          points="5,1 9.3,8.5 0.7,8.5"
          fill={color} opacity={0.9}
          stroke={outline ? "#f0c040" : "none"}
          strokeWidth={outline ? 0.8 : 0}
        />
      </svg>
      <span>{label}</span>
    </div>
  );
}
