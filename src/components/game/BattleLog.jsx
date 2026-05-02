import { useState } from "react";

export default function BattleLog({ battles, bLog, onClose, unseenBattles }) {
  const [view, setView] = useState("simple");
  const [selected, setSelected] = useState(0);

  return (
    <div style={{position:"fixed",top:46,right:52,width:300,maxHeight:"60vh",zIndex:300,background:"rgba(5,7,11,.97)",border:"1px solid #221e12",borderRadius:6,display:"flex",flexDirection:"column",boxShadow:"0 4px 24px rgba(0,0,0,.8)"}}>
      <div style={{padding:"8px 12px",borderBottom:"1px solid #221e12",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <span style={{fontFamily:"'Cinzel',serif",fontSize:10,color:"#c8a060",fontWeight:700}}>⚔ BATTLE REPORTS ({battles.length})</span>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          {["simple","detailed"].map(v => (
            <button key={v} className="btn" onClick={() => setView(v)}
              style={{padding:"2px 6px",fontSize:7,background:view===v?"rgba(240,192,64,.15)":"transparent",border:`1px solid ${view===v?"#f0c040":"#2a2010"}`,color:view===v?"#f0c040":"#6a5a4a"}}>
              {v}
            </button>
          ))}
          <button className="btn" onClick={onClose}
            style={{padding:"2px 8px",fontSize:9,background:"transparent",border:"1px solid #2a2010",color:"#5a4a3a",marginLeft:2}}>✕</button>
        </div>
      </div>

      <div className="scr" style={{flex:1,overflowY:"auto",padding:8}}>
        {view === "simple" ? (
          bLog.length === 0
            ? <div style={{fontSize:9,color:"#3a3040",padding:8,fontStyle:"italic",fontFamily:"'Crimson Pro',serif"}}>No battles yet.</div>
            : bLog.map((l,i) => (
              <div key={i} style={{fontSize:8,color:i===0?"#c0a880":"#5a4a3a",fontFamily:"'Crimson Pro',serif",marginBottom:4,lineHeight:1.5,borderBottom:"1px solid #1a1810",paddingBottom:4}}>{l}</div>
            ))
        ) : (
          battles.length === 0
            ? <div style={{fontSize:9,color:"#3a3040",padding:8,fontStyle:"italic",fontFamily:"'Crimson Pro',serif"}}>No battles yet.</div>
            : <>
              <div style={{display:"flex",gap:3,marginBottom:8,flexWrap:"wrap"}}>
                {battles.map((b,i) => (
                  <button key={i} className="btn" onClick={() => setSelected(i)}
                    style={{padding:"2px 6px",fontSize:7,background:i===selected?"rgba(240,192,64,.15)":"transparent",border:`1px solid ${i===selected?"#f0c040":"#2a2010"}`,color:i===selected?"#f0c040":"#5a4a3a"}}>
                    {b.won?"✅":"❌"}{i+1}
                  </button>
                ))}
              </div>
              {battles[selected] && (() => {
                const b = battles[selected];
                return (
                  <div>
                    <div style={{fontSize:9,color:"#c8a060",fontFamily:"'Cinzel',serif",marginBottom:3}}>{b.atkIcon} {b.atkName} Lv{b.atkLvl} vs {b.defCmdIcon} {b.defCmdName}</div>
                    <div style={{fontSize:8,color:"#6a5a4a",marginBottom:3}}>{b.modLabel} · {b.terrain} · <span style={{color:b.won?"#3daa60":"#cc3030"}}>{b.won?"⚔ VICTORY":"💀 DEFEAT"}</span>{b.won?` · +${b.xpGain}XP`:""}</div>
                    <div style={{fontSize:8,color:"#5a5060",marginBottom:8}}>Troops: {b.atkTroopsStart.toLocaleString()} → {b.atkTroopsEnd.toLocaleString()} (lost {(b.atkTroopsStart-b.atkTroopsEnd).toLocaleString()})</div>
                    {b.rounds.map((rd,ri) => (
                      <div key={ri} style={{marginBottom:5}}>
                        <div style={{fontSize:7,color:"#4a3a2a",borderBottom:"1px solid #1a1810",marginBottom:2,paddingBottom:1,fontFamily:"'Cinzel',serif"}}>Round {rd.round}</div>
                        {rd.actions.map((a,ai) => (
                          <div key={ai} style={{fontSize:7,lineHeight:1.5,color:a.isSkill?"#d0a860":a.isPlayer===false?"#cc6060":a.isPlayer===true?"#60a0cc":"#6a6a7a"}}>
                            {a.action}{a.dmg>0?` [${a.dmg}]`:""}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
        )}
      </div>
    </div>
  );
}
