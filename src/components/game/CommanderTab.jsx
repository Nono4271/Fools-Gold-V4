import { useState } from "react";
import { applyGearToCmd } from "../../utils/gearStats.js";
import {
  RARITY, CLASS, SKILL_TREES, getSkillNames, getMainBranchNames,
  respectCost, RESPECT_MAX, PROMO, RC,
  PLAYABLE_FACTIONS,
} from "../../constants/heroes.js";
import { cmdCommand } from "../../constants/buildings.js";
import { CMD_LVL_MAX, xpToNext } from "../../constants/troops.js";

/* ─────────────────────────────────────────────────────────────────────────────
   CommanderTab — full commander roster + detail view
   Visual language: reference screenshot (portrait list left, detail right)
   adapted to Fool's Gold dark-fantasy palette.
───────────────────────────────────────────────────────────────────────────── */

const RARITY_ORDER = { champion: 0, veteran: 1, soldier: 2 };

// ── Respect bar helpers ───────────────────────────────────────────────────────
function getRespectInfo(cmd) {
  const rLvl = cmd.respectLevel ?? 0;
  const rPts = cmd.respectPoints ?? 0;
  let spent = 0;
  for (let i = 0; i < rLvl; i++) spent += respectCost(i);
  const intoLvl = rPts - spent;
  const cost = respectCost(Math.min(rLvl, RESPECT_MAX - 1));
  const pct = rLvl >= RESPECT_MAX ? 100 : Math.min(100, Math.round((intoLvl / cost) * 100));
  return { rLvl, intoLvl, cost, pct };
}

// ── Skill tree view ───────────────────────────────────────────────────────────
function SkillTreeView({ cmd, onClose }) {
  const rLvl = cmd.respectLevel ?? 0;
  const trees = Object.entries(SKILL_TREES);

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "rgba(5,4,3,.97)",
      borderRadius: 10,
      display: "flex", flexDirection: "column",
      animation: "fadeUp .18s ease",
      zIndex: 10,
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 14px 10px",
        borderBottom: "1px solid #2a2010",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 11,
            background: "linear-gradient(135deg,#f0c040,#c8a030)", WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent" }}>
            SKILL TREES
          </div>
          <div style={{ fontSize: 9, color: "#6a5a3a", fontFamily: "'Cinzel',serif", marginTop: 2 }}>
            {cmd.n} · R{rLvl} · Lv{cmd.lvl ?? 5}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "1px solid #2a2010", color: "#6a5a3a",
          fontFamily: "'Cinzel',serif", fontSize: 10, padding: "3px 10px",
          borderRadius: 3, cursor: "pointer",
        }}>✕ Close</button>
      </div>

      {/* Unspent points banner */}
      {(cmd.unspentSkillPoints ?? 0) > 0 && (
        <div style={{
          margin: "10px 14px 0",
          padding: "6px 10px",
          background: "rgba(240,192,64,.1)",
          border: "1px solid rgba(240,192,64,.3)",
          borderRadius: 4,
          fontSize: 9, color: "#f0c040", fontFamily: "'Cinzel',serif",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ fontSize: 14 }}>✦</span>
          {cmd.unspentSkillPoints} unspent skill point{cmd.unspentSkillPoints !== 1 ? "s" : ""} available
        </div>
      )}

      {/* Trees */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {trees.map(([treeKey, tree]) => {
          const locked = rLvl < tree.unlocksAt;
          const names = getSkillNames(cmd.faction, cmd.cls, treeKey);
          const mainNames = getMainBranchNames(cmd.faction, cmd.cls, treeKey);
          const rarityColor = RARITY[cmd.rarity]?.color ?? "#888";

          return (
            <div key={treeKey} style={{
              background: locked ? "rgba(255,255,255,.015)" : "rgba(255,255,255,.03)",
              border: `1px solid ${locked ? "#1a1a1a" : rarityColor + "30"}`,
              borderRadius: 6,
              overflow: "hidden",
              opacity: locked ? 0.5 : 1,
            }}>
              {/* Tree header */}
              <div style={{
                padding: "8px 12px",
                background: locked ? "transparent" : `linear-gradient(90deg, ${rarityColor}12, transparent)`,
                borderBottom: `1px solid ${locked ? "#1a1a1a" : rarityColor + "20"}`,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 14 }}>{tree.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 10, fontWeight: 700,
                    color: locked ? "#3a3a3a" : "#e0d0c0" }}>{tree.n}</div>
                  <div style={{ fontSize: 8, color: locked ? "#2a2a2a" : "#5a4a3a",
                    fontFamily: "'Crimson Pro',serif", marginTop: 1 }}>{tree.desc}</div>
                </div>
                {locked ? (
                  <div style={{ fontSize: 8, color: "#cc3030", fontFamily: "'Cinzel',serif",
                    padding: "2px 6px", border: "1px solid #cc303040", borderRadius: 3 }}>
                    🔒 R{tree.unlocksAt}
                  </div>
                ) : (
                  <div style={{ fontSize: 8, color: "#3daa60", fontFamily: "'Cinzel',serif" }}>Unlocked</div>
                )}
              </div>

              {/* Main branch nodes */}
              {!locked && (
                <div style={{ padding: "10px 12px" }}>
                  {/* Main branch */}
                  <div style={{ fontSize: 7, color: "#5a4a2a", fontFamily: "'Cinzel',serif",
                    letterSpacing: ".08em", marginBottom: 6 }}>MAIN BRANCH (max 10)</div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                    {mainNames.map((nodeName, i) => (
                      <div key={i} style={{
                        minWidth: 44, padding: "3px 5px", borderRadius: 4,
                        background: "rgba(255,255,255,.025)",
                        border: `1px solid ${rarityColor}28`,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                      }}>
                        <span style={{ fontSize: 7, color: rarityColor, fontFamily: "'Cinzel',serif", fontWeight: 700 }}>{i + 1}</span>
                        <span style={{ fontSize: 5.5, color: "#4a3a20", fontFamily: "'Cinzel',serif", textAlign: "center", lineHeight: 1.2 }}>{nodeName}</span>
                      </div>
                    ))}
                  </div>

                  {/* Sub-branches */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[0, 1].map(sub => (
                      <div key={sub}>
                        <div style={{ fontSize: 7, color: "#4a3a2a", fontFamily: "'Cinzel',serif",
                          letterSpacing: ".06em", marginBottom: 5 }}>
                          {names[sub] ?? `SUB ${sub + 1}`} (max 5)
                        </div>
                        <div style={{ display: "flex", gap: 3 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} style={{
                              width: 18, height: 18, borderRadius: 3,
                              background: "rgba(255,255,255,.02)",
                              border: `1px solid ${rarityColor}20`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 7, color: "#3a2a1a",
                            }}>
                              <span style={{ opacity: .35 }}>{i + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 8, fontSize: 8, color: "#3a3040",
                    fontFamily: "'Crimson Pro',serif", fontStyle: "italic" }}>
                    Full skill point assignment UI coming in next update.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Commander detail panel (right side) ───────────────────────────────────────
function CommanderDetail({ cmd, bldgs, tiles, recallMarch }) {
  const [showSkills, setShowSkills] = useState(false);
  const [showClassPopup, setShowClassPopup] = useState(false);
  if (!cmd) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      color: "#2a2020", fontFamily: "'Cinzel',serif", fontSize: 11, fontStyle: "italic" }}>
      Select a commander
    </div>
  );

  const rarityDef   = RARITY[cmd.rarity] ?? RARITY.soldier;
  const classDef    = CLASS[cmd.cls];
  const faction     = PLAYABLE_FACTIONS.find(f => f.key === cmd.faction);
  const { rLvl, intoLvl, cost, pct } = getRespectInfo(cmd);
  const lvl         = cmd.lvl ?? 5;
  const xpNeeded    = lvl < CMD_LVL_MAX ? xpToNext(lvl) : null;
  const xpPct       = xpNeeded ? Math.min(100, Math.round(((cmd.xp ?? 0) / xpNeeded) * 100)) : 100;
  const cmdCap      = cmdCommand(lvl, bldgs?.commandcenter ?? 0, (cmd.cls==="leader"&&lvl>=25)?500:0);
  const promoInfo   = PROMO[cmd.rarity];
  const nextPromoAt = promoInfo?.respectRequired;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", minHeight: 0 }}>
      {showSkills && <SkillTreeView cmd={cmd} onClose={() => setShowSkills(false)} />}

      {/* Portrait hero area */}
      <div style={{
        padding: "14px 16px 10px",
        background: `linear-gradient(160deg, ${rarityDef.color}0a 0%, transparent 60%)`,
        borderBottom: "1px solid #1a1510",
        flexShrink: 0,
      }}>
        {/* Name + class row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
          <div>
            <div style={{
              fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 15,
              color: "#e8dcc8", letterSpacing: ".02em", lineHeight: 1.1,
            }}>{cmd.n}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap", position: "relative" }}>
              {/* Class badge — clickable popup */}
              {classDef && (
                <>
                  <div
                    onClick={() => setShowClassPopup(s => !s)}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "3px 8px",
                      background: showClassPopup ? `${rarityDef.color}18` : "rgba(255,255,255,.04)",
                      border: `1px solid ${rarityDef.color}${showClassPopup ? "70" : "40"}`,
                      borderRadius: 3, cursor: "pointer",
                    }}>
                    <span style={{ fontSize: 12 }}>{classDef.icon}</span>
                    <span style={{ fontFamily: "'Cinzel',serif", fontSize: 9,
                      color: rarityDef.color, fontWeight: 700, letterSpacing: ".06em" }}>
                      {classDef.n}
                    </span>
                    <span style={{ fontSize: 7, color: rarityDef.color, opacity: 0.6 }}>ⓘ</span>
                  </div>
                  {showClassPopup && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
                      width: 200, padding: "9px 11px",
                      background: "#0e0c09", border: `1px solid ${rarityDef.color}40`,
                      borderRadius: 6, boxShadow: "0 4px 20px rgba(0,0,0,.7)",
                      animation: "fadeUp .12s ease",
                    }}>
                      <div style={{ fontSize: 7, color: rarityDef.color, fontFamily: "'Cinzel',serif",
                        letterSpacing: ".08em", marginBottom: 4 }}>
                        {classDef.icon} {classDef.n.toUpperCase()} CLASS
                      </div>
                      <div style={{ fontSize: 9, fontFamily: "'Crimson Pro',serif",
                        color: "#7a6a50", lineHeight: 1.5, marginBottom: 7 }}>{classDef.desc}</div>
                      <div style={{ fontSize: 7, color: lvl >= 25 ? "#f0c040" : "#5a4a2a",
                        fontFamily: "'Cinzel',serif", letterSpacing: ".08em", marginBottom: 3 }}>
                        ⭐ LV25 BONUS{lvl >= 25 ? " — ACTIVE" : ` — unlocks at Lv25`}
                      </div>
                      <div style={{ fontSize: 9, fontFamily: "'Crimson Pro',serif",
                        color: lvl >= 25 ? "#c0a070" : "#3a3020", lineHeight: 1.5 }}>{classDef.bonus}</div>
                    </div>
                  )}
                </>
              )}
              {/* Faction badge */}
              {faction && (
                <div style={{ fontSize: 9, color: faction.c, fontFamily: "'Cinzel',serif" }}>
                  {faction.s} {faction.n}
                </div>
              )}
              {/* Rarity badge */}
              <div style={{
                padding: "2px 7px",
                background: `${rarityDef.color}15`,
                border: `1px solid ${rarityDef.color}50`,
                borderRadius: 3,
                fontSize: 8, color: rarityDef.color, fontFamily: "'Cinzel',serif", fontWeight: 700,
              }}>{rarityDef.n}</div>
            </div>
          </div>

          {/* Big icon */}
          <div style={{
            width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
            background: `radial-gradient(circle at 35% 35%, ${rarityDef.color}20, #0e0c09)`,
            border: `2px solid ${rarityDef.color}60`,
            boxShadow: `0 0 16px ${rarityDef.color}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32,
          }}>{cmd.icon}</div>
        </div>

        {/* Respect bar (primary — like the reference's star/loyalty bar) */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 14 }}>⚜</span>
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: 13, fontWeight: 700,
                color: rarityDef.color }}>R{rLvl}</span>
              {nextPromoAt && rLvl < nextPromoAt && (
                <span style={{ fontSize: 7, color: "#4a4a3a", fontFamily: "'Cinzel',serif" }}>
                  → {RARITY[promoInfo.to]?.n} at R{nextPromoAt}
                </span>
              )}
              {rLvl >= RESPECT_MAX && (
                <span style={{ fontSize: 7, color: rarityDef.color, fontFamily: "'Cinzel',serif" }}>MAX</span>
              )}
            </div>
            <span style={{ fontSize: 8, color: "#5a4a3a", fontFamily: "'Cinzel',serif" }}>
              {rLvl < RESPECT_MAX ? `${intoLvl} / ${cost}` : "Max Respect"}
            </span>
          </div>
          <div style={{ height: 5, background: "#0e0c09", borderRadius: 3,
            border: "1px solid #2a2010", overflow: "hidden", position: "relative" }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: `linear-gradient(90deg, ${rarityDef.color}aa, ${rarityDef.color})`,
              borderRadius: 3, transition: "width .4s ease",
              boxShadow: `0 0 8px ${rarityDef.color}60`,
            }} />
            {/* Chevron tick marks */}
            {[25,50,75].map(p => (
              <div key={p} style={{ position: "absolute", top: 0, bottom: 0, left: `${p}%`,
                width: 1, background: "rgba(0,0,0,.4)" }} />
            ))}
          </div>
        </div>

        {/* Level / XP row */}
        <div style={{ marginBottom: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
            <span style={{ fontFamily: "'Cinzel',serif", fontSize: 10, color: "#8a8060" }}>
              Lv.{lvl} / Lv.{CMD_LVL_MAX}
            </span>
            {xpNeeded && (
              <span style={{ fontSize: 8, color: "#4a4a3a", fontFamily: "'Cinzel',serif" }}>
                {cmd.xp ?? 0} / {xpNeeded} XP
              </span>
            )}
          </div>
          <div style={{ height: 3, background: "#0e0c09", borderRadius: 2,
            border: "1px solid #1a1510", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${xpPct}%`,
              background: "linear-gradient(90deg,#8a6020,#f0c040)",
              borderRadius: 2, transition: "width .4s ease",
            }} />
          </div>
        </div>
      </div>

      {/* Stats grid — like the reference's 4-stat row */}
      {(() => {
        const bc = applyGearToCmd(cmd, gearInventory);
        return (
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)",
        gap: 1, borderBottom: "1px solid #1a1510",
        background: "#0a0805", flexShrink: 0,
      }}>
        {[
          { icon: "⚔",  label: "ATK", val: bc.atk ?? 0,  color: "#e08050" },
          { icon: "✦",  label: "FOC", val: bc.foc ?? 0,  color: "#aa66ff" },
          { icon: "💨", label: "SPD", val: bc.spd ?? 0,  color: "#40a8e0" },
          { icon: "📡", label: "CMD", val: cmdCap,         color: "#60c0a0" },
        ].map(({ icon, label, val, color }) => (
          <div key={label} style={{
            padding: "10px 0", textAlign: "center",
            background: "rgba(255,255,255,.015)",
            borderRight: "1px solid #181410",
          }}>
            <div style={{ fontSize: 16, marginBottom: 3 }}>{icon}</div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, fontWeight: 700,
              color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 7, color: "#4a4a3a", fontFamily: "'Cinzel',serif",
              letterSpacing: ".06em", marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>
        );
      })()}

      {/* March / location status */}
      {(() => {
        if (cmd.march) {
          const eta = Math.ceil((cmd.march.path.length - cmd.march.step - 1) * cmd.march.stepMs / 1000);
          const isAtk = cmd.march.type === "attack";
          return (
            <div style={{
              margin: "8px 14px 0", padding: "6px 10px",
              background: isAtk ? "rgba(200,30,30,.1)" : "rgba(40,140,80,.1)",
              border: `1px solid ${isAtk ? "#cc303040" : "#3daa6040"}`,
              borderRadius: 4, flexShrink: 0,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 14 }}>{isAtk ? "⚔" : "🚶"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: isAtk ? "#ff8080" : "#80d090",
                  fontFamily: "'Cinzel',serif", fontWeight: 700 }}>
                  {isAtk ? "Attacking" : "Marching"} · ~{eta}s
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}



      {/* Skill tree button — prominent, like the reference */}
      <div style={{ padding: "10px 14px", flexShrink: 0 }}>
        <button onClick={() => setShowSkills(true)} style={{
          width: "100%", padding: "11px 0",
          background: `linear-gradient(135deg, ${rarityDef.color}18 0%, rgba(0,0,0,.3) 100%)`,
          border: `1px solid ${rarityDef.color}50`,
          borderRadius: 5, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: `0 0 12px ${rarityDef.color}15, inset 0 1px 0 rgba(255,255,255,.05)`,
          transition: "all .15s",
          position: "relative", overflow: "hidden",
        }}>
          {/* Shimmer line */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: `linear-gradient(90deg,transparent,${rarityDef.color}60,transparent)`,
          }} />
          <span style={{ fontSize: 18 }}>✦</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, fontWeight: 700,
              color: rarityDef.color, letterSpacing: ".06em" }}>SKILL TREES</div>
            <div style={{ fontSize: 8, color: "#5a4a3a", fontFamily: "'Cinzel',serif",
              marginTop: 1 }}>
              {(cmd.unspentSkillPoints ?? 0) > 0
                ? `${cmd.unspentSkillPoints} point${cmd.unspentSkillPoints !== 1 ? "s" : ""} to spend`
                : "View & assign skill points"}
            </div>
          </div>
          {(cmd.unspentSkillPoints ?? 0) > 0 && (
            <div style={{
              marginLeft: "auto",
              width: 20, height: 20, borderRadius: "50%",
              background: "linear-gradient(135deg,#dd3030,#991010)",
              fontSize: 9, color: "#fff", fontFamily: "'Cinzel',serif", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{cmd.unspentSkillPoints}</div>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Portrait circle (left list) ───────────────────────────────────────────────
function RosterPortrait({ cmd, selected, onClick }) {
  const rarityDef = RARITY[cmd.rarity] ?? RARITY.soldier;
  const rLvl = cmd.respectLevel ?? 0;
  const lvl  = cmd.lvl ?? 5;
  const isMarching = !!cmd.march;

  return (
    <div onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      cursor: "pointer", padding: "6px 4px",
      background: selected ? `${rarityDef.color}12` : "transparent",
      borderRadius: 8,
      borderRight: selected ? `2px solid ${rarityDef.color}` : "2px solid transparent",
      transition: "background .15s",
    }}>
      {/* Ring + portrait */}
      <div style={{
        width: 54, height: 54, borderRadius: "50%",
        // Conic ring matches rarity
        background: `conic-gradient(${rarityDef.color} 0deg, #1a1408 90deg, ${rarityDef.color} 180deg, #1a1408 270deg, ${rarityDef.color} 360deg)`,
        padding: selected ? 2.5 : 2,
        boxShadow: selected
          ? `0 0 0 1px ${rarityDef.color}, 0 0 14px ${rarityDef.color}55`
          : `0 2px 8px rgba(0,0,0,.7)`,
        transition: "box-shadow .15s, padding .1s",
        position: "relative", flexShrink: 0,
      }}>
        <div style={{
          width: "100%", height: "100%", borderRadius: "50%",
          background: `radial-gradient(circle at 35% 35%, ${rarityDef.color}20, #0e0c09)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, border: `1px solid ${rarityDef.color}40`,
          overflow: "hidden", position: "relative",
        }}>
          {cmd.icon}
          {/* Bottom fade */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "35%",
            background: "linear-gradient(to top,rgba(0,0,0,.7),transparent)",
          }} />
        </div>

        {/* Level badge — top-left */}
        <div style={{
          position: "absolute", top: -2, left: -2,
          padding: "1px 4px",
          background: "linear-gradient(135deg,#1a1408,#0a0805)",
          border: `1px solid ${rarityDef.color}60`,
          borderRadius: 3,
          fontFamily: "'Cinzel',serif", fontSize: 7, fontWeight: 700,
          color: rarityDef.color,
        }}>{lvl}</div>

        {/* Marching indicator — top-right */}
        {isMarching && (
          <div style={{
            position: "absolute", top: -2, right: -2,
            width: 14, height: 14, borderRadius: "50%",
            background: cmd.march.type === "attack" ? "#cc3030" : "#3daa60",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 7, border: "1px solid #0e0c09",
          }}>
            {cmd.march.type === "attack" ? "⚔" : "→"}
          </div>
        )}

        {/* Respect pip — bottom centre */}
        <div style={{
          position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)",
          padding: "1px 5px",
          background: "#0a0805",
          border: `1px solid ${rarityDef.color}50`,
          borderRadius: 8,
          fontFamily: "'Cinzel',serif", fontSize: 6, color: rarityDef.color,
          whiteSpace: "nowrap",
        }}>R{rLvl}</div>
      </div>

      {/* Name */}
      <div style={{
        fontFamily: "'Cinzel',serif", fontSize: 7,
        color: selected ? rarityDef.color : "#5a4a3a",
        textAlign: "center", maxWidth: 58,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        transition: "color .15s",
        lineHeight: 1.3,
      }}>
        {cmd.n.split(" ")[0]}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function CommanderTab({ cmds, bldgs, tiles, recallMarch, setHqTab, setHqOpen, setScreen, gearInventory }) {
  const playerCmds = cmds
    .filter(c => c.owner === "player")
    .sort((a, b) => (RARITY_ORDER[a.rarity] ?? 3) - (RARITY_ORDER[b.rarity] ?? 3));

  const [selectedUid, setSelectedUid] = useState(playerCmds[0]?.uid ?? null);
  const selectedCmd = playerCmds.find(c => c.uid === selectedUid) ?? playerCmds[0] ?? null;

  if (playerCmds.length === 0) {
    return (
      <div style={{ padding: "20px 14px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>✦</div>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: "#4a4050", marginBottom: 8 }}>
          No commanders yet
        </div>
        <button onClick={() => { setHqOpen(false); setScreen("gacha"); }} style={{
          padding: "8px 20px", background: "rgba(120,50,150,.18)",
          border: "1px solid rgba(153,64,204,.35)", color: "#bb88ee",
          fontFamily: "'Cinzel',serif", fontSize: 11, borderRadius: 3, cursor: "pointer",
        }}>✦ Summon Commanders</button>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", height: "100%", gap: 0,
      // Prevent overflow from breaking the layout
      overflow: "hidden",
    }}>
      {/* ── Left: scrollable portrait roster ── */}
      <div style={{
        width: 70, flexShrink: 0,
        overflowY: "auto", overflowX: "hidden",
        borderRight: "1px solid #1a1510",
        background: "rgba(0,0,0,.2)",
        scrollbarWidth: "none",
        display: "flex", flexDirection: "column",
        paddingTop: 4, paddingBottom: 8,
      }}>
        {playerCmds.map(cmd => (
          <RosterPortrait
            key={cmd.uid}
            cmd={cmd}
            selected={cmd.uid === selectedUid}
            onClick={() => setSelectedUid(cmd.uid)}
          />
        ))}

        {/* Summon more */}
        <div onClick={() => { setHqOpen(false); setScreen("gacha"); }}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            padding: "8px 4px", cursor: "pointer", opacity: 0.5,
            marginTop: 4,
          }}>
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "rgba(120,50,150,.1)",
            border: "1px dashed rgba(153,64,204,.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "#7a3aaa",
          }}>+</div>
          <div style={{ fontSize: 6, color: "#4a3a5a", fontFamily: "'Cinzel',serif",
            textAlign: "center" }}>Summon</div>
        </div>
      </div>

      {/* ── Right: detail panel ── */}
      <div style={{
        flex: 1, overflowY: "auto", display: "flex", flexDirection: "column",
        minWidth: 0, position: "relative",
      }}>
        <CommanderDetail
          cmd={selectedCmd}
          bldgs={bldgs}
          tiles={tiles}
          recallMarch={recallMarch}
          setHqTab={setHqTab}
        />
      </div>
    </div>
  );
}
