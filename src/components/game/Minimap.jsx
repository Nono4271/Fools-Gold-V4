import { COLS, ROWS, TW, TH } from "../../constants/geometry.js";
import { REGION_LIST } from "../../constants/regions.js";

export default function Minimap({ tiles, cmds, panSt }) {
  // Only render tiles that are owned or are keeps — skipping neutral tiles
  // massively reduces SVG element count (490k → typically <200 at game start)
  const notableTiles = Object.values(tiles).filter(t =>
    !t.isShore && (t.owner || t.isKeep || t.isHQ || t.isWin)
  );

  return (
    <div style={{
      position:"fixed", top:52, left:8, zIndex:180,
      width:96, height:96,
      background:"rgba(4,6,10,.92)",
      border:"1px solid #221e12",
      borderRadius:4, overflow:"hidden",
    }}>
      <svg width="96" height="96" viewBox={`0 0 ${COLS} ${ROWS}`} style={{display:"block"}}>
        {/* Dark base */}
        <rect x={0} y={0} width={COLS} height={ROWS} fill="#0a0c10"/>
        {/* Region outlines — faint circles to show map structure */}
        {REGION_LIST.map(reg => (
          <circle key={reg.key} cx={reg.cx} cy={reg.cy} r={55}
            fill="none" stroke="#1a1a28" strokeWidth={1.5}/>
        ))}
        {/* Only owned tiles + keeps */}
        {notableTiles.map(t => {
          const fill = (t.isWin || t.isKeep) && !t.owner ? "#f0c040"
            : t.owner === "player" ? "#3daa60"
            : t.owner === "ai"    ? "#c83222"
            : "#f0c040";
          return <rect key={t.k} x={t.c} y={t.r} width={1} height={1} fill={fill}/>;
        })}
        {/* Keep markers always visible */}
        {REGION_LIST.map(reg => (
          <rect key={`keep_${reg.key}`} x={reg.cx-1} y={reg.cy-1} width={2} height={2}
            fill="none" stroke="#f0c040"
            strokeWidth={reg.layer === "ring" ? 0.8 : 0.5} opacity={0.7}/>
        ))}
        {/* Viewport rect */}
        <rect
          x={Math.max(0, -panSt.x / TW)}
          y={Math.max(0, -panSt.y / (TH / 2))}
          width={Math.min(COLS, window.innerWidth / TW)}
          height={Math.min(ROWS, (window.innerHeight - 52) / (TH / 2))}
          fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".4"/>
        {/* Player commanders */}
        {cmds.filter(c => c.owner === "player").map(cmd => {
          if (!cmd.tk) return null;
          const [tc, tr] = cmd.tk.split(",").map(Number);
          return <rect key={cmd.uid} x={tc - .5} y={tr - .5} width={1.5} height={1.5}
            fill="#f0e030" opacity={.95}/>;
        })}
      </svg>
      <div style={{position:"absolute",bottom:1,left:2,fontSize:6,color:"#3a3040",fontFamily:"'Cinzel',serif"}}>MAP</div>
    </div>
  );
}
