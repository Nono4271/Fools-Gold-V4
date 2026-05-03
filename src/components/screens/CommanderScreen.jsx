import { useState } from "react";
import { CSS } from "../../constants/css.js";
import {
  RARITY, CLASS, SKILL_TREES,
  getCommanderTrees, getTreeDisplayNames,
  respectCost, RESPECT_MAX, PROMO,
  PLAYABLE_FACTIONS, ALIGNMENT, addRespect,
} from "../../constants/heroes.js";
import {
  MAIN_SKILLS, SIDE_SKILLS,
  getBranchMainSkill, getBranchSideSkills,
} from "../../constants/skills.js";

const GEAR_RARITY_COLORS = { common: "#8a8a8a", rare: "#4488cc", epic: "#a855f7", legendary: "#f0c040" };
import { GEAR_SLOTS, GEAR_RARITY } from "../../constants/gear.js";
import { CMD_LVL_MAX, xpToNext } from "../../constants/troops.js";
import { cmdCommand } from "../../constants/buildings.js";

/* ─────────────────────────────────────────────────────────────────────────────
   CommanderScreen — fullscreen commander roster + detail
   Opened directly from GameBar portrait taps. No HQ chrome.
   Visual language: reference screenshot palette adapted to Fool's Gold.
───────────────────────────────────────────────────────────────────────────── */

const RARITY_ORDER = { champion: 0, veteran: 1, soldier: 2 };

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

// ── Skill node component ──────────────────────────────────────────────────────
function SkillNode({ skillKey, skillDef, level, maxLevel, unspent, rarityColor, onLevelUp, isMain, gateLocked }) {
  const [expanded, setExpanded] = useState(false);
  const canLevelUp = unspent > 0 && level < maxLevel && !gateLocked;
  const filled = level > 0;

  return (
    <div style={{ marginBottom: isMain ? 0 : 6 }}>
      {/* Node row */}
      <div
        onClick={() => skillDef && setExpanded(e => !e)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: isMain ? "7px 10px" : "5px 8px",
          background: filled ? `${rarityColor}12` : "rgba(255,255,255,.02)",
          border: `1px solid ${filled ? rarityColor + "40" : "#1e1810"}`,
          borderRadius: 6, cursor: skillDef ? "pointer" : "default",
          transition: "all .15s",
        }}
      >
        {/* Icon */}
        <span style={{ fontSize: isMain ? 16 : 13, flexShrink: 0 }}>{skillDef?.icon ?? "·"}</span>

        {/* Name + level pips */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: isMain ? 10 : 8, fontWeight: 700,
            color: filled ? "#e0d0b8" : "#4a3a24",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {skillDef?.name ?? skillKey}
          </div>
          <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
            {Array.from({ length: maxLevel }).map((_, i) => (
              <div key={i} style={{
                width: isMain ? 10 : 8, height: isMain ? 4 : 3, borderRadius: 2,
                background: i < level ? `linear-gradient(90deg,${rarityColor}99,${rarityColor})` : "#1a1410",
                border: `1px solid ${i < level ? rarityColor + "60" : "#241c0e"}`,
                boxShadow: i < level ? `0 0 4px ${rarityColor}40` : "none",
                transition: "all .2s",
              }} />
            ))}
          </div>
        </div>

        {/* Level badge */}
        <div style={{
          padding: "2px 6px", borderRadius: 3, flexShrink: 0,
          background: filled ? `${rarityColor}20` : "rgba(255,255,255,.03)",
          border: `1px solid ${filled ? rarityColor + "40" : "#1e1810"}`,
          fontFamily: "'Cinzel',serif", fontSize: 8,
          color: filled ? rarityColor : "#2e2418",
        }}>{level}/{maxLevel}</div>

        {/* Expand arrow */}
        {skillDef && (
          <span style={{ fontSize: 8, color: "#3a2e18", flexShrink: 0,
            transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</span>
        )}
      </div>

      {/* Expanded info panel */}
      {expanded && skillDef && (
        <div style={{
          margin: "2px 0 0 0", padding: "10px 12px",
          background: "rgba(0,0,0,.5)", border: `1px solid ${rarityColor}22`,
          borderRadius: "0 0 6px 6px", borderTop: "none",
          animation: "fadeUp .15s ease",
        }}>
          {/* Description */}
          <div style={{ fontSize: 10, color: "#8a7a58", fontFamily: "'Crimson Pro',serif",
            lineHeight: 1.5, marginBottom: 8 }}>{skillDef.desc}</div>

          {/* Current level effect */}
          {level > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 7, color: "#5a4a2a", fontFamily: "'Cinzel',serif",
                letterSpacing: ".06em", marginBottom: 3 }}>CURRENT (Lv{level})</div>
              <div style={{ fontSize: 9, color: "#c0a070", fontFamily: "'Crimson Pro',serif" }}>
                {skillDef.nextDesc(level - 1)}
              </div>
            </div>
          )}

          {/* Next level preview */}
          {level < maxLevel && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 7, color: "#3a4a2a", fontFamily: "'Cinzel',serif",
                letterSpacing: ".06em", marginBottom: 3 }}>NEXT (Lv{level + 1})</div>
              <div style={{ fontSize: 9, color: "#3daa60", fontFamily: "'Crimson Pro',serif" }}>
                {skillDef.nextDesc(level)}
              </div>
            </div>
          )}

          {/* Level Up button */}
          {level < maxLevel ? (
            <button
              onClick={(e) => { e.stopPropagation(); if (canLevelUp) onLevelUp(skillKey); }}
              disabled={!canLevelUp}
              style={{
                width: "100%", padding: "7px 0",
                background: canLevelUp
                  ? `linear-gradient(135deg,${rarityColor}30,${rarityColor}15)`
                  : "rgba(255,255,255,.02)",
                border: `1px solid ${canLevelUp ? rarityColor + "60" : gateLocked ? "rgba(200,120,40,.3)" : "#1e1810"}`,
                borderRadius: 4, cursor: canLevelUp ? "pointer" : "not-allowed",
                fontFamily: "'Cinzel',serif", fontSize: 9, fontWeight: 700,
                color: canLevelUp ? rarityColor : gateLocked ? "#c07830" : "#2e2418",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "all .15s",
                opacity: canLevelUp ? 1 : 0.6,
              }}
            >
              <span style={{ fontSize: 12 }}>{gateLocked ? "🔒" : "✦"}</span>
              {canLevelUp
                ? `Level Up (1 point)`
                : gateLocked
                  ? "Upgrade main skill first"
                  : unspent === 0
                    ? "No points available"
                    : "Max level reached"}
            </button>
          ) : (
            <div style={{ textAlign: "center", padding: "5px 0",
              fontFamily: "'Cinzel',serif", fontSize: 8, color: rarityColor,
              letterSpacing: ".06em" }}>✦ MAX LEVEL ✦</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── UTC date string helper (for daily respec tracking) ───────────────────────
function utcDateKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
}

// ── Skill tree overlay ────────────────────────────────────────────────────────
function SkillTreeOverlay({ cmd, setCmds, gems, setGems, onClose }) {
  const rLvl = cmd.respectLevel ?? 0;
  const rarityDef = RARITY[cmd.rarity] ?? RARITY.soldier;
  const skillPoints = cmd.skillPoints ?? {};
  const unspent = cmd.unspentSkillPoints ?? 0;
  const [respecError, setRespecError] = useState(null);

  // ── Respec logic ──────────────────────────────────────────────────────────
  const today = utcDateKey();
  const respecRecord = cmd.respecRecord ?? {}; // { dateKey, usedCount }
  const respecToday = respecRecord.dateKey === today ? (respecRecord.usedCount ?? 0) : 0;
  const FREE_RESPEC_LIMIT = 1;
  const PAID_RESPEC_LIMIT = 2;
  const RESPEC_GEM_COST   = 50;

  const canFreeRespec = respecToday < FREE_RESPEC_LIMIT;
  const canPaidRespec = !canFreeRespec && respecToday < PAID_RESPEC_LIMIT;
  const canRespec     = canFreeRespec || canPaidRespec;

  // Count total spent skill points to refund
  function totalSpentPoints(sp) {
    return Object.values(sp ?? {}).reduce((a, b) => a + b, 0);
  }

  function handleRespec() {
    if (!canRespec) return;
    if (canPaidRespec && gems < RESPEC_GEM_COST) {
      setRespecError(`Need ${RESPEC_GEM_COST} 💎 gems (you have ${gems})`);
      setTimeout(() => setRespecError(null), 3000);
      return;
    }

    const cost = canFreeRespec ? 0 : RESPEC_GEM_COST;
    if (cost > 0) setGems(g => g - cost);

    setCmds(prev => prev.map(c => {
      if (c.uid !== cmd.uid) return c;
      const refund = totalSpentPoints(c.skillPoints);
      return {
        ...c,
        skillPoints: {},
        unspentSkillPoints: (c.unspentSkillPoints ?? 0) + refund,
        respecRecord: { dateKey: today, usedCount: respecToday + 1 },
      };
    }));
    setRespecError(null);
  }

  // ── Side skill gatekeeping ────────────────────────────────────────────────
  // allowedSideLevel for a branch = floor(mainSkillLevel / 2)
  // e.g. main=0→side cap 0, main=2→side cap 1, main=4→side cap 2 …
  function getSideCap(mainSkillKey) {
    const liveSkillPts = cmd.skillPoints ?? {};
    const mainLvl = liveSkillPts[mainSkillKey] ?? 0;
    return Math.floor(mainLvl / 2);
  }

  function handleLevelUp(skillKey, mainSkillKeyForBranch) {
    if (unspent <= 0) return;
    setCmds(prev => prev.map(c => {
      if (c.uid !== cmd.uid) return c;
      const prev_pts = c.skillPoints ?? {};
      const curLvl = prev_pts[skillKey] ?? 0;
      const isMain = !!MAIN_SKILLS[skillKey];
      const maxLvl = isMain ? 10 : 5;
      if (curLvl >= maxLvl) return c;

      // Gatekeep side skills
      if (!isMain && mainSkillKeyForBranch) {
        const mainLvl = prev_pts[mainSkillKeyForBranch] ?? 0;
        const sideCap = Math.floor(mainLvl / 2);
        if (curLvl >= sideCap) return c; // blocked
      }

      return {
        ...c,
        skillPoints: { ...prev_pts, [skillKey]: curLvl + 1 },
        unspentSkillPoints: (c.unspentSkillPoints ?? 0) - 1,
      };
    }));
  }

  // Live read from cmds for reactivity
  const liveUnspent = cmd.unspentSkillPoints ?? 0;
  const liveSkillPts = cmd.skillPoints ?? {};
  const liveTotalSpent = totalSpentPoints(liveSkillPts);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 800,
      background: "rgba(4,3,2,.97)",
      display: "flex", flexDirection: "column",
      animation: "fadeUp .2s ease",
    }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{
        padding: "14px 16px 12px",
        borderBottom: "1px solid #2a2010",
        background: `linear-gradient(180deg, ${rarityDef.color}0a, transparent)`,
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(255,255,255,.04)", border: "1px solid #2a2010",
          color: "#8a7a50", fontSize: 16, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>←</button>
        <div style={{ fontSize: 28 }}>{cmd.icon}</div>
        <div>
          <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 15, color: "#e8dcc8" }}>
            {cmd.n}
          </div>
          <div style={{ fontSize: 9, color: rarityDef.color, fontFamily: "'Cinzel',serif", marginTop: 2 }}>
            SKILL TREES · R{rLvl} · Lv{cmd.lvl ?? 5}
          </div>
        </div>
        {/* Points badge */}
        <div style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
          padding: "5px 12px",
          background: liveUnspent > 0 ? "rgba(240,192,64,.12)" : "rgba(255,255,255,.03)",
          border: `1px solid ${liveUnspent > 0 ? "rgba(240,192,64,.4)" : "#1e1810"}`,
          borderRadius: 4,
          boxShadow: liveUnspent > 0 ? "0 0 10px rgba(240,192,64,.2)" : "none",
          transition: "all .3s",
        }}>
          <span style={{ fontSize: 14 }}>✦</span>
          <div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, fontWeight: 700,
              color: liveUnspent > 0 ? "#f0c040" : "#3a3020" }}>{liveUnspent}</div>
            <div style={{ fontSize: 7, color: "#3a3020", fontFamily: "'Cinzel',serif" }}>pts left</div>
          </div>
        </div>

        {/* Respec button */}
        {liveTotalSpent > 0 && (
          <button
            onClick={handleRespec}
            disabled={!canRespec}
            title={
              !canRespec
                ? "Both daily respecs used — resets at 00:00 UTC"
                : canFreeRespec
                  ? "Free daily respec — resets skills & refunds all points"
                  : `Paid respec — costs ${RESPEC_GEM_COST} 💎`
            }
            style={{
              padding: "5px 10px", borderRadius: 4, cursor: canRespec ? "pointer" : "not-allowed",
              background: !canRespec
                ? "rgba(255,255,255,.02)"
                : canFreeRespec
                  ? "rgba(61,170,96,.12)"
                  : "rgba(100,120,220,.12)",
              border: `1px solid ${!canRespec ? "#1e1810" : canFreeRespec ? "#3daa6060" : "#6478dc60"}`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
              opacity: canRespec ? 1 : 0.4,
              transition: "all .2s",
            }}
          >
            <span style={{ fontSize: 13 }}>↺</span>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 6, fontWeight: 700,
              color: !canRespec ? "#2a2010" : canFreeRespec ? "#3daa60" : "#8090e0",
              whiteSpace: "nowrap" }}>
              {!canRespec ? "USED" : canFreeRespec ? "FREE" : `${RESPEC_GEM_COST}💎`}
            </div>
          </button>
        )}
      </div>

      {/* Respec error toast */}
      {respecError && (
        <div style={{
          margin: "0 16px", padding: "8px 12px",
          background: "rgba(200,50,50,.15)", border: "1px solid rgba(200,50,50,.4)",
          borderRadius: 5, fontSize: 9, color: "#e07070",
          fontFamily: "'Cinzel',serif", animation: "fadeUp .2s ease",
        }}>{respecError}</div>
      )}

      {/* Respec usage indicator */}
      <div style={{
        padding: "6px 16px",
        background: "rgba(0,0,0,.3)", borderBottom: "1px solid #1a1408",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 8, color: "#3a2e18", fontFamily: "'Cinzel',serif", letterSpacing: ".06em" }}>
          DAILY RESPEC
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {[0, 1].map(i => {
            const used = i < respecToday;
            const isPaid = i === 1;
            return (
              <div key={i} style={{
                padding: "2px 7px", borderRadius: 3, fontSize: 7,
                fontFamily: "'Cinzel',serif",
                background: used ? "rgba(255,255,255,.03)" : isPaid ? "rgba(100,120,220,.1)" : "rgba(61,170,96,.1)",
                border: `1px solid ${used ? "#1e1810" : isPaid ? "#6478dc50" : "#3daa6050"}`,
                color: used ? "#2a2010" : isPaid ? "#8090e0" : "#3daa60",
                textDecoration: used ? "line-through" : "none",
              }}>
                {isPaid ? `${RESPEC_GEM_COST}💎` : "FREE"}
              </div>
            );
          })}
        </div>
        <span style={{ fontSize: 7, color: "#2a2010", fontFamily: "'Cinzel',serif", marginLeft: "auto" }}>
          resets 00:00 UTC
        </span>
      </div>

      {/* Trees */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {(() => {
          const { primary, secondary } = getCommanderTrees(cmd);
          const displayNames = getTreeDisplayNames(cmd.faction, cmd.cls);
          const treeEntries = [
            { treeKey: primary[0], label: displayNames[0], unlocksAt: 0, tag: "CLASS I",   branchIdx: 0 },
            { treeKey: primary[1] ?? primary[0], label: displayNames[1], unlocksAt: 0, tag: "CLASS II",  branchIdx: 1 },
            { treeKey: primary[2] ?? primary[0], label: displayNames[2], unlocksAt: 3, tag: "CLASS III", branchIdx: 2 },
            { treeKey: secondary, label: displayNames[3], unlocksAt: 5, tag: "LEGACY", branchIdx: 3 },
          ];
          return treeEntries.map(({ treeKey, label, unlocksAt, tag, branchIdx }, idx) => {
            const tree = SKILL_TREES[treeKey];
            if (!tree) return null;
            const locked = rLvl < unlocksAt;
            const isLegacy = idx === 3;
            const mainSkill = getBranchMainSkill(treeKey, branchIdx);
            const sideSkills = getBranchSideSkills(treeKey, branchIdx);
            const mainLvl = liveSkillPts[mainSkill.key] ?? 0;
            const sideLvls = sideSkills.map(s => liveSkillPts[s.key] ?? 0);
            const totalInBranch = mainLvl + sideLvls.reduce((a, b) => a + b, 0);

            return (
              <div key={`tree_${idx}`} style={{
                background: locked ? "rgba(255,255,255,.012)" : "rgba(255,255,255,.025)",
                border: `1px solid ${locked ? "#1c1c1c" : (isLegacy ? "#6a5a3040" : rarityDef.color + "30")}`,
                borderRadius: 8, overflow: "hidden",
                opacity: locked ? 0.45 : 1,
              }}>
                {/* Branch header */}
                <div style={{
                  padding: "10px 14px",
                  background: locked ? "transparent" : `linear-gradient(90deg, ${isLegacy ? "#6a5a3010" : rarityDef.color + "10"}, transparent)`,
                  borderBottom: `1px solid ${locked ? "#181818" : (isLegacy ? "#6a5a3018" : rarityDef.color + "18")}`,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>{tree.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, fontWeight: 700,
                      color: locked ? "#333" : "#e0d0c0" }}>{label}</div>
                    <div style={{ fontSize: 8, color: locked ? "#252525" : "#5a4a3a",
                      fontFamily: "'Crimson Pro',serif", marginTop: 1 }}>{tree.desc}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                    {isLegacy
                      ? <div style={{ padding: "2px 8px", borderRadius: 3, border: "1px solid #6a5a3040",
                          fontSize: 7, color: "#8a7a50", fontFamily: "'Cinzel',serif" }}>LEGACY</div>
                      : <div style={{ padding: "2px 8px", borderRadius: 3,
                          background: `${rarityDef.color}18`, border: `1px solid ${rarityDef.color}50`,
                          fontSize: 7, color: rarityDef.color, fontFamily: "'Cinzel',serif" }}>{tag}</div>
                    }
                    {locked
                      ? <div style={{ padding: "2px 8px", borderRadius: 3, border: "1px solid #cc303040",
                          fontSize: 7, color: "#cc3030", fontFamily: "'Cinzel',serif" }}>🔒 R{unlocksAt}</div>
                      : <div style={{ fontSize: 7, color: totalInBranch > 0 ? "#3daa60" : "#2a3a20",
                          fontFamily: "'Cinzel',serif" }}>{totalInBranch > 0 ? `${totalInBranch} pts spent` : "Unlocked"}</div>
                    }
                  </div>
                </div>

                {!locked && (
                  <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* Main skill — 10 levels */}
                    <div>
                      <div style={{ fontSize: 7, color: "#5a4a2a", fontFamily: "'Cinzel',serif",
                        letterSpacing: ".08em", marginBottom: 5 }}>MAIN SKILL — 10 LEVELS</div>
                      <SkillNode
                        skillKey={mainSkill.key}
                        skillDef={MAIN_SKILLS[mainSkill.key]}
                        level={mainLvl}
                        maxLevel={10}
                        unspent={liveUnspent}
                        rarityColor={rarityDef.color}
                        onLevelUp={(key) => handleLevelUp(key, null)}
                        isMain={true}
                      />
                    </div>

                    {/* Side skills — 5 levels each, gated by main */}
                    {(() => {
                      const sideCap = getSideCap(mainSkill.key);
                      return (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {sideSkills.map((sk, si) => {
                            const sideLevel = sideLvls[si];
                            const sideGateLocked = sideLevel >= sideCap;
                            const nextUnlockAt = (sideCap + 1) * 2; // main levels needed for next side level
                            return (
                              <div key={si}>
                                <div style={{ fontSize: 7, fontFamily: "'Cinzel',serif",
                                  letterSpacing: ".06em", marginBottom: 5,
                                  display: "flex", alignItems: "center", gap: 4,
                                  color: sideGateLocked && sideCap < 5 ? "#5a3a1a" : "#4a3a2a",
                                }}>
                                  SIDE SKILL — 5 LEVELS
                                  {sideGateLocked && sideCap < 5 && (
                                    <span style={{
                                      fontSize: 6, padding: "1px 5px", borderRadius: 3,
                                      background: "rgba(200,120,40,.12)",
                                      border: "1px solid rgba(200,120,40,.3)",
                                      color: "#c07830",
                                    }}>🔒 main lv {nextUnlockAt}</span>
                                  )}
                                  {sideCap >= 5 && (
                                    <span style={{
                                      fontSize: 6, padding: "1px 5px", borderRadius: 3,
                                      background: "rgba(61,170,96,.1)",
                                      border: "1px solid rgba(61,170,96,.3)",
                                      color: "#3daa60",
                                    }}>FULLY UNLOCKED</span>
                                  )}
                                </div>
                                <SkillNode
                                  skillKey={sk.key}
                                  skillDef={SIDE_SKILLS[sk.key]}
                                  level={sideLevel}
                                  maxLevel={5}
                                  unspent={liveUnspent}
                                  rarityColor={rarityDef.color}
                                  onLevelUp={(key) => handleLevelUp(key, mainSkill.key)}
                                  isMain={false}
                                  gateLocked={sideGateLocked && sideLevel < 5}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}

// ── Portrait circle (left roster column) ──────────────────────────────────────
function RosterPortrait({ cmd, selected, onClick }) {
  const r = RARITY[cmd.rarity] ?? RARITY.soldier;
  const rLvl = cmd.respectLevel ?? 0;

  return (
    <div onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
      padding: "8px 6px",
      borderRight: `2px solid ${selected ? r.color : "transparent"}`,
      background: selected ? `${r.color}10` : "transparent",
      cursor: "pointer", transition: "background .15s",
      position: "relative",
    }}>
      {/* Rarity ring */}
      <div style={{
        width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
        background: `conic-gradient(${r.color} 0deg, #140f06 80deg, ${r.color} 180deg, #140f06 260deg, ${r.color} 360deg)`,
        padding: selected ? 3 : 2,
        boxShadow: selected
          ? `0 0 0 1px ${r.color}, 0 0 18px ${r.color}50`
          : "0 2px 8px rgba(0,0,0,.8)",
        transition: "box-shadow .15s, padding .1s",
        position: "relative",
      }}>
        {/* Portrait face */}
        <div style={{
          width: "100%", height: "100%", borderRadius: "50%",
          background: `radial-gradient(circle at 38% 32%, ${r.color}25, #0c0a07)`,
          border: `1px solid ${r.color}45`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, overflow: "hidden", position: "relative",
        }}>
          {cmd.icon}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "38%",
            background: "linear-gradient(to top, rgba(0,0,0,.75), transparent)",
          }} />
        </div>

        {/* Level chip — top left */}
        <div style={{
          position: "absolute", top: -3, left: -3,
          padding: "1px 4px", borderRadius: 3,
          background: "linear-gradient(135deg,#1c1408,#0a0805)",
          border: `1px solid ${r.color}55`,
          fontFamily: "'Cinzel',serif", fontSize: 7, fontWeight: 700, color: r.color,
        }}>{cmd.lvl ?? 5}</div>

        {/* March dot — top right */}
        {cmd.march && (
          <div style={{
            position: "absolute", top: -2, right: -2,
            width: 14, height: 14, borderRadius: "50%",
            background: cmd.march.type === "attack" ? "#cc3030" : "#3daa60",
            border: "1px solid #0c0a07",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7,
          }}>{cmd.march.type === "attack" ? "⚔" : "→"}</div>
        )}

        {/* Respect pip — bottom */}
        <div style={{
          position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)",
          padding: "1px 5px", borderRadius: 8,
          background: "#0c0a07", border: `1px solid ${r.color}45`,
          fontFamily: "'Cinzel',serif", fontSize: 6, color: r.color, whiteSpace: "nowrap",
        }}>R{rLvl}</div>
      </div>

      {/* First name label */}
      <div style={{
        fontFamily: "'Cinzel',serif", fontSize: 7, marginTop: 2,
        color: selected ? r.color : "#4a3a28",
        textAlign: "center", maxWidth: 64,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        transition: "color .15s",
      }}>{cmd.n.split(" ")[0]}</div>
    </div>
  );
}

// ── Commander detail (right panel) ────────────────────────────────────────────
function CommanderDetail({ cmd, bldgs, gearInventory, setGearInventory, respectSchematics, setCmds, onSchematicUsed, gems, setGems }) {
  const [showSkills, setShowSkills] = useState(false);
  const [showSchematics, setShowSchematics] = useState(false);
  const r = RARITY[cmd.rarity] ?? RARITY.soldier;
  const cls = CLASS[cmd.cls];
  const faction = PLAYABLE_FACTIONS.find(f => f.key === cmd.faction);
  const { rLvl, intoLvl, cost, pct } = getRespectInfo(cmd);
  const promoInfo = PROMO[cmd.rarity];
  const lvl = cmd.lvl ?? 5;
  const xpNeeded = lvl < CMD_LVL_MAX ? xpToNext(lvl) : null;
  const xpPct = xpNeeded ? Math.min(100, Math.round(((cmd.xp ?? 0) / xpNeeded) * 100)) : 100;
  const cmdCap = cmdCommand(lvl, bldgs?.commandcenter ?? 0);

  return (
    <>
      {showSkills && <SkillTreeOverlay cmd={cmd} setCmds={setCmds} gems={gems} setGems={setGems} onClose={() => setShowSkills(false)} />}

      {/* ── Name + identity ── */}
      <div style={{
        padding: "16px 18px 12px",
        background: `linear-gradient(160deg, ${r.color}0c 0%, transparent 55%)`,
        borderBottom: "1px solid #1c1610",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Name */}
            <div style={{
              fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 20,
              color: "#ede0c8", letterSpacing: ".01em", lineHeight: 1.1,
            }}>{cmd.n}</div>

            {/* Class + faction + rarity chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
              {cls && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "3px 9px",
                  background: "rgba(255,255,255,.04)", border: `1px solid ${r.color}45`,
                  borderRadius: 3,
                }}>
                  <span style={{ fontSize: 13 }}>{cls.icon}</span>
                  <span style={{ fontFamily: "'Cinzel',serif", fontSize: 9, fontWeight: 700,
                    color: r.color, letterSpacing: ".06em" }}>{cls.n}</span>
                </div>
              )}
              {faction && (
                <div style={{ display: "flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 3,
                  background: `${faction.c}12`, border: `1px solid ${faction.c}35` }}>
                  <span style={{ fontSize: 11 }}>{faction.s}</span>
                  <span style={{ fontSize: 8, color: faction.c, fontFamily: "'Cinzel',serif" }}>{faction.n}</span>
                </div>
              )}
              <div style={{
                padding: "3px 8px", borderRadius: 3,
                background: `${r.color}12`, border: `1px solid ${r.color}45`,
                fontSize: 8, color: r.color, fontFamily: "'Cinzel',serif", fontWeight: 700,
              }}>{r.n}</div>
            </div>
          </div>

          {/* Portrait circle */}
          <div style={{
            width: 58, height: 58, borderRadius: "50%", flexShrink: 0,
            background: `radial-gradient(circle at 38% 32%, ${r.color}22, #0c0a07)`,
            border: `2px solid ${r.color}55`,
            boxShadow: `0 0 20px ${r.color}28`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34,
          }}>{cmd.icon}</div>
        </div>

        {/* Respect bar */}
        {(() => {
          // Pulsing glow when within 1 level of promotion threshold
          const nextPromo = promoInfo?.respectRequired;
          const atPromoThreshold = nextPromo && rLvl >= nextPromo - 1 && rLvl < nextPromo;
          const atMaxPromo = rLvl >= (promoInfo?.respectRequired ?? RESPECT_MAX) || !promoInfo?.to;
          const barGlows = atPromoThreshold || pct >= 90;
          return (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 15 }}>⚜</span>
                  <span style={{ fontFamily: "'Cinzel',serif", fontSize: 15, fontWeight: 700,
                    color: r.color }}>R{rLvl}</span>
                  {promoInfo?.to && rLvl < promoInfo.respectRequired && (
                    <span style={{ fontSize: 7, color: "#3a3228", fontFamily: "'Cinzel',serif" }}>
                      → {RARITY[promoInfo.to]?.n} at R{promoInfo.respectRequired}
                    </span>
                  )}
                  {/* + button to apply schematics */}
                  {rLvl < RESPECT_MAX && (
                    <button onClick={() => setShowSchematics(s => !s)} style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: showSchematics ? `${r.color}30` : "rgba(255,255,255,.05)",
                      border: `1px solid ${r.color}50`,
                      color: r.color, fontSize: 13, lineHeight: 1,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, flexShrink: 0,
                      boxShadow: (respectSchematics?.length > 0) ? `0 0 6px ${r.color}50` : "none",
                    }}>+</button>
                  )}
                </div>
                <span style={{ fontSize: 8, color: "#4a3a28", fontFamily: "'Cinzel',serif" }}>
                  {rLvl < RESPECT_MAX ? `${intoLvl} / ${cost} pts` : "Max Respect"}
                </span>
              </div>

              {/* Schematic picker */}
              {showSchematics && (
                <div style={{
                  marginBottom: 8, padding: "8px 10px",
                  background: "rgba(0,0,0,.4)", border: `1px solid ${r.color}28`,
                  borderRadius: 6, animation: "fadeUp .15s ease",
                }}>
                  {!respectSchematics?.length ? (
                    <div style={{ fontSize: 8, color: "#3a2e18", fontFamily: "'Crimson Pro',serif",
                      fontStyle: "italic" }}>No schematics in inventory</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 7, color: "#5a4a2a", fontFamily: "'Cinzel',serif",
                        letterSpacing: ".06em", marginBottom: 6 }}>
                        APPLY SCHEMATIC — {respectSchematics.length} available
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {respectSchematics.map(sc => {
                          const scColor = sc.rarity === "champion" ? "#f0c040" : sc.rarity === "veteran" ? "#a855f7" : "#4488cc";
                          return (
                            <button key={sc.instanceId} onClick={() => {
                              setCmds(prev => prev.map(c => {
                                if (c.uid !== cmd.uid) return c;
                                const updated = addRespect(c, sc.points);
                                return { ...updated, _justPromoted: null };
                              }));
                              // Remove schematic from inventory — passed up via setter
                              if (onSchematicUsed) onSchematicUsed(sc.instanceId);
                              setShowSchematics(false);
                            }} style={{
                              padding: "6px 10px", textAlign: "left",
                              background: `${scColor}10`, border: `1px solid ${scColor}35`,
                              borderRadius: 4, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 8,
                            }}>
                              <span style={{ fontSize: 16 }}>{sc.icon}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 9,
                                  color: scColor, fontWeight: 700 }}>+{sc.points} Respect pts</div>
                                <div style={{ fontSize: 7, color: "#4a3a28",
                                  fontFamily: "'Cinzel',serif" }}>
                                  {sc.rarity.charAt(0).toUpperCase() + sc.rarity.slice(1)} Schematic
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Bar — pulses when near promotion */}
              <div style={{
                height: 6, background: "#0c0905", borderRadius: 3,
                border: `1px solid ${barGlows ? r.color + "50" : "#241c0e"}`,
                overflow: "hidden", position: "relative",
                boxShadow: barGlows ? `0 0 10px ${r.color}40` : "none",
                transition: "box-shadow .3s",
              }}>
                <div style={{
                  height: "100%", width: `${pct}%`,
                  background: `linear-gradient(90deg, ${r.color}88, ${r.color})`,
                  borderRadius: 3, transition: "width .4s ease",
                  boxShadow: `0 0 8px ${r.color}55`,
                  animation: barGlows ? "pulse 1.8s ease-in-out infinite" : "none",
                }} />
                {[25, 50, 75].map(p => (
                  <div key={p} style={{ position: "absolute", top: 0, bottom: 0, left: `${p}%`,
                    width: 1, background: "rgba(0,0,0,.5)" }} />
                ))}
              </div>
            </div>
          );
        })()}

        {/* XP bar */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontFamily: "'Cinzel',serif", fontSize: 9, color: "#6a6040" }}>
              Lv.{lvl} / Lv.{CMD_LVL_MAX}
            </span>
            {xpNeeded && (
              <span style={{ fontSize: 8, color: "#3a3020", fontFamily: "'Cinzel',serif" }}>
                {cmd.xp ?? 0} / {xpNeeded} XP
              </span>
            )}
          </div>
          <div style={{ height: 3, background: "#0c0905", borderRadius: 2,
            border: "1px solid #1c1408", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${xpPct}%`,
              background: "linear-gradient(90deg,#8a6020,#f0c040)",
              borderRadius: 2, transition: "width .4s" }} />
          </div>
        </div>
      </div>

      {/* ── 4-stat row (matches reference layout) ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)",
        borderBottom: "1px solid #1a1510", background: "#090805", flexShrink: 0,
      }}>
        {[
          { icon: "⚔",  label: "ATK", val: cmd.atk ?? 0,  color: "#e08050" },
          { icon: "✦",  label: "FOC", val: cmd.foc ?? 0,  color: "#aa66ff" },
          { icon: "💨", label: "SPD", val: cmd.spd ?? 0,  color: "#40a8e0" },
          { icon: "📡", label: "CMD", val: cmdCap,          color: "#60c0a0" },
        ].map(({ icon, label, val, color }) => (
          <div key={label} style={{
            padding: "8px 0", textAlign: "center",
            borderRight: "1px solid #161210",
          }}>
            <div style={{ fontSize: 14, marginBottom: 3 }}>{icon}</div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: 6, color: "#3a3020", fontFamily: "'Cinzel',serif",
              letterSpacing: ".07em", marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Class info + bonus ── */}
      {cls && (
        <div style={{
          margin: "12px 18px 0", padding: "10px 12px", flexShrink: 0,
          background: `${r.color}07`, border: `1px solid ${r.color}22`, borderRadius: 6,
        }}>
          <div style={{ fontSize: 7, color: r.color, fontFamily: "'Cinzel',serif",
            letterSpacing: ".08em", marginBottom: 4 }}>
            {cls.icon} {cls.n.toUpperCase()} CLASS
          </div>
          <div style={{ fontSize: 9, fontFamily: "'Crimson Pro',serif",
            color: "#7a6a50", lineHeight: 1.5, marginBottom: 8 }}>{cls.desc}</div>
          <div style={{ fontSize: 7, color: lvl >= 25 ? "#f0c040" : "#5a4a2a",
            fontFamily: "'Cinzel',serif", letterSpacing: ".08em", marginBottom: 4 }}>
            ⭐ LV25 BONUS{lvl >= 25 ? " — ACTIVE" : ` — unlocks at Lv25`}
          </div>
          <div style={{ fontSize: 9, fontFamily: "'Crimson Pro',serif",
            color: lvl >= 25 ? "#c0a070" : "#3a3020", lineHeight: 1.5 }}>{cls.bonus}</div>
        </div>
      )}

      {/* ── March status ── */}
      {cmd.march && (() => {
        const eta = Math.ceil((cmd.march.path.length - cmd.march.step - 1) * cmd.march.stepMs / 1000);
        const atk = cmd.march.type === "attack";
        return (
          <div style={{
            margin: "10px 18px 0", padding: "8px 12px", flexShrink: 0,
            background: atk ? "rgba(200,30,30,.08)" : "rgba(40,140,80,.08)",
            border: `1px solid ${atk ? "#cc303038" : "#3daa6038"}`, borderRadius: 5,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>{atk ? "⚔" : "🚶"}</span>
            <div>
              <div style={{ fontSize: 9, fontFamily: "'Cinzel',serif", fontWeight: 700,
                color: atk ? "#e06060" : "#60c880" }}>
                {atk ? "Attacking" : "Marching"} · ~{eta}s
              </div>
              <div style={{ fontSize: 7, color: "#3a3028", fontFamily: "'Cinzel',serif", marginTop: 1 }}>
                → {cmd.march.dest}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Gear slots ── */}
      {(() => {
        const SLOT_DEFS = { helmet:{n:"Helmet",icon:"⛑"}, armor:{n:"Armor",icon:"🛡"}, bracers:{n:"Bracers",icon:"🥊"}, accessory:{n:"Accessory",icon:"💍"} };
        const hasAnyGear = ["helmet","armor","bracers","accessory"].some(s => cmd.gear?.[s]);
        const handleUnequipAll = () => {
          if (setGearInventory) setGearInventory(prev => prev.map(g => g.equippedBy === cmd.uid ? { ...g, equippedBy: null } : g));
          if (setCmds) setCmds(prev => prev.map(c => c.uid === cmd.uid ? { ...c, gear: { helmet:null, armor:null, bracers:null, accessory:null } } : c));
        };
        return (
          <div style={{ margin: "0 18px 4px", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 7, color: "#3a3020", fontFamily: "'Cinzel',serif", letterSpacing: ".08em" }}>GEAR</div>
              {hasAnyGear && (
                <button onClick={handleUnequipAll} style={{
                  padding: "2px 8px", borderRadius: 3,
                  background: "rgba(180,60,60,.1)", border: "1px solid rgba(180,60,60,.3)",
                  color: "#aa5050", fontFamily: "'Cinzel',serif", fontSize: 7, cursor: "pointer",
                }}>Unequip All</button>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 }}>
              {["helmet","armor","bracers","accessory"].map(slotKey => {
                const equippedId = cmd.gear?.[slotKey];
                const piece = equippedId ? (gearInventory ?? []).find(g => g.instanceId === equippedId) : null;
                const slotDef = SLOT_DEFS[slotKey];
                const rc = piece ? (GEAR_RARITY_COLORS[piece.rarity] ?? "#888") : null;
                return (
                  <div key={slotKey} style={{
                    padding: "12px 6px", textAlign: "center",
                    background: piece ? `${rc}10` : "rgba(255,255,255,.015)",
                    border: `1px solid ${piece ? rc + "40" : "#1e1810"}`,
                    borderRadius: 5, transition: "all .15s",
                    boxShadow: piece ? `0 0 6px ${rc}20` : "none",
                  }}>
                    <div style={{ fontSize: piece ? 26 : 20, marginBottom: 5, opacity: piece ? 1 : 0.3 }}>
                      {piece ? piece.icon : slotDef.icon}
                    </div>
                    <div style={{ fontSize: 7, fontFamily: "'Cinzel',serif",
                      color: piece ? rc : "#2a2010",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {piece ? piece.n.split(" ")[0] : slotDef.n}
                    </div>
                    {piece && (
                      <div style={{ display: "flex", justifyContent: "center", gap: 1, marginTop: 2 }}>
                        {Array.from({length:5}).map((_,i)=>(
                          <span key={i} style={{fontSize:5,color:i<(piece.stars??0)?"#aaa":"#222"}}>★</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Skill Trees button (the main CTA) ── */}
      <div style={{ padding: "12px 18px", flexShrink: 0 }}>
        <button onClick={() => setShowSkills(true)} style={{
          width: "100%", padding: "13px 0",
          background: `linear-gradient(135deg, ${r.color}18, rgba(0,0,0,.4))`,
          border: `1px solid ${r.color}48`,
          borderRadius: 6, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          boxShadow: `0 0 16px ${r.color}12, inset 0 1px 0 rgba(255,255,255,.04)`,
          transition: "all .15s", position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: `linear-gradient(90deg,transparent,${r.color}55,transparent)`,
          }} />
          <span style={{ fontSize: 20 }}>✦</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, fontWeight: 700,
              color: r.color, letterSpacing: ".06em" }}>SKILL TREES</div>
            <div style={{ fontSize: 8, color: "#4a3a28", fontFamily: "'Cinzel',serif", marginTop: 2 }}>
              {(cmd.unspentSkillPoints ?? 0) > 0
                ? `${cmd.unspentSkillPoints} point${cmd.unspentSkillPoints !== 1 ? "s" : ""} to spend`
                : "View & assign skill points"}
            </div>
          </div>
          {(cmd.unspentSkillPoints ?? 0) > 0 && (
            <div style={{
              marginLeft: "auto",
              width: 22, height: 22, borderRadius: "50%",
              background: "linear-gradient(135deg,#dd3030,#991010)",
              fontSize: 10, color: "#fff", fontFamily: "'Cinzel',serif", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{cmd.unspentSkillPoints}</div>
          )}
        </button>
      </div>
    </>
  );
}

// ── Main screen export ────────────────────────────────────────────────────────
// ── Filter/sort chip ──────────────────────────────────────────────────────────
function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "3px 9px", borderRadius: 12,
      background: active ? "rgba(240,192,64,.15)" : "rgba(255,255,255,.03)",
      border: `1px solid ${active ? "rgba(240,192,64,.45)" : "#1e1810"}`,
      color: active ? "#f0c040" : "#4a3a28",
      fontFamily: "'Cinzel',serif", fontSize: 7, cursor: "pointer",
      letterSpacing: ".04em", whiteSpace: "nowrap",
      transition: "all .15s",
    }}>{label}</button>
  );
}

export default function CommanderScreen({ cmds, bldgs, gearInventory, setGearInventory, respectSchematics, setCmds, onSchematicUsed, onClose, initialUid, gems, setGems }) {
  // ── Filter / sort state ──
  const [filterClass,     setFilterClass]     = useState(null); // "leader"|"attacker"|"support"|"defender"|null
  const [filterAlignment, setFilterAlignment] = useState(null); // "humans"|"creatures"|null
  const [sortBy,          setSortBy]          = useState("rarity"); // "rarity"|"level"|"respect"

  const allPlayer = cmds.filter(c => c.owner === "player");

  const filtered = allPlayer.filter(c => {
    if (filterClass && c.cls !== filterClass) return false;
    if (filterAlignment) {
      const aln = ALIGNMENT[filterAlignment];
      if (!aln?.factions.includes(c.faction)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === "rarity")  return (RARITY_ORDER[a.rarity] ?? 3) - (RARITY_ORDER[b.rarity] ?? 3);
    if (sortBy === "level")   return (b.lvl ?? 5) - (a.lvl ?? 5);
    if (sortBy === "respect") return (b.respectLevel ?? 0) - (a.respectLevel ?? 0);
    return 0;
  });

  const [selectedUid, setSelectedUid] = useState(initialUid ?? filtered[0]?.uid ?? null);
  const selectedCmd = filtered.find(c => c.uid === selectedUid) ?? filtered[0] ?? null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 700,
      background: "#080704",
      display: "flex", flexDirection: "column",
    }}>
      <style>{CSS}</style>

      {/* ── Top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        background: "linear-gradient(180deg,rgba(20,15,5,1),rgba(10,8,3,.97))",
        borderBottom: "1px solid #2a1e08",
        flexShrink: 0, position: "relative",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg,transparent,#8a6020 20%,#f0c04066 50%,#8a6020 80%,transparent)",
        }} />

        <button onClick={onClose} style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "rgba(255,255,255,.04)", border: "1px solid #2e2010",
          color: "#8a7050", fontSize: 18, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>←</button>

        <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 13,
          background: "linear-gradient(135deg,#f0c040,#c8902888)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: ".04em" }}>Commander</div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3daa60",
            boxShadow: "0 0 6px #3daa60" }} />
          <span style={{ fontFamily: "'Cinzel',serif", fontSize: 9, color: "#3a4a3a" }}>
            {filtered.length}/{allPlayer.length}
          </span>
        </div>
      </div>

      {/* ── Filter / sort bar ── */}
      <div style={{
        padding: "8px 10px",
        borderBottom: "1px solid #161208",
        background: "rgba(0,0,0,.25)",
        display: "flex", flexDirection: "column", gap: 6, flexShrink: 0,
      }}>
        {/* Alignment + class filters */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 7, color: "#3a2e18", fontFamily: "'Cinzel',serif",
            letterSpacing: ".06em", flexShrink: 0 }}>FILTER</span>
          <Chip label="All" active={!filterAlignment && !filterClass}
            onClick={() => { setFilterAlignment(null); setFilterClass(null); }} />
          {Object.entries(ALIGNMENT).map(([key, aln]) => (
            <Chip key={key} label={`${aln.icon} ${aln.n}`}
              active={filterAlignment === key}
              onClick={() => setFilterAlignment(filterAlignment === key ? null : key)} />
          ))}
          {Object.entries(CLASS).map(([key, cls]) => (
            <Chip key={key} label={`${cls.icon} ${cls.n}`}
              active={filterClass === key}
              onClick={() => setFilterClass(filterClass === key ? null : key)} />
          ))}
        </div>
        {/* Sort */}
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <span style={{ fontSize: 7, color: "#3a2e18", fontFamily: "'Cinzel',serif",
            letterSpacing: ".06em", flexShrink: 0 }}>SORT</span>
          {[["rarity","⭐ Rarity"],["level","Lv Level"],["respect","R Respect"]].map(([key,label]) => (
            <Chip key={key} label={label} active={sortBy === key}
              onClick={() => setSortBy(key)} />
          ))}
        </div>
      </div>

      {/* ── Body: portrait list + detail ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left — portrait roster */}
        <div style={{
          width: 76, flexShrink: 0,
          overflowY: "auto", overflowX: "hidden",
          borderRight: "1px solid #1e1508",
          background: "rgba(0,0,0,.3)",
          scrollbarWidth: "none",
          display: "flex", flexDirection: "column",
          paddingTop: 6, paddingBottom: 12,
        }}>
          {filtered.map(cmd => (
            <RosterPortrait
              key={cmd.uid}
              cmd={cmd}
              selected={cmd.uid === selectedUid}
              onClick={() => setSelectedUid(cmd.uid)}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "20px 8px", textAlign: "center", color: "#2a2010",
              fontFamily: "'Cinzel',serif", fontSize: 8, fontStyle: "italic" }}>
              No matches
            </div>
          )}
        </div>

        {/* Right — detail panel */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column",
          minWidth: 0, position: "relative" }}>
          {selectedCmd
            ? <CommanderDetail cmd={selectedCmd} bldgs={bldgs} gearInventory={gearInventory} setGearInventory={setGearInventory} respectSchematics={respectSchematics} setCmds={setCmds} onSchematicUsed={onSchematicUsed} gems={gems} setGems={setGems} />
            : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                color: "#2a2020", fontFamily: "'Cinzel',serif", fontSize: 11, fontStyle: "italic" }}>
                Select a commander
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}
