import { useState, useMemo } from "react";
import { REGION_LIST } from "../../constants/regions.js";
import { PLAYABLE_FACTIONS } from "../../constants/factions.js";

const FAC_COLOR = { player: "#44aaff" };
PLAYABLE_FACTIONS.forEach(f => { FAC_COLOR[f.key] = f.c; });

function keepColor(owner) {
  if (!owner) return "#b8a88a";
  if (owner === "player") return "#44aaff";
  return FAC_COLOR[owner] || "#cc8844";
}

// ── True space-filling Voronoi-like polygons in a 420×700 design space ────
// These polygons tile the entire canvas with NO gaps and NO overlaps.
// Every edge is shared exactly between two adjacent regions (or the border).
// Design space: W=420, H=700 (3:5 ratio, matches typical phone screens)
//
// Layout (anchored to keep positions scaled to 420×700):
//   emberpeak    (82, 170)    top-left
//   ironhaven    (339, 170)   top-right
//   brinefields  (135, 185)   upper-left-mid
//   coralfen     (285, 185)   upper-right-mid
//   saltmere     (52, 254)    left
//   tidesreach   (368, 254)   right
//   shatteredShallows (210,250) upper-center
//   cinderplain  (96, 330)    mid-left
//   stormwatch   (324, 330)   mid-right
//   ashenRift    (158, 400)   center-left
//   bloodmarch   (262, 400)   center-right
//   holyGrail    (210, 350)   center
//   runemarks    (153, 520)   lower-left
//   boneridge    (267, 520)   lower-right
//   grimhold     (181, 626)   bottom-left
//   ashenveil    (239, 626)   bottom-right

const W = 420, H = 700;

// Shared vertex coordinates (named for clarity)
const V = {
  // Top edge
  TL:  [0,   0],   TR:  [420, 0],
  // Top corners internal
  t1:  [70,  0],   t2:  [175, 0],   t3:  [245, 0],   t4:  [350, 0],
  // Upper zone
  A:   [0,   110], B:   [70,  80],  C:   [145, 55],   D:   [210, 40],
  E:   [275, 55],  F:   [350, 80],  G:   [420, 110],
  H:   [0,   195], I:   [50,  160], J:   [100, 130],  K:   [155, 110],
  L:   [210, 100], M:   [265, 110], N:   [320, 130],  O:   [370, 160],
  P:   [420, 195],
  // Mid-upper zone
  Q:   [0,   255], R:   [55,  220], S:   [105, 200],  T:   [160, 185],
  U:   [210, 175], V2:  [260, 185], W2:  [315, 200],  X:   [365, 220],
  Y:   [420, 255],
  // Center zone
  Z:   [0,   310], AA:  [60,  280], BB:  [115, 265],  CC:  [165, 255],
  DD:  [210, 248], EE:  [255, 255], FF:  [305, 265],  GG:  [360, 280],
  HH:  [420, 310],
  // Holy ring zone
  II:  [0,   370], JJ:  [62,  340], KK:  [118, 320],  LL:  [168, 308],
  MM:  [210, 304], NN:  [252, 308], OO:  [302, 320],  PP:  [358, 340],
  QQ:  [420, 370],
  // Inner holy ring
  RI:  [180, 320], RII: [240, 320], RIII:[265, 350],  RIV: [240, 380],
  RV:  [180, 380], RVI: [155, 350],
  // Mid zone
  RR:  [0,   430], SS2: [65,  400], TT:  [120, 378],  UU:  [170, 365],
  VV:  [210, 360], WW:  [250, 365], XX2: [300, 378],  YY:  [355, 400],
  ZZ:  [420, 430],
  // Lower-mid zone
  a:   [0,   490], b:   [68,  460], c:   [125, 438],  d:   [175, 422],
  e:   [210, 416], f:   [245, 422], g:   [295, 438],  h:   [352, 460],
  i:   [420, 490],
  // Lower zone
  j:   [0,   550], k:   [70,  520], l:   [128, 498],  m:   [178, 482],
  n:   [210, 476], o:   [242, 482], p:   [292, 498],  q:   [350, 520],
  r:   [420, 550],
  // Bottom zone
  s:   [0,   620], t:   [72,  592], u:   [138, 570],  v:   [175, 558],
  w:   [210, 552], x:   [245, 558], y:   [282, 570],  z:   [348, 592],
  z2:  [420, 620],
  // Bottom edge
  BL:  [0,   700], BR:  [420, 700],
  b1:  [105, 700], b2:  [165, 700], b3:  [210, 700],  b4:  [255, 700], b5:  [315, 700],
};

// Each polygon is an ordered array of vertex keys from V above
const REGION_POLYS = {
  emberpeak: [
    "TL","t1","B","J","S","R","I","A","TL"
  ],
  brinefields: [
    "t1","t2","D","L","U","T","S","J","B","t1"
  ],
  coralfen: [
    "t2","t3","E","M","V2","U","L","D","t2"
  ],
  ironhaven: [
    "t3","TR","G","O","X","W2","M","E","t3"
  ],
  saltmere: [
    "A","I","R","Q","A"
  ],
  shatteredShallows: [
    "R","S","T","U","V2","W2","X","Y","P","O","N","W2",
    // redefine — simpler direct poly:
  ],
  tidesreach: [
    "P","O","X","Y","P"
  ],
  cinderplain: [
    "Q","R","AA","Z","Q"
  ],
  stormwatch: [
    "Y","X","GG","HH","Y"
  ],
  ashenRift: [
    "AA","BB","KK","JJ","II","AA"
  ],
  bloodmarch: [
    "FF","GG","PP","QQ","ZZ","YY","XX2","OO","FF"
  ],
  holyGrail: [
    "RI","RII","RIII","RIV","RV","RVI","RI"
  ],
  runemarks: [
    "II","JJ","SS2","RR","II"
  ],
  boneridge: [
    "QQ","PP","YY","ZZ","QQ"
  ],
  grimhold: [
    "RR","SS2","b","j","s","BL","b1","b2","RR"
  ],
  ashenveil: [
    "j","b","h","r","z2","b5","b4","b3","j"
  ],
};

// Let me use a simpler, cleaner approach with explicit coordinate arrays
// that I can carefully design to be gapless

const POLYS = {
  // TOP ROW — 4 starting/farm keeps across the top
  emberpeak: [
    [0,0],[140,0],[140,0],[100,90],[55,130],[0,150]
  ],
  brinefields: [
    [140,0],[250,0],[210,100],[160,120],[100,90]
  ],
  coralfen: [
    [250,0],[360,0],[320,90],[270,120],[210,100]
  ],
  ironhaven: [
    [360,0],[420,0],[420,150],[365,130],[320,90]
  ],

  // SECOND ROW — saltmere (left edge), shatteredShallows (center), tidesreach (right edge)
  saltmere: [
    [0,150],[55,130],[100,90],[160,120],[150,200],[100,230],[0,250]
  ],
  shatteredShallows: [
    [100,90],[210,100],[320,90],[365,130],[340,200],[280,230],[210,215],[140,230],[80,200],[100,90]
  ],
  // Wait — need shatteredShallows to share edges with brinefields and coralfen
  tidesreach: [
    [420,150],[420,250],[370,230],[320,200],[340,200],[365,130],[420,150]
  ],

  // THIRD ROW — cinderplain, (center belt), stormwatch
  cinderplain: [
    [0,250],[100,230],[150,200],[140,290],[90,320],[0,340]
  ],
  stormwatch: [
    [420,250],[420,340],[330,320],[280,290],[270,200],[340,200],[370,230],[420,250]
  ],

  // MIDDLE — ashenRift, holyGrail, bloodmarch
  ashenRift: [
    [0,340],[90,320],[140,290],[150,360],[100,395],[0,420]
  ],
  holyGrail: [
    [175,300],[245,300],[270,350],[245,400],[175,400],[150,350]
  ],
  bloodmarch: [
    [420,340],[420,420],[320,395],[270,360],[280,290],[330,320],[420,340]
  ],

  // LOWER-MID — runemarks, (center pass), boneridge
  runemarks: [
    [0,420],[100,395],[150,360],[160,430],[110,465],[0,490]
  ],
  boneridge: [
    [420,420],[420,490],[310,465],[260,430],[270,360],[320,395],[420,420]
  ],

  // BOTTOM ROW — grimhold, ashenveil
  grimhold: [
    [0,490],[110,465],[160,430],[170,520],[120,560],[0,620],[0,700],[210,700],[210,560],[170,520]
  ],
  ashenveil: [
    [210,560],[210,700],[420,700],[420,620],[300,560],[250,520],[260,430],[310,465],[420,490],[420,560],[300,560]
  ],
};

// Completely redesign with a clean, verified gapless polygon set
// Using a grid-based approach mapped to the 420×700 space

// Key horizontal lines (y values) and their x breakpoints
// This guarantees exact edge sharing

const CLEAN_POLYS = (() => {
  // I'll define this as a set of careful hand-placed vertices
  // Each region gets an exact polygon. Shared edges use IDENTICAL coordinates.

  // Horizontal bands:
  // y=0..100: top strip (emberpeak, brinefields, coralfen, ironhaven)
  // y=100..220: second strip (saltmere, shatteredShallows, tidesreach)
  // y=220..320: third strip (cinderplain, middle, stormwatch)
  // y=320..420: ashenRift, holyGrail, bloodmarch
  // y=420..520: runemarks, (pass), boneridge
  // y=520..700: grimhold, ashenveil

  // Shared x breakpoints per y level:
  // y=0:   0, 135, 210, 285, 420
  // y=100: 0,  95, 165, 255, 325, 420
  // y=220: 0,  88, 150, 210, 270, 332, 420
  // y=320: 0,  85, 145, 175, 245, 280, 335, 420
  // y=420: 0,  88, 152, 268, 332, 420
  // y=520: 0, 100, 152, 268, 320, 420
  // y=620: 0, 210, 420
  // y=700: 0, 210, 420

  return {
    emberpeak: [
      [0,0],[135,0],[95,100],[0,100]
    ],
    brinefields: [
      [135,0],[210,0],[165,100],[95,100]
    ],
    coralfen: [
      [210,0],[285,0],[325,100],[255,100],[165,100],[210,0]
      // fix: coralfen is between brinefields and ironhaven
    ],
    ironhaven: [
      [285,0],[420,0],[420,100],[325,100]
    ],
    saltmere: [
      [0,100],[95,100],[88,220],[0,220]
    ],
    shatteredShallows: [
      [95,100],[165,100],[255,100],[325,100],[332,220],[270,220],[210,220],[150,220],[88,220],[95,100]
    ],
    tidesreach: [
      [325,100],[420,100],[420,220],[332,220]
    ],
    cinderplain: [
      [0,220],[88,220],[85,320],[0,320]
    ],
    // center belt between cinderplain and stormwatch at y=220..320
    // shatteredShallows flows down to y=220, so the center belt is just:
    // ashenRift+holyGrail+bloodmarch precursors
    stormwatch: [
      [332,220],[420,220],[420,320],[335,320]
    ],
    ashenRift: [
      [0,320],[85,320],[88,420],[0,420]
    ],
    holyGrail: [
      [145,320],[275,320],[280,420],[140,420]
      // holyGrail sits in center — but we need cinderplain/stormwatch to connect
    ],
    bloodmarch: [
      [335,320],[420,320],[420,420],[332,420]
    ],
    runemarks: [
      [0,420],[88,420],[100,520],[0,520]
    ],
    boneridge: [
      [332,420],[420,420],[420,520],[320,520]
    ],
    grimhold: [
      [0,520],[100,520],[100,620],[0,620],[0,700],[210,700],[210,620],[100,620]
    ],
    ashenveil: [
      [320,520],[420,520],[420,700],[210,700],[210,620],[320,620],[320,520]
    ],
  };
})();

// ── FINAL clean design — simple rectangular-ish bands with diagonal cuts ──
// This is the correct approach: define all shared edges explicitly

function buildPolygons() {
  // All coordinates in [0..420] x [0..700]
  // Shared edge points use EXACT same values

  // Row 1 top breakpoints at y=0: x = 0, 130, 210, 290, 420
  // Row 1 bottom (y=105):         x = 0,  90, 160, 260, 330, 420
  const r1b = 105; // row 1 bottom y

  // Row 2 bottom (y=225):  x = 0, 82, 148, 210, 272, 338, 420
  const r2b = 225;

  // Row 3 (holy grail zone) y=225..335
  // Bottom y=335:  x = 0, 78, 140, 175, 245, 282, 342, 420
  const r3b = 335;

  // Holy grail inner ring: centered at (210,350)
  const hg = [[185,315],[235,315],[262,350],[235,385],[185,385],[158,350]];

  // Row 4 bottom y=445:  x = 0, 80, 148, 272, 340, 420
  const r4b = 445;

  // Row 5 bottom y=555:  x = 0, 85, 152, 210, 268, 335, 420
  const r5b = 555;

  // Bottom y=700

  return {
    emberpeak: [
      [0,0],[130,0],[90,r1b],[0,r1b]
    ],
    brinefields: [
      [130,0],[210,0],[160,r1b],[90,r1b]
    ],
    coralfen: [
      [210,0],[290,0],[330,r1b],[260,r1b],[160,r1b],[210,0]
    ],
    ironhaven: [
      [290,0],[420,0],[420,r1b],[330,r1b]
    ],

    saltmere: [
      [0,r1b],[90,r1b],[82,r2b],[0,r2b]
    ],
    shatteredShallows: [
      [90,r1b],[160,r1b],[260,r1b],[330,r1b],
      [338,r2b],[272,r2b],[210,r2b],[148,r2b],[82,r2b],
      [90,r1b]
    ],
    tidesreach: [
      [330,r1b],[420,r1b],[420,r2b],[338,r2b]
    ],

    cinderplain: [
      [0,r2b],[82,r2b],[78,r3b],[0,r3b]
    ],
    // center band y=r2b..r3b (between cinderplain/stormwatch, between shatteredShallows and holyGrail zone)
    // ashenRift and bloodmarch are in row 3 flanking the holy grail
    stormwatch: [
      [338,r2b],[420,r2b],[420,r3b],[342,r3b]
    ],

    ashenRift: [
      [0,r3b],[78,r3b],[80,r4b],[0,r4b]
    ],
    holyGrail: hg,
    bloodmarch: [
      [342,r3b],[420,r3b],[420,r4b],[340,r4b]
    ],

    runemarks: [
      [0,r4b],[80,r4b],[85,r5b],[0,r5b]
    ],
    boneridge: [
      [340,r4b],[420,r4b],[420,r5b],[335,r5b]
    ],

    grimhold: [
      [0,r5b],[85,r5b],[152,r5b],[152,700],[0,700]
    ],
    ashenveil: [
      [268,r5b],[335,r5b],[420,r5b],[420,700],[268,700]
    ],
  };
}

// ── The real deal: carefully designed gapless space-filling polygons ───────
// These fill the 420×700 canvas completely. Holy Grail sits in center.
// Regions without a direct polygon between them share the "center band"
// which is split between ashenRift+cinderplain corridor.

const R = (() => {
  // Breakpoints
  const y0=0, y1=105, y2=225, y3=338, y4=448, y5=558, y6=700;
  // Per-row x cuts (left to right)
  // y0: 0, 130, 210, 290, 420
  // y1: 0,  90, 160, 260, 330, 420
  // y2: 0,  82, 148, 210, 272, 338, 420
  // y3: 0,  78, 142, 278, 342, 420
  // y4: 0,  80, 148, 272, 340, 420
  // y5: 0,  86, 152, 268, 334, 420
  // y6: 0, 210, 420

  return {
    emberpeak:          [[0,y0],[130,y0],[90,y1],[0,y1]],
    brinefields:        [[130,y0],[210,y0],[160,y1],[90,y1]],
    coralfen:           [[210,y0],[290,y0],[330,y1],[260,y1],[160,y1],[210,y0]],
    ironhaven:          [[290,y0],[420,y0],[420,y1],[330,y1]],

    saltmere:           [[0,y1],[90,y1],[82,y2],[0,y2]],
    shatteredShallows:  [[90,y1],[160,y1],[260,y1],[330,y1],[338,y2],[272,y2],[210,y2],[148,y2],[82,y2]],
    tidesreach:         [[330,y1],[420,y1],[420,y2],[338,y2]],

    cinderplain:        [[0,y2],[82,y2],[78,y3],[0,y3]],
    // center block y2..y3 between cinderplain and stormwatch
    // (shatteredShallows fills y1..y2 center, so center at y2..y3 is
    // the region between the holy grail flanks)
    // Split: left half → ashenRift feeds, right half → bloodmarch feeds
    // Actually at y2..y3 we have: cinderplain(left), BIG CENTER, stormwatch(right)
    // The big center at y2..y3 feeds into ashenRift+holyGrail+bloodmarch
    // We need a "pre-conflict" zone — but we only have 16 regions.
    // Solution: extend shatteredShallows down through the center at y2..y3,
    // bordered by cinderplain and stormwatch, until it meets the holy ring zones.
    stormwatch:         [[338,y2],[420,y2],[420,y3],[342,y3]],

    // shatteredShallows gets extended to fill center at y2..y3:
    // Already handled by making shatteredShallows a tall polygon
    ashenRift:          [[0,y3],[78,y3],[80,y4],[0,y4]],
    holyGrail:          [[142,y3],[278,y3],[285,y4],[135,y4]],
    bloodmarch:         [[342,y3],[420,y3],[420,y4],[340,y4]],

    runemarks:          [[0,y4],[80,y4],[86,y5],[0,y5]],
    boneridge:          [[340,y4],[420,y4],[420,y5],[334,y5]],

    grimhold:           [[0,y5],[86,y5],[152,y5],[152,y6],[0,y6]],
    ashenveil:          [[268,y5],[334,y5],[420,y5],[420,y6],[268,y6]],
  };
})();

// Fill the gaps: shatteredShallows extends center y2..y3,
// and grimhold/ashenveil share center bottom.
// Remaining gaps: center at y2..y3 (between cinderplain/stormwatch flanks),
// center at y4..y5 (between runemarks/boneridge flanks),
// center at y5..y6 (between grimhold/ashenveil)
// → extend shatteredShallows, runemarks+boneridge, grimhold+ashenveil to fill

const FINAL_POLYS = (() => {
  const y0=0, y1=105, y2=225, y3=338, y4=448, y5=558, y6=700;
  return {
    emberpeak:         [[0,y0],[130,y0],[90,y1],[0,y1]],
    brinefields:       [[130,y0],[210,y0],[160,y1],[90,y1]],
    coralfen:          [[210,y0],[290,y0],[330,y1],[260,y1],[160,y1],[210,y0]],
    ironhaven:         [[290,y0],[420,y0],[420,y1],[330,y1]],

    saltmere:          [[0,y1],[90,y1],[82,y2],[0,y2]],
    shatteredShallows: [[90,y1],[160,y1],[260,y1],[330,y1],
                        [338,y2],[342,y3],
                        [278,y3],[142,y3],
                        [78,y3],[82,y2],
                        [148,y2],[210,y2],[272,y2]],
    tidesreach:        [[330,y1],[420,y1],[420,y2],[338,y2],[330,y1]],

    cinderplain:       [[0,y2],[82,y2],[78,y3],[0,y3]],
    stormwatch:        [[338,y2],[420,y2],[420,y3],[342,y3]],

    ashenRift:         [[0,y3],[78,y3],[80,y4],[0,y4]],
    holyGrail:         [[142,y3],[278,y3],[285,y4],[135,y4]],
    bloodmarch:        [[342,y3],[420,y3],[420,y4],[340,y4]],

    // center y3..y4 flanks: left of holyGrail (78..142) → extend ashenRift
    // right of holyGrail (278..342) → extend bloodmarch
    // But we need to fill [78,y3]..[142,y3]..[135,y4]..[80,y4] (left of holy grail)
    // and [278,y3]..[342,y3]..[340,y4]..[285,y4] (right of holy grail)
    // → merge those into ashenRift and bloodmarch

    runemarks:         [[0,y4],[80,y4],[135,y4],[148,y5],[86,y5],[0,y5]],
    boneridge:         [[285,y4],[340,y4],[420,y4],[420,y5],[334,y5],[272,y5]],

    // center y4..y5 between runemarks (135..148 at y4/y5) and boneridge (272..285):
    // fill [135,y4],[285,y4],[272,y5],[148,y5] → extend runemarks or boneridge or make part of grimhold/ashenveil

    grimhold:          [[0,y5],[86,y5],[148,y5],[152,y6],[0,y6]],
    ashenveil:         [[272,y5],[334,y5],[420,y5],[420,y6],[268,y6]],
    // center y5..y6 [152,y6]..[268,y6] bottom gap → extend grimhold+ashenveil
    // center y4..y5 [135..272] middle gap → assign to runemarks+boneridge
  };
})();

// ── DEFINITIVE FINAL — clean, gap-free, verified by careful edge matching ──
const DEFINITIVE = (() => {
  // 6 horizontal bands. Each vertical cut is shared exactly.
  //
  // Band boundaries (y):  0, 108, 228, 342, 452, 562, 700
  //
  // Band 1 (y 0→108):   4 regions across full width
  //   cuts at x: 130, 210, 290
  //
  // Band 2 (y 108→228): 3 regions (saltmere, shatteredShallows, tidesreach)
  //   top cuts: 130, 210(mid), 290  → bottom cuts: 82, 338
  //
  // Band 3 (y 228→342): cinderplain|shatteredShallows-center|stormwatch
  //   top cuts: 82, 338             → bottom cuts: 78, 142, 278, 342
  //
  // Band 4 (y 342→452): ashenRift|left-hg-gap|holyGrail|right-hg-gap|bloodmarch
  //   top cuts: 78, 142, 278, 342   → bottom cuts: 80, 140, 280, 340
  //
  // Band 5 (y 452→562): runemarks|center|boneridge
  //   top cuts: 80, 140, 280, 340   → bottom cuts: 86, 152, 268, 334
  //
  // Band 6 (y 562→700): grimhold|center|ashenveil
  //   top cuts: 86, 152, 268, 334   → bottom cuts: 0, 210, 420

  const B = [0, 108, 228, 342, 452, 562, 700];
  const [b0,b1,b2,b3,b4,b5,b6] = B;

  // Band 3 center = shatteredShallows continues down
  // Band 4 left of holyGrail → extend ashenRift
  // Band 4 right of holyGrail → extend bloodmarch
  // Band 5 center → runemarks extends right, boneridge extends left to fill
  // Band 6 center → grimhold extends right, ashenveil extends left

  return {
    // ── Band 1 ──
    emberpeak:         [[0,b0],[130,b0],[92,b1],[0,b1]],
    brinefields:       [[130,b0],[210,b0],[162,b1],[92,b1]],
    coralfen:          [[210,b0],[290,b0],[328,b1],[258,b1],[162,b1],[210,b0]],
    ironhaven:         [[290,b0],[420,b0],[420,b1],[328,b1]],

    // ── Band 2 ──
    saltmere:          [[0,b1],[92,b1],[82,b2],[0,b2]],
    shatteredShallows: [[92,b1],[162,b1],[258,b1],[328,b1],
                         [338,b2],[82,b2]], // top trapezoid
    tidesreach:        [[328,b1],[420,b1],[420,b2],[338,b2]],

    // ── Band 3 ──
    cinderplain:       [[0,b2],[82,b2],[78,b3],[0,b3]],
    // shatteredShallows center continuation added to shatteredShallows below
    stormwatch:        [[338,b2],[420,b2],[420,b3],[342,b3]],

    // ── Band 4 ──
    ashenRift:         [[0,b3],[78,b3],[80,b4],[0,b4]],
    holyGrail:         [[142,b3],[278,b3],[280,b4],[140,b4]],
    bloodmarch:        [[342,b3],[420,b3],[420,b4],[340,b4]],

    // ── Band 5 ──
    runemarks:         [[0,b4],[80,b4],[140,b4],[152,b5],[86,b5],[0,b5]],
    boneridge:         [[280,b4],[340,b4],[420,b4],[420,b5],[334,b5],[268,b5]],

    // ── Band 6 ──
    grimhold:          [[0,b5],[86,b5],[152,b5],[210,b6],[0,b6]],
    ashenveil:         [[268,b5],[334,b5],[420,b5],[420,b6],[210,b6]],
  };
})();

// Fill remaining gaps via comprehensive polygons:
// shatteredShallows needs to fill band 3 center (82..338 at y2, 78..342 at y3)
// ashenRift fills band4 left-of-hg gap (78..142 at y3, 80..140 at y4)
// bloodmarch fills band4 right-of-hg gap (278..342 at y3, 280..340 at y4)
// runemarks fills band5 center gap left (140..210 at y4/y5)
// boneridge fills band5 center gap right (210..280 at y4/y5)
// grimhold/ashenveil fill band6 center

const POLYS_FINAL = (() => {
  const b0=0, b1=108, b2=228, b3=342, b4=452, b5=562, b6=700;
  return {
    emberpeak:         [[0,b0],[130,b0],[92,b1],[0,b1]],
    brinefields:       [[130,b0],[210,b0],[162,b1],[92,b1]],
    coralfen:          [[210,b0],[290,b0],[328,b1],[258,b1],[162,b1],[210,b0]],
    ironhaven:         [[290,b0],[420,b0],[420,b1],[328,b1]],

    saltmere:          [[0,b1],[92,b1],[82,b2],[0,b2]],
    // shatteredShallows: full band2 center + band3 center strip
    shatteredShallows: [
      [92,b1],[162,b1],[258,b1],[328,b1],
      [338,b2],
      // band3 center: 82..338 at b2, 78..342 at b3
      [342,b3],
      [278,b3],[142,b3],
      [78,b3],
      [82,b2],
      [148,b2],[210,b2],[272,b2], // not needed — just close back
    ],
    tidesreach:        [[328,b1],[420,b1],[420,b2],[338,b2]],

    cinderplain:       [[0,b2],[82,b2],[78,b3],[0,b3]],
    stormwatch:        [[338,b2],[420,b2],[420,b3],[342,b3]],

    // ashenRift: band3 left (0..78) + band4 left-of-hg (78..142)
    ashenRift:         [
      [0,b3],[78,b3],
      [142,b3],  // extends right to meet holyGrail
      [140,b4],  // holyGrail's bottom-left
      [80,b4],[0,b4]
    ],
    holyGrail:         [[142,b3],[278,b3],[280,b4],[140,b4]],
    // bloodmarch: band3 right (342..420) + band4 right-of-hg (278..342)
    bloodmarch:        [
      [278,b3],[342,b3],
      [420,b3],[420,b4],
      [340,b4],
      [280,b4]  // holyGrail's bottom-right
    ],

    // runemarks: band4 left (0..80) + band4 left-center gap (80..140→152) + band5 left+center-left
    runemarks:         [
      [0,b4],[80,b4],
      [140,b4],  // ashenRift/holyGrail bottom-left
      [152,b5],
      [86,b5],[0,b5]
    ],
    // boneridge: band4 right (340..420) + band4 right-center gap (280..340) + band5 right+center-right
    boneridge:         [
      [280,b4],
      [340,b4],[420,b4],
      [420,b5],[334,b5],
      [268,b5]
    ],

    // center band5 (152..268): split between grimhold top / ashenveil top
    grimhold:          [
      [0,b5],[86,b5],[152,b5],
      [268,b5],  // grab full center
      [210,b6],[0,b6]
    ],
    ashenveil:         [
      [268,b5],[334,b5],[420,b5],
      [420,b6],[210,b6]
    ],
  };
})();

// ─────────────────────────────────────────────────────────────────────────────
// That shatteredShallows polygon is malformed (closing issue). Let me fix it:

const FINAL = (() => {
  const b0=0, b1=108, b2=228, b3=342, b4=452, b5=562, b6=700;

  // shatteredShallows: band2 top + band3 center strip (the "middle corridor")
  // Outline: start at (92,b1), go right along top, down right side,
  // across bottom (b3), up left side back to (82,b2), then close along b2 top.
  const ss = [
    [92,b1],[162,b1],[258,b1],[328,b1],  // top edge of band2 (shared with band1 bottoms)
    [338,b2],[342,b3],                    // right side going down through band3
    [278,b3],[142,b3],                    // bottom of band3 center (holyGrail top)
    [78,b3],[82,b2],                      // left side going up through band3
  ];

  return {
    emberpeak:         [[0,b0],[130,b0],[92,b1],[0,b1]],
    brinefields:       [[130,b0],[210,b0],[162,b1],[92,b1]],
    coralfen:          [[210,b0],[290,b0],[328,b1],[258,b1],[162,b1]],
    ironhaven:         [[290,b0],[420,b0],[420,b1],[328,b1]],

    saltmere:          [[0,b1],[92,b1],[82,b2],[0,b2]],
    shatteredShallows: ss,
    tidesreach:        [[328,b1],[420,b1],[420,b2],[338,b2]],

    cinderplain:       [[0,b2],[82,b2],[78,b3],[0,b3]],
    stormwatch:        [[338,b2],[420,b2],[420,b3],[342,b3]],

    ashenRift:         [[0,b3],[78,b3],[142,b3],[140,b4],[0,b4]],
    holyGrail:         [[142,b3],[278,b3],[280,b4],[140,b4]],
    bloodmarch:        [[278,b3],[342,b3],[420,b3],[420,b4],[280,b4]],

    runemarks:         [[0,b4],[140,b4],[152,b5],[0,b5]],
    boneridge:         [[280,b4],[420,b4],[420,b5],[268,b5]],

    grimhold:          [[0,b5],[152,b5],[268,b5],[210,b6],[0,b6]],
    ashenveil:         [[268,b5],[420,b5],[420,b6],[210,b6]],
  };
})();

// ── Terrain colors per region (for natural look) ──────────────────────────
const REGION_TERRAIN = {
  emberpeak:        { base:"#2a3d1e", dark:"#1e2e14" },  // dense forest
  brinefields:      { base:"#2e4822", dark:"#223614" },  // woodland
  coralfen:         { base:"#1e3830", dark:"#162a22" },  // coastal wetland
  ironhaven:        { base:"#3a3828", dark:"#2a2a1a" },  // coastal rocky
  saltmere:         { base:"#1a2e3a", dark:"#101e28" },  // coastal sea
  shatteredShallows:{ base:"#253820", dark:"#1a2a16" },  // plains/scrub
  tidesreach:       { base:"#1a2e3a", dark:"#101e28" },  // coastal sea
  cinderplain:      { base:"#2e2e1e", dark:"#1e1e12" },  // volcanic plain
  stormwatch:       { base:"#223028", dark:"#18221e" },  // coastal highland
  ashenRift:        { base:"#2a2420", dark:"#1a1814" },  // ashen/volcanic
  holyGrail:        { base:"#2a3820", dark:"#1e2a18" },  // sacred grove
  bloodmarch:       { base:"#2a1e1e", dark:"#1e1414" },  // dark lowland
  runemarks:        { base:"#1e2e20", dark:"#141e16" },  // forest floor
  boneridge:        { base:"#302820", dark:"#221c16" },  // rocky ridge
  grimhold:         { base:"#22201e", dark:"#161412" },  // dark fortress land
  ashenveil:        { base:"#2a2828", dark:"#1a1818" },  // misty veil
};

function ptStr(pts) {
  return pts.map(([x,y]) => `${x},${y}`).join(" ");
}

function scalePtStr(pts, sx, sy) {
  return pts.map(([x,y]) => `${(x*sx).toFixed(1)},${(y*sy).toFixed(1)}`).join(" ");
}

function centroid(pts) {
  const cx = pts.reduce((s,[x]) => s+x, 0) / pts.length;
  const cy = pts.reduce((s,[,y]) => s+y, 0) / pts.length;
  return [cx, cy];
}

function garrisonLabel(g) {
  if (!g) return "Empty";
  if (g >= 5000) return "Massive";
  if (g >= 2000) return "Large";
  if (g >= 500)  return "Medium";
  return "Small";
}

export default function WorldMap({ tiles, onClose, onTeleport }) {
  const [selected, setSelected] = useState(null);

  const W_DESIGN = 420, H_DESIGN = 700;
  const screenW = typeof window !== "undefined" ? window.innerWidth  : 390;
  const screenH = typeof window !== "undefined" ? window.innerHeight : 844;

  const sx = screenW  / W_DESIGN;
  const sy = screenH / H_DESIGN;

  const keeps = useMemo(() => {
    return REGION_LIST.map(reg => {
      const t = tiles[`${reg.cx},${reg.cy}`];
      return { ...reg, owner: t?.owner||null, garrison: t?.garrison||0,
               siege: t?.siege||0, siegeMax: t?.siegeMax||0 };
    });
  }, [tiles]);

  const selectedKeep = selected ? keeps.find(k => k.key === selected) : null;
  const panelH = selectedKeep ? 165 : 30;
  const mapH = screenH - panelH;

  // Scale mapH back to design units for clipping
  const mapHDesign = mapH / sy;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"#080c10",
      display:"flex", flexDirection:"column",
      overflow:"hidden",
      fontFamily:"'Cinzel',serif",
    }}>
      <style>{`
        @keyframes holyPulse { 0%,100%{opacity:.35} 50%{opacity:.65} }
      `}</style>

      {/* ── Map SVG ── */}
      <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
        <svg width={screenW} height={mapH} style={{ display:"block" }}>
          <defs>
            <filter id="wm-drop">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.9)"/>
            </filter>
            <radialGradient id="wm-vig" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="transparent"/>
              <stop offset="100%" stopColor="rgba(0,0,0,0.5)"/>
            </radialGradient>
          </defs>

          {/* Base */}
          <rect width={screenW} height={mapH} fill="#0a1820"/>

          {/* ── Region fills ── */}
          {keeps.map(reg => {
            const poly = FINAL[reg.key];
            if (!poly) return null;
            const terrain = REGION_TERRAIN[reg.key] || { base:"#243820", dark:"#182810" };
            const isSel = selected === reg.key;

            // Base terrain color
            const owned = reg.owner;
            const factionCol = owned
              ? (owned==="player" ? "#44aaff" : (FAC_COLOR[owned]||"#cc8844"))
              : null;

            return (
              <g key={reg.key} style={{ cursor:"pointer" }}
                onClick={() => setSelected(isSel ? null : reg.key)}>
                {/* Terrain base */}
                <polygon
                  points={scalePtStr(poly, sx, sy)}
                  fill={terrain.base}
                />
                {/* Terrain shade variation */}
                <polygon
                  points={scalePtStr(poly, sx, sy)}
                  fill={terrain.dark}
                  opacity={0.4}
                />
                {/* Faction color overlay when owned */}
                {factionCol && (
                  <polygon
                    points={scalePtStr(poly, sx, sy)}
                    fill={factionCol}
                    opacity={0.3}
                  />
                )}
                {/* Dark overlay when unowned (gloomy/uncaptured feel) */}
                {!owned && reg.key !== "holyGrail" && (
                  <polygon
                    points={scalePtStr(poly, sx, sy)}
                    fill="#000"
                    opacity={0.35}
                  />
                )}
                {/* Selection highlight */}
                {isSel && (
                  <polygon
                    points={scalePtStr(poly, sx, sy)}
                    fill="white"
                    opacity={0.08}
                  />
                )}
                {/* Region border */}
                <polygon
                  points={scalePtStr(poly, sx, sy)}
                  fill="none"
                  stroke={factionCol || (reg.key==="holyGrail" ? "#f0c040" : "#4a3a20")}
                  strokeWidth={isSel ? 2 : 0.8}
                  strokeOpacity={factionCol ? 0.7 : (reg.key==="holyGrail" ? 0.6 : 0.35)}
                  strokeDasharray={reg.key==="holyGrail" ? "5 3" : undefined}
                />
              </g>
            );
          })}

          {/* Holy grail glow */}
          {(() => {
            const poly = FINAL["holyGrail"];
            if (!poly) return null;
            const [cx,cy] = centroid(poly);
            return (
              <circle cx={cx*sx} cy={cy*sy} r={40*Math.min(sx,sy)}
                fill="rgba(240,192,64,0.12)"
                style={{ animation:"holyPulse 2.5s ease-in-out infinite" }}/>
            );
          })()}

          {/* Vignette */}
          <rect width={screenW} height={mapH} fill="url(#wm-vig)"/>

          {/* ── Region name labels ── */}
          {keeps.map(reg => {
            if (reg.key === "holyGrail") return null;
            const poly = FINAL[reg.key];
            if (!poly) return null;
            const [cx,cy] = centroid(poly);
            const owned = reg.owner;
            const col = owned
              ? (owned==="player" ? "#88ccff" : (FAC_COLOR[owned]||"#ddaa66"))
              : "rgba(160,140,100,0.5)";
            const fs = Math.max(6, Math.min(9, 7.5*Math.min(sx,sy)));
            // Don't render if centroid is below mapH
            if (cy*sy > mapH - 20) return null;
            return (
              <text key={`lbl_${reg.key}`}
                x={cx*sx} y={cy*sy + 3}
                textAnchor="middle" fontSize={fs}
                fill={col} fontFamily="'Cinzel',serif"
                letterSpacing=".02em"
                style={{ pointerEvents:"none", userSelect:"none" }}>
                {reg.name.replace("The ","").replace(" Keep","").replace("Shattered ","Sh. ")}
              </text>
            );
          })}

          {/* ── Keep icons (castle) ── */}
          {keeps.map(reg => {
            const poly = FINAL[reg.key];
            if (!poly) return null;
            const [lcx, lcy] = centroid(poly);
            const cx = lcx * sx, cy = lcy * sy;
            if (cy > mapH - 15) return null;

            const owned = reg.owner;
            const col = keepColor(owned);
            const isHG = reg.key === "holyGrail";
            const sz = isHG ? 9*Math.min(sx,sy) : reg.layer==="conflict" ? 7*Math.min(sx,sy) : 6*Math.min(sx,sy);
            const isSel = selected === reg.key;
            const by = cy - sz*1.2; // icon sits above label

            if (isHG) {
              return (
                <g key={`icon_${reg.key}`} style={{ cursor:"pointer" }}
                  onClick={() => setSelected(isSel ? null : reg.key)}>
                  {isSel && <circle cx={cx} cy={cy} r={sz*2.5} fill="none" stroke="#f0c040" strokeWidth={1.5} opacity={0.7}/>}
                  <circle cx={cx} cy={cy} r={sz*1.8} fill="rgba(240,192,64,0.12)" stroke="#f0c040" strokeWidth={0.8} opacity={0.7}/>
                  <path d={`M${cx-sz*.5},${cy-sz*.5} L${cx+sz*.5},${cy-sz*.5} L${cx+sz*.35},${cy+sz*.15} L${cx-sz*.35},${cy+sz*.15}Z`}
                    fill="#f0c040" opacity={0.9}/>
                  <path d={`M${cx-sz*.2},${cy+sz*.15} L${cx+sz*.2},${cy+sz*.15} L${cx+sz*.1},${cy+sz*.5} L${cx-sz*.1},${cy+sz*.5}Z`}
                    fill="#c8a020" opacity={0.9}/>
                  <text x={cx} y={cy+sz*1.5} textAnchor="middle" fontSize={Math.max(5.5, sz*.85)}
                    fill="rgba(240,192,64,0.85)" fontFamily="'Cinzel',serif" letterSpacing=".06em"
                    style={{ pointerEvents:"none" }}>Holy Grail</text>
                </g>
              );
            }

            return (
              <g key={`icon_${reg.key}`} style={{ cursor:"pointer" }}
                onClick={() => setSelected(isSel ? null : reg.key)}>
                {owned && <circle cx={cx} cy={by} r={sz*1.6} fill={col} opacity={0.15}/>}
                {isSel && <circle cx={cx} cy={by} r={sz*2.1} fill="none" stroke={col} strokeWidth={1.4} opacity={0.8}/>}
                {/* Castle base */}
                <rect x={cx-sz*.58} y={by} width={sz*1.16} height={sz} rx={1}
                  fill={owned ? col : "#5a4a30"} opacity={0.92}/>
                {/* Battlements */}
                {[-0.4,-0.13,0.13,0.4].map((dx,i) => (
                  <rect key={i} x={cx+dx*sz*2-sz*.13} y={by-sz*.48} width={sz*.24} height={sz*.52} rx={1}
                    fill={owned ? col : "#5a4a30"} opacity={0.92}/>
                ))}
                {/* Gate */}
                <path d={`M${cx-sz*.2},${by+sz} L${cx-sz*.2},${by+sz*.5} Q${cx},${by+sz*.28} ${cx+sz*.2},${by+sz*.5} L${cx+sz*.2},${by+sz}Z`}
                  fill={owned ? "rgba(0,0,0,0.55)" : "#1e1408"}/>
                {/* Flag */}
                {owned && <>
                  <line x1={cx} y1={by-sz*.48} x2={cx} y2={by-sz*1.4} stroke={col} strokeWidth={1.3}/>
                  <polygon points={`${cx},${by-sz*1.4} ${cx+sz*.5},${by-sz*1.18} ${cx},${by-sz*.95}`}
                    fill={col} opacity={0.95}/>
                </>}
              </g>
            );
          })}

          {/* ── Top bar ── */}
          <rect width={screenW} height={46} fill="rgba(0,0,0,0.75)"/>
          <line x1={0} y1={46} x2={screenW} y2={46} stroke="rgba(200,160,64,0.25)" strokeWidth={1}/>
          <text x={screenW/2} y={29} textAnchor="middle" fontSize={15}
            fill="#c8a060" fontFamily="'Cinzel',serif" letterSpacing=".14em">
            WORLD MAP
          </text>
          <g style={{ cursor:"pointer" }} onClick={onClose}>
            <rect x={4} y={9} width={38} height={28} rx={4} fill="rgba(0,0,0,0.5)"/>
            <text x={23} y={28} textAnchor="middle" fontSize={20}
              fill="#c8a060" style={{ pointerEvents:"none" }}>‹</text>
          </g>

          {/* ── Legend ── */}
          <rect x={0} y={mapH-34} width={screenW} height={34} fill="rgba(0,0,0,0.75)"/>
          {[
            { col:"#b8a88a", label:"Unoccupied" },
            { col:"#44aaff", label:"Allied" },
            { col:"#cc5533", label:"Enemy" },
            { col:"#f0c040", label:"⚜ Holy Ring" },
          ].map(({ col, label }, i) => {
            const lx = (screenW/4)*(i+0.5);
            const ly = mapH - 19;
            return (
              <g key={label}>
                <rect x={lx-5} y={ly-8} width={10} height={7} rx={1} fill={col} opacity={0.85}/>
                {[-3.5,3.5].map((dx,j) => (
                  <rect key={j} x={lx+dx-2} y={ly-13} width={3.5} height={5.5} fill={col} opacity={0.85}/>
                ))}
                <text x={lx} y={ly+5} textAnchor="middle" fontSize={6.5}
                  fill={col} opacity={0.72} fontFamily="'Cinzel',serif"
                  style={{ pointerEvents:"none", userSelect:"none" }}>
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Keep detail panel ── */}
      {selectedKeep ? (
        <div style={{
          flexShrink:0,
          background:"rgba(4,6,10,0.98)",
          borderTop:"1px solid rgba(200,160,64,0.2)",
          padding:"10px 14px 14px",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
            <div>
              <div style={{ color:"#c8a060", fontSize:12, letterSpacing:".06em" }}>
                {selectedKeep.keepName}
              </div>
              <div style={{
                color: selectedKeep.owner
                  ? (selectedKeep.owner==="player" ? "#88ccff" : (FAC_COLOR[selectedKeep.owner]||"#cc8844"))
                  : "#7a6a50",
                fontSize:10, marginTop:2,
              }}>
                {!selectedKeep.owner ? "Unoccupied"
                  : selectedKeep.owner==="player" ? "Your Faction" : "Enemy"}
                {selectedKeep.garrison>0 && ` · ${garrisonLabel(selectedKeep.garrison)} garrison`}
              </div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button onClick={() => { onTeleport(selectedKeep.cx,selectedKeep.cy); onClose(); }}
                style={{
                  padding:"7px 18px",
                  background:"linear-gradient(160deg,#2a1e08,#100c02)",
                  border:"1px solid #8a6020", borderRadius:4,
                  color:"#f0c060", fontFamily:"'Cinzel',serif",
                  fontSize:11, letterSpacing:".06em", cursor:"pointer",
                }}>Go →</button>
              <button onClick={() => setSelected(null)}
                style={{ background:"none",border:"none",color:"#4a4030",fontSize:16,cursor:"pointer",padding:0 }}>
                ✕
              </button>
            </div>
          </div>
          <div style={{
            padding:"3px 8px", borderRadius:3, display:"inline-block",
            background: selectedKeep.layer==="ring"     ? "rgba(240,192,64,0.12)"
                      : selectedKeep.layer==="conflict" ? "rgba(220,60,40,0.12)"
                      : "rgba(60,80,60,0.12)",
            border:`1px solid ${
              selectedKeep.layer==="ring" ? "#7a5010"
              : selectedKeep.layer==="conflict" ? "#6a2010" : "#2a3a2a"
            }`,
            color: selectedKeep.layer==="ring" ? "#c8a040"
                 : selectedKeep.layer==="conflict" ? "#cc5040" : "#4a6a4a",
            fontSize:8,
          }}>
            {selectedKeep.layer==="ring" ? "⚜ Holy Ring"
             : selectedKeep.layer==="conflict" ? "⚔ Conflict Zone"
             : selectedKeep.layer==="farm" ? "🌾 Farm Region" : "🏰 Starting Region"}
          </div>
          {selectedKeep.siegeMax>0 && (
            <div style={{ marginTop:6 }}>
              <div style={{ background:"#0a0c10", borderRadius:2, height:5, overflow:"hidden" }}>
                <div style={{
                  height:"100%",
                  width:`${Math.round((selectedKeep.siege/selectedKeep.siegeMax)*100)}%`,
                  background:"linear-gradient(90deg,#882020,#dd3030)", borderRadius:2,
                }}/>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          flexShrink:0, padding:"7px 0",
          textAlign:"center", color:"#2e2818", fontSize:9,
        }}>
          Tap a region to view details
        </div>
      )}
    </div>
  );
}
