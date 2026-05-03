import { useState } from "react";

function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function outcomeOf(b) {
  if (b.won && b.defTroopsEnd === 0) return { text:"VICTORY", color:"#3daa60" };
  if (!b.won && b.atkTroopsEnd === 0) return { text:"DEFEAT",  color:"#cc3030" };
  return { text:"DRAW", color:"#d0a030" };
}

const CLS_COLOR = { attacker:"#e08050", defender:"#5080e0", support:"#50d090", leader:"#d0a030" };

// ── Pre-battle passive phase ──────────────────────────────────────────────────
function PreBattle({ passiveSummary, cmdName }) {
  if (!passiveSummary) return null;
  const ps = passiveSummary;
  const lines = [
    ps.cmdAtkMult     > 1 && { text:`+${Math.round((ps.cmdAtkMult-1)*100)}% Commander ATK`,         color:"#f0c040" },
    ps.critChance     > 0 && { text:`+${Math.round(ps.critChance*100)}% Critical Hit Chance`,       color:"#f0c040" },
    ps.dmgReduce      > 0 && { text:`-${Math.round(ps.dmgReduce*100)}% Incoming Damage`,            color:"#60aaff" },
    ps.enemyAtkReduce > 0 && { text:`-${Math.round(ps.enemyAtkReduce*100)}% Enemy ATK`,             color:"#60aaff" },
    ps.troopAtkMult   > 1 && { text:`+${Math.round((ps.troopAtkMult-1)*100)}% Troop ATK`,           color:"#f0c040" },
    ps.troopDefMult   > 1 && { text:`+${Math.round((ps.troopDefMult-1)*100)}% Troop DEF`,           color:"#60aaff" },
    ps.healPerRound   > 0 && { text:`+${Math.round(ps.healPerRound*100)}% Troops Restored per Round`, color:"#50d090" },
    ps.garrisonIgnore > 0 && { text:`Ignore ${Math.round(ps.garrisonIgnore*100)}% Garrison Bonus`,  color:"#d0a030" },
  ].filter(Boolean);
  if (!lines.length) return null;

  return (
    <div style={{ marginBottom:14 }}>
      <div style={{
        fontSize:7, fontFamily:"'Cinzel',serif", color:"#6a5040",
        letterSpacing:".1em", marginBottom:6, paddingBottom:3,
        borderBottom:"1px solid #2a1a08",
        display:"flex", alignItems:"center", gap:6,
      }}>
        <div style={{ flex:1, height:1, background:"#2a1a08" }} />
        PRE-BATTLE — {cmdName} Passives Activated
        <div style={{ flex:1, height:1, background:"#2a1a08" }} />
      </div>
      {lines.map((l,i) => (
        <div key={i} style={{
          fontSize:8, color:l.color, lineHeight:1.7, paddingLeft:10,
          fontFamily:"'Crimson Pro',serif",
        }}>
          ✦ {l.text}
        </div>
      ))}
    </div>
  );
}

// ── Simple battle summary card ────────────────────────────────────────────────
function BattleCard({ b, onClick }) {
  const oc   = outcomeOf(b);
  const lost = b.atkTroopsStart - b.atkTroopsEnd;
  const pct  = Math.round((b.atkTroopsEnd / Math.max(1, b.atkTroopsStart)) * 100);

  return (
    <div onClick={onClick} style={{
      padding:"10px 14px", marginBottom:8, cursor:"pointer",
      background:"rgba(255,255,255,.02)",
      border:`1px solid #221e12`,
      borderLeft:`3px solid ${oc.color}`,
      borderRadius:5, transition:"background .15s",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <span style={{ fontSize:16 }}>{b.atkIcon || "⚔"}</span>
          <div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700, color:"#c8a060" }}>
              {b.atkName}
              {b.cmdCls && (
                <span style={{ marginLeft:6, fontSize:7, color: CLS_COLOR[b.cmdCls] ?? "#888",
                  background:"rgba(255,255,255,.04)", padding:"1px 5px", borderRadius:2 }}>
                  {b.cmdCls}
                </span>
              )}
            </div>
            <div style={{ fontSize:7, color:"#4a3a28" }}>Lv{b.atkLvl} · {b.terrain} · {b.modLabel}</div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700, color:oc.color }}>
            {oc.text}
          </div>
          <div style={{ fontSize:7, color:"#3a3028" }}>{timeAgo(b.timestamp)}</div>
        </div>
      </div>

      {/* VS row */}
      <div style={{ display:"flex", alignItems:"stretch", gap:8, marginBottom:8 }}>
        {/* Left: attacker */}
        <div style={{ flex:1 }}>
          <div style={{ fontSize:7, color:"#3a3028", fontFamily:"'Cinzel',serif", letterSpacing:".06em", marginBottom:2 }}>ATTACKER</div>
          <div style={{ fontSize:8, color:"#6a8060" }}>{b.atkTroopsStart.toLocaleString()} troops</div>
        </div>
        {/* Divider */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2 }}>
          <div style={{ height:1, width:16, background:"#2a1e10" }} />
          <span style={{ fontSize:7, color:"#3a3028", fontFamily:"'Cinzel',serif" }}>VS</span>
          <div style={{ height:1, width:16, background:"#2a1e10" }} />
        </div>
        {/* Right: defender */}
        <div style={{ flex:1, textAlign:"right" }}>
          <div style={{ fontSize:7, color:"#3a3028", fontFamily:"'Cinzel',serif", letterSpacing:".06em", marginBottom:2 }}>DEFENDER</div>
          <div style={{ fontSize:8, color:"#9a5050" }}>
            {b.defCmdIcon} {b.defCmdName}
            {b.defPowerLevel > 1 && <span style={{ color:"#5a4038", marginLeft:4 }}>PL{b.defPowerLevel}</span>}
          </div>
          <div style={{ fontSize:7, color:"#4a3028" }}>{b.defTroopsStart?.toLocaleString()} troops</div>
        </div>
      </div>

      {/* Troop bar */}
      <div style={{ marginBottom:5 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
          <span style={{ fontSize:7, color:"#4a3a28", fontFamily:"'Cinzel',serif", letterSpacing:".05em" }}>TROOPS</span>
          <span style={{ fontSize:7, color: lost > 0 ? "#cc6060" : "#3daa60" }}>
            {b.atkTroopsStart.toLocaleString()} → {b.atkTroopsEnd.toLocaleString()}
            {lost > 0 && ` (−${lost.toLocaleString()})`}
          </span>
        </div>
        <div style={{ height:5, background:"#0c0905", borderRadius:2, overflow:"hidden" }}>
          <div style={{
            height:"100%", borderRadius:2,
            width:`${pct}%`,
            background:`linear-gradient(90deg,${oc.color}66,${oc.color})`,
            transition:"width .4s",
          }} />
        </div>
      </div>

      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <div style={{ display:"flex", gap:8 }}>
          {b.won && b.xpGain > 0 && (
            <span style={{ fontSize:7, color:"#8a6030" }}>+{b.xpGain} XP</span>
          )}
          {b.bastionActive && (
            <span style={{ fontSize:7, color:"#5080e0" }}>🛡 Bastion</span>
          )}
          {b.isStage2 && (
            <span style={{ fontSize:7, color:"#5a4a38" }}>Stage 2</span>
          )}
        </div>
        <span style={{ fontSize:7, color:"#2a2018", fontFamily:"'Cinzel',serif" }}>
          {b.rounds?.length ?? 0} rounds · tap for details →
        </span>
      </div>
    </div>
  );
}

// ── Detailed round-by-round log ───────────────────────────────────────────────
function DetailedLog({ b }) {
  if (!b) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%",
      color:"#2a2020", fontFamily:"'Cinzel',serif", fontSize:9, fontStyle:"italic" }}>
      Select a battle on the left
    </div>
  );

  const oc   = outcomeOf(b);
  const lost = b.atkTroopsStart - b.atkTroopsEnd;

  return (
    <div>
      {/* Battle header */}
      <div style={{
        padding:"12px 14px", marginBottom:14,
        background:"rgba(0,0,0,.3)", borderRadius:5,
        border:`1px solid ${oc.color}33`,
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
          <div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:12, fontWeight:700, color:"#c8a060", marginBottom:2 }}>
              {b.atkIcon} {b.atkName}
              <span style={{ fontSize:8, color:"#5a4a38", marginLeft:6 }}>Lv{b.atkLvl}</span>
            </div>
            <div style={{ fontSize:8, color:"#5a4a38" }}>vs {b.defCmdIcon} {b.defCmdName}</div>
          </div>
          <div style={{
            fontFamily:"'Cinzel',serif", fontSize:11, fontWeight:700,
            color:oc.color, padding:"4px 10px",
            border:`1px solid ${oc.color}55`, borderRadius:3,
          }}>
            {oc.text}
          </div>
        </div>

        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 16px" }}>
          {[
            ["Terrain",    b.terrain ?? "—"],
            ["Match-up",   b.modLabel ?? "—"],
            ["Rounds",     String(b.rounds?.length ?? 0)],
            ["Lost",       lost.toLocaleString()],
            b.won && b.xpGain > 0 ? ["XP", `+${b.xpGain}`] : null,
          ].filter(Boolean).map(([k,v]) => (
            <div key={k}>
              <div style={{ fontSize:6, color:"#3a3028", fontFamily:"'Cinzel',serif", letterSpacing:".08em" }}>{k}</div>
              <div style={{ fontSize:8, color:"#8a7050" }}>{v}</div>
            </div>
          ))}
        </div>

        {b.bastionActive && (
          <div style={{ marginTop:6, fontSize:7, color:"#5080e0" }}>
            🛡 Bastion passive — double HP &amp; DEF active rounds 1-2
          </div>
        )}
      </div>

      {/* Rounds — Phase 0 (pre-battle) renders first, then rounds 1-10 */}
      {(b.rounds ?? []).map((rd) => (
        <div key={rd.round} style={{ marginBottom:12 }}>
          {/* Round divider */}
          <div style={{
            display:"flex", alignItems:"center", gap:6,
            marginBottom:5,
          }}>
            <div style={{ flex:1, height:1, background: rd.isPreBattle ? "#2a2010" : "#1e1810" }} />
            <span style={{
              fontSize:7, fontFamily:"'Cinzel',serif",
              color: rd.isPreBattle ? "#8a6030" : "#4a3a28",
              letterSpacing:".1em", flexShrink:0,
            }}>
              {rd.isPreBattle ? "⚔ PRE-BATTLE" : `ROUND ${rd.round}`}
            </span>
            <div style={{ flex:1, height:1, background: rd.isPreBattle ? "#2a2010" : "#1e1810" }} />
          </div>

          {rd.actions.map((a, ai) => {
            // Colour coding
            let color, indent;
            if (a.isHeal) {
              color = "#50d090"; indent = 12;
            } else if (a.isGear) {
              color = "#a070d0"; indent = 10;
            } else if (a.isSkill && a.isPhase0) {
              color = "#c8901a"; indent = 10;
            } else if (a.isSkill) {
              color = "#d0a030"; indent = 0;
            } else if (a.isPhase0) {
              color = "#6a5a40"; indent = 0;
            } else if (a.isPlayer === true) {
              color = "#60a8e0"; indent = 12;
            } else if (a.isPlayer === false) {
              color = "#cc6060"; indent = 12;
            } else {
              color = "#5a5068"; indent = 0;
            }

            return (
              <div key={ai} style={{
                fontSize: a.isSkill ? 7.5 : 7,
                lineHeight:1.7,
                color,
                paddingLeft: indent,
                fontFamily: a.isSkill ? "'Cinzel',serif" : "'Crimson Pro',serif",
                fontStyle: a.actor === "SYSTEM" ? "italic" : "normal",
              }}>
                {a.action}
                {/* Combat actions: show dmg + troops killed/remaining */}
                {a.dmg > 0 && !a.isSkill && (() => {
                  const killed    = a.defKilled    ?? a.atkKilled;
                  const remaining = a.defRemaining ?? a.atkRemaining;
                  return (
                    <span style={{ fontFamily:"'Cinzel',serif" }}>
                      {" — "}
                      <span style={{ color:"#cc6060" }}>{a.dmg.toLocaleString()} dmg</span>
                      {killed > 0 && <>
                        {", "}
                        <span style={{ color:"#e07050" }}>{killed.toLocaleString()} killed</span>
                        {remaining !== undefined &&
                          <span style={{ color:"#3a3028" }}> ({remaining.toLocaleString()} remain)</span>
                        }
                      </>}
                    </span>
                  );
                })()}
                {/* Skill damage: just bracket number */}
                {a.dmg > 0 && a.isSkill && (
                  <span style={{ color:"#cc6060", marginLeft:4, fontFamily:"'Cinzel',serif" }}>
                    [{a.dmg.toLocaleString()}]
                  </span>
                )}
                {a.dmg < 0 && (
                  <span style={{ color:"#50d090", marginLeft:4, fontFamily:"'Cinzel',serif" }}>
                    [+{Math.abs(a.dmg).toLocaleString()} restored]
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BattleLog({ battles, bLog, onClose }) {
  const [view,     setView]     = useState("simple");
  const [selected, setSelected] = useState(0);

  const hasBattles = battles.length > 0;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:500,
      background:"rgba(0,0,0,.7)",
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <div style={{
        width:"min(700px, 96vw)", height:"min(88vh, 800px)",
        background:"#08060a",
        border:"1px solid #2a1e08",
        borderRadius:8,
        display:"flex", flexDirection:"column",
        boxShadow:"0 8px 56px rgba(0,0,0,.95)",
        overflow:"hidden",
      }}>

        {/* ── Header ── */}
        <div style={{
          padding:"12px 16px", flexShrink:0,
          borderBottom:"1px solid #1e1808",
          background:"linear-gradient(180deg,rgba(20,15,5,1),rgba(10,8,3,.97))",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          position:"relative",
        }}>
          <div style={{
            position:"absolute", top:0, left:0, right:0, height:1,
            background:"linear-gradient(90deg,transparent,#8a6020 20%,#f0c04066 50%,#8a6020 80%,transparent)",
          }} />

          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:16 }}>⚔</span>
            <span style={{
              fontFamily:"'Cinzel Decorative',serif", fontSize:12,
              background:"linear-gradient(135deg,#f0c040,#c89028)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>
              Battle Reports
            </span>
            {battles.length > 0 && (
              <span style={{
                background:"rgba(240,192,64,.12)", border:"1px solid #f0c04033",
                borderRadius:10, padding:"1px 8px",
                fontSize:7, color:"#b08040", fontFamily:"'Cinzel',serif",
              }}>
                {battles.length}
              </span>
            )}
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {hasBattles && [
              ["simple",   "📋 SUMMARY"],
              ["detailed", "📜 DETAILED"],
            ].map(([v, label]) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding:"4px 10px", borderRadius:3, cursor:"pointer",
                background: view===v ? "rgba(240,192,64,.14)" : "transparent",
                border:`1px solid ${view===v ? "#f0c040" : "#2a2010"}`,
                color: view===v ? "#f0c040" : "#5a4a3a",
                fontFamily:"'Cinzel',serif", fontSize:7, letterSpacing:".06em",
              }}>
                {label}
              </button>
            ))}
            <button onClick={onClose} style={{
              width:30, height:30, borderRadius:"50%",
              background:"rgba(255,255,255,.04)", border:"1px solid #2a1e08",
              color:"#6a5a4a", fontSize:14, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>✕</button>
          </div>
        </div>

        {/* ── Body ── */}
        {!hasBattles ? (
          <div style={{
            flex:1, display:"flex", alignItems:"center", justifyContent:"center",
            color:"#2a2020", fontFamily:"'Cinzel',serif", fontSize:10, fontStyle:"italic",
          }}>
            No battles recorded yet.
          </div>

        ) : view === "simple" ? (
          /* ── Summary: card list ── */
          <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
            {battles.map((b, i) => (
              <BattleCard
                key={i} b={b}
                onClick={() => { setSelected(i); setView("detailed"); }}
              />
            ))}
          </div>

        ) : (
          /* ── Detailed: picker + log ── */
          <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

            {/* Left picker */}
            <div style={{
              width:155, flexShrink:0,
              borderRight:"1px solid #1a1510",
              overflowY:"auto", padding:"8px 6px",
              background:"rgba(0,0,0,.25)",
            }}>
              {battles.map((b, i) => {
                const oc = outcomeOf(b);
                return (
                  <div key={i} onClick={() => setSelected(i)} style={{
                    padding:"7px 8px", marginBottom:4, cursor:"pointer", borderRadius:4,
                    background: i===selected ? "rgba(240,192,64,.07)" : "transparent",
                    border:`1px solid ${i===selected ? "#f0c04044" : "transparent"}`,
                    borderLeft:`2px solid ${oc.color}`,
                  }}>
                    <div style={{ fontSize:8, color:"#9a8060", fontFamily:"'Cinzel',serif",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:1 }}>
                      {b.atkIcon} {b.atkName}
                    </div>
                    <div style={{ fontSize:7, color:oc.color, marginBottom:1 }}>{oc.text}</div>
                    <div style={{ fontSize:6, color:"#3a3028" }}>{timeAgo(b.timestamp)}</div>
                  </div>
                );
              })}
            </div>

            {/* Right log */}
            <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
              <DetailedLog b={battles[selected] ?? null} />
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
