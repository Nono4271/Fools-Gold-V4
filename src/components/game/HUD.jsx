import { RKEYS, RSS } from "../../constants/map.js";

/*
  HUD — top resource bar
  Dark fantasy / aged-metal aesthetic matching the GameBar language:
  near-black background, warm gold trim, resource chips with rarity colors.
*/
export default function HUD({ facName, pKeys, rss, gems, setCmdScreenOpen }) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
      background: "linear-gradient(180deg, rgba(12,9,4,1) 0%, rgba(18,14,6,.97) 80%, rgba(30,22,8,0) 100%)",
      paddingTop: "env(safe-area-inset-top, 0px)",
    }}>
      {/* Gold bottom trim */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent, #8a6020 15%, #f0c04066 40%, #c89030 60%, #8a602066 85%, transparent)",
      }} />

      {/* Decorative corner accents */}
      <div style={{ position: "absolute", bottom: 4, left: 8, width: 16, height: 16, opacity: .35,
        borderBottom: "1px solid #c8a060", borderLeft: "1px solid #c8a060" }} />
      <div style={{ position: "absolute", bottom: 4, right: 8, width: 16, height: 16, opacity: .35,
        borderBottom: "1px solid #c8a060", borderRight: "1px solid #c8a060" }} />

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "6px 12px 7px",
        gap: 6, maxWidth: 700, margin: "0 auto",
      }}>

        {/* Faction name + tile count */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{
            fontFamily: "'Cinzel Decorative',serif", fontSize: 10,
            background: "linear-gradient(135deg,#f0c040,#c03030,#f0c040)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "shimmer 3s linear infinite",
          }}>FG</span>
          <div style={{ width: 1, height: 12, background: "#3a2010" }} />
          <span style={{ fontFamily: "'Cinzel',serif", fontSize: 9, color: "#8a7a50", letterSpacing: ".04em" }}>
            {facName}
          </span>
          <div style={{
            display: "flex", alignItems: "center", gap: 3,
            padding: "1px 6px",
            background: "rgba(40,100,60,.12)",
            border: "1px solid rgba(40,140,80,.2)",
            borderRadius: 3,
          }}>
            <span style={{ fontSize: 8 }}>🗺</span>
            <span style={{ fontFamily: "'Cinzel',serif", fontSize: 8, color: "#3daa60" }}>{pKeys.size}</span>
          </div>
        </div>

        {/* Resource chips */}
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          {RKEYS.map(k => (
            <div key={k} style={{
              display: "flex", alignItems: "center", gap: 2,
              padding: "2px 7px",
              background: RSS[k].bg,
              border: `1px solid ${RSS[k].col}28`,
              borderRadius: 3,
              // Inset bevel on top for stone feel
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.04), 0 1px 4px rgba(0,0,0,.5)",
              fontSize: 10, color: RSS[k].col,
              fontFamily: "'Cinzel',serif",
              whiteSpace: "nowrap",
            }}>
              {RSS[k].icon}
              <span style={{ fontSize: 9 }}>{Math.floor(rss[k]).toLocaleString()}</span>
            </div>
          ))}

          {/* Gems */}
          <div style={{
            display: "flex", alignItems: "center", gap: 2,
            padding: "2px 7px",
            background: "rgba(240,192,64,.07)",
            border: "1px solid rgba(240,192,64,.22)",
            borderRadius: 3,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.04), 0 1px 4px rgba(0,0,0,.5)",
            color: "#f0c040", fontFamily: "'Cinzel',serif", fontSize: 10,
            whiteSpace: "nowrap",
          }}>
            💎<span style={{ fontSize: 9 }}>{gems}</span>
          </div>
        </div>

        {/* Commander tab button */}
        <button
          onClick={() => setCmdScreenOpen && setCmdScreenOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "3px 10px",
            background: "rgba(240,192,64,.07)",
            border: "1px solid rgba(240,192,64,.25)",
            borderRadius: 3,
            color: "#c8a040", fontFamily: "'Cinzel',serif", fontSize: 9,
            cursor: "pointer", flexShrink: 0,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.04)",
          }}>
          <span style={{ fontSize: 11 }}>⚔</span>
          <span>Cmdr</span>
        </button>

      </div>
    </div>
  );
}
