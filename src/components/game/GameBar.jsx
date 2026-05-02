import { useState } from "react";
import { RARITY, CLASS } from "../../constants/heroes.js";
import { CSS } from "../../constants/css.js";

/* ─────────────────────────────────────────────────────────────────────────────
   GameBar — persistent bottom action bar
   Inspired by the reference (circular portrait buttons, stone-metal frame)
   but using Fool's Gold's dark fantasy palette: near-black, warm gold trim,
   deep crimson accents, aged-bronze textures via gradients.
───────────────────────────────────────────────────────────────────────────── */

// Octagonal clip-path for the portrait frames (matches reference aesthetic)
const OCTAGON = "polygon(30% 0%,70% 0%,100% 30%,100% 70%,70% 100%,30% 100%,0% 70%,0% 30%)";

// Rarity → glow/ring color
const RARITY_GLOW = {
  soldier:  { ring: "#4488cc", glow: "rgba(68,136,204,0.6)"  },
  veteran:  { ring: "#a855f7", glow: "rgba(168,85,247,0.6)"  },
  champion: { ring: "#f0c040", glow: "rgba(240,192,64,0.7)"  },
};

function PortraitButton({ cmd, onClick, active, badge }) {
  const rg = RARITY_GLOW[cmd?.rarity] ?? RARITY_GLOW.soldier;
  const cls = CLASS[cmd?.cls];
  const [pressed, setPressed] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}>

      {/* Outer decorative ring */}
      <div style={{
        width: 52, height: 52,
        borderRadius: "50%",
        background: `conic-gradient(${rg.ring} 0deg, #2a1e0e 90deg, ${rg.ring} 180deg, #2a1e0e 270deg, ${rg.ring} 360deg)`,
        padding: 2,
        boxShadow: active
          ? `0 0 0 2px ${rg.ring}, 0 0 12px ${rg.glow}, inset 0 1px 0 rgba(255,255,255,.1)`
          : `0 0 6px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.05)`,
        transform: pressed ? "scale(0.92)" : active ? "scale(1.06)" : "scale(1)",
        transition: "transform .12s ease, box-shadow .15s ease",
        position: "relative",
        flexShrink: 0,
      }}>
        {/* Inner frame — stone texture via gradient */}
        <div style={{
          width: "100%", height: "100%",
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #2a2215, #0e0c09)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26,
          border: `1px solid ${rg.ring}55`,
          overflow: "hidden",
          position: "relative",
        }}>
          <span style={{ lineHeight: 1, userSelect: "none" }}>{cmd?.icon ?? "?"}</span>

          {/* Bottom fade for depth */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "40%",
            background: "linear-gradient(to top, rgba(0,0,0,.7), transparent)",
            borderRadius: "0 0 50% 50%",
          }} />

          {/* Active indicator — lit bottom arc */}
          {active && (
            <div style={{
              position: "absolute", bottom: 0, left: "10%", right: "10%", height: 3,
              background: rg.ring,
              borderRadius: "0 0 4px 4px",
              boxShadow: `0 0 8px ${rg.glow}`,
            }} />
          )}
        </div>

        {/* Notification badge */}
        {badge > 0 && (
          <div style={{
            position: "absolute", top: -2, right: -2,
            width: 16, height: 16, borderRadius: "50%",
            background: "linear-gradient(135deg,#dd3030,#991010)",
            border: "1px solid #0e0c09",
            fontSize: 7, color: "#fff", fontFamily: "'Cinzel',serif", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{Math.min(99, badge)}</div>
        )}
      </div>

      {/* Name label */}
      <div style={{
        fontFamily: "'Cinzel',serif", fontSize: 6.5, color: active ? "#f0c040" : "#6a5a3a",
        letterSpacing: ".04em", textAlign: "center", maxWidth: 52,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        transition: "color .15s",
        textShadow: active ? "0 0 8px rgba(240,192,64,.5)" : "none",
      }}>
        {cmd?.n?.split(" ")[0] ?? ""}
      </div>
    </div>
  );
}

function ActionButton({ icon, label, color = "#c8a060", onClick, badge, accent }) {
  const [pressed, setPressed] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}>

      <div style={{
        width: 46, height: 46,
        borderRadius: 8,
        position: "relative",
        transform: pressed ? "scale(0.92)" : "scale(1)",
        transition: "transform .12s ease",
        flexShrink: 0,
      }}>
        {/* Beveled stone button face */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: 8,
          background: accent
            ? `linear-gradient(160deg, ${accent}22 0%, #0e0c09 60%)`
            : "linear-gradient(160deg, #1e1a12 0%, #0a0805 60%)",
          border: `1px solid ${accent ?? color}44`,
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,.08),
            inset 0 -1px 0 rgba(0,0,0,.6),
            0 4px 12px rgba(0,0,0,.7),
            0 0 0 1px rgba(0,0,0,.8)
          `,
        }} />
        {/* Top highlight bevel */}
        <div style={{
          position: "absolute", top: 1, left: 2, right: 2, height: 1,
          background: "rgba(255,255,255,.12)", borderRadius: "8px 8px 0 0",
        }} />
        {/* Icon */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, filter: "drop-shadow(0 1px 3px rgba(0,0,0,.8))",
        }}>{icon}</div>

        {/* Badge */}
        {badge > 0 && (
          <div style={{
            position: "absolute", top: -3, right: -3,
            width: 16, height: 16, borderRadius: "50%",
            background: "linear-gradient(135deg,#dd3030,#991010)",
            border: "1px solid #0e0c09",
            fontSize: 7, color: "#fff", fontFamily: "'Cinzel',serif", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{Math.min(99, badge)}</div>
        )}
      </div>

      <div style={{
        fontFamily: "'Cinzel',serif", fontSize: 6.5, color,
        letterSpacing: ".04em", textAlign: "center",
        textShadow: `0 0 6px ${color}44`,
      }}>{label}</div>
    </div>
  );
}

export default function GameBar({
  cmds, facName,
  unseenBattles,
  setHqOpen, setHqTab,
  setScreen,
  setShowBattleLog, setUnseenBattles,
  setCmdScreenOpen, setCmdScreenUid,
  setGearScreenOpen, gearInventoryCount,
}) {
  // Show up to 4 player commanders in portrait slots (most recently added / highest rarity first)
  const playerCmds = cmds
    .filter(c => c.owner === "player")
    .sort((a, b) => {
      const rOrder = { champion: 0, veteran: 1, soldier: 2 };
      return (rOrder[a.rarity] ?? 3) - (rOrder[b.rarity] ?? 3);
    })
    .slice(0, 4);

  const openHQ = (tab = "overview") => {
    setHqOpen(true);
    setHqTab(tab);
  };

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      zIndex: 300,
      // Layered bar: stone-textured background with gold trim
      background: `
        linear-gradient(180deg,
          rgba(30,22,8,.0) 0%,
          rgba(18,14,6,.97) 20%,
          rgba(12,9,4,1) 100%
        )
      `,
      borderTop: "1px solid #3a2c10",
      boxShadow: "0 -1px 0 rgba(0,0,0,.9), 0 -8px 32px rgba(0,0,0,.8)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {/* Gold top trim line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent, #8a6020 15%, #f0c04088 40%, #c89030 60%, #8a602088 85%, transparent)",
      }} />

      {/* Decorative corner accents */}
      <div style={{ position: "absolute", top: 4, left: 8, width: 20, height: 20, opacity: .4,
        borderTop: "1px solid #c8a060", borderLeft: "1px solid #c8a060" }} />
      <div style={{ position: "absolute", top: 4, right: 8, width: 20, height: 20, opacity: .4,
        borderTop: "1px solid #c8a060", borderRight: "1px solid #c8a060" }} />

      <div style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        padding: "10px 12px 8px",
        gap: 6,
        maxWidth: 600,
        margin: "0 auto",
      }}>

        {/* ── Left: HQ + Summon action buttons ── */}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <ActionButton
            icon="🏰"
            label="HQ"
            color="#c8a060"
            accent="#8a6020"
            onClick={() => openHQ("overview")}
          />
          <ActionButton
            icon="✦"
            label="Summon"
            color="#bb88ee"
            accent="#7c22d4"
            onClick={() => setScreen("gacha")}
          />
        </div>

        {/* ── Centre: Commander portrait row ── */}
        <div style={{
          display: "flex", gap: 8, alignItems: "flex-end",
          flex: 1, justifyContent: "center",
        }}>
          {playerCmds.map(cmd => (
            <PortraitButton
              key={cmd.uid}
              cmd={cmd}
              onClick={() => { setCmdScreenOpen(true); setCmdScreenUid(cmd.uid); }}
              active={false}
            />
          ))}
          {/* Empty slots when fewer than 4 commanders */}
          {playerCmds.length < 4 && Array.from({ length: Math.min(4 - playerCmds.length, 2) }).map((_, i) => (
            <div key={`empty-${i}`} style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "radial-gradient(circle, #141008, #0a0805)",
              border: "1px dashed #2a2010",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: 0.3,
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 18, color: "#4a3a1a" }}>+</span>
            </div>
          ))}
        </div>

        {/* ── Right: Battle log + Army buttons ── */}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <ActionButton
            icon="⚔"
            label="Battles"
            color={unseenBattles > 0 ? "#e8a040" : "#4a4a3a"}
            accent={unseenBattles > 0 ? "#8a4010" : undefined}
            badge={unseenBattles}
            onClick={() => { setShowBattleLog(true); setUnseenBattles(0); }}
          />
          <ActionButton
            icon="🛡"
            label="Gear"
            color="#c8a040"
            accent="#6a4010"
            badge={0}
            onClick={() => setGearScreenOpen(true)}
          />
        </div>

      </div>
    </div>
  );
}
