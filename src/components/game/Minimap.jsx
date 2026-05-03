import { COLS, ROWS, TW, TH } from "../../constants/geometry.js";
import { WIN_C, WIN_R } from "../../constants/map.js";

export default function Minimap({ tiles, cmds, panSt }) {
  return (
    <div style={{position:"fixed",bottom:8,right:8,zIndex:180,width:96,height:74,background:"rgba(4,6,10,.92)",border:"1px solid #221e12",borderRadius:4,overflow:"hidden"}}>
      <svg width="96" height="74" viewBox={`0 0 ${COLS} ${ROWS}`} style={{display:"block"}}>
        {Object.values(tiles).map(t => {
          const fill = t.isWin && !t.owner ? "#f0c040"
            : t.owner==="player" ? "#3daa60"
            : t.owner==="ai" ? "#c83222"
            : "#2a2d35";
          return <rect key={t.k} x={t.c} y={t.r} width={1} height={1} fill={fill} opacity={t.owner||t.isWin?1:0.35}/>;
        })}
        <rect x={WIN_C-.3} y={WIN_R-.3} width={1.6} height={1.6} fill="none" stroke="#f0c040" strokeWidth=".4"/>
        {cmds.filter(c => c.owner==="player").map(cmd => {
          if (!cmd.tk) return null;
          const [tc,tr] = cmd.tk.split(",").map(Number);
          return <rect key={cmd.uid} x={tc-.4} y={tr-.4} width={1.2} height={1.2} fill="#f0e030" opacity={.95}/>;
        })}
        <rect
          x={Math.max(0, -panSt.x/TW)} y={Math.max(0, -panSt.y/(TH/2))}
          width={Math.min(COLS, window.innerWidth/TW)} height={Math.min(ROWS, (window.innerHeight-38)/(TH/2))}
          fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".4"/>
      </svg>
      <div style={{position:"absolute",bottom:1,left:2,fontSize:6,color:"#3a3040",fontFamily:"'Cinzel',serif"}}>MINIMAP</div>
    </div>
  );
}
