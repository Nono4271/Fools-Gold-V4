import { COLS, ROWS, TW, TH } from "../../constants/geometry.js";
import { WIN_C, WIN_R } from "../../constants/map.js";
import { REGION_LIST } from "../../constants/regions.js";

// HUD is ~50px tall (38px bar + a little padding); minimap sits just below it top-left.
export default function Minimap({ tiles, cmds, panSt }) {
  return (
    <div style={{
      position:"fixed", top:52, left:8, zIndex:180,
      width:96, height:96,
      background:"rgba(4,6,10,.92)",
      border:"1px solid #221e12",
      borderRadius:4, overflow:"hidden",
    }}>
      <svg width="96" height="96" viewBox={`0 0 ${COLS} ${ROWS}`} style={{display:"block"}}>
        {/* Region backgrounds — faint faction tints */}
        {REGION_LIST.map(reg => (
          <circle key={reg.key} cx={reg.cx} cy={reg.cy} r={60} fill="#1a1a24" opacity={0.4}/>
        ))}
        {/* Tiles */}
        {Object.values(tiles).map(t => {
          if (t.isShore) return null;
          const fill = (t.isWin || t.isKeep) && !t.owner ? "#f0c040"
            : t.owner==="player" ? "#3daa60"
            : t.owner==="ai"     ? "#c83222"
            : "#2a2d35";
          const op = (t.owner || t.isWin || t.isKeep) ? 1 : 0.2;
          return <rect key={t.k} x={t.c} y={t.r} width={1} height={1} fill={fill} opacity={op}/>;
        })}
        {/* Keep markers */}
        {REGION_LIST.map(reg => (
          <rect key={`keep_${reg.key}`} x={reg.cx-1} y={reg.cy-1} width={2} height={2}
            fill="none" stroke="#f0c040" strokeWidth={reg.layer==='ring'?0.8:0.5} opacity={0.7}/>
        ))}
        {/* Viewport rect */}
        <rect
          x={Math.max(0, -panSt.x/TW)} y={Math.max(0, -panSt.y/(TH/2))}
          width={Math.min(COLS, window.innerWidth/TW)} height={Math.min(ROWS, (window.innerHeight-52)/(TH/2))}
          fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".4"/>
        {/* Player commanders */}
        {cmds.filter(c => c.owner==="player").map(cmd => {
          if (!cmd.tk) return null;
          const [tc,tr] = cmd.tk.split(",").map(Number);
          return <rect key={cmd.uid} x={tc-.5} y={tr-.5} width={1.5} height={1.5} fill="#f0e030" opacity={.95}/>;
        })}
      </svg>
      <div style={{position:"absolute",bottom:1,left:2,fontSize:6,color:"#3a3040",fontFamily:"'Cinzel',serif"}}>MAP</div>
    </div>
  );
}
