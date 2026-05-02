import { FAC } from "../../constants/factions.js";
import { HQP, AI_HQ_KEY } from "../../constants/map.js";
import { HDEFS } from "../../constants/heroes.js";
import { barracksCapacity } from "../../constants/buildings.js";
import { genMap } from "../../utils/mapGen.js";

export default function WinScreen({ winner, aiFaction, setWinner, setTiles, setCmds, setMode, setSelKey, setUpgQueue, setBldgs, setBarracks, setAiRss, setAiBldgs, setAiBarracksPool, aiLastActionRef, setScreen }) {
  const isVictory = winner === "player";
  const aiName = aiFaction ? (FAC[aiFaction]?.n || aiFaction) : "Enemy";

  return (
    <div style={{position:"fixed",inset:0,zIndex:10000,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:24}}>
      <div style={{fontSize:72}}>{isVictory ? "🏆" : "💀"}</div>
      <h2 style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"clamp(20px,6vw,44px)",fontWeight:900,
        background:isVictory?"linear-gradient(135deg,#f0c040,#e67e22,#f0c040)":"linear-gradient(135deg,#cc3030,#881010,#cc3030)",
        backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
        animation:"shimmer 2s linear infinite",textAlign:"center"}}>
        {isVictory ? "VICTORY! THE HOLY GRAIL IS YOURS!" : `DEFEAT — ${aiName} claims the Holy Grail`}
      </h2>
      <p style={{fontFamily:"'Crimson Pro',serif",fontStyle:"italic",color:"#7a6a5a",fontSize:13,textAlign:"center",maxWidth:360}}>
        {isVictory
          ? "Your alliance stands victorious. The age of conquest is complete."
          : `The ${aiName} army has seized the Holy Grail. Rally your forces and try again.`}
      </p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
        <button className="btn" onClick={() => {
          setWinner(null);
          setTiles(genMap());
          setCmds(p => {
            const playerCmds = p.filter(c => c.owner==="player").map(c => ({...c, tk:`${HQP.player.c},${HQP.player.r}`, march:null, troops:0}));
            const aiStarters = aiFaction ? HDEFS.filter(h => h.faction === aiFaction) : [];
            const aiCmds = aiStarters.map((h,i) => ({...h, uid:`ai${i}`, owner:"ai", troops:0, troopType:null, tk:AI_HQ_KEY, lvl:5, xp:0}));
            return [...playerCmds, ...aiCmds];
          });
          setMode("view"); setSelKey(null);
          setUpgQueue({});
          setBldgs({hq:1,quarry:0,lumber:0,forge:0,refinery:0,barracks:0,training:0,commandcenter:0,healingtent:0,walls:0,academy:0});
          setBarracks(barracksCapacity(0));
          setAiRss({stone:300,wood:300,ore:300,gas:300});
          setAiBldgs({hq:1,quarry:0,lumber:0,forge:0,refinery:0,barracks:0,training:0,commandcenter:0,healingtent:0,walls:0,academy:0});
          setAiBarracksPool(barracksCapacity(0));
          aiLastActionRef.current = 0;
        }}
          style={{padding:"12px 28px",background:"linear-gradient(135deg,#7a1010,#c03030)",border:"1px solid #e04040",color:"#f0c040",fontSize:13,fontWeight:700}}>
          ⚔ Play Again
        </button>
        <button className="btn" onClick={() => setScreen("title")}
          style={{padding:"12px 28px",background:"rgba(255,255,255,.04)",border:"1px solid #333",color:"#aaa",fontSize:13}}>
          ← Main Menu
        </button>
      </div>
    </div>
  );
}
