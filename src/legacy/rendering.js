// SVG rendering, floorplan rendering, terminal snapping, and previews.

// ── Render ──────────────────────────────────────────────────────────────────
function render(){
  // Floorplan background (House View tab)
  const fpg=document.getElementById('floorplan-g');
  if(fpg){
    fpg.innerHTML='';
    const curCt=_circuits[_currentIdx];
    if(curCt&&curCt.background==='floorplan') drawFloorplan(fpg);
  }
  updateHvOverlays();
  renderWires();renderComps();renderNodes();
  if(!_flowVisible){const fl=document.getElementById('flow-g');if(fl)fl.innerHTML='';}
}

// ── House View overlay helpers ────────────────────────────────────────────────────────
function updateHvOverlays() {
  const isHV = _circuits[_currentIdx] && _circuits[_currentIdx].background === 'floorplan';
  const legend = document.getElementById('hv-legend');
  const fitBtn = document.getElementById('hv-fit-btn');
  if (legend) legend.style.display = isHV ? 'block' : 'none';
  if (fitBtn)  fitBtn.style.display  = isHV ? 'block' : 'none';
}

function hvFitToView() {
  // Collect bounding box from all components and wires in current circuit
  if (!comps.length && !wires.length) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  comps.forEach(c => {
    minX = Math.min(minX, c.px); minY = Math.min(minY, c.py);
    maxX = Math.max(maxX, c.px); maxY = Math.max(maxY, c.py);
  });
  wires.forEach(w => {
    minX = Math.min(minX, w.x1, w.x2); minY = Math.min(minY, w.y1, w.y2);
    maxX = Math.max(maxX, w.x1, w.x2); maxY = Math.max(maxY, w.y1, w.y2);
  });
  const svg = document.getElementById('circuit-svg');
  const viewW = svg.clientWidth  || svg.getBoundingClientRect().width;
  const viewH = svg.clientHeight || svg.getBoundingClientRect().height;
  const pad = 60;
  const rangeX = maxX - minX + pad * 2;
  const rangeY = maxY - minY + pad * 2;
  const zoom = Math.min(viewW / rangeX, viewH / rangeY, 2);
  const clampedZoom = Math.max(0.1, zoom);
  _zoom = clampedZoom;
  _pan = { x: -minX * clampedZoom + pad * clampedZoom, y: -minY * clampedZoom + pad * clampedZoom };
  updateViewport();
}


// ── Floorplan drawing ────────────────────────────────────────────────────────
function drawFloorplan(g) {
  // Grid: G=40px per unit — UNCHANGED.
  // Building coordinates are at 2× scale (doubled from original).
  // Ground floor: x=2..60, y=2..56   First floor: x=2..60, y=60..100
  //   Living Room: x=2..36, y=2..28    Kitchen: x=36..60, y=2..28
  //   Hall: x=2..16, y=28..56          Under-stairs/CU area: x=16..60, y=28..56
  //   Master Bedroom: x=2..32, y=60..84  Bedroom 2: x=32..60, y=60..84
  //   Landing: x=2..44, y=84..100       Bathroom: x=44..60, y=84..100

  const fmk = (tag, attrs) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for(const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
    g.appendChild(el); return el;
  };

  // ── Architectural style constants (dark navy blueprint) ──────────────
  const ROOM_FILL    = 'rgba(8,20,50,0.92)';
  const STAIR_FILL   = 'rgba(10,16,40,0.92)';
  const WALL_COL     = '#a0c8e8';
  const WALL_W       = 6;
  const WALL_INT     = 4;
  const WALL_INT_COL = '#5a8ca8';
  const LABEL_COL    = '#7ab8e8';
  const WIN_COL      = '#7ab8e8';
  const DOOR_COL     = '#5a8ca8';
  const HATCH_COL    = '#2a4a6a';

  // ── Helpers ───────────────────────────────────────────────────────────
  const px = n => n * G;

  const roomFill = (x1,y1,x2,y2,fill) => fmk('rect',{
    x:px(x1), y:px(y1), width:px(x2-x1), height:px(y2-y1),
    fill: fill||ROOM_FILL, stroke:'none'
  });

  const wall = (x1,y1,x2,y2,w) => fmk('line',{
    x1:px(x1),y1:px(y1), x2:px(x2),y2:px(y2),
    stroke:(w===WALL_INT)?WALL_INT_COL:WALL_COL, 'stroke-width':w||WALL_W, 'stroke-linecap':'square'
  });

  const label = (gx,gy,txt,sz) => {
    const lines = txt.split('\n');
    const el = fmk('text',{
      x:px(gx), y:px(gy) - (lines.length-1)*8,
      'text-anchor':'middle', fill:LABEL_COL,
      'font-size': sz||12, 'font-family':'Arial,Helvetica,sans-serif',
      'font-weight':'bold', 'letter-spacing':'0.5'
    });
    lines.forEach((line,i) => {
      const ts = document.createElementNS('http://www.w3.org/2000/svg','tspan');
      ts.setAttribute('x', px(gx));
      ts.setAttribute('dy', i ? '16' : '0');
      ts.textContent = line;
      el.appendChild(ts);
    });
  };

  // Window: double line across a wall gap
  const win = (gx,gy,horiz) => {
    if(horiz){
      const cx=px(gx), y0=px(gy);
      const hw=px(1.5);
      fmk('rect',{x:cx-hw, y:y0-WALL_W/2, width:hw*2, height:WALL_W, fill:'rgba(186,230,253,0.5)', stroke:'none'});
      fmk('line',{x1:cx-hw,y1:y0-3,x2:cx+hw,y2:y0-3,stroke:WIN_COL,'stroke-width':2});
      fmk('line',{x1:cx-hw,y1:y0+3,x2:cx+hw,y2:y0+3,stroke:WIN_COL,'stroke-width':2});
      fmk('line',{x1:cx-hw,y1:y0-5,x2:cx-hw,y2:y0+5,stroke:WIN_COL,'stroke-width':2});
      fmk('line',{x1:cx+hw,y1:y0-5,x2:cx+hw,y2:y0+5,stroke:WIN_COL,'stroke-width':2});
    } else {
      const cy=px(gy), x0=px(gx);
      const hw=px(1.5);
      fmk('rect',{x:x0-WALL_W/2, y:cy-hw, width:WALL_W, height:hw*2, fill:'rgba(186,230,253,0.5)', stroke:'none'});
      fmk('line',{x1:x0-3,y1:cy-hw,x2:x0-3,y2:cy+hw,stroke:WIN_COL,'stroke-width':2});
      fmk('line',{x1:x0+3,y1:cy-hw,x2:x0+3,y2:cy+hw,stroke:WIN_COL,'stroke-width':2});
      fmk('line',{x1:x0-5,y1:cy-hw,x2:x0+5,y2:cy-hw,stroke:WIN_COL,'stroke-width':2});
      fmk('line',{x1:x0-5,y1:cy+hw,x2:x0+5,y2:cy+hw,stroke:WIN_COL,'stroke-width':2});
    }
  };

  // Door: gap mask + leaf line + quarter-circle arc
  const door = (hx,hy,ex,ey,arcX,arcY) => {
    const r = Math.hypot(px(ex-hx), px(ey-hy));
    const mx1=Math.min(px(hx),px(ex)), my1=Math.min(px(hy),px(ey));
    const mw=Math.abs(px(ex-hx))||WALL_W*2, mh=Math.abs(px(ey-hy))||WALL_W*2;
    const pad=WALL_W;
    fmk('rect',{x:mx1-pad/2,y:my1-pad/2,width:(mw||pad)+pad,height:(mh||pad)+pad,fill:'rgba(4,10,28,0.97)',stroke:'none'});
    fmk('line',{x1:px(hx),y1:px(hy),x2:px(ex),y2:px(ey),stroke:DOOR_COL,'stroke-width':2});
    const dx1=px(ex)-px(hx), dy1=px(ey)-px(hy);
    const dx2=px(arcX)-px(hx), dy2=px(arcY)-px(hy);
    const cross=dx1*dy2-dy1*dx2;
    const sweep=cross<0?0:1;
    fmk('path',{
      d:`M${px(ex)},${px(ey)} A${r},${r} 0 0,${sweep} ${px(arcX)},${px(arcY)}`,
      stroke:DOOR_COL, 'stroke-width':1.5, fill:'rgba(100,116,139,0.08)', 'stroke-dasharray':'4,3', opacity:'0.8'
    });
  };

  // Staircase: hatched area with tread lines and UP/DOWN label
  const staircase = (x1,y1,x2,y2,dir) => {
    const px1=px(x1),py1=px(y1),px2=px(x2),py2=px(y2);
    fmk('rect',{x:px1,y:py1,width:px2-px1,height:py2-py1,fill:STAIR_FILL,stroke:'none'});
    const n=14;
    const step=(py2-py1)/n;
    for(let i=1;i<n;i++){
      const ty=py1+i*step;
      fmk('line',{x1:px1,y1:ty,x2:px2,y2:ty,stroke:HATCH_COL,'stroke-width':1.5});
    }
    const cx=(px1+px2)/2, cy=(py1+py2)/2;
    const arrow=fmk('text',{x:cx,y:cy-6,'text-anchor':'middle',fill:LABEL_COL,'font-size':9,'font-family':'Arial,sans-serif','font-weight':'bold'});
    arrow.textContent=dir||'UP';
    const arrowSym=fmk('text',{x:cx,y:cy+10,'text-anchor':'middle',fill:LABEL_COL,'font-size':14,'font-family':'Arial,sans-serif'});
    arrowSym.textContent=dir==='DOWN'?'▼':'▲';
  };

  // ── ① ROOM FILLS ─────────────────────────────────────────────────────
  // Ground floor
  roomFill(2, 2, 36,28, 'rgba(8,20,50,0.92)');    // Living Room
  roomFill(36,2, 60,28, 'rgba(6,18,46,0.92)');    // Kitchen
  roomFill(2,28, 16,56, 'rgba(5,15,40,0.92)');    // Hall
  roomFill(16,28,60,56, 'rgba(6,18,46,0.92)');    // Under-stairs / CU area
  // First floor
  roomFill(2, 60,32,84, 'rgba(8,20,50,0.92)');    // Master Bedroom
  roomFill(32,60,60,84, 'rgba(6,18,46,0.92)');    // Bedroom 2
  roomFill(2, 84,44,100,'rgba(5,15,40,0.92)');    // Landing
  roomFill(44,84,60,100,'rgba(4,14,38,0.92)');    // Bathroom

  // ── ② FLOOR SEPARATOR BAND (y=56..60) ────────────────────────────────
  fmk('rect',{x:px(0),y:px(56),width:px(62),height:px(4),fill:'rgba(13,26,61,0.98)',stroke:'none'});
  const sepTxt1=fmk('text',{x:px(31),y:px(57.5),'text-anchor':'middle',fill:'#7ab8e8','font-size':11,'font-family':'Arial,Helvetica,sans-serif','font-weight':'bold','letter-spacing':'2'});
  sepTxt1.textContent='GROUND FLOOR   ▲';
  const sepTxt2=fmk('text',{x:px(31),y:px(59),'text-anchor':'middle',fill:'#7ab8e8','font-size':11,'font-family':'Arial,Helvetica,sans-serif','font-weight':'bold','letter-spacing':'2'});
  sepTxt2.textContent='▼   FIRST FLOOR';

  // ── ③ STAIRCASES ─────────────────────────────────────────────────────
  staircase(2,40, 16,56,'UP');      // Ground floor stairwell (hall south portion)
  staircase(2,84, 18,100,'DOWN');   // First floor stairwell (landing west portion)

  // ── ④ WINDOWS ────────────────────────────────────────────────────────
  // Ground floor north wall
  win(14,2,true);  win(24,2,true);  // Living room front
  win(44,2,true);  win(54,2,true);  // Kitchen front
  // Ground floor side walls
  win(2,14,false);                  // Living room west
  win(60,14,false);                 // Kitchen east
  // First floor north wall
  win(12,60,true); win(22,60,true); // Master bedroom front
  win(40,60,true); win(52,60,true); // Bedroom 2 front
  // First floor side walls
  win(2,72,false);                  // Master bedroom west
  win(60,72,false);                 // Bedroom 2 east
  win(60,92,false);                 // Bathroom east

  // ── ⑤ DOORS ──────────────────────────────────────────────────────────
  // Living room → Hall (hinge at (2,28), leaf east 4 units, swings south)
  door(2,28, 6,28, 6,32);
  // Kitchen → Under-stairs (hinge at (52,28), leaf west 4 units, swings south)
  door(52,28, 48,28, 48,32);
  // Front door in south hall wall (hinge at (4,56), leaf east, swings north)
  door(4,56, 8,56, 4,52);
  // Master bedroom door (hinge at (2,84), leaf east, swings north)
  door(2,84, 6,84, 6,80);
  // Bedroom 2 door (hinge at (56,84), leaf west, swings north)
  door(56,84, 52,84, 52,80);
  // Bathroom door (hinge at (44,84), leaf south into bathroom, swings east)
  door(44,84, 44,88, 48,88);

  // ── ⑥ EXTERIOR WALLS ─────────────────────────────────────────────────
  // Ground floor
  wall(2, 2,60, 2);                 // North wall
  wall(2, 2, 2,56);                 // West wall
  wall(60,2,60,56);                 // East wall
  wall(2,56, 4,56);                 // South wall (west of front door)
  wall(8,56,60,56);                 // South wall (east of front door)
  // First floor
  wall(2, 60,60,60);                // North wall FF
  wall(2, 60, 2,100);               // West wall FF
  wall(60,60,60,100);               // East wall FF
  wall(18,100,60,100);              // South wall FF (stairwell open on west)

  // ── ⑦ INTERIOR WALLS ─────────────────────────────────────────────────
  // Ground floor
  wall(36,2, 36,28,  WALL_INT);     // Living room / Kitchen divider
  wall(2, 28, 2,28,  WALL_INT);     // (door gap starts at x=2)
  wall(6, 28,36,28,  WALL_INT);     // LR south wall (door gap 2..6)
  wall(36,28,48,28,  WALL_INT);     // Kitchen south wall (west of door)
  wall(52,28,60,28,  WALL_INT);     // Kitchen south wall (east of door gap)
  wall(16,28,16,56,  WALL_INT);     // Hall / under-stairs divider
  // First floor
  wall(32,60,32,84,  WALL_INT);     // Master / Bed2 divider
  wall(6, 84,32,84,  WALL_INT);     // Master bedroom south (door gap 2..6)
  wall(32,84,52,84,  WALL_INT);     // Bed2/Landing south (door gap 52..56)
  wall(56,84,60,84,  WALL_INT);     // Bed2 south east segment
  wall(44,84,44,100, WALL_INT);     // Landing / Bathroom divider
  wall(18,84,18,100, WALL_INT);     // Stairwell east wall on landing

  // ── ⑧ ROOM LABELS ────────────────────────────────────────────────────
  label(19, 15,  'LIVING\nROOM');
  label(48, 15,  'KITCHEN');
  label( 9, 38,  'HALL');
  label(38, 42,  'UNDER-STAIRS\nCU AREA');
  label(17, 72,  'MASTER\nBEDROOM');
  label(46, 72,  'BEDROOM 2');
  label(23, 92,  'LANDING');
  label(52, 92,  'BATH');

  // ── ⑩ SCALE BAR ──────────────────────────────────────────────────────
  // Each 20 grid units = 6m at 2× scale (1 unit ≈ 0.3m)
  const sbX=px(36), sbY=px(103);
  const unit=px(20)/6; // pixels per metre
  fmk('line',{x1:sbX,y1:sbY,x2:sbX+unit*6,y2:sbY,stroke:'#7ab8e8','stroke-width':2});
  [0,2,4,6].forEach(m=>{
    fmk('line',{x1:sbX+m*unit,y1:sbY-5,x2:sbX+m*unit,y2:sbY+5,stroke:'#7ab8e8','stroke-width':2});
    const t=fmk('text',{x:sbX+m*unit,y:sbY+16,'text-anchor':'middle',fill:'#7ab8e8','font-size':9,'font-family':'Arial,sans-serif'});
    t.textContent=m+'m';
  });
  const sbLbl=fmk('text',{x:sbX+unit*3,y:sbY+27,'text-anchor':'middle',fill:'#5a8ca8','font-size':8,'font-family':'Arial,sans-serif'});
  sbLbl.textContent='Scale: 1 unit ≈ 0.3m  (2× routing grid)';

  // ── ⑪ NORTH ARROW ────────────────────────────────────────────────────
  const naX=px(58), naY=px(103);
  fmk('line',{x1:naX,y1:naY+12,x2:naX,y2:naY-12,stroke:'#7ab8e8','stroke-width':2.5});
  fmk('polygon',{points:`${naX},${naY-16} ${naX-5},${naY-4} ${naX+5},${naY-4}`,fill:'#7ab8e8',stroke:'none'});
  const nLbl=fmk('text',{x:naX,y:naY+24,'text-anchor':'middle',fill:'#7ab8e8','font-size':11,'font-family':'Arial,sans-serif','font-weight':'bold'});
  nLbl.textContent='N';

  // ── ⑫ ANNOTATIONS ────────────────────────────────────────────────────
  const ANN_DOT  = '#5a8ca8';
  const ANN_LINE = '#2a4a6a';
  const ANN_TEXT = '#7ab8e8';
  const ANN_FF   = 'Arial,sans-serif';

  const ann = (gx, gy, dx, dy, txt) => {
    const cx = px(gx), cy = px(gy);
    const tx = cx + dx, ty = cy + dy;
    fmk('line',{x1:cx,y1:cy,x2:tx,y2:ty,stroke:ANN_LINE,'stroke-width':0.8,opacity:'0.7'});
    fmk('circle',{cx:cx,cy:cy,r:2,fill:ANN_DOT});
    const el = fmk('text',{
      x:tx, y:ty,
      fill:ANN_TEXT, 'font-size':9, 'font-family':ANN_FF,
      'font-style':'italic', 'dominant-baseline':'middle'
    });
    el.textContent = txt;
  };

  ann( 9, 40,  30, -10, 'Consumer Unit');
  ann(20, 16,  30,  16, 'Ceiling Rose (LR)');
  ann(50, 16,  24,  16, 'Ceiling Rose (Kit)');
  ann( 9, 70,  28, -14, 'Ceiling Rose (Bed 1)');
  ann(42, 70,  28, -14, 'Ceiling Rose (Bed 2)');
  ann( 6, 76,  28,  14, 'Master Bed Switch');
  ann(48, 76, -28,  14, 'Bed 2 Switch');

  // ── ⑬ CABLE COLOUR LEGEND ────────────────────────────────────────────
  const lgX = px(2), lgY = px(103);
  const lgW = px(14), lgH = px(4.0);
  fmk('rect',{x:lgX-4, y:lgY-8, width:lgW, height:lgH, rx:4,
    fill:'rgba(4,10,28,0.96)', stroke:'#2a4a6a', 'stroke-width':1});
  const lgTitle = fmk('text',{x:lgX+4, y:lgY+4,
    fill:'#7ab8e8','font-size':8,'font-family':ANN_FF,
    'font-weight':'bold','font-style':'normal'});
  lgTitle.textContent = 'Cable colours';
  const lgEntries = [
    ['#b45309', 'Live (Brown)'],
    ['#3b82f6', 'Neutral (Blue)'],
    ['#65a30d', 'Earth (Green/Yellow)'],
  ];
  lgEntries.forEach(([col, txt], i) => {
    const ex = lgX + 8;
    const ey = lgY + 18 + i * 14;
    fmk('circle',{cx:ex, cy:ey-3, r:4, fill:col, opacity:'0.9'});
    const et = fmk('text',{x:ex+9, y:ey,
      fill:'#7ab8e8','font-size':8.5,'font-family':ANN_FF,
      'dominant-baseline':'middle'});
    et.textContent = txt;
  });
}

const WIRE_GAUGE_SW={'1.5':1.5,'2.5':2,'4':2.8,'6':3.5,'10':4.5};

// Determine UK cable colour role for a wire based on solved node voltages.
// Returns {stroke, strokeWidth, dasharray}
function _wireElecRole(w){
  const simulated=!!(window.simNodeV && window.simVoltages);
  if(!simulated) return {stroke:'#5d6a85',strokeWidth:2,dasharray:null};

  // Build set of GND node IDs once per render — cached on window for this frame.
  // We rebuild it inside this function but it is cheap (few GND comps).
  const gndNodeIds=new Set();
  comps.forEach(c=>{
    if(c.type==='GND'){
      const nid=window.simNodeV[nk(c.x1,c.y1)];
      if(nid!==undefined) gndNodeIds.add(nid);
    }
  });

  const nid1=window.simNodeV[nk(w.x1,w.y1)];
  const nid2=window.simNodeV[nk(w.x2,w.y2)];
  const hasNode=nid1!==undefined||nid2!==undefined;
  if(!hasNode) return {stroke:'#5d6a85',strokeWidth:2,dasharray:null};

  // Earth: either endpoint is on a GND node
  if((nid1!==undefined&&gndNodeIds.has(nid1))||(nid2!==undefined&&gndNodeIds.has(nid2))){
    return {stroke:'#65a30d',strokeWidth:2,dasharray:'4,2'};
  }

  const v1=nid1!==undefined?(window.simVoltages[nid1]??null):null;
  const v2=nid2!==undefined?(window.simVoltages[nid2]??null):null;
  const maxV=Math.max(v1!==null?Math.abs(v1):0, v2!==null?Math.abs(v2):0);

  // Live: significant voltage present
  if(maxV>20) return {stroke:'#b45309',strokeWidth:2.5,dasharray:null};

  // Neutral: both endpoints at or near zero
  const bothNearZero=(v1===null||Math.abs(v1)<5)&&(v2===null||Math.abs(v2)<5);
  if(bothNearZero) return {stroke:'#3b82f6',strokeWidth:2.5,dasharray:null};

  // Ambiguous / low voltage
  return {stroke:'#5d6a85',strokeWidth:2,dasharray:null};
}

// Builds a path string for a wire that needs to visually "hop" over one or more
// crossing wires — a small semicircular bump at each given coordinate along the
// wire's own axis (x for a horizontal wire, y for a vertical one). The bump always
// curves the same absolute way (up for horizontal wires, left for vertical ones)
// regardless of the wire's stored start/end order, so hops look consistent everywhere.
function _wireHopPath(w,hopCoords){
  const r=7;
  const horiz=(w.y1===w.y2);
  const dir=Math.sign(horiz?(w.x2-w.x1):(w.y2-w.y1))||1;
  const sweep=dir>0?0:1;
  const sorted=hopCoords.slice().sort((a,b)=>dir>=0?a-b:b-a);
  let d=`M ${w.x1} ${w.y1}`;
  sorted.forEach(c=>{
    if(horiz) d+=` L ${c-dir*r} ${w.y1} A ${r} ${r} 0 0 ${sweep} ${c+dir*r} ${w.y1}`;
    else      d+=` L ${w.x1} ${c-dir*r} A ${r} ${r} 0 0 ${sweep} ${w.x1} ${c+dir*r}`;
  });
  d+=` L ${w.x2} ${w.y2}`;
  return d;
}

function renderWires(){
  const g=document.getElementById('wires-g'); g.innerHTML='';

  // Decide, for each ambiguous X-crossing the user has flagged as a "jump" (no real
  // connection), which of the two wires visually hops over the other — the one with
  // the higher id (added later / drawn "on top") consistently gets the arc.
  const crossings=findWireCrossings();
  const hopMap=new Map(); // wireId -> [coord,...] along that wire's own axis
  const widNum=id=>parseInt(String(id).replace(/\D/g,''),10)||0;
  crossings.forEach(xc=>{
    if(!jumpPoints.has(nk(xc.x,xc.y))) return;
    const hopId=widNum(xc.vId)>=widNum(xc.hId)?xc.vId:xc.hId;
    const hopWire=wires.find(w=>w.id===hopId);
    if(!hopWire) return;
    const coord=(hopWire.y1===hopWire.y2)?xc.x:xc.y;
    if(!hopMap.has(hopId)) hopMap.set(hopId,[]);
    hopMap.get(hopId).push(coord);
  });

  wires.forEach(w=>{
    const gaugedSW=WIRE_GAUGE_SW[w.gauge||'2.5']||2;
    const role=_wireElecRole(w);
    // Scale gauge stroke-width proportionally onto the role stroke-width
    const scaledSW=(gaugedSW/2)*role.strokeWidth;
    const hops=hopMap.get(w.id);
    let line;
    if(hops&&hops.length){
      const attrs={d:_wireHopPath(w,hops),class:'wl',fill:'none','data-id':w.id,'stroke-width':scaledSW};
      if(role.dasharray) attrs['stroke-dasharray']=role.dasharray;
      line=mk('path',attrs);
    } else {
      const attrs={x1:w.x1,y1:w.y1,x2:w.x2,y2:w.y2,class:'wl','data-id':w.id,'stroke-width':scaledSW};
      if(role.dasharray) attrs['stroke-dasharray']=role.dasharray;
      line=mk('line',attrs);
    }
    // Apply electrical colour via inline style (overrides CSS .wl stroke) unless selected
    if(sel!==w.id) line.style.stroke=role.stroke;
    if(sel===w.id) line.classList.add('wl-sel');
    g.appendChild(line);
    // Invisible thick hit area for easy selection
    const hit=mk('line',{x1:w.x1,y1:w.y1,x2:w.x2,y2:w.y2,'stroke-width':12,'stroke':'transparent','stroke-linecap':'round','data-id':w.id});
    hit.style.cursor='pointer';
    hit.addEventListener('click',e=>{
      e.stopPropagation();
      if(tryPlaceProbe(e)) return;
      if(mode!=='select') return;
      if(sel===w.id){ sel=null; showProps(null); render(); return; } // click again to deselect
      const p=svgPt(e);
      const tap=nearestWirePoint(p.x,p.y,22)||{x:w.x1,y:w.y1};
      showWireTapMenu(w.id,tap.x,tap.y,e.clientX,e.clientY);
    });
    g.appendChild(hit);
    // Show gauge label if non-default
    if(w.gauge&&w.gauge!=='2.5'){
      const mx=(w.x1+w.x2)/2, my=(w.y1+w.y2)/2;
      const t=mk('text',{x:mx,y:my-6,'text-anchor':'middle',class:'wire-gauge-label'});
      t.textContent=w.gauge+'mm²'; g.appendChild(t);
    }
  });

  // Mark every dangling wire end with a small connection blob, so it's clear
  // at a glance where a new wire can be tapped off — corners/T-junctions and
  // crossings get their own markers (renderCrossings / sim overlay) instead.
  const termKeys=new Set();
  comps.forEach(c=>_getTerminals(c).forEach(t=>termKeys.add(nk(t.x,t.y))));
  const endKeys=new Set();
  wires.forEach(w=>{
    [[w.x1,w.y1],[w.x2,w.y2]].forEach(([x,y])=>{
      const k=nk(x,y);
      if(termKeys.has(k)) return;
      if(wireCountAt(x,y)!==1) return;
      endKeys.add(k);
    });
  });
  endKeys.forEach(k=>{
    const [ex,ey]=k.split(',').map(Number);
    g.appendChild(mk('circle',{cx:ex,cy:ey,r:3.5,class:'wire-end-dot'}));
  });

  renderCrossings(crossings);
}

// Renders a marker at every ambiguous wire X-crossing: a dot for a real junction,
// nothing extra for a "hop" (the arc on the wire itself shows that). Either way the
// marker is clickable in select mode, toggling the crossing between the two states.
function renderCrossings(crossings){
  const g=document.getElementById('crossings-g'); g.innerHTML='';
  crossings.forEach(xc=>{
    const k=nk(xc.x,xc.y);
    const isJump=jumpPoints.has(k);
    // Real junctions are usually already marked by the simulation overlay's node dot
    // (renderNodes' .nd, with a live voltage readout) — only draw our own when that
    // isn't present, so the two don't visually stack on top of each other.
    const hasSimDot=window.simNodeV&&window.simNodeV[k]!==undefined;
    if(!isJump&&!hasSimDot) g.appendChild(mk('circle',{cx:xc.x,cy:xc.y,r:3.5,class:'xing-dot'}));
    const hit=mk('circle',{cx:xc.x,cy:xc.y,r:9,class:'xing-hit'});
    hit.style.cursor='pointer';
    hit.setAttribute('title', isJump
      ? 'Wires cross but are NOT connected — click for options'
      : 'Wires cross and connect here (junction) — click for options');
    hit.addEventListener('click',e=>{
      if(tryPlaceProbe(e)){e.stopPropagation();return;}
      if(mode!=='select') return; // let wire-drawing/other modes handle the click normally
      e.stopPropagation();
      showCrossingMenu(xc.x,xc.y,e.clientX,e.clientY);
    });
    g.appendChild(hit);
  });
}

function drawSymbol(g, type, x1, y1, x2, y2, extra={}) {
  const dx=x2-x1, dy=y2-y1;
  const L=Math.sqrt(dx*dx+dy*dy)||1;
  const ang=Math.atan2(dy,dx)*180/Math.PI;
  const mid=L/2, pad=L*0.2, bw=L*0.6;

  if(type==='GND'){
    g.setAttribute('transform',`translate(${x1},${y1})`);
    g.appendChild(mk('line',{x1:0,y1:0,x2:0,y2:14,class:'cl'}));
    g.appendChild(mk('line',{x1:-16,y1:14,x2:16,y2:14,class:'cl','stroke-width':2.5}));
    g.appendChild(mk('line',{x1:-10,y1:20,x2:10,y2:20,class:'cl','stroke-width':1.5}));
    g.appendChild(mk('line',{x1:-5,y1:26,x2:5,y2:26,class:'cl','stroke-width':1}));
    return;
  }
  if(type==='probe'){
    g.setAttribute('transform',`translate(${x1},${y1})`);
    g.appendChild(mk('line',{x1:0,y1:0,x2:0,y2:-6,stroke:'#34d399','stroke-width':1.5}));
    g.appendChild(mk('circle',{cx:0,cy:-17,r:10,stroke:'#16a34a',fill:'rgba(22,163,74,0.06)','stroke-width':1.5}));
    const t=mk('text',{x:-4,y:-14,style:'fill:#34d399;font-size:9px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    t.textContent='V'; g.appendChild(t);
    return;
  }

  g.setAttribute('transform',`translate(${x1},${y1}) rotate(${ang})`);

  if(type==='R'){
    const rh=Math.min(14,L*0.22);
    g.appendChild(mk('line',{x1:0,y1:0,x2:pad,y2:0,class:'cl'}));
    g.appendChild(mk('rect',{x:pad,y:-rh/2,width:bw,height:rh,rx:2,class:'cl'}));
    g.appendChild(mk('line',{x1:pad+bw,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='C'){
    const ph=Math.min(20,L*0.38), gap=Math.min(5,L*0.07);
    g.appendChild(mk('line',{x1:0,y1:0,x2:mid-gap,y2:0,class:'cl'}));
    g.appendChild(mk('line',{x1:mid-gap,y1:-ph/2,x2:mid-gap,y2:ph/2,class:'cl','stroke-width':2.5}));
    g.appendChild(mk('line',{x1:mid+gap,y1:-ph/2,x2:mid+gap,y2:ph/2,class:'cl','stroke-width':2.5}));
    g.appendChild(mk('line',{x1:mid+gap,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='L'){
    g.appendChild(mk('line',{x1:0,y1:0,x2:pad,y2:0,class:'cl'}));
    const arcs=4, aw=bw/arcs;
    let d=`M ${pad} 0`;
    for(let i=0;i<arcs;i++){const sx=pad+i*aw; d+=` Q ${sx+aw/2} ${-Math.min(aw/2,13)} ${sx+aw} 0`;}
    g.appendChild(mk('path',{d,class:'cl'}));
    g.appendChild(mk('line',{x1:pad+bw,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='V'){
    const r=Math.min(bw/2,22);
    g.appendChild(mk('line',{x1:0,y1:0,x2:mid-r,y2:0,class:'cl'}));
    g.appendChild(mk('circle',{cx:mid,cy:0,r,class:'cl'}));
    const p=mk('text',{x:mid-r*0.52,y:-r*0.1,style:'fill:#dce4f2;font-size:11px;font-family:monospace'}); p.textContent='+'; g.appendChild(p);
    const m=mk('text',{x:mid+r*0.1,y:-r*0.1,style:'fill:#dce4f2;font-size:11px;font-family:monospace'}); m.textContent='−'; g.appendChild(m);
    g.appendChild(mk('line',{x1:mid+r,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='I'){
    const r=Math.min(bw/2,22), al=r*0.6;
    g.appendChild(mk('line',{x1:0,y1:0,x2:mid-r,y2:0,class:'cl'}));
    g.appendChild(mk('circle',{cx:mid,cy:0,r,class:'cl'}));
    g.appendChild(mk('line',{x1:mid-al*0.5,y1:0,x2:mid+al*0.4,y2:0,stroke:'#5d6a85','stroke-width':1.5}));
    g.appendChild(mk('polygon',{points:`${mid+al*0.4},0 ${mid+al*0.0},${-al*0.35} ${mid+al*0.0},${al*0.35}`,fill:'#5d6a85'}));
    g.appendChild(mk('line',{x1:mid+r,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='bulb'){
    const r=Math.min(bw/2,22), cr=r*0.55;
    g.appendChild(mk('line',{x1:0,y1:0,x2:mid-r,y2:0,class:'cl'}));
    g.appendChild(mk('circle',{cx:mid,cy:0,r,stroke:'#ffd700','stroke-width':1.5,fill:'none',class:'bulb-ring'}));
    g.appendChild(mk('line',{x1:mid-cr,y1:-cr,x2:mid+cr,y2:cr,stroke:'#ffd700','stroke-width':1.5,class:'bulb-fil'}));
    g.appendChild(mk('line',{x1:mid+cr,y1:-cr,x2:mid-cr,y2:cr,stroke:'#ffd700','stroke-width':1.5,class:'bulb-fil'}));
    g.appendChild(mk('line',{x1:mid+r,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='fuse'){
    const rh=Math.min(10,L*0.16), rw=bw*0.7;
    g.appendChild(mk('line',{x1:0,y1:0,x2:(L-rw)/2,y2:0,class:'cl'}));
    g.appendChild(mk('rect',{x:(L-rw)/2,y:-rh/2,width:rw,height:rh,rx:rh/2,stroke:'#f0a500','stroke-width':1.5,fill:'none',class:'fuse-body'}));
    g.appendChild(mk('line',{x1:(L+rw)/2,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='pot'){
    const rh=Math.min(12,L*0.2), pos=extra?.pos??0.5;
    g.appendChild(mk('line',{x1:0,y1:0,x2:pad,y2:0,class:'cl'}));
    g.appendChild(mk('rect',{x:pad,y:-rh/2,width:bw,height:rh,rx:2,stroke:'#a78bfa','stroke-width':1.5,fill:'rgba(167,139,250,0.06)'}));
    // Wiper arrow
    const wx=pad+bw*pos;
    g.appendChild(mk('line',{x1:wx,y1:-rh/2-10,x2:wx,y2:-rh/2,stroke:'#a78bfa','stroke-width':1.5}));
    g.appendChild(mk('polygon',{points:`${wx},${-rh/2} ${wx-4},${-rh/2-6} ${wx+4},${-rh/2-6}`,fill:'#a78bfa'}));
    g.appendChild(mk('line',{x1:pad+bw,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='LED'||type==='diode'){
    // Diode: anode(+)=x1, cathode(−)=x2. Triangle points right (current flows left→right).
    const col = type==='LED' ? (extra?.ledColor==='green'?'#4ade80':extra?.ledColor==='blue'?'#60a5fa':extra?.ledColor==='white'?'#f0f0f0':'#f87171') : '#f0a500';
    const bodyL = L*0.5, bodyStart = (L-bodyL)/2;
    g.appendChild(mk('line',{x1:0,y1:0,x2:bodyStart,y2:0,class:'cl'}));
    g.appendChild(mk('polygon',{points:`${bodyStart},${-bodyL*0.5} ${bodyStart},${bodyL*0.5} ${bodyStart+bodyL},0`,
      stroke:col,'stroke-width':1.5,fill:`${col}22`}));
    g.appendChild(mk('line',{x1:bodyStart+bodyL,y1:-bodyL*0.55,x2:bodyStart+bodyL,y2:bodyL*0.55,stroke:col,'stroke-width':2}));
    g.appendChild(mk('line',{x1:bodyStart+bodyL,y1:0,x2:L,y2:0,class:'cl'}));
    if(type==='LED'){
      // Emission arrows
      const ax=bodyStart+bodyL*0.7, ay=-bodyL*0.35;
      g.appendChild(mk('line',{x1:ax,y1:ay,x2:ax+8,y2:ay-8,stroke:col,'stroke-width':1.2}));
      g.appendChild(mk('line',{x1:ax+4,y1:ay-2,x2:ax+8,y2:ay-8,stroke:col,'stroke-width':1.2}));
      g.appendChild(mk('line',{x1:ax+6,y1:ay-10,x2:ax+8,y2:ay-8,stroke:col,'stroke-width':1.2}));
      g.appendChild(mk('line',{x1:ax+3,y1:ay+2,x2:ax+11,y2:ay-6,stroke:col,'stroke-width':1.2}));
      g.appendChild(mk('line',{x1:ax+9,y1:ay-8,x2:ax+11,y2:ay-6,stroke:col,'stroke-width':1.2}));
      g.appendChild(mk('line',{x1:ax+9,y1:ay-4,x2:ax+11,y2:ay-6,stroke:col,'stroke-width':1.2}));
    }
  } else if(type==='zener'){
    // Zener: like diode but cathode bar has bent ends (Z-shape)
    const col='#fb923c';
    const bodyL=L*0.5, bodyStart=(L-bodyL)/2;
    g.appendChild(mk('line',{x1:0,y1:0,x2:bodyStart,y2:0,class:'cl'}));
    g.appendChild(mk('polygon',{points:`${bodyStart},${-bodyL*0.5} ${bodyStart},${bodyL*0.5} ${bodyStart+bodyL},0`,
      stroke:col,'stroke-width':1.5,fill:`${col}22`}));
    // Zener bar with bent ends
    const bx=bodyStart+bodyL, bh=bodyL*0.55;
    g.appendChild(mk('line',{x1:bx,y1:-bh,x2:bx,y2:bh,stroke:col,'stroke-width':2}));
    g.appendChild(mk('line',{x1:bx-5,y1:-bh,x2:bx,y2:-bh,stroke:col,'stroke-width':1.8}));
    g.appendChild(mk('line',{x1:bx,y1:bh,x2:bx+5,y2:bh,stroke:col,'stroke-width':1.8}));
    g.appendChild(mk('line',{x1:bodyStart+bodyL,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='sw'){
    // Switch: two anchor dots, pivoting arm
    const closed=extra?.closed??false;
    const p1x=L*0.28, p2x=L*0.72;
    g.appendChild(mk('line',{x1:0,y1:0,x2:p1x,y2:0,class:'cl'}));
    g.appendChild(mk('circle',{cx:p1x,cy:0,r:3,fill:'#5d6a85'}));
    g.appendChild(mk('circle',{cx:p2x,cy:0,r:3,fill:'#5d6a85'}));
    if(closed){
      g.appendChild(mk('line',{x1:p1x,y1:0,x2:p2x,y2:0,stroke:'#34d399','stroke-width':2}));
    } else {
      g.appendChild(mk('line',{x1:p1x,y1:0,x2:p2x-2,y2:-L*0.2,stroke:'#5d6a85','stroke-width':1.8}));
    }
    g.appendChild(mk('line',{x1:p2x,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='sw2'){
    // Two-way (SPDT) switch drawn in absolute canvas coords
    // x1,y1 = COM terminal; x2,y2 = L1 terminal; extra.x3,extra.y3 = L2 terminal
    g.setAttribute('transform','translate(0,0)');
    const pos2=extra?.sw2pos??0;
    const col2='#60a5fa';
    const l2x=extra?.x3??x2, l2y=extra?.y3??y2;
    // Active and inactive contact coords
    const actX=pos2===0?x2:l2x, actY=pos2===0?y2:l2y;
    const inactX=pos2===0?l2x:x2, inactY=pos2===0?l2y:y2;
    // Bounding box for plate
    const bx2=Math.min(x1,x2,l2x)-6, by2=Math.min(y1,y2,l2y)-6;
    const bw2=Math.max(x1,x2,l2x)-bx2+12, bh2=Math.max(y1,y2,l2y)-by2+12;
    // Body plate
    g.appendChild(mk('rect',{x:bx2,y:by2,width:bw2,height:bh2,rx:4,stroke:col2,'stroke-width':1,fill:'rgba(96,165,250,0.06)'}));
    // COM pivot dot
    g.appendChild(mk('circle',{cx:x1,cy:y1,r:3.5,fill:col2}));
    // L1 contact dot
    g.appendChild(mk('circle',{cx:x2,cy:y2,r:3.5,fill:col2}));
    // L2 contact dot
    g.appendChild(mk('circle',{cx:l2x,cy:l2y,r:3.5,fill:col2}));
    // Active arm (solid)
    g.appendChild(mk('line',{x1:x1,y1:y1,x2:actX,y2:actY,stroke:col2,'stroke-width':2.2,'stroke-linecap':'round'}));
    // Inactive arm (dashed, dimmed)
    g.appendChild(mk('line',{x1:x1,y1:y1,x2:inactX,y2:inactY,stroke:col2+'55','stroke-width':1,'stroke-dasharray':'3,3','stroke-linecap':'round'}));
    // Label
    const lbl2=mk('text',{x:(x1+x2+l2x)/3,y:Math.max(y1,y2,l2y)+16,'text-anchor':'middle',style:`fill:${col2};font-size:8px;font-family:JetBrains Mono Variable, ui-monospace, monospace`});
    lbl2.textContent=pos2===0?'2W →L1':'2W →L2'; g.appendChild(lbl2);
    return;
  } else if(type==='intswitch'){
    g.setAttribute('transform','translate(0,0)');
    const ipos=extra?.intpos??0;
    const icol='#a78bfa';
    const ix3=extra?.x3??x2, iy3=extra?.y3??y2;
    const ix4=extra?.x4??x2, iy4=extra?.y4??y2;
    const iallX=[x1,x2,ix3,ix4], iallY=[y1,y2,iy3,iy4];
    const ibxL=Math.min(...iallX)-8, ibyT=Math.min(...iallY)-8;
    const ibxR=Math.max(...iallX)+8, ibyB=Math.max(...iallY)+8;
    g.appendChild(mk('rect',{x:ibxL,y:ibyT,width:ibxR-ibxL,height:ibyB-ibyT,rx:4,stroke:icol,'stroke-width':1,fill:'rgba(167,139,250,0.06)'}));
    [[x1,y1],[x2,y2],[ix3,iy3],[ix4,iy4]].forEach(([px,py])=>g.appendChild(mk('circle',{cx:px,cy:py,r:3.5,fill:icol})));
    if(ipos===0){
      g.appendChild(mk('line',{x1:x1,y1:y1,x2:x2,y2:y2,stroke:icol,'stroke-width':2,'stroke-linecap':'round'}));
      g.appendChild(mk('line',{x1:ix3,y1:iy3,x2:ix4,y2:iy4,stroke:icol,'stroke-width':2,'stroke-linecap':'round'}));
    } else {
      g.appendChild(mk('line',{x1:x1,y1:y1,x2:ix4,y2:iy4,stroke:icol,'stroke-width':2,'stroke-linecap':'round'}));
      g.appendChild(mk('line',{x1:ix3,y1:iy3,x2:x2,y2:y2,stroke:icol,'stroke-width':2,'stroke-linecap':'round'}));
    }
    const ilbl=mk('text',{x:(x1+x2+ix3+ix4)/4,y:Math.max(...iallY)+16,'text-anchor':'middle',style:`fill:${icol};font-size:8px;font-family:JetBrains Mono Variable, ui-monospace, monospace`});
    ilbl.textContent=ipos===0?'INT →':'INT ×'; g.appendChild(ilbl);
    return;
  } else if(type==='switch2_uk'){
    // UK 2-way plate switch — absolute coords, plate visual with COM/L1/L2
    g.setAttribute('transform','translate(0,0)');
    const s2pos = extra?.sw2pos ?? 0;
    const l2x = extra?.x3 ?? x2, l2y = extra?.y3 ?? y2;
    // Plate bounding box
    const bx2=Math.min(x1,x2,l2x)-7, by2=Math.min(y1,y2,l2y)-7;
    const bw2=Math.max(x1,x2,l2x)-bx2+7, bh2=Math.max(y1,y2,l2y)-by2+7;
    // Outer plate (UK style)
    g.appendChild(mk('rect',{x:bx2,y:by2,width:bw2,height:bh2,rx:4,stroke:'#c0c0c0','stroke-width':1.5,fill:'#f5f5f5'}));
    // Inner rocker (tinted by state)
    const rFill2=s2pos===0?'#dcfce7':'#dbeafe';
    g.appendChild(mk('rect',{x:bx2+4,y:by2+4,width:bw2-8,height:bh2-8,rx:2,fill:rFill2,stroke:'#b0b0b0','stroke-width':0.8}));
    // State indicator dot (top-right of plate)
    const iColor=s2pos===0?'#22c55e':'#3b82f6';
    g.appendChild(mk('circle',{cx:bx2+bw2-7,cy:by2+7,r:3,fill:iColor}));
    // Active and inactive connections
    const aX=s2pos===0?x2:l2x, aY=s2pos===0?y2:l2y;
    const nX=s2pos===0?l2x:x2, nY=s2pos===0?l2y:y2;
    g.appendChild(mk('line',{x1,y1,x2:aX,y2:aY,stroke:'#f97316','stroke-width':2.2,'stroke-linecap':'round'}));
    g.appendChild(mk('line',{x1,y1,x2:nX,y2:nY,stroke:'#c0c0c0','stroke-width':1,'stroke-dasharray':'3,3','stroke-linecap':'round'}));
    // Terminal dots — COM=brown, L1=blue, L2=grey
    g.appendChild(mk('circle',{cx:x1,cy:y1,r:4,fill:'#b45309'}));
    g.appendChild(mk('circle',{cx:x2,cy:y2,r:4,fill:'#1e40af'}));
    g.appendChild(mk('circle',{cx:l2x,cy:l2y,r:4,fill:'#6b7280'}));
    // Labels — offset outward from plate center
    const pcx2=bx2+bw2/2, pcy2=by2+bh2/2;
    const lbls2=[[x1,y1,'COM'],[x2,y2,'L1'],[l2x,l2y,'L2']];
    lbls2.forEach(([tx,ty,lbl])=>{
      const ddx=tx-pcx2, ddy=ty-pcy2, len=Math.hypot(ddx,ddy)||1;
      const t=mk('text',{x:tx+ddx/len*11,y:ty+ddy/len*11+3,'text-anchor':'middle',style:'fill:#6b7280;font-size:6px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
      t.textContent=lbl; g.appendChild(t);
    });
    return;
  } else if(type==='switchint_uk'){
    // UK intermediate plate switch — absolute coords
    g.setAttribute('transform','translate(0,0)');
    const sipos = extra?.intpos ?? 0;
    const six3=extra?.x3??x2, siy3=extra?.y3??y2;
    const six4=extra?.x4??x2, siy4=extra?.y4??y2;
    const siallX=[x1,x2,six3,six4], siallY=[y1,y2,siy3,siy4];
    const sibxL=Math.min(...siallX)-7, sibyT=Math.min(...siallY)-7;
    const sibxR=Math.max(...siallX)+7, sibyB=Math.max(...siallY)+7;
    // Outer plate
    g.appendChild(mk('rect',{x:sibxL,y:sibyT,width:sibxR-sibxL,height:sibyB-sibyT,rx:4,stroke:'#c0c0c0','stroke-width':1.5,fill:'#f5f5f5'}));
    // Inner rocker
    g.appendChild(mk('rect',{x:sibxL+4,y:sibyT+4,width:sibxR-sibxL-8,height:sibyB-sibyT-8,rx:2,fill:'#e8e8e8',stroke:'#b0b0b0','stroke-width':0.8}));
    // State indicator
    g.appendChild(mk('circle',{cx:sibxR-7,cy:sibyT+7,r:3,fill:sipos===0?'#f97316':'#a78bfa'}));
    // Connections
    const sc='#f97316';
    if(sipos===0){
      g.appendChild(mk('line',{x1,y1,x2:six3,y2:siy3,stroke:sc,'stroke-width':2,'stroke-linecap':'round'}));
      g.appendChild(mk('line',{x1:x2,y1:y2,x2:six4,y2:siy4,stroke:sc,'stroke-width':2,'stroke-linecap':'round'}));
    } else {
      g.appendChild(mk('line',{x1,y1,x2:six4,y2:siy4,stroke:sc,'stroke-width':2,'stroke-linecap':'round'}));
      g.appendChild(mk('line',{x1:x2,y1:y2,x2:six3,y2:siy3,stroke:sc,'stroke-width':2,'stroke-linecap':'round'}));
    }
    // Terminal dots and labels
    const sipcx=(sibxL+sibxR)/2, sipcy=(sibyT+sibyB)/2;
    [[x1,y1,"L1"],[x2,y2,"L2"],[six3,siy3,"L1'"],[six4,siy4,"L2'"]].forEach(([tx,ty,lbl])=>{
      g.appendChild(mk('circle',{cx:tx,cy:ty,r:4,fill:'#6b7280'}));
      const ddx=tx-sipcx, ddy=ty-sipcy, len=Math.hypot(ddx,ddy)||1;
      const t=mk('text',{x:tx+ddx/len*11,y:ty+ddy/len*11+3,'text-anchor':'middle',style:'fill:#6b7280;font-size:6px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
      t.textContent=lbl; g.appendChild(t);
    });
    // State label
    const silbl=mk('text',{x:(sibxL+sibxR)/2,y:sibyB+14,'text-anchor':'middle',style:'fill:#9ca3af;font-size:7px;font-family:JetBrains Mono Variable, ui-monospace, monospace'});
    silbl.textContent=sipos===0?'INT →':'INT ×'; g.appendChild(silbl);
    return;
  } else if(type==='switch2g_uk'||type==='switch3g_uk'){
    // Multi-gang UK plate switch — absolute SVG coords
    g.setAttribute('transform','translate(0,0)');
    const numGangs=type==='switch3g_uk'?3:2;
    const gx3=extra?.x3??x1, gy3=extra?.y3??y1;
    const gx4=extra?.x4??x2, gy4=extra?.y4??y2;
    const gx5=extra?.x5??x1, gy5=extra?.y5??y1;
    const gx6=extra?.x6??x2, gy6=extra?.y6??y2;
    // Collect all terminal coords to compute plate bounding box
    const allTx=[x1,x2,gx3,gx4], allTy=[y1,y2,gy3,gy4];
    if(numGangs===3){allTx.push(gx5,gx6);allTy.push(gy5,gy6);}
    const platL=Math.min(...allTx)-8, platT=Math.min(...allTy)-8;
    const platR=Math.max(...allTx)+8, platB=Math.max(...allTy)+8;
    const platW=platR-platL, platH=platB-platT;
    // Outer plate (white/light grey, blue border for multi-gang)
    g.appendChild(mk('rect',{x:platL,y:platT,width:platW,height:platH,rx:4,stroke:'#60a5fa','stroke-width':1.5,fill:'#f5f5f5'}));
    // Per-gang rockers and indicators
    const gangs=[
      {com:[x1,y1],sw:[x2,y2],state:extra?.gang1??0},
      {com:[gx3,gy3],sw:[gx4,gy4],state:extra?.gang2??0},
    ];
    if(numGangs===3) gangs.push({com:[gx5,gy5],sw:[gx6,gy6],state:extra?.gang3??0});
    gangs.forEach((gang,gi)=>{
      const [cx,cy]=gang.com, [sx,sy]=gang.sw;
      const closed=gang.state;
      // Determine rocker rect: centred between COM and SW, perpendicular
      const rmx=(cx+sx)/2, rmy=(cy+sy)/2;
      const dx=sx-cx, dy=sy-cy, rlen=Math.hypot(dx,dy)||1;
      const ux=dx/rlen, uy=dy/rlen;
      // Rocker aligned along gang direction
      const rW=rlen*0.8, rH=20;
      const rFill=closed?'#dcfce7':'#e8e8e8';
      // Compute rocker corner via rotation
      const rx0=rmx-ux*(rW/2)-(-uy)*(rH/2);
      const ry0=rmy-uy*(rW/2)-(ux)*(rH/2);
      g.appendChild(mk('rect',{
        x:rx0,y:ry0,width:rW,height:rH,rx:2,fill:rFill,stroke:'#b0b0b0','stroke-width':0.8,
        transform:`rotate(${Math.round(Math.atan2(dy,dx)*180/Math.PI)},${rmx},${rmy})`
      }));
      // Pivot line (rocker centre line)
      g.appendChild(mk('line',{x1:cx,y1:cy,x2:sx,y2:sy,stroke:'#aaaaaa','stroke-width':0.8}));
      // ON indicator dot
      const indX=sx-ux*(rlen*0.1)+uy*6, indY=sy-uy*(rlen*0.1)-ux*6;
      g.appendChild(mk('circle',{cx:indX,cy:indY,r:2.5,fill:closed?'#22c55e':'#d1d5db'}));
      // Terminal dots
      g.appendChild(mk('circle',{cx,cy,r:4,fill:'#60a5fa'}));
      g.appendChild(mk('circle',{cx:sx,cy:sy,r:4,fill:'#60a5fa'}));
      // Gang number label near COM terminal
      const lx=cx-ux*10-uy*8, ly=cy-uy*10+ux*8;
      const gl=mk('text',{x:lx,y:ly,'text-anchor':'middle',style:'fill:#60a5fa;font-size:6px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
      gl.textContent='G'+(gi+1); g.appendChild(gl);
    });
    // Gang plate label
    const midLblX=(platL+platR)/2, midLblY=platB+12;
    const plbl=mk('text',{x:midLblX,y:midLblY,'text-anchor':'middle',style:'fill:#60a5fa;font-size:7px;font-family:JetBrains Mono Variable, ui-monospace, monospace'});
    plbl.textContent=numGangs+'-gang'; g.appendChild(plbl);
    return;
  } else if(type==='buzzer'){
    // Two-terminal device: x1=+, x2=-
    g.setAttribute('transform','translate(0,0)');
    const bcol='#facc15';
    const mx2=(x1+x2)/2, my2=(y1+y2)/2;
    const dx2=x2-x1, dy2=y2-y1, dlen=Math.hypot(dx2,dy2)||1;
    const ux=dx2/dlen, uy=dy2/dlen; // unit vector x1→x2
    const nx=-uy, ny=ux;            // normal
    const bw=20, bh=24;
    // Body: rect centred on midpoint, rotated along the x1→x2 axis
    const angle=Math.atan2(dy2,dx2)*180/Math.PI;
    const bgrp=mk('g',{transform:`translate(${mx2},${my2}) rotate(${angle})`});
    bgrp.appendChild(mk('rect',{x:-bw/2,y:-bh/2,width:bw,height:bh,rx:3,stroke:bcol,'stroke-width':1.5,fill:'rgba(250,204,21,0.08)'}));
    // Sound waves (to the side of the body)
    bgrp.appendChild(mk('path',{d:`M${bw/2+2},-8 Q${bw/2+9},0 ${bw/2+2},8`,stroke:bcol,'stroke-width':1.5,fill:'none'}));
    bgrp.appendChild(mk('path',{d:`M${bw/2+4},-13 Q${bw/2+14},0 ${bw/2+4},13`,stroke:bcol,'stroke-width':1,fill:'none',opacity:0.5}));
    g.appendChild(bgrp);
    // Wire stubs from terminals to body edge
    g.appendChild(mk('line',{x1,y1,x2:mx2-ux*bw/2,y2:my2-uy*bw/2,stroke:bcol,'stroke-width':1,'stroke-dasharray':'3,2'}));
    g.appendChild(mk('line',{x1:x2,y1:y2,x2:mx2+ux*bw/2,y2:my2+uy*bw/2,stroke:bcol,'stroke-width':1,'stroke-dasharray':'3,2'}));
    // Terminal dots
    g.appendChild(mk('circle',{cx:x1,cy:y1,r:3,fill:bcol}));
    g.appendChild(mk('circle',{cx:x2,cy:y2,r:3,fill:'#5d6a85'}));
    // +/- labels
    const tp=mk('text',{'text-anchor':'middle',style:`fill:${bcol};font-size:8px;font-family:JetBrains Mono Variable, ui-monospace, monospace`});
    tp.setAttribute('x', x1-ux*8); tp.setAttribute('y', y1-uy*8+3); tp.textContent='+'; g.appendChild(tp);
    const tm=mk('text',{'text-anchor':'middle',style:'fill:#5d6a85;font-size:8px;font-family:JetBrains Mono Variable, ui-monospace, monospace'});
    tm.setAttribute('x', x2+ux*8); tm.setAttribute('y', y2+uy*8+3); tm.textContent='−'; g.appendChild(tm);
    return;
  } else if(type==='seg7'){
    // Single-terminal: drawn at x1,y1. Input node = x1,y1.
    g.setAttribute('transform',`translate(${x1},${y1})`);
    const digit=Math.max(0,Math.min(9,Math.round(extra?.segVal??0)));
    // Segments: a(top) b(top-right) c(bot-right) d(bot) e(bot-left) f(top-left) g(middle)
    //  a
    // f b
    //  g
    // e c
    //  d
    const W=28, H=44, sw=4, seg_on='#0891b2', seg_off='rgba(8,145,178,0.1)';
    const SEG_MAP={
      0:[1,1,1,1,1,1,0],1:[0,1,1,0,0,0,0],2:[1,1,0,1,1,0,1],
      3:[1,1,1,1,0,0,1],4:[0,1,1,0,0,1,1],5:[1,0,1,1,0,1,1],
      6:[1,0,1,1,1,1,1],7:[1,1,1,0,0,0,0],8:[1,1,1,1,1,1,1],9:[1,1,1,1,0,1,1]
    };
    const segs=SEG_MAP[digit]||SEG_MAP[0];
    g.appendChild(mk('rect',{x:-4,y:-4,width:W+8,height:H+8,rx:3,fill:'#090c14',stroke:'#28324a','stroke-width':1}));
    // a - top horizontal
    g.appendChild(mk('rect',{x:2,y:0,width:W-4,height:sw,rx:sw/2,fill:segs[0]?seg_on:seg_off}));
    // b - top-right vertical
    g.appendChild(mk('rect',{x:W-sw,y:2,width:sw,height:H/2-2,rx:sw/2,fill:segs[1]?seg_on:seg_off}));
    // c - bottom-right vertical
    g.appendChild(mk('rect',{x:W-sw,y:H/2+2,width:sw,height:H/2-2,rx:sw/2,fill:segs[2]?seg_on:seg_off}));
    // d - bottom horizontal
    g.appendChild(mk('rect',{x:2,y:H-sw,width:W-4,height:sw,rx:sw/2,fill:segs[3]?seg_on:seg_off}));
    // e - bottom-left vertical
    g.appendChild(mk('rect',{x:0,y:H/2+2,width:sw,height:H/2-2,rx:sw/2,fill:segs[4]?seg_on:seg_off}));
    // f - top-left vertical
    g.appendChild(mk('rect',{x:0,y:2,width:sw,height:H/2-2,rx:sw/2,fill:segs[5]?seg_on:seg_off}));
    // g - middle horizontal
    g.appendChild(mk('rect',{x:2,y:H/2-sw/2,width:W-4,height:sw,rx:sw/2,fill:segs[6]?seg_on:seg_off}));
    return;
  } else if(type==='motor'){
    // Motor symbol: circle with M
    const r2=Math.min(bw/2,22);
    g.appendChild(mk('line',{x1:0,y1:0,x2:mid-r2,y2:0,class:'cl'}));
    g.appendChild(mk('circle',{cx:mid,cy:0,r:r2,stroke:'#a78bfa','stroke-width':1.5,fill:'rgba(167,139,250,0.08)'}));
    const mt=mk('text',{x:mid,y:4,'text-anchor':'middle',style:'fill:#a78bfa;font-size:12px;font-family:monospace;font-weight:bold'});
    mt.textContent='M'; g.appendChild(mt);
    // Rotation arrows inside circle
    g.appendChild(mk('path',{d:`M ${mid-r2*0.5},${-r2*0.2} A ${r2*0.5} ${r2*0.5} 0 1 1 ${mid+r2*0.4},${r2*0.2}`,
      stroke:'#a78bfa','stroke-width':1,fill:'none'}));
    g.appendChild(mk('line',{x1:mid+r2,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='xfmr'){
    // Transformer: two sets of coils separated by core line
    const coreX=mid;
    // Primary side (left)
    g.appendChild(mk('line',{x1:0,y1:-G*0.5,x2:mid-8,y2:-G*0.5,class:'cl'}));
    g.appendChild(mk('line',{x1:0,y1:G*0.5,x2:mid-8,y2:G*0.5,class:'cl'}));
    // Primary coils
    const arcs2=3, aw2=(mid-8)/arcs2;
    let dp=`M ${mid-8} ${-G*0.5}`;
    for(let i=0;i<arcs2;i++){const sx=mid-8-i*aw2;dp+=` Q ${sx-aw2/2} ${-G*0.5-8} ${sx-aw2} ${-G*0.5}`;}
    g.appendChild(mk('path',{d:dp,stroke:'#60a5fa','stroke-width':1.5,fill:'none'}));
    let dp2=`M ${mid-8} ${G*0.5}`;
    for(let i=0;i<arcs2;i++){const sx=mid-8-i*aw2;dp2+=` Q ${sx-aw2/2} ${G*0.5+8} ${sx-aw2} ${G*0.5}`;}
    g.appendChild(mk('path',{d:dp2,stroke:'#60a5fa','stroke-width':1.5,fill:'none'}));
    // Core
    g.appendChild(mk('line',{x1:coreX-3,y1:-G*0.7,x2:coreX-3,y2:G*0.7,stroke:'#8e9cb8','stroke-width':2.5}));
    g.appendChild(mk('line',{x1:coreX+3,y1:-G*0.7,x2:coreX+3,y2:G*0.7,stroke:'#8e9cb8','stroke-width':2.5}));
    // Secondary coils
    const aw3=(L-mid-8)/arcs2;
    let ds=`M ${mid+8} ${-G*0.5}`;
    for(let i=0;i<arcs2;i++){const sx=mid+8+i*aw3;ds+=` Q ${sx+aw3/2} ${-G*0.5-8} ${sx+aw3} ${-G*0.5}`;}
    g.appendChild(mk('path',{d:ds,stroke:'#60a5fa','stroke-width':1.5,fill:'none'}));
    let ds2=`M ${mid+8} ${G*0.5}`;
    for(let i=0;i<arcs2;i++){const sx=mid+8+i*aw3;ds2+=` Q ${sx+aw3/2} ${G*0.5+8} ${sx+aw3} ${G*0.5}`;}
    g.appendChild(mk('path',{d:ds2,stroke:'#60a5fa','stroke-width':1.5,fill:'none'}));
    g.appendChild(mk('line',{x1:L,y1:-G*0.5,x2:mid+8,y2:-G*0.5,class:'cl'}));
    g.appendChild(mk('line',{x1:L,y1:G*0.5,x2:mid+8,y2:G*0.5,class:'cl'}));
    // Terminal dots
    g.appendChild(mk('circle',{cx:0,cy:-G*0.5,r:2.5,fill:'#5d6a85'}));
    g.appendChild(mk('circle',{cx:0,cy:G*0.5,r:2.5,fill:'#5d6a85'}));
    g.appendChild(mk('circle',{cx:L,cy:-G*0.5,r:2.5,fill:'#5d6a85'}));
    g.appendChild(mk('circle',{cx:L,cy:G*0.5,r:2.5,fill:'#5d6a85'}));
  } else if(type==='load3'){
    // 3-phase load: rectangle with 3∅ label
    const rh=Math.min(16,L*0.25);
    g.appendChild(mk('line',{x1:0,y1:0,x2:pad,y2:0,class:'cl'}));
    g.appendChild(mk('rect',{x:pad,y:-rh/2,width:bw,height:rh,rx:2,stroke:'#f59e0b','stroke-width':1.5,fill:'rgba(245,158,11,0.08)'}));
    const lt=mk('text',{x:mid,y:4,'text-anchor':'middle',style:'fill:#f59e0b;font-size:10px;font-family:JetBrains Mono Variable, ui-monospace, monospace'});
    lt.textContent='3∅'; g.appendChild(lt);
    g.appendChild(mk('line',{x1:pad+bw,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='3ph'){
    // 3-phase source: rect with phase labels + 3 output stubs at right
    // Terminals (rotation=0): neutral=x1y1(left), phaseA=x2y2(right,centre),
    //   phaseB=x3y3(right,+G), phaseC=x4y4(right,-G)
    // Draw in absolute coords — set own transform
    g.setAttribute('transform',`translate(${x1},${y1}) rotate(${ang})`);
    const W=L, bH=3*G+8;
    const pad3=Math.max(8, L*0.1);
    // Neutral input line
    g.appendChild(mk('line',{x1:0,y1:0,x2:pad3,y2:0,class:'cl'}));
    // Body rectangle (centred on y=0 = neutral y)
    g.appendChild(mk('rect',{x:pad3,y:-bH/2,width:W-2*pad3,height:bH,rx:3,stroke:'#f59e0b','stroke-width':1.5,fill:'rgba(245,158,11,0.08)'}));
    // Phase A at y=0, B at y=+G, C at y=-G (matches placeComp terminal layout)
    const phases=[{lbl:'A',dy:0},{lbl:'B',dy:G},{lbl:'C',dy:-G}];
    phases.forEach(({lbl,dy})=>{
      const t=mk('text',{x:W*0.5,y:dy+4,'text-anchor':'middle',style:'fill:#f59e0b;font-size:9px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
      t.textContent=lbl; g.appendChild(t);
      // Output line stub at right
      g.appendChild(mk('line',{x1:W-pad3,y1:dy,x2:W,y2:dy,class:'cl'}));
      g.appendChild(mk('circle',{cx:W,cy:dy,r:2.5,fill:'#f59e0b'}));
    });
    // Neutral label + dot
    const nt=mk('text',{x:pad3+6,y:-bH/2+10,style:'fill:#f59e0b;font-size:7px;font-family:JetBrains Mono Variable, ui-monospace, monospace'});
    nt.textContent='N'; g.appendChild(nt);
    g.appendChild(mk('circle',{cx:0,cy:0,r:2.5,fill:'#f59e0b'}));
    return; // skip transform wrapper
  } else if(type==='AND'||type==='OR'){
    g.removeAttribute('transform');  // draws in absolute SVG coords
    const col='#6ee7b7';
    const ox=x1, oy=y1;
    const inAx=x2, inAy=y2;
    const inBx=extra?.x3??x2, inBy=extra?.y3??y2;
    const midInX=(inAx+inBx)/2, midInY=(inAy+inBy)/2;
    const dx=ox-midInX, dy=oy-midInY;
    const cAx=inAx+dx, cAy=inAy+dy;
    const cBx=inBx+dx, cBy=inBy+dy;
    if(type==='AND'){
      const p=`M ${inAx},${inAy} L ${inBx},${inBy} Q ${cBx},${cBy} ${ox},${oy} Q ${cAx},${cAy} ${inAx},${inAy} Z`;
      g.appendChild(mk('path',{d:p,stroke:col,'stroke-width':1.5,fill:'rgba(110,231,183,0.10)'}));
    } else {
      const cpx=midInX+dx*0.4, cpy=midInY+dy*0.4;
      const p=`M ${inAx},${inAy} Q ${cpx},${cpy} ${inBx},${inBy} Q ${cBx},${cBy} ${ox},${oy} Q ${cAx},${cAy} ${inAx},${inAy} Z`;
      g.appendChild(mk('path',{d:p,stroke:col,'stroke-width':1.5,fill:'rgba(110,231,183,0.10)'}));
    }
    const lx=(midInX+ox)/2, ly=(midInY+oy)/2;
    const lbl=mk('text',{'text-anchor':'middle','dominant-baseline':'central',fill:col,'font-size':'9','font-family':'JetBrains Mono Variable, ui-monospace, monospace','font-weight':'bold','pointer-events':'none',x:lx,y:ly});
    lbl.textContent=type;
    g.appendChild(lbl);
    return;
  } else if(type==='NOT'){
    const col='#6ee7b7';
    const bodyL=L*0.65;
    const start=L*0.1;
    // Input lead
    g.appendChild(mk('line',{x1:0,y1:0,x2:start,y2:0,class:'cl'}));
    // Triangle body
    g.appendChild(mk('polygon',{points:`${start},${-bodyL*0.4} ${start},${bodyL*0.4} ${start+bodyL},0`,
      stroke:col,'stroke-width':1.5,fill:'rgba(110,231,183,0.10)'}));
    // Inversion bubble
    g.appendChild(mk('circle',{cx:start+bodyL+4,cy:0,r:4,stroke:col,'stroke-width':1.5,fill:'none'}));
    // Output lead
    g.appendChild(mk('line',{x1:start+bodyL+8,y1:0,x2:L,y2:0,class:'cl'}));
    const nlx=start+bodyL*0.42;
    const notLbl=mk('text',{'text-anchor':'middle','dominant-baseline':'central',fill:col,'font-size':'8','font-family':'JetBrains Mono Variable, ui-monospace, monospace','font-weight':'bold','pointer-events':'none',x:nlx,y:1,transform:`rotate(${-ang},${nlx},1)`});
    notLbl.textContent='NOT';
    g.appendChild(notLbl);
  } else if(type==='nmos'){
    g.removeAttribute('transform');  // draws in absolute SVG coords
    const midY=(y1+y2)/2, midX=(x1+x2)/2;
    const gx=extra?.x3??x1-G, gy=extra?.y3??midY;
    const col='#a78bfa';
    const conducting=extra?.mosfetOn;
    const stubLen=G*0.28;  // D/S stub length toward the channel
    const isDV=Math.abs(y2-y1)>=Math.abs(x2-x1);  // D-to-S axis: vertical?
    let chx1,chy1,chx2,chy2, insx1,insy1,insx2,insy2, glx,gly;
    if(isDV){
      // Gate is left (r=0) or right (r=2); channel bar is vertical
      const gateLeft=(gx<midX);
      const chx=x1+(gateLeft?-stubLen:stubLen);
      chx1=chx; chy1=y1; chx2=chx; chy2=y2;
      // Horizontal D/S stubs
      g.appendChild(mk('line',{'x1':x1,'y1':y1,'x2':chx,'y2':y1,stroke:col,'stroke-width':1.5}));
      g.appendChild(mk('line',{'x1':x2,'y1':y2,'x2':chx,'y2':y2,stroke:col,'stroke-width':1.5}));
      // Gate insulator bar (vertical, 3px toward gate from channel)
      const insx=gateLeft?chx-3:chx+3;
      insx1=insx; insy1=midY-G*0.3; insx2=insx; insy2=midY+G*0.3;
      glx=insx; gly=midY;
      // Arrow tip at channel, body away from gate
      const ad=gateLeft?1:-1;
      g.appendChild(mk('polygon',{points:`${chx},${midY} ${chx+ad*7},${midY-5} ${chx+ad*7},${midY+5}`,fill:col,opacity:0.7}));
    } else {
      // Gate is above (r=1) or below (r=3); channel bar is horizontal
      const gateAbove=(gy<midY);
      const chy=y1+(gateAbove?-stubLen:stubLen);
      chx1=Math.min(x1,x2); chy1=chy; chx2=Math.max(x1,x2); chy2=chy;
      // Vertical D/S stubs
      g.appendChild(mk('line',{'x1':x1,'y1':y1,'x2':x1,'y2':chy,stroke:col,'stroke-width':1.5}));
      g.appendChild(mk('line',{'x1':x2,'y1':y2,'x2':x2,'y2':chy,stroke:col,'stroke-width':1.5}));
      // Gate insulator bar (horizontal, 3px toward gate from channel)
      const insy=gateAbove?chy-3:chy+3;
      insx1=midX-G*0.3; insy1=insy; insx2=midX+G*0.3; insy2=insy;
      glx=midX; gly=insy;
      const ad=gateAbove?1:-1;
      g.appendChild(mk('polygon',{points:`${midX},${chy} ${midX-5},${chy+ad*7} ${midX+5},${chy+ad*7}`,fill:col,opacity:0.7}));
    }
    // Channel, insulator, gate lead
    g.appendChild(mk('line',{'x1':chx1,'y1':chy1,'x2':chx2,'y2':chy2,stroke:col,'stroke-width':2}));
    g.appendChild(mk('line',{'x1':insx1,'y1':insy1,'x2':insx2,'y2':insy2,stroke:col,'stroke-width':2.5}));
    g.appendChild(mk('line',{'x1':glx,'y1':gly,'x2':gx,'y2':gy,stroke:col,'stroke-width':1.5}));
    // Labels
    const dLbl=mk('text',{'x':x1+(isDV?4:0),'y':y1+(isDV?-4:-10),fill:col,'font-size':8,'font-family':'JetBrains Mono Variable, ui-monospace, monospace'});
    dLbl.textContent='D'; g.appendChild(dLbl);
    const sLbl=mk('text',{'x':x2+(isDV?4:0),'y':y2+(isDV?10:14),fill:col,'font-size':8,'font-family':'JetBrains Mono Variable, ui-monospace, monospace'});
    sLbl.textContent='S'; g.appendChild(sLbl);
    const gLbl=mk('text',{'x':gx,'y':gy+(isDV?-4:0),fill:col,'font-size':8,'font-family':'JetBrains Mono Variable, ui-monospace, monospace','text-anchor':(isDV?'end':'middle')});
    gLbl.textContent='G'; g.appendChild(gLbl);
    if(conducting){
      if(isDV) g.appendChild(mk('rect',{'x':chx1-2,'y':chy1,'width':4,'height':chy2-chy1,fill:col,opacity:0.25}));
      else g.appendChild(mk('rect',{'x':chx1,'y':chy1-2,'width':chx2-chx1,'height':4,fill:col,opacity:0.25}));
    }
    return; // drawn in absolute coords
  } else if(type==='plug'){
    // UK BS 1363 plug — draws in absolute SVG coords.
    // x1,y1=cable-L  x2,y2=cable-N  x3,y3=pin-L (=socket L)  x4,y4=pin-N (=socket N)
    g.removeAttribute('transform');
    const pLx=extra?.x3??null, pLy=extra?.y3??null;
    const pNx=extra?.x4??null, pNy=extra?.y4??null;
    if(pLx===null||pNx===null) return;
    // Derive face geometry: face centre = midpoint of L/N wire-entry points
    const fcx=(pLx+pNx)/2, fcy=(pLy+pNy)/2;
    const pd=Math.hypot(pNx-pLx,pNy-pLy)||1;
    const tx=(pNx-pLx)/pd, ty=(pNy-pLy)/pd;   // tangent unit vector along pin axis
    const cmx=(x1+x2)/2, cmy=(y1+y2)/2;
    const cd=Math.hypot(cmx-fcx,cmy-fcy)||1;
    const nrx=(cmx-fcx)/cd, nry=(cmy-fcy)/cd; // cable direction unit vector (toward cable)
    // Visual slot positions — derived from socket_uk face geometry (fw=22, slot offsets ±11.5/14.5)
    // These exactly match where the socket_uk L/N slot rects appear for every rotation.
    const vLx=fcx+11.5*tx+14.5*nrx, vLy=fcy+11.5*ty+14.5*nry;
    const vNx=fcx-11.5*tx+14.5*nrx, vNy=fcy-11.5*ty+14.5*nry;
    // Plug body: 44px wide (same as socket face), 16px deep, sitting just outside the face edge
    const fw=22, bd=16;
    const b1x=fcx+fw*tx+fw*nrx,      b1y=fcy+fw*ty+fw*nry;       // body top-right
    const b2x=fcx-fw*tx+fw*nrx,      b2y=fcy-fw*ty+fw*nry;       // body top-left
    const b3x=fcx-fw*tx+(fw+bd)*nrx, b3y=fcy-fw*ty+(fw+bd)*nry;  // body bottom-left
    const b4x=fcx+fw*tx+(fw+bd)*nrx, b4y=fcy+fw*ty+(fw+bd)*nry;  // body bottom-right
    // Pin prongs — solid lines from visual slot centre to body top edge (pins entering socket slots)
    g.appendChild(mk('line',{x1:vLx,y1:vLy,x2:fcx+11.5*tx+fw*nrx,y2:fcy+11.5*ty+fw*nry,stroke:'#b45309','stroke-width':2,'stroke-linecap':'round'}));
    g.appendChild(mk('line',{x1:vNx,y1:vNy,x2:fcx-11.5*tx+fw*nrx,y2:fcy-11.5*ty+fw*nry,stroke:'#2563eb','stroke-width':2,'stroke-linecap':'round'}));
    // Plug body rectangle
    g.appendChild(mk('polygon',{points:`${b1x},${b1y} ${b2x},${b2y} ${b3x},${b3y} ${b4x},${b4y}`,stroke:'#9ca3af','stroke-width':1.5,fill:'#f9fafb'}));
    // "PLUG" label centred in body
    const plbl=mk('text',{'text-anchor':'middle','dominant-baseline':'central',fill:'#6b7280','font-size':'6','font-family':'JetBrains Mono Variable, ui-monospace, monospace','font-weight':'bold','pointer-events':'none',x:(b1x+b2x+b3x+b4x)/4,y:(b1y+b2y+b3y+b4y)/4});
    plbl.textContent='PLUG'; g.appendChild(plbl);
    // Flex cables: dashed lines from body bottom (aligned with pins) to cable terminals
    const fLx=fcx+11.5*tx+(fw+bd)*nrx, fLy=fcy+11.5*ty+(fw+bd)*nry;
    const fNx=fcx-11.5*tx+(fw+bd)*nrx, fNy=fcy-11.5*ty+(fw+bd)*nry;
    g.appendChild(mk('line',{x1:fLx,y1:fLy,x2:x1,y2:y1,stroke:'#b45309','stroke-width':1.5,'stroke-dasharray':'4,2'}));
    g.appendChild(mk('line',{x1:fNx,y1:fNy,x2:x2,y2:y2,stroke:'#2563eb','stroke-width':1.5,'stroke-dasharray':'4,2'}));
    // L/N labels on flex cables
    const lLbl=mk('text',{'text-anchor':'middle','dominant-baseline':'central',fill:'#b45309','font-size':'7','font-family':'JetBrains Mono Variable, ui-monospace, monospace','font-weight':'bold','pointer-events':'none',x:(fLx+x1)/2,y:(fLy+y1)/2});
    lLbl.textContent='L'; g.appendChild(lLbl);
    const nLbl=mk('text',{'text-anchor':'middle','dominant-baseline':'central',fill:'#2563eb','font-size':'7','font-family':'JetBrains Mono Variable, ui-monospace, monospace','font-weight':'bold','pointer-events':'none',x:(fNx+x2)/2,y:(fNy+y2)/2});
    nLbl.textContent='N'; g.appendChild(nLbl);
    return;
  } else if(type==='socket_uk'){
    // UK BS 1363 socket outlet — 3 terminals: L (x1), N (x2), E (x3/extra)
    const smid=L/2;
    const ex3=extra?.x3??null, ey3=extra?.y3??null;
    // Square BS 1363 faceplate — 44×44px centred in the 3G component body
    const ph=44, pw=44, px0=smid-pw/2, py0=-ph/2;
    // Lead wires from terminals to plate edges
    g.appendChild(mk('line',{x1:0,y1:0,x2:px0,y2:0,class:'cl'}));
    g.appendChild(mk('line',{x1:px0+pw,y1:0,x2:L,y2:0,class:'cl'}));
    // Earth exits from TOP of face (away from plug insertion side) matching the earth slot position
    const earthLy=-G;
    g.appendChild(mk('line',{x1:smid,y1:py0,x2:smid,y2:earthLy,stroke:'#22c55e','stroke-width':1.5}));
    // Square plate face
    g.appendChild(mk('rect',{x:px0,y:py0,width:pw,height:ph,rx:0,stroke:'#d0d0d0','stroke-width':1.5,fill:'#f5f5f5'}));
    // Earth slot — top centre
    g.appendChild(mk('rect',{x:smid-4,y:py0+4,width:8,height:10,rx:0,fill:'#22c55e',opacity:0.7}));
    // Neutral slot — bottom left
    g.appendChild(mk('rect',{x:px0+4,y:py0+ph-11,width:13,height:7,rx:0,fill:'#3b82f6',opacity:0.8}));
    // Live slot — bottom right
    g.appendChild(mk('rect',{x:px0+pw-17,y:py0+ph-11,width:13,height:7,rx:0,fill:'#f59e0b',opacity:0.8}));
    // Terminal labels
    const tE2=mk('text',{x:smid,y:py0+18,'text-anchor':'middle',style:'fill:#22c55e;font-size:5.5px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    tE2.textContent='E'; g.appendChild(tE2);
    const tN2=mk('text',{x:px0+10,y:py0+ph-1,'text-anchor':'middle',style:'fill:#60a5fa;font-size:5.5px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    tN2.textContent='N'; g.appendChild(tN2);
    const tL2=mk('text',{x:px0+pw-10,y:py0+ph-1,'text-anchor':'middle',style:'fill:#f59e0b;font-size:5.5px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    tL2.textContent='L'; g.appendChild(tL2);
    // Earth terminal dot (on the back/wall side, opposite the plug face)
    g.appendChild(mk('circle',{cx:smid,cy:earthLy,r:4,fill:'#22c55e'}));
    const tEext=mk('text',{x:smid+8,y:earthLy-4,'text-anchor':'start',style:'fill:#22c55e;font-size:6px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    tEext.textContent='E'; g.appendChild(tEext);
  } else if(type==='switch_uk'){
    // UK plate switch — 3 terminals: COM (x1), L1 (x2), E (x3/extra)
    const closed=extra?.closed??false;
    const pL=G*0.3, pR=G*2.7;
    const smid2=L/2;
    const earthLy2=-G;
    // Lead wires
    g.appendChild(mk('line',{x1:0,y1:0,x2:pL,y2:0,class:'cl'}));
    g.appendChild(mk('line',{x1:pR,y1:0,x2:L,y2:0,class:'cl'}));
    // Earth wire (green, toward back/wall side — away from rocker face)
    g.appendChild(mk('line',{x1:smid2,y1:0,x2:smid2,y2:earthLy2,stroke:'#22c55e','stroke-width':1.5}));
    // Outer plate
    g.appendChild(mk('rect',{x:pL,y:-20,width:G*2.4,height:40,rx:3,stroke:'#c0c0c0','stroke-width':1.5,fill:'#f5f5f5'}));
    // Inner rocker
    const rockerFill=closed?'#dcfce7':'#e8e8e8';
    g.appendChild(mk('rect',{x:G*0.5,y:-15,width:G*2,height:30,rx:2,fill:rockerFill,stroke:'#b0b0b0','stroke-width':1}));
    // Rocker pivot line
    g.appendChild(mk('line',{x1:G*0.5,y1:0,x2:G*2.5,y2:0,stroke:'#aaa','stroke-width':0.8}));
    // ON indicator dot
    g.appendChild(mk('circle',{cx:G*2.3,cy:-8,r:2,fill:closed?'#22c55e':'#d1d5db'}));
    // Terminal labels on plate
    const tCOM=mk('text',{x:G*0.9,y:13,'text-anchor':'middle',style:'fill:#8e9cb8;font-size:5px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    tCOM.textContent='COM'; g.appendChild(tCOM);
    const tL1=mk('text',{x:G*2.1,y:13,'text-anchor':'middle',style:'fill:#8e9cb8;font-size:5px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    tL1.textContent='L1'; g.appendChild(tL1);
    // Earth terminal dot + label (back/wall side)
    g.appendChild(mk('circle',{cx:smid2,cy:earthLy2,r:4,fill:'#22c55e'}));
    const tEsw=mk('text',{x:smid2+8,y:earthLy2-4,'text-anchor':'start',style:'fill:#22c55e;font-size:6px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    tEsw.textContent='E'; g.appendChild(tEsw);
  } else if(type==='crose'){
    // Ceiling rose / light point
    const cr2=Math.min(bw/2,22);
    g.appendChild(mk('line',{x1:0,y1:0,x2:mid-cr2,y2:0,class:'cl'}));
    // Outer ring (ceiling rose disc)
    g.appendChild(mk('circle',{cx:mid,cy:0,r:cr2,stroke:'#e5c07b','stroke-width':1.5,fill:'rgba(229,192,123,0.1)',class:'crose-ring'}));
    // Inner lamp circle
    const litFill=extra?.simPower>0.1?'#ffd700':'rgba(255,215,0,0.3)';
    g.appendChild(mk('circle',{cx:mid,cy:0,r:6,fill:litFill,class:'crose-bulb'}));
    // Pendant drop line
    g.appendChild(mk('line',{x1:mid,y1:cr2,x2:mid,y2:cr2+8,stroke:'#888','stroke-width':1}));
    // Globe pendant
    g.appendChild(mk('circle',{cx:mid,cy:cr2+12,r:4,fill:'#ffe',stroke:'#ccc','stroke-width':1}));
    g.appendChild(mk('line',{x1:mid+cr2,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='mcb'){
    // DIN-rail MCB profile
    const mw=G*1.6, mh=28, mx=(L-mw)/2;
    // Lead lines
    g.appendChild(mk('line',{x1:0,y1:0,x2:mx,y2:0,class:'cl'}));
    g.appendChild(mk('line',{x1:mx+mw,y1:0,x2:L,y2:0,class:'cl'}));
    // MCB body
    const blown=extra?.blown??false;
    g.appendChild(mk('rect',{x:mx,y:-14,width:mw,height:28,rx:2,fill:'#0d1a2e',stroke:blown?'#ef4444':'#3b82f6','stroke-width':1.5}));
    // Trip toggle / rocker on front
    const toggleFill=blown?'#ef4444':'#3b82f6';
    g.appendChild(mk('rect',{x:mx+G*0.2,y:-10,width:G*1.2,height:10,rx:1,fill:toggleFill}));
    // Rating label
    const mt=mk('text',{x:mid,y:8,'text-anchor':'middle',style:'fill:#fff;font-size:7px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    mt.textContent=blown?'TRIP':`B${extra?.ratingLabel??'?'}`; g.appendChild(mt);
  } else if(type==='cunit'){
    // Consumer unit — LANDSCAPE layout: supply section left, MCB columns right.
    // Width=(numMCBs+2)*G, Height=4*G. Draws in absolute SVG coords.
    g.setAttribute('transform','');
    const cuMCBs=extra?.cuMCBs??[];
    const numMCBs=cuMCBs.length;
    const cuDP=extra?.cuDP??true;
    const cuRCD=extra?.cuRCD??true;
    const cuRCDma=extra?.cuRCDma??30;
    const cuSPD=extra?.cuSPD??false;
    const cuW=numMCBs>0?(numMCBs+2)*G:(extra?.cuBoxW??2)*G;  // 2G supply + 1G per MCB slot; or custom width
    const cuH=(extra?.cuBoxH??4)*G;  // default 4G; cuBoxH override in grid units
    // x1=L-in terminal (left edge, 2G below anchor), so box top = x1,y1-2G
    const ox=x1; const oy=y1-2*G;

    // Shadow + main body
    g.appendChild(mk('rect',{x:ox+3,y:oy+3,width:cuW,height:cuH,rx:6,fill:'rgba(0,0,0,0.08)'}));
    g.appendChild(mk('rect',{x:ox,y:oy,width:cuW,height:cuH,rx:6,fill:'#0d1a2e',
      stroke:'#4da3ff','stroke-width':2,'stroke-dasharray':'6,3'}));

    // Header strip (full width, top G*0.62)
    const hh=G*0.62;
    g.appendChild(mk('rect',{x:ox,y:oy,width:cuW,height:hh,rx:6,fill:'rgba(77,163,255,0.12)',stroke:'none'}));
    const hdrlbl=mk('text',{x:ox+cuW/2,y:oy+hh*0.76,'text-anchor':'middle',
      style:'fill:#4da3ff;font-size:8px;font-family:inherit;font-weight:bold;letter-spacing:2px'});
    hdrlbl.textContent='CONSUMER UNIT'; g.appendChild(hdrlbl);

    // ── Supply section (left 2G, below header) ──────────────────────────────
    const supY=oy+hh;
    const supH=cuH-hh;
    const svtlbl=mk('text',{x:ox+G,y:supY+G*0.18,'text-anchor':'middle',
      style:'fill:#5d6a85;font-size:5px;font-family:inherit;letter-spacing:1px'});
    svtlbl.textContent='SUPPLY'; g.appendChild(svtlbl);

    // DP block (left half of supply section)
    if(cuDP){
      const dpx=ox+G*0.1, dpy=supY+G*0.28, dpw=G*0.75, dph=supH*0.42;
      g.appendChild(mk('rect',{x:dpx,y:dpy,width:dpw,height:dph,rx:2,fill:'#eff6ff',stroke:'#3b82f6','stroke-width':1}));
      const dpt=mk('text',{x:dpx+dpw/2,y:dpy+dph/2+3,'text-anchor':'middle',
        style:'fill:#1d4ed8;font-size:5px;font-family:inherit;font-weight:bold'});
      dpt.textContent='DP'; g.appendChild(dpt);
    }
    // RCD block (right half of supply section)
    if(cuRCD){
      const rcdx=ox+G*1.14, rcdy=supY+G*0.28, rcdw=G*0.75, rcdh=supH*0.42;
      g.appendChild(mk('rect',{x:rcdx,y:rcdy,width:rcdw,height:rcdh,rx:2,fill:'#fffbeb',stroke:'#f59e0b','stroke-width':1}));
      const rcdt=mk('text',{x:rcdx+rcdw/2,y:rcdy+rcdh*0.42,'text-anchor':'middle',
        style:'fill:#f5a623;font-size:5px;font-family:inherit;font-weight:bold'});
      rcdt.textContent='RCD'; g.appendChild(rcdt);
      const rcdma=mk('text',{x:rcdx+rcdw/2,y:rcdy+rcdh*0.42+8,'text-anchor':'middle',
        style:'fill:#92400e;font-size:4px;font-family:inherit'});
      rcdma.textContent=cuRCDma+'mA'; g.appendChild(rcdma);
    }
    // SPD block (bottom strip spanning supply section)
    if(cuSPD){
      const spdx=ox+G*0.1, spdy=supY+supH*0.76, spdw=G*1.78, spdh=supH*0.2;
      g.appendChild(mk('rect',{x:spdx,y:spdy,width:spdw,height:spdh,rx:2,fill:'#fefce8',stroke:'#eab308','stroke-width':1}));
      const spdt=mk('text',{x:spdx+spdw/2,y:spdy+spdh/2+3,'text-anchor':'middle',
        style:'fill:#a16207;font-size:4.5px;font-family:inherit;font-weight:bold'});
      spdt.textContent='SPD'; g.appendChild(spdt);
    }

    // ── MCB rail (right of divX) — only when MCBs are configured ────────────
    if(numMCBs>0){
      const divX=ox+2*G;
      g.appendChild(mk('line',{x1:divX,y1:oy+hh,x2:divX,y2:oy+cuH,stroke:'#28324a','stroke-width':1.5}));
      // Live bus bar: horizontal red line near top of MCB area
      const busY=oy+hh+G*0.32;
      g.appendChild(mk('line',{x1:divX+4,y1:busY,x2:ox+cuW-4,y2:busY,stroke:'#ef4444','stroke-width':3,'stroke-linecap':'round'}));

      // Neutral bar: horizontal blue strip near bottom
      const nbarY=oy+cuH-G*0.72;
      const nbarH=G*0.32;
      g.appendChild(mk('rect',{x:divX+2,y:nbarY,width:numMCBs*G-4,height:nbarH,rx:2,fill:'#eff6ff',stroke:'#3b82f6','stroke-width':1.2}));
      const nbt=mk('text',{x:divX+numMCBs*G/2,y:nbarY+nbarH/2+3,'text-anchor':'middle',
        style:'fill:#1d4ed8;font-size:5px;font-family:inherit;font-weight:bold'});
      nbt.textContent='N'; g.appendChild(nbt);

      // PE bar: horizontal green strip at very bottom
      const peY=oy+cuH-G*0.35;
      const peH=G*0.28;
      g.appendChild(mk('rect',{x:divX+2,y:peY,width:numMCBs*G-4,height:peH,rx:2,fill:'#f0fdf4',stroke:'#4ade80','stroke-width':1}));
      const pet=mk('text',{x:divX+numMCBs*G/2,y:peY+peH/2+3,'text-anchor':'middle',
        style:'fill:#16a34a;font-size:4.5px;font-family:inherit;font-weight:bold'});
      pet.textContent='PE'; g.appendChild(pet);

      // MCB columns — one per slot, each 1G wide
      const slotBodyH=G*1.55;
      const slotBodyY=busY+G*0.14;
      for(let i=0;i<numMCBs;i++){
        const mcb=cuMCBs[i]||{A:32,label:''};
        const sx=divX+i*G;       // left edge of slot column
        const scx=sx+G*0.5;      // centre x of slot
        // Slot body
        g.appendChild(mk('rect',{x:sx+G*0.08,y:slotBodyY,width:G*0.84,height:slotBodyH,
          rx:2,fill:'#1a1a2e',stroke:'#28324a','stroke-width':1}));
        // Rocker toggle
        g.appendChild(mk('rect',{x:sx+G*0.12,y:slotBodyY+3,width:G*0.4,height:slotBodyH*0.38,
          rx:1,fill:'#3b82f6'}));
        // Rating (B6/B32) — top of slot
        const ratingT=mk('text',{x:scx,y:slotBodyY+slotBodyH*0.35,'text-anchor':'middle',
          style:'fill:#1d4ed8;font-size:5px;font-family:inherit;font-weight:bold'});
        ratingT.textContent='B'+mcb.A; g.appendChild(ratingT);
        // Circuit label — bottom of slot (truncated 6 chars to fit 1G width)
        const circT=mk('text',{x:scx,y:slotBodyY+slotBodyH*0.72,'text-anchor':'middle',
          style:'fill:#8e9cb8;font-size:4px;font-family:inherit'});
        circT.textContent=(mcb.label||'').slice(0,6); g.appendChild(circT);
        // Red dot on bus bar (internal indicator)
        g.appendChild(mk('circle',{cx:scx,cy:busY,r:2.5,fill:'#ef4444',stroke:'#ffffff','stroke-width':0.8}));
        // Blue dot on neutral bar (internal indicator)
        g.appendChild(mk('circle',{cx:scx,cy:nbarY+nbarH/2,r:2.5,fill:'#3b82f6',stroke:'#ffffff','stroke-width':0.8}));
        // MCB output terminal — at bottom edge of CU box (external wire connection point)
        const termX=ox+(2+i)*G, termY=oy+cuH;
        g.appendChild(mk('line',{x1:scx,y1:slotBodyY+slotBodyH,x2:termX,y2:termY,stroke:'#22c55e','stroke-width':1,'stroke-dasharray':'2,2'}));
        const blown2=extra?.cuMCBTerms?.[i]?.blown??false;
        g.appendChild(mk('circle',{cx:termX,cy:termY,r:4,fill:blown2?'#ef4444':'#22c55e',stroke:'#ffffff','stroke-width':1}));
        const tOut=mk('text',{x:termX+6,y:termY+3,'text-anchor':'start',style:'fill:#16a34a;font-size:5px;font-family:inherit'});
        tOut.textContent='L'+(i+1); g.appendChild(tOut);
      }
    }

    // L-in terminal dot (external wire connection — mains Live input)
    g.appendChild(mk('circle',{cx:ox,cy:oy+2*G,r:5,fill:'#ef4444',stroke:'#ffffff','stroke-width':1.2}));
    const tLin=mk('text',{x:ox-8,y:oy+2*G+3,'text-anchor':'end',style:'fill:#ef4d4d;font-size:6px;font-family:inherit;font-weight:bold'});
    tLin.textContent='L'; g.appendChild(tLin);
    // N-bar terminal dot (external wire connection — Neutral bar input)
    g.appendChild(mk('circle',{cx:ox+G,cy:oy+cuH,r:5,fill:'#3b82f6',stroke:'#ffffff','stroke-width':1.2}));
    const tNbar=mk('text',{x:ox+G-8,y:oy+cuH+12,'text-anchor':'middle',style:'fill:#1d4ed8;font-size:6px;font-family:inherit;font-weight:bold'});
    tNbar.textContent='N'; g.appendChild(tNbar);

  } else if(type==='supply'){
    // UK single-phase mains supply — orange bordered box with ~ 230V 50Hz
    const sbw=bw*1.0, sx2=(L-sbw)/2;
    g.appendChild(mk('line',{x1:0,y1:0,x2:sx2,y2:0,class:'cl'}));
    g.appendChild(mk('rect',{x:sx2,y:-18,width:sbw,height:36,rx:4,fill:'#1a0800',stroke:'#f97316','stroke-width':2}));
    // AC sine wave symbol
    const scx=sx2+sbw*0.38;
    g.appendChild(mk('path',{d:`M ${scx-8},0 C ${scx-4},-10 ${scx+4},-10 ${scx+8},0 C ${scx+4},10 ${scx-4},10 ${scx-8},0`,stroke:'#fb923c','stroke-width':1.5,fill:'none'}));
    const svt1=mk('text',{x:sx2+sbw*0.78,y:-6,'text-anchor':'middle',style:'fill:#f97316;font-size:7px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    svt1.textContent='230V'; g.appendChild(svt1);
    const svt2=mk('text',{x:sx2+sbw*0.78,y:4,'text-anchor':'middle',style:'fill:#fb923c;font-size:6px;font-family:JetBrains Mono Variable, ui-monospace, monospace'});
    svt2.textContent='50Hz'; g.appendChild(svt2);
    // L / N terminal labels
    const lt=mk('text',{x:sx2-2,y:14,'text-anchor':'end',style:'fill:#f87171;font-size:7px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    lt.textContent='L'; g.appendChild(lt);
    const nt=mk('text',{x:sx2+sbw+2,y:14,'text-anchor':'start',style:'fill:#60a5fa;font-size:7px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    nt.textContent='N'; g.appendChild(nt);
    g.appendChild(mk('line',{x1:sx2+sbw,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='dpswitch'){
    const dpclosed=extra?.closed??false;
    const dpL=G*0.3, dpR=G*2.7;
    const dpx1=G*0.6, dpx2=G*2.4;
    const col=dpclosed?'#22c55e':'#aaa';
    // L path lead lines (y=0)
    g.appendChild(mk('line',{x1:0,y1:0,x2:dpL,y2:0,class:'cl'}));
    g.appendChild(mk('line',{x1:dpR,y1:0,x2:L,y2:0,class:'cl'}));
    // N path lead lines (y=G)
    g.appendChild(mk('line',{x1:0,y1:G,x2:dpL,y2:G,class:'cl'}));
    g.appendChild(mk('line',{x1:dpR,y1:G,x2:L,y2:G,class:'cl'}));
    // Body spanning both L and N rails
    g.appendChild(mk('rect',{x:dpL,y:-16,width:G*2.4,height:G+32,rx:3,stroke:'#c0c0c0','stroke-width':1.5,fill:'#f5f5f5'}));
    g.appendChild(mk('rect',{x:G*0.5,y:-12,width:G*2,height:G+24,rx:2,fill:dpclosed?'#dcfce7':'#e8e8e8',stroke:'#b0b0b0','stroke-width':1}));
    // L contact (y=0 rail)
    if(dpclosed){
      g.appendChild(mk('line',{x1:dpx1,y1:-5,x2:dpx2,y2:-5,stroke:col,'stroke-width':1.5}));
      g.appendChild(mk('line',{x1:dpx1,y1:G+5,x2:dpx2,y2:G+5,stroke:col,'stroke-width':1.5}));
    } else {
      g.appendChild(mk('line',{x1:dpx1,y1:-5,x2:dpx2,y2:-10,stroke:col,'stroke-width':1.5}));
      g.appendChild(mk('line',{x1:dpx1,y1:G+5,x2:dpx2,y2:G,stroke:col,'stroke-width':1.5}));
    }
    // Ganging bar connecting both contacts
    const gmx=(dpx1+dpx2)/2;
    g.appendChild(mk('line',{x1:gmx,y1:dpclosed?-5:-10,x2:gmx,y2:dpclosed?G+5:G,'stroke':col,'stroke-width':1.5,'stroke-dasharray':'2,3'}));
    // L / N terminal labels
    const llt=mk('text',{x:dpL-2,y:3,'text-anchor':'end',style:'fill:#f87171;font-size:7px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    llt.textContent='L'; g.appendChild(llt);
    const nlt=mk('text',{x:dpL-2,y:G+3,'text-anchor':'end',style:'fill:#60a5fa;font-size:7px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    nlt.textContent='N'; g.appendChild(nlt);
    const dpt=mk('text',{x:G*1.5,y:G/2+4,'text-anchor':'middle',style:'fill:#5d6a85;font-size:7px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    dpt.textContent='DP'; g.appendChild(dpt);
  } else if(type==='rcd'){
    const rcdTripped=extra?.tripped??false;
    const rcdbw=bw*0.8, rcdx=(L-rcdbw)/2;
    g.appendChild(mk('line',{x1:0,y1:0,x2:rcdx,y2:0,class:'cl'}));
    g.appendChild(mk('rect',{x:rcdx,y:-14,width:rcdbw,height:28,rx:3,fill:'#fffbeb',stroke:rcdTripped?'#ef4444':'#f59e0b','stroke-width':1.5}));
    g.appendChild(mk('circle',{cx:rcdx+rcdbw*0.75,cy:-5,r:4,fill:rcdTripped?'#ef4444':'#f5a623',stroke:'#fff','stroke-width':0.8}));
    const rcdt=mk('text',{x:rcdx+rcdbw*0.3,y:5,'text-anchor':'middle',style:'fill:#fbbf24;font-size:7px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    rcdt.textContent=rcdTripped?'TRIP':'RCD'; g.appendChild(rcdt);
    g.appendChild(mk('line',{x1:rcdx+rcdbw,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='meter'){
    const metbw=bw*0.85, metx=(L-metbw)/2;
    g.appendChild(mk('line',{x1:0,y1:0,x2:metx,y2:0,class:'cl'}));
    g.appendChild(mk('rect',{x:metx,y:-16,width:metbw,height:32,rx:3,fill:'#f0fdf4',stroke:'#22c55e','stroke-width':1.5}));
    g.appendChild(mk('rect',{x:metx+3,y:-12,width:metbw-6,height:12,rx:2,fill:'#166534',stroke:'#22c55e','stroke-width':0.8}));
    const mslotW=(metbw-12)/3;
    for(let i=0;i<3;i++) g.appendChild(mk('rect',{x:metx+5+i*(mslotW+1),y:-11,width:mslotW,height:10,rx:1,fill:'#14532d',stroke:'#4ade80','stroke-width':0.5}));
    const mkwh=mk('text',{x:metx+metbw/2,y:10,'text-anchor':'middle',style:'fill:#6ee7b7;font-size:6px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    mkwh.textContent='kWh'; g.appendChild(mkwh);
    g.appendChild(mk('line',{x1:metx+metbw,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='shower'){
    const shbw=bw*0.75, shx=(L-shbw)/2;
    g.appendChild(mk('line',{x1:0,y1:0,x2:shx,y2:0,class:'cl'}));
    g.appendChild(mk('rect',{x:shx,y:-16,width:shbw,height:32,rx:5,fill:'#eff6ff',stroke:'#3b82f6','stroke-width':1.5}));
    const shcx=shx+shbw*0.65;
    g.appendChild(mk('path',{d:`M ${shcx-4},-8 Q ${shcx},-12 ${shcx+4},-8`,stroke:'#60a5fa','stroke-width':1,fill:'none'}));
    g.appendChild(mk('path',{d:`M ${shcx-4},0 Q ${shcx},-4 ${shcx+4},0`,stroke:'#60a5fa','stroke-width':1,fill:'none'}));
    g.appendChild(mk('path',{d:`M ${shcx-4},8 Q ${shcx},4 ${shcx+4},8`,stroke:'#60a5fa','stroke-width':1,fill:'none'}));
    const sht=mk('text',{x:shx+shbw*0.3,y:4,'text-anchor':'middle',style:'fill:#93c5fd;font-size:6px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    sht.textContent='kW'; g.appendChild(sht);
    g.appendChild(mk('line',{x1:shx+shbw,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='cooker'){
    const ckbw=bw*0.85, ckx=(L-ckbw)/2;
    g.appendChild(mk('line',{x1:0,y1:0,x2:ckx,y2:0,class:'cl'}));
    g.appendChild(mk('rect',{x:ckx,y:-16,width:ckbw,height:32,rx:3,fill:'#1a0600',stroke:'#fb923c','stroke-width':1.5}));
    const ckrx=ckx+ckbw*0.2, ckry1=-8, ckry2=4, ckrs=5;
    [[ckrx,ckry1],[ckx+ckbw*0.55,ckry1],[ckrx,ckry2],[ckx+ckbw*0.55,ckry2]].forEach(([hx,hy])=>{
      g.appendChild(mk('circle',{cx:hx,cy:hy,r:ckrs,fill:'none',stroke:'#fb923c','stroke-width':1.2}));
      g.appendChild(mk('circle',{cx:hx,cy:hy,r:ckrs*0.5,fill:'#fb923c44'}));
    });
    const ckt=mk('text',{x:ckx+ckbw*0.85,y:14,'text-anchor':'middle',style:'fill:#fb923c;font-size:5px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    ckt.textContent='kW'; g.appendChild(ckt);
    g.appendChild(mk('line',{x1:ckx+ckbw,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='kettle'){
    const kbw=L*0.65, kbx=(L-kbw)/2;
    g.appendChild(mk('line',{x1:0,y1:0,x2:kbx,y2:0,class:'cl'}));
    // Body
    g.appendChild(mk('path',{d:`M${kbx},-18 Q${kbx},-22 ${kbx+kbw*0.3},-22 L${kbx+kbw*0.85},-22 Q${kbx+kbw},-22 ${kbx+kbw},-18 L${kbx+kbw},18 Q${kbx+kbw},22 ${kbx+kbw*0.85},22 L${kbx+kbw*0.15},22 Q${kbx},22 ${kbx},18 Z`,fill:'#1a2030',stroke:'#a0c8e8','stroke-width':1.4}));
    // Spout
    g.appendChild(mk('path',{d:`M${kbx+kbw},-4 Q${kbx+kbw+10},-4 ${kbx+kbw+12},-8`,fill:'none',stroke:'#a0c8e8','stroke-width':1.4}));
    // Steam lines when powered
    if(extra?.simPower>10){
      ['#38bdf8','#7dd3fc','#bae6fd'].forEach((sc,i)=>{
        const sx=kbx+kbw*0.3+i*8, powered=extra.simPower>10;
        if(powered) g.appendChild(mk('path',{d:`M${sx},-22 Q${sx+3},-26 ${sx},-30`,fill:'none',stroke:sc,'stroke-width':1,'opacity':'0.8'}));
      });
    }
    // Rating label
    const kt=mk('text',{x:kbx+kbw/2,y:8,'text-anchor':'middle',style:'fill:#a0c8e8;font-size:5px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    kt.textContent='kW'; g.appendChild(kt);
    g.appendChild(mk('line',{x1:kbx+kbw,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='toaster'){
    const tbw=L*0.7, tbx=(L-tbw)/2;
    g.appendChild(mk('line',{x1:0,y1:0,x2:tbx,y2:0,class:'cl'}));
    // Body
    g.appendChild(mk('rect',{x:tbx,y:-10,width:tbw,height:22,rx:3,fill:'#fffbeb',stroke:'#f5a623','stroke-width':1.4}));
    // Slots
    const sw=tbw*0.22, sh=14, sy=-8;
    g.appendChild(mk('rect',{x:tbx+tbw*0.18,y:sy,width:sw,height:sh,rx:2,fill:'#fde68a',stroke:'#f5a623','stroke-width':0.8}));
    g.appendChild(mk('rect',{x:tbx+tbw*0.58,y:sy,width:sw,height:sh,rx:2,fill:'#fde68a',stroke:'#f5a623','stroke-width':0.8}));
    // Heat glow in slots when powered
    if(extra?.simPower>10){
      g.appendChild(mk('rect',{x:tbx+tbw*0.18,y:sy,width:sw,height:sh,rx:2,fill:'#f97316',opacity:'0.35'}));
      g.appendChild(mk('rect',{x:tbx+tbw*0.58,y:sy,width:sw,height:sh,rx:2,fill:'#f97316',opacity:'0.35'}));
    }
    g.appendChild(mk('line',{x1:tbx+tbw,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='tv'){
    const tvbw=L*0.72, tvbx=(L-tvbw)/2, tvbh=26;
    g.appendChild(mk('line',{x1:0,y1:0,x2:tvbx,y2:0,class:'cl'}));
    // Screen bezel
    g.appendChild(mk('rect',{x:tvbx,y:-tvbh/2,width:tvbw,height:tvbh,rx:2,fill:'#090c14',stroke:'#60a5fa','stroke-width':1.4}));
    // Screen
    const scr_fill=extra?.simPower>0.5?'#1e3a8a':'#0a0a14';
    g.appendChild(mk('rect',{x:tvbx+2,y:-tvbh/2+2,width:tvbw-4,height:tvbh-7,rx:1,fill:scr_fill}));
    // Subtle scan line when on
    if(extra?.simPower>0.5){
      g.appendChild(mk('line',{x1:tvbx+3,y1:-4,x2:tvbx+tvbw-3,y2:-4,stroke:'#3b82f6',opacity:'0.4','stroke-width':1}));
    }
    // Stand
    g.appendChild(mk('line',{x1:tvbx+tvbw/2-5,y1:tvbh/2,x2:tvbx+tvbw/2-8,y2:tvbh/2+5,stroke:'#60a5fa','stroke-width':1.2}));
    g.appendChild(mk('line',{x1:tvbx+tvbw/2+5,y1:tvbh/2,x2:tvbx+tvbw/2+8,y2:tvbh/2+5,stroke:'#60a5fa','stroke-width':1.2}));
    g.appendChild(mk('line',{x1:tvbx+tvbw/2-10,y1:tvbh/2+5,x2:tvbx+tvbw/2+10,y2:tvbh/2+5,stroke:'#60a5fa','stroke-width':1.2}));
    g.appendChild(mk('line',{x1:tvbx+tvbw,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='fridge'){
    const fbw=L*0.5, fbx=(L-fbw)/2, fbh=44;
    g.appendChild(mk('line',{x1:0,y1:0,x2:fbx,y2:0,class:'cl'}));
    // Cabinet
    g.appendChild(mk('rect',{x:fbx,y:-fbh/2,width:fbw,height:fbh,rx:2,fill:'#0a1929',stroke:'#67e8f9','stroke-width':1.4}));
    // Freezer compartment
    g.appendChild(mk('rect',{x:fbx+1,y:-fbh/2+1,width:fbw-2,height:fbh*0.35,rx:1,fill:'#061018',stroke:'#67e8f9','stroke-width':0.7}));
    // Fridge compartment divider
    g.appendChild(mk('line',{x1:fbx,y1:-fbh/2+fbh*0.37,x2:fbx+fbw,y2:-fbh/2+fbh*0.37,stroke:'#67e8f9','stroke-width':0.7}));
    // Handle
    g.appendChild(mk('line',{x1:fbx+fbw-3,y1:-fbh/2+4,x2:fbx+fbw-3,y2:-fbh/2+fbh*0.32,stroke:'#67e8f9','stroke-width':1.5}));
    // Subtle activity indicator when on
    if(extra?.simPower>0.1){
      g.appendChild(mk('circle',{cx:fbx+fbw*0.35,cy:-fbh/2+fbh*0.55,r:2.5,fill:'#22c55e',opacity:'0.8'}));
    }
    g.appendChild(mk('line',{x1:fbx+fbw,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='fan'){
    // Extractor fan: circle body with fan blades, 2G wide
    const fanR=Math.min(bw/2,18);
    g.appendChild(mk('line',{x1:0,y1:0,x2:mid-fanR,y2:0,class:'cl'}));
    g.appendChild(mk('circle',{cx:mid,cy:0,r:fanR,stroke:'#a0c8e8','stroke-width':1.5,fill:'rgba(160,200,232,0.08)'}));
    // Fan blades: 3 curved arcs inside the circle
    g.appendChild(mk('path',{d:`M ${mid},0 Q ${mid+fanR*0.6},${-fanR*0.6} ${mid+fanR*0.5},${-fanR*0.85}`,stroke:'#a0c8e8','stroke-width':1.5,fill:'none'}));
    g.appendChild(mk('path',{d:`M ${mid},0 Q ${mid-fanR*0.7},${-fanR*0.3} ${mid-fanR*0.85},${fanR*0.5}`,stroke:'#a0c8e8','stroke-width':1.5,fill:'none'}));
    g.appendChild(mk('path',{d:`M ${mid},0 Q ${mid+fanR*0.1},${fanR*0.75} ${mid-fanR*0.5},${fanR*0.85}`,stroke:'#a0c8e8','stroke-width':1.5,fill:'none'}));
    // Hub dot
    g.appendChild(mk('circle',{cx:mid,cy:0,r:2.5,fill:'#a0c8e8'}));
    const fanlbl=mk('text',{x:mid,y:fanR+12,'text-anchor':'middle',style:'fill:#a0c8e8;font-size:6px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    fanlbl.textContent='FAN'; g.appendChild(fanlbl);
    g.appendChild(mk('line',{x1:mid+fanR,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='fcu'){
    // Fused Connection Unit: 3G wide rectangular plate with FCU label and fuse symbol
    const fcubw=bw*0.85, fcux=(L-fcubw)/2;
    g.appendChild(mk('line',{x1:0,y1:0,x2:fcux,y2:0,class:'cl'}));
    g.appendChild(mk('rect',{x:fcux,y:-16,width:fcubw,height:32,rx:3,fill:'#0d1a2e',stroke:'#60a5fa','stroke-width':1.5}));
    // Fuse symbol in middle
    const fsymx=fcux+fcubw*0.5, fsymh=7, fsymw=14;
    g.appendChild(mk('rect',{x:fsymx-fsymw/2,y:-fsymh/2,width:fsymw,height:fsymh,rx:fsymh/2,stroke:'#f0a500','stroke-width':1.2,fill:'none'}));
    g.appendChild(mk('line',{x1:fsymx-fsymw/2-4,y1:0,x2:fsymx-fsymw/2,y2:0,stroke:'#60a5fa','stroke-width':1}));
    g.appendChild(mk('line',{x1:fsymx+fsymw/2,y1:0,x2:fsymx+fsymw/2+4,y2:0,stroke:'#60a5fa','stroke-width':1}));
    // FCU label
    const fculbl=mk('text',{x:fcux+fcubw/2,y:12,'text-anchor':'middle',style:'fill:#60a5fa;font-size:5.5px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    fculbl.textContent='FCU'; g.appendChild(fculbl);
    // Blown indicator
    if(extra?.blown){
      g.appendChild(mk('circle',{cx:fcux+fcubw*0.85,cy:-10,r:3,fill:'#ef4444'}));
    }
    g.appendChild(mk('line',{x1:fcux+fcubw,y1:0,x2:L,y2:0,class:'cl'}));
  } else if(type==='pullcord'){
    // Pull-cord switch: rectangular plate with line and circle at bottom
    const closed=extra?.closed??false;
    const pL=G*0.3, pR=G*1.7;
    const smid2=L/2;
    // Lead wires
    g.appendChild(mk('line',{x1:0,y1:0,x2:pL,y2:0,class:'cl'}));
    g.appendChild(mk('line',{x1:pR,y1:0,x2:L,y2:0,class:'cl'}));
    // Outer plate
    g.appendChild(mk('rect',{x:pL,y:-15,width:G*1.4,height:30,rx:3,stroke:'#60a5fa','stroke-width':1.5,fill:'#f5f5f5'}));
    // Inner rocker
    const rockerFillPC=closed?'#dcfce7':'#e8e8e8';
    g.appendChild(mk('rect',{x:G*0.45,y:-10,width:G*1.1,height:20,rx:2,fill:rockerFillPC,stroke:'#b0b0b0','stroke-width':1}));
    // Vertical cord line from centre of plate down
    g.appendChild(mk('line',{x1:smid2,y1:15,x2:smid2,y2:22,stroke:'#60a5fa','stroke-width':1.2}));
    // Cord bead (pull end)
    g.appendChild(mk('circle',{cx:smid2,cy:25,r:3,fill:'#60a5fa',stroke:'#1e40af','stroke-width':0.8}));
    // ON indicator dot
    g.appendChild(mk('circle',{cx:G*1.55,cy:-8,r:2,fill:closed?'#22c55e':'#d1d5db'}));
    // PULL label
    const plbl=mk('text',{x:smid2,y:4,'text-anchor':'middle',style:'fill:#6b7280;font-size:5px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    plbl.textContent='PULL'; g.appendChild(plbl);
  }
}

function drawDamagedOverlay(g, type, x1, y1, x2, y2, extra={}) {
  // extra: {blown} for fuse
  const dx=x2-x1, dy=y2-y1;
  const L=Math.sqrt(dx*dx+dy*dy)||1;
  const ang=Math.atan2(dy,dx)*180/Math.PI;
  const mid=L/2;

  if((type==='fuse'||type==='mcb')&&extra.blown){
    // Draw broken wire gap over the fuse body
    const rw=L*0.7*0.7;
    // Blank out the fuse body (light canvas bg colour)
    g.appendChild(mk('rect',{x:(L-rw)/2-1,y:-8,width:rw+2,height:16,fill:'#090c14'}));
    // Broken wire stumps with singed ends
    g.appendChild(mk('line',{x1:0,y1:0,x2:mid-8,y2:0,stroke:'#5d6a85','stroke-width':2}));
    g.appendChild(mk('line',{x1:mid+8,y1:0,x2:L,y2:0,stroke:'#5d6a85','stroke-width':2}));
    // Gap marks (char)
    g.appendChild(mk('line',{x1:mid-8,y1:-5,x2:mid-4,y2:5,stroke:'#5d6a85','stroke-width':1.5}));
    g.appendChild(mk('line',{x1:mid+8,y1:-5,x2:mid+4,y2:5,stroke:'#5d6a85','stroke-width':1.5}));
    // Orange flash dot
    g.appendChild(mk('circle',{cx:mid,cy:0,r:3,fill:'#ff6600',opacity:0.7,filter:'url(#dmg-glow)'}));
    return;
  }

  if(type==='R'||type==='bulb'){
    const bw=L*0.6, pad=L*0.2;
    // Char overlay on body
    if(type==='R'){
      const rh=Math.min(14,L*0.22);
      g.appendChild(mk('rect',{x:pad,y:-rh/2,width:bw,height:rh,rx:2,fill:'#1a0a00',stroke:'#3a1500','stroke-width':1.5}));
      // Char cracks
      g.appendChild(mk('line',{x1:pad+bw*0.3,y1:-rh/2,x2:pad+bw*0.45,y2:rh/2,stroke:'#ff4400','stroke-width':1,opacity:0.6}));
      g.appendChild(mk('line',{x1:pad+bw*0.65,y1:-rh/2,x2:pad+bw*0.55,y2:rh/2,stroke:'#ff4400','stroke-width':1,opacity:0.6}));
    } else {
      // Bulb: black out circle, broken X
      const r=Math.min(bw/2,22), cr=r*0.55;
      g.appendChild(mk('circle',{cx:mid,cy:0,r:r+1,fill:'#0d0a00',stroke:'#3a1500','stroke-width':1.5}));
      // Broken filament (gap in middle)
      g.appendChild(mk('line',{x1:mid-cr,y1:-cr,x2:mid-cr*0.2,y2:-cr*0.2,stroke:'#5d6a85','stroke-width':1.5}));
      g.appendChild(mk('line',{x1:mid+cr,y1:cr,x2:mid+cr*0.2,y2:cr*0.2,stroke:'#5d6a85','stroke-width':1.5}));
      g.appendChild(mk('line',{x1:mid+cr,y1:-cr,x2:mid+cr*0.2,y2:-cr*0.2,stroke:'#5d6a85','stroke-width':1.5}));
      g.appendChild(mk('line',{x1:mid-cr,y1:cr,x2:mid-cr*0.2,y2:cr*0.2,stroke:'#5d6a85','stroke-width':1.5}));
    }
    // Red damaged label
    const t=mk('text',{x:mid,y:type==='R'?-10:-28,'text-anchor':'middle',style:'fill:#ff6166;font-size:9px;font-family:JetBrains Mono Variable, ui-monospace, monospace;font-weight:bold'});
    t.textContent='BURNT'; g.appendChild(t);
  }
}

function renderComps(){
  const layer=document.getElementById('comps-g'); layer.innerHTML='';
  comps.forEach(c=>{
    const g=mk('g',{'data-id':c.id});
    g.style.cursor=mode==='select'?'pointer':'default';
    if((c.type==='shower'||c.type==='cooker'||c.type==='kettle'||c.type==='toaster'||c.type==='tv'||c.type==='fridge'||c.type==='fan')&&c.on===false){
      g.style.opacity='0.4';
    }
    drawSymbol(g,c.type,c.x1,c.y1,c.x2,c.y2,{pos:c.pos??0.5,ledColor:c.ledColor,closed:c.closed,x3:c.x3,y3:c.y3,x4:c.x4,y4:c.y4,x5:c.x5,y5:c.y5,x6:c.x6,y6:c.y6,segVal:c.segVal??0,sw2pos:c.sw2pos,intpos:c.intpos??0,gang1:c.gang1??0,gang2:c.gang2??0,gang3:c.gang3??0,simPower:c.simPower,blown:c.blown,tripped:c.tripped,ratingLabel:c.value,slots:c.slots??6,cuDP:c.cuDP??true,cuRCD:c.cuRCD??true,cuRCDma:c.cuRCDma??30,cuSPD:c.cuSPD??false,cuMCBs:c.cuMCBs??[],cuMCBTerms:c.mcbTerms??[],mosfetOn:c.mosfetOn??false});

    // Hit region — large enough to grab without hovering on thin drawn lines
    {
      const isAbsCoords=c.type==='sw2'||c.type==='intswitch'||c.type==='plug'||c.type==='switch2_uk'||c.type==='switchint_uk'||c.type==='switch2g_uk'||c.type==='switch3g_uk'||c.type==='buzzer';
      const isPoint=c.type==='GND'||c.type==='probe';
      const isCUnit=c.type==='cunit';
      const isTall=c.type==='seg7'||c.type==='buzzer';
      const isWide=c.type==='3ph'||c.type==='xfmr';
      const hasEarth=c.type==='socket_uk'||c.type==='switch_uk'||c.type==='dpswitch';
      const pad=16; // px padding beyond visual bounds on each side
      if(isCUnit){
        // CU: landscape — (numMCBs+2)*G wide, 4*G tall. Box top-left = (c.px, c.py).
        const cuMCBs2=c.cuMCBs??[];
        const numMCBs2=cuMCBs2.length||1;
        const cuW2=(numMCBs2+2)*G, cuH2=4*G;
        g.appendChild(mk('rect',{x:c.px-pad/2,y:c.py-pad/2,width:cuW2+pad,height:cuH2+pad,rx:8,class:'comp-hit','pointer-events':'all'}));
      } else if(isAbsCoords){
        // Components that draw in absolute SVG coords (no local rotate transform)
        const allX=[c.x1,c.x2,c.x3,c.x4,c.x5,c.x6].filter(v=>v!=null);
        const allY=[c.y1,c.y2,c.y3,c.y4,c.y5,c.y6].filter(v=>v!=null);
        const mnX=Math.min(...allX)-pad, mnY=Math.min(...allY)-pad;
        const mxX=Math.max(...allX)+pad, mxY=Math.max(...allY)+pad;
        g.appendChild(mk('rect',{x:mnX,y:mnY,width:mxX-mnX,height:mxY-mnY,rx:6,class:'comp-hit','pointer-events':'all'}));
      } else if(isPoint){
        g.appendChild(mk('circle',{cx:0,cy:0,r:32,class:'comp-hit','pointer-events':'all'}));
      } else if(hasEarth){
        // Extend downward into local space to cover earth terminal at (L/2, G)
        const hw=3*G+pad;
        g.appendChild(mk('rect',{x:-pad/2,y:-30,width:hw,height:30+G+pad,rx:6,class:'comp-hit','pointer-events':'all'}));
      } else {
        const hw=(isWide?4*G:3*G)+pad, hh=isTall?90:(isWide?3*G+pad*2:60);
        const hx=-pad/2, hy=isTall?-14:(isWide?-G*1.5-pad:-hh/2);
        g.appendChild(mk('rect',{x:hx,y:hy,width:hw,height:hh,rx:6,class:'comp-hit','pointer-events':'all'}));
      }
    }

    // Damage overlay (has its own transform, stays inside g)
    if(c.damaged||c.blown){
      const dg=mk('g');
      drawDamagedOverlay(dg,c.type,c.x1,c.y1,c.x2,c.y2,{blown:c.blown});
      g.appendChild(dg);
    }

    g.addEventListener('click',e=>{e.stopPropagation();if(tryPlaceProbe(e))return;if(mode==='select'){if(_tryStartWireFromTerminal(svgPt(e),false))return;selectComp(c.id);}});
    g.addEventListener('mousedown',e=>{if(mode==='select'&&e.button===0){pushHistory();const p=svgPt(e);dragging=c.id;_dragMoved=false;dragOff={x:p.x-c.px,y:p.y-c.py};_dragTermOld=_getTerminals(c);_dragWireBinds=captureWireBinds(_dragTermOld);_dragXings=snapshotCrossings();e.preventDefault();}});
    layer.appendChild(g);

    // All overlays (labels, sim readouts, glows) — in absolute SVG coords.
    const mx=(c.x1+c.x2)/2, my=(c.y1+c.y2)/2;
    const ls=labelSide(c);              // best perpendicular unit vector
    const bOff=perpOff(c.type)+14;     // base offset from component centre
    const isH=ls.x!==0;                // label goes left/right (else up/down)
    // lp(n): SVG position for nth label line (0=value, 1=first readout, 2=second)
    const lp=(n)=>({
      x: isH ? mx+ls.x*bOff : mx,
      y: isH ? (my-6+n*12) : (my+ls.y*(bOff+n*12)),
      a: isH ? (ls.x>0?'start':'end') : 'middle'
    });

    // Value label
    const d=DEFS[c.type];
    const noLabel=new Set(['GND','probe','seg7','buzzer','sw','sw2','AND','OR','NOT','3ph','xfmr','switch_uk','dpswitch','intswitch','meter','rcd','cunit','plug','switch2_uk','switchint_uk','switch2g_uk','switch3g_uk','pullcord','fcu']);
    if(!noLabel.has(c.type)){
      const p=lp(0);
      const lbl=mk('text',{x:p.x,y:p.y,'text-anchor':p.a,class:'ct'});
      lbl.textContent=fmtVal(c.value,d.unit); layer.appendChild(lbl);
    }

    // Sim results
    if(c.simV!==undefined){
      // AC phasor helper for on-canvas readouts
      const fmtV = _acMode && c.acV!=null
        ? fmtPhasorU(c.acV, c.acVph??0, 'V')
        : fmtVal(c.simV,'V');
      const fmtI = _acMode && c.acI!=null
        ? fmtPhasorU(c.acI, c.acIph??0, 'A')
        : (c.simI!=null?fmtVal(c.simI,'A'):null);

      if(c.type==='probe'){
        const t=mk('text',{x:c.x1,y:c.y1-30,'text-anchor':'middle',class:'rt',style:'font-size:10px;font-weight:bold'});
        t.textContent=fmtV; layer.appendChild(t);
      } else if(c.type==='LED'){
        if(c.ledOn){
          const ledCols={red:'#f87171',green:'#4ade80',blue:'#60a5fa',white:'#f0f0f0'};
          const col=ledCols[c.ledColor]||'#f87171';
          const glow=mk('circle',{cx:mx,cy:my,r:18,fill:col,opacity:0.25,filter:'url(#led-glow)',class:'led-glow','data-col':col});
          layer.insertBefore(glow,g);
          const glow2=mk('circle',{cx:mx,cy:my,r:10,fill:col,opacity:0.4,filter:'url(#led-glow)'});
          layer.insertBefore(glow2,g);
        }
        const p1=lp(1);
        const t=mk('text',{x:p1.x,y:p1.y,'text-anchor':p1.a,class:'rt',style:`fill:${c.ledOn?'#4ade80':'#5d6a85'}`});
        t.textContent=c.ledOn?fmtVal(c.simV,'V'):'off'; layer.appendChild(t);
      } else if(c.type==='seg7'){
        g.innerHTML='';
        drawSymbol(g,c.type,c.x1,c.y1,c.x2,c.y2,{segVal:c.segVal??0});
        g.style.cursor=mode==='select'?'pointer':'default';
        g.addEventListener('click',e=>{e.stopPropagation();if(tryPlaceProbe(e))return;if(mode==='select'){if(_tryStartWireFromTerminal(svgPt(e),false))return;selectComp(c.id);}});
        g.addEventListener('mousedown',e=>{if(mode==='select'&&e.button===0){pushHistory();const p=svgPt(e);dragging=c.id;_dragMoved=false;dragOff={x:p.x-c.px,y:p.y-c.py};_dragTermOld=_getTerminals(c);_dragWireBinds=captureWireBinds(_dragTermOld);_dragXings=snapshotCrossings();e.preventDefault();}});
        const t=mk('text',{x:c.x1+14,y:c.y1+58,'text-anchor':'middle',class:'rt',style:'font-size:9px'});
        t.textContent=fmtVal(c.simV,'V'); layer.appendChild(t);
      } else if(c.type==='buzzer'){
        if(c.buzzerOn){
          for(let ri=0;ri<3;ri++){
            const ring=mk('circle',{cx:c.x1+28,cy:c.y1,r:10+ri*7,stroke:'#facc15',
              'stroke-width':Math.max(0.5,1.5-ri*0.4),fill:'none',opacity:0.6-ri*0.15});
            layer.appendChild(ring);
          }
        }
        const t=mk('text',{x:c.x1+7,y:c.y1+26,'text-anchor':'middle',class:'rt',
          style:`fill:${c.buzzerOn?'#facc15':'#5d6a85'};font-size:9px`});
        t.textContent=c.buzzerOn?'BUZZ':'off'; layer.appendChild(t);
      } else if(c.type==='diode'||c.type==='zener'){
        const stateCol=c.diodeState==='forward'?'#4ade80':c.diodeState==='reverse-breakdown'?'#fb923c':'#5d6a85';
        const stateStr=c.diodeState==='forward'?fmtVal(c.simV,'V'):c.diodeState==='reverse-breakdown'?'BKDN':'off';
        const p1=lp(1);
        const t=mk('text',{x:p1.x,y:p1.y,'text-anchor':p1.a,class:'rt',style:`fill:${stateCol}`});
        t.textContent=stateStr; layer.appendChild(t);
      } else if(c.type==='sw'||c.type==='switch_uk'||c.type==='dpswitch'||c.type==='pullcord'){
        const stateLabel=c.closed?'CLOSED':'OPEN';
        const stateCol=c.closed?'#34d399':'#5d6a85';
        const p0=lp(0), p1=lp(1);
        const t=mk('text',{x:p0.x,y:p0.y,'text-anchor':p0.a,class:'rt',style:`fill:${stateCol};font-size:9px`});
        t.textContent=stateLabel; layer.appendChild(t);
        if(c.simI!=null&&c.closed){
          const t2=mk('text',{x:p1.x,y:p1.y,'text-anchor':p1.a,class:'rt',style:'fill:#e3ad33'});
          t2.textContent=fmtVal(c.simI,'A'); layer.appendChild(t2);
        }
      } else if(c.type==='fcu'){
        const fcuCol=c.blown?'#ef4444':'#34d399';
        const p0=lp(0);
        const t=mk('text',{x:p0.x,y:p0.y,'text-anchor':p0.a,class:'rt',style:`fill:${fcuCol};font-size:9px`});
        t.textContent=c.blown?'BLOWN':'ok'; layer.appendChild(t);
        if(c.simI!=null&&!c.blown){
          const p1=lp(1);
          const t2=mk('text',{x:p1.x,y:p1.y,'text-anchor':p1.a,class:'rt',style:'fill:#e3ad33'});
          t2.textContent=fmtVal(c.simI,'A'); layer.appendChild(t2);
        }
      } else if(c.type==='rcd'){
        const rcdCol=c.tripped?'#ef4444':'#34d399';
        const p0=lp(0);
        const t=mk('text',{x:p0.x,y:p0.y,'text-anchor':p0.a,class:'rt',style:`fill:${rcdCol};font-size:9px`});
        t.textContent=c.tripped?'TRIP':'ok'; layer.appendChild(t);
      } else if(c.type==='intswitch'){
        const p0=lp(0);
        const t=mk('text',{x:p0.x,y:p0.y,'text-anchor':p0.a,class:'rt',style:'fill:#a78bfa;font-size:9px'});
        t.textContent=(c.intpos??0)===0?'INT →':'INT ×'; layer.appendChild(t);
      } else if(c.type==='switch2g_uk'||c.type==='switch3g_uk'){
        // Show gang states above the plate
        const numG=c.type==='switch3g_uk'?3:2;
        const gangs=[c.gang1??0,c.gang2??0];
        if(numG===3) gangs.push(c.gang3??0);
        const allX=[c.x1,c.x2,c.x3,c.x4].filter(v=>v!=null);
        const allY=[c.y1,c.y2,c.y3,c.y4].filter(v=>v!=null);
        if(c.x5!=null){allX.push(c.x5,c.x6);allY.push(c.y5,c.y6);}
        const mcx=(Math.min(...allX)+Math.max(...allX))/2;
        const mcy=Math.min(...allY)-14;
        const stateStr=gangs.map((s,i)=>(s?'G'+(i+1)+'●':'G'+(i+1)+'○')).join(' ');
        const t=mk('text',{x:mcx,y:mcy,'text-anchor':'middle',class:'rt',style:'fill:#60a5fa;font-size:8px'});
        t.textContent=stateStr; layer.appendChild(t);
      } else if(c.type==='crose'){
        const P=c.simPower||0;
        if(P>0.1){
          const brightness=Math.min(1, Math.log10(P*10+1)/2.5);
          const glowR=14+brightness*20;
          const alpha=(0.06+brightness*0.28).toFixed(2);
          const col=brightness<0.5?`rgba(255,${Math.round(180+brightness*175)},0,${alpha})`:`rgba(255,255,${Math.round(brightness*180)},${alpha})`;
          const glow=mk('circle',{cx:mx,cy:my,r:glowR,fill:col,filter:'url(#bulb-blur)',class:'bulb-glow','data-base-r':glowR,'data-brightness':brightness});
          layer.insertBefore(glow,g);
        }
        const p2=lp(2);
        const t2=mk('text',{x:p2.x,y:p2.y,'text-anchor':p2.a,class:'rt',style:'fill:#e3ad33'});
        t2.textContent=fmtVal(P,'W'); layer.appendChild(t2);
      } else if(c.type==='shower'||c.type==='cooker'||c.type==='kettle'||c.type==='toaster'||c.type==='tv'||c.type==='fridge'||c.type==='fan'){
        const p1=lp(1);
        const t=mk('text',{x:p1.x,y:p1.y,'text-anchor':p1.a,class:'rt'});
        t.textContent=fmtV; layer.appendChild(t);
        if(c.on===false){
          const p2=lp(2);
          const t2=mk('text',{x:p2.x,y:p2.y,'text-anchor':p2.a,class:'rt',style:'fill:#5d6a85;font-size:9px'});
          t2.textContent='OFF'; layer.appendChild(t2);
        } else if(c.simPower!=null&&c.simPower>1){
          const p2=lp(2);
          const t2=mk('text',{x:p2.x,y:p2.y,'text-anchor':p2.a,class:'rt',style:'fill:#e3ad33'});
          t2.textContent=fmtVal(c.simPower,'W'); layer.appendChild(t2);
        }
      } else if(c.type==='sw2'){
        const pos2=c.sw2pos??0;
        const p0=lp(0);
        const t=mk('text',{x:p0.x,y:p0.y,'text-anchor':p0.a,class:'rt',style:'fill:#60a5fa;font-size:9px'});
        t.textContent=pos2===0?'→L1':'→L2'; layer.appendChild(t);
        if(c.simI!=null&&c.simI>1e-9){
          const p1=lp(1);
          const t2=mk('text',{x:p1.x,y:p1.y,'text-anchor':p1.a,class:'rt',style:'fill:#e3ad33'});
          t2.textContent=fmtVal(c.simI,'A'); layer.appendChild(t2);
        }
      } else if(c.type==='AND'||c.type==='OR'||c.type==='NOT'){
        const outV=c.gateOut??0;
        const col=outV>2.5?'#4ade80':'#5d6a85';
        const lbl=outV>2.5?'HIGH':'LOW';
        const t=mk('text',{x:c.x1,y:c.y1-12,'text-anchor':'middle',class:'rt',style:`fill:${col};font-size:9px`});
        t.textContent=lbl; layer.appendChild(t);
      } else if(c.type==='bulb'){
        const P=c.simPower||0;
        if(P>1e-6){
          const brightness=Math.min(1, Math.log10(P*1000+1)/3);
          const glowR=Math.min((c.x2-c.x1)*0.3, 30)*0.6+12+brightness*18;
          const alpha=(0.08+brightness*0.35).toFixed(2);
          const col=brightness<0.5?`rgba(255,${Math.round(160+brightness*190)},0,${alpha})`:`rgba(255,255,${Math.round(brightness*200)},${alpha})`;
          const glow=mk('circle',{cx:mx,cy:my,r:glowR,fill:col,filter:'url(#bulb-blur)',class:'bulb-glow','data-base-r':glowR,'data-brightness':brightness});
          layer.insertBefore(glow,g);
        }
        const p1=lp(1), p2=lp(2);
        const t1=mk('text',{x:p1.x,y:p1.y,'text-anchor':p1.a,class:'rt'});
        t1.textContent=fmtV; layer.appendChild(t1);
        const t2=mk('text',{x:p2.x,y:p2.y,'text-anchor':p2.a,class:'rt',style:'fill:#e3ad33'});
        t2.textContent=fmtVal(c.simPower||0,'W'); layer.appendChild(t2);
      } else if(c.type==='motor'||c.type==='load3'||c.type==='3ph'||c.type==='xfmr'){
        const p1=lp(1);
        const t1=mk('text',{x:p1.x,y:p1.y,'text-anchor':p1.a,class:'rt'});
        t1.textContent=fmtV; layer.appendChild(t1);
        if(fmtI){
          const p2=lp(2);
          const t2=mk('text',{x:p2.x,y:p2.y,'text-anchor':p2.a,class:'rt',style:'fill:#e3ad33'});
          t2.textContent=fmtI; layer.appendChild(t2);
        }
      } else {
        const p1=lp(1);
        const t1=mk('text',{x:p1.x,y:p1.y,'text-anchor':p1.a,class:'rt'});
        t1.textContent=fmtV; layer.appendChild(t1);
        if(fmtI){
          const p2=lp(2);
          const t2=mk('text',{x:p2.x,y:p2.y,'text-anchor':p2.a,class:'rt',style:'fill:#e3ad33'});
          t2.textContent=fmtI; layer.appendChild(t2);
        }
      }
    }

    // Selection box — mirrors comp-hit geometry in global SVG coords
    if(sel===c.id){
      const _isAbsC=c.type==='sw2'||c.type==='intswitch'||c.type==='plug'||c.type==='switch2_uk'||c.type==='switchint_uk'||c.type==='switch2g_uk'||c.type==='switch3g_uk'||c.type==='buzzer';
      const _isPt=c.type==='GND'||c.type==='probe';
      const _isCU=c.type==='cunit';
      const _isTall=c.type==='seg7'||c.type==='buzzer';
      const _isWide=c.type==='3ph'||c.type==='xfmr';
      const _hasE=c.type==='socket_uk'||c.type==='switch_uk'||c.type==='dpswitch';
      let sx,sy,sw,sh;
      if(_isCU){
        const cuSlots2=c.slots??6;
        sx=c.x1-6; sy=c.y1-6;
        sw=(cuSlots2+2)*G+12; sh=4*G+12;
      } else if(_isAbsC){
        const axs=[c.x1,c.x2,c.x3,c.x4,c.x5,c.x6].filter(v=>v!=null);
        const ays=[c.y1,c.y2,c.y3,c.y4,c.y5,c.y6].filter(v=>v!=null);
        sx=Math.min(...axs)-16; sy=Math.min(...ays)-16;
        sw=Math.max(...axs)-sx+16; sh=Math.max(...ays)-sy+16;
      } else if(_isPt){
        sx=c.x1-32; sy=c.y1-32; sw=64; sh=64;
      } else {
        // Compute global bounding box of the local hit rect.
        // Local hit rect: x ∈ [-8, L+8], y ∈ [-halfH, +halfH] (for standard 60px tall)
        // Transform: translate(x1,y1) rotate(ang) → local(lx,ly) = global(x1+lx*ux+ly*pX, y1+lx*uy+ly*pY)
        const hh=_isTall?90:(_isWide?3*G+32:(_hasE?30+G+16:60));
        const yTop=-30, yBot=_hasE?G+16:30; // local y extents
        const axPad=8;
        const ddx=c.x2-c.x1, ddy=c.y2-c.y1;
        const len=Math.sqrt(ddx*ddx+ddy*ddy)||1;
        const ux=ddx/len, uy=ddy/len;
        const pX=-uy, pY=ux; // perpendicular unit vector
        const corn=[
          [c.x1-axPad*ux+yTop*pX, c.y1-axPad*uy+yTop*pY],
          [c.x1-axPad*ux+yBot*pX, c.y1-axPad*uy+yBot*pY],
          [c.x2+axPad*ux+yTop*pX, c.y2+axPad*uy+yTop*pY],
          [c.x2+axPad*ux+yBot*pX, c.y2+axPad*uy+yBot*pY],
        ];
        const cxs=corn.map(p=>p[0]), cys=corn.map(p=>p[1]);
        sx=Math.min(...cxs); sy=Math.min(...cys);
        sw=Math.max(...cxs)-sx; sh=Math.max(...cys)-sy;
      }
      layer.appendChild(mk('rect',{x:sx,y:sy,width:sw,height:sh,rx:4,class:'sel-box'}));
    }
  });
}

function renderNodes(){
  const layer=document.getElementById('nodes-g'); layer.innerHTML='';
  if(!window.simNodeV) return;
  // Show junction dots and voltages where ≥2 things meet
  const cnt={};
  const addPt=(x,y)=>{const k=nk(x,y);cnt[k]=(cnt[k]||0)+1;};
  wires.forEach(w=>{addPt(w.x1,w.y1);addPt(w.x2,w.y2);
    // midpoints on wire
    if(w.x1===w.x2){const mn=Math.min(w.y1,w.y2),mx=Math.max(w.y1,w.y2);for(let y=mn+G;y<mx;y+=G)addPt(w.x1,y);}
    else{const mn=Math.min(w.x1,w.x2),mx=Math.max(w.x1,w.x2);for(let x=mn+G;x<mx;x+=G)addPt(x,w.y1);}
  });
  comps.forEach(c=>{
    addPt(c.x1,c.y1);
    if(c.type!=='GND'&&c.type!=='probe'&&c.type!=='seg7') addPt(c.x2,c.y2);
    if(c.type==='cunit'&&c.mcbTerms) c.mcbTerms.forEach(mt=>addPt(mt.x,mt.y));
    if((c.type==='AND'||c.type==='OR'||c.type==='nmos')&&c.x3!=null) addPt(c.x3,c.y3);
    if((c.type==='sw2'||c.type==='switch2_uk')&&c.x3!=null) addPt(c.x3,c.y3);
    if((c.type==='intswitch'||c.type==='switchint_uk')&&c.x3!=null){addPt(c.x3,c.y3);if(c.x4!=null)addPt(c.x4,c.y4);}
    if((c.type==='switch2g_uk')&&c.x3!=null){addPt(c.x3,c.y3);if(c.x4!=null)addPt(c.x4,c.y4);}
    if((c.type==='switch3g_uk')&&c.x3!=null){addPt(c.x3,c.y3);if(c.x4!=null)addPt(c.x4,c.y4);if(c.x5!=null)addPt(c.x5,c.y5);if(c.x6!=null)addPt(c.x6,c.y6);}
    if((c.type==='3ph'||c.type==='xfmr')&&c.x3!=null){addPt(c.x3,c.y3);}
    if((c.type==='3ph'||c.type==='xfmr')&&c.x4!=null){addPt(c.x4,c.y4);}
    if(c.type==='plug'&&c.x3!=null){addPt(c.x3,c.y3);addPt(c.x4,c.y4);}
  });

  const seenN=new Set();
  for(const [k,c] of Object.entries(cnt)){
    const nid=window.simNodeV[k];
    if(nid===undefined) continue;
    const [cx,cy]=k.split(',').map(Number);
    if(c>=2){
      layer.appendChild(mk('circle',{cx,cy,r:4,class:'nd'}));
    }
    if(!seenN.has(nid)){
      seenN.add(nid);
      const t=mk('text',{x:cx+6,y:cy-4,style:'fill:#4da3ff;font-size:9px;font-family:JetBrains Mono Variable, ui-monospace, monospace'});
      if(_acMode && window.simVoltagesC){
        const vC=window.simVoltagesC[nid]??{re:0,im:0};
        t.textContent=fmtPhasorU(Cabs(vC),Carg(vC),'V');
      } else {
        const v=window.simVoltages[nid]??0;
        t.textContent=fmtVal(v,'V');
      }
      layer.appendChild(t);
    }
  }

  // Terminal connection indicators
  comps.forEach(c=>{
    const terms=[{x:c.x1,y:c.y1},{x:c.x2,y:c.y2}];
    if((c.type==='sw2'||c.type==='nmos')&&c.x3!=null) terms.push({x:c.x3,y:c.y3});
    if((c.type==='intswitch'||c.type==='switchint_uk'||c.type==='switch2g_uk')&&c.x3!=null){terms.push({x:c.x3,y:c.y3});if(c.x4!=null)terms.push({x:c.x4,y:c.y4});}
    if(c.type==='switch3g_uk'&&c.x3!=null){terms.push({x:c.x3,y:c.y3});if(c.x4!=null)terms.push({x:c.x4,y:c.y4});if(c.x5!=null)terms.push({x:c.x5,y:c.y5});if(c.x6!=null)terms.push({x:c.x6,y:c.y6});}
    const singleTerm=c.type==='GND'||c.type==='probe'||c.type==='seg7';
    let checkTerms=singleTerm?[terms[0]]:terms;
    if(c.type==='cunit'&&c.mcbTerms) checkTerms=[{x:c.x1,y:c.y1},{x:c.x2,y:c.y2},...c.mcbTerms.map(mt=>({x:mt.x,y:mt.y}))];
    checkTerms.forEach(t=>{
      const k=nk(t.x,t.y);
      const wireCount=cnt[k]||0;
      if(wireCount>=2) return; // already drawn as junction dot
      if(wireCount===1){
        // Single wire connected: draw a small connection dot
        layer.appendChild(mk('circle',{cx:t.x,cy:t.y,r:3,class:'term-dot'}));
      } else {
        // No wire connected: draw a tiny open circle to show terminal location
        layer.appendChild(mk('circle',{cx:t.x,cy:t.y,r:5,fill:'#f59e0b',stroke:'#f5a623',class:'term-open'}));
      }
    });
  });
}

// ── Terminal snap helper ───────────────────────────────────────────────────
function nearestTerminal(px, py, radius=20) {
  const singleTerm=new Set(['GND','probe','seg7']);
  let best=null, bestD=radius*radius;
  comps.forEach(c=>{
    const pts=singleTerm.has(c.type)?[[c.x1,c.y1]]:[[c.x1,c.y1],[c.x2,c.y2]];
    if((c.type==='sw2'||c.type==='nmos'||c.type==='switch2_uk')&&c.x3!=null) pts.push([c.x3,c.y3]);
    if((c.type==='intswitch'||c.type==='switchint_uk')&&c.x3!=null){pts.push([c.x3,c.y3]);if(c.x4!=null)pts.push([c.x4,c.y4]);}
    if(c.type==='switch2g_uk'&&c.x3!=null){pts.push([c.x3,c.y3]);if(c.x4!=null)pts.push([c.x4,c.y4]);}
    if(c.type==='switch3g_uk'&&c.x3!=null){pts.push([c.x3,c.y3]);if(c.x4!=null)pts.push([c.x4,c.y4]);if(c.x5!=null)pts.push([c.x5,c.y5]);if(c.x6!=null)pts.push([c.x6,c.y6]);}
    if(c.type==='plug'&&c.x3!=null){pts.push([c.x3,c.y3]);pts.push([c.x4,c.y4]);}
    if(c.type==='cunit'&&c.mcbTerms) c.mcbTerms.forEach(mt=>pts.push([mt.x,mt.y]));
    pts.forEach(([tx,ty])=>{
      const d=(px-tx)**2+(py-ty)**2;
      if(d<bestD){bestD=d;best={x:tx,y:ty};}
    });
  });
  return best;
}

function wireCountAt(x, y) {
  let n = 0;
  wires.forEach(w => { if((w.x1===x&&w.y1===y)||(w.x2===x&&w.y2===y)) n++; });
  return n;
}

// Nearest grid point lying anywhere along an existing wire — its endpoints, a
// corner/T-junction shared with another wire, or a plain mid-span point. Any of
// these is a valid place to tap off and start a new wire (the shared coordinate
// makes it a real electrical connection, junction or not).
function nearestWirePoint(px, py, radius=20) {
  let best=null, bestD=radius*radius;
  wires.forEach(w=>{
    if(w.x1===w.x2){
      const mn=Math.min(w.y1,w.y2), mx=Math.max(w.y1,w.y2);
      for(let y=mn;y<=mx;y+=G){
        const d=(px-w.x1)**2+(py-y)**2;
        if(d<bestD){bestD=d;best={x:w.x1,y};}
      }
    } else {
      const mn=Math.min(w.x1,w.x2), mx=Math.max(w.x1,w.x2);
      for(let x=mn;x<=mx;x+=G){
        const d=(px-x)**2+(py-w.y1)**2;
        if(d<bestD){bestD=d;best={x,y:w.y1};}
      }
    }
  });
  return best;
}

function nearestWireEndpoint(px, py, radius=20) {
  let best=null, bestD=radius*radius;
  wires.forEach(w=>{
    [[w.x1,w.y1],[w.x2,w.y2]].forEach(([wx,wy])=>{
      const d=(px-wx)**2+(py-wy)**2;
      if(d<bestD){bestD=d;best={x:wx,y:wy};}
    });
  });
  return best;
}

function nearestSnapPoint(px, py, radius=20) {
  return nearestTerminal(px,py,radius) || nearestWireEndpoint(px,py,radius);
}

function _tryStartWireFromTerminal(rawP, allowSpur=true) {
  const term = nearestTerminal(rawP.x, rawP.y, 22);
  if (term && wireCountAt(term.x, term.y) === 0) {
    setMode('wire');
    wireStart = {x:term.x, y:term.y};
    setStatus(`Wire started — click end point. Esc to cancel.`);
    return true;
  }
  if (!allowSpur) return false;
  // Tap off any existing wire — its endpoint, a corner/T-junction, or a plain
  // mid-span point — to start a new spur from there.
  const wirePt = nearestWirePoint(rawP.x, rawP.y, 22);
  if (wirePt) {
    setMode('wire');
    wireStart = {x:wirePt.x, y:wirePt.y};
    setStatus(`Wire started — click end point. Esc to cancel.`);
    return true;
  }
  return false;
}

// ── Ghost preview ──────────────────────────────────────────────────────────
function drawGhost(px,py){
  const layer=document.getElementById('ghost-g'); layer.innerHTML='';
  if(!mode.startsWith('place-')) return;
  const type=mode.replace('place-','');
  const [x1,y1,x2,y2]=terminals(type,px,py,rot);
  let x3=null,y3=null,x4=null,y4=null;
  if(type==='AND'||type==='OR'){
    if(rot===0){x3=px;y3=py+2*G;}
    else if(rot===1){x3=px+2*G;y3=py;}
    else if(rot===2){x3=px+3*G;y3=py+2*G;}
    else{x3=px+2*G;y3=py+3*G;}
  }
  if(type==='sw2'||type==='switch2_uk'){
    if(rot===0){x3=px+3*G;y3=py+G;}
    else if(rot===1){x3=px-G;y3=py+3*G;}
    else if(rot===2){x3=px;y3=py-G;}
    else{x3=px+G;y3=py;}
  }
  if(type==='switchint_uk'){
    if(rot===0){x3=px;y3=py+G;x4=px+3*G;y4=py+G;}
    else if(rot===1){x3=px-G;y3=py;x4=px-G;y4=py+3*G;}
    else if(rot===2){x3=px+3*G;y3=py-G;x4=px;y4=py-G;}
    else{x3=px+G;y3=py+3*G;x4=px+G;y4=py;}
  }
  if(type==='nmos'){
    const mid2=(y1+y2)/2;
    const midH=(x1+x2)/2;
    if(rot===0){x3=x1-G;y3=mid2;}
    else if(rot===1){x3=midH;y3=y1-G;}
    else if(rot===2){x3=x1+G;y3=mid2;}
    else{x3=midH;y3=y1+G;}
  }
  if(type==='plug'){
    if(rot===0){x3=px;y3=py;x4=px+3*G;y4=py;}
    else if(rot===1){x3=px;y3=py;x4=px;y4=py+3*G;}
    else if(rot===2){x3=px+3*G;y3=py;x4=px;y4=py;}
    else{x3=px;y3=py+3*G;x4=px;y4=py;}
  }
  if(type==='3ph'){
    if(rot===0){x3=px+4*G;y3=py+G;x4=px+4*G;y4=py-G;}
    else if(rot===1){x3=px-G;y3=py+4*G;x4=px+G;y4=py+4*G;}
    else if(rot===2){x3=px;y3=py-G;x4=px;y4=py+G;}
    else{x3=px+G;y3=py;x4=px-G;y4=py;}
  }
  if(type==='xfmr'){
    if(rot===0){x3=px;y3=py+2*G;x4=px+4*G;y4=py+2*G;}
    else if(rot===1){x3=px+2*G;y3=py;x4=px+2*G;y4=py+4*G;}
    else if(rot===2){x3=px+4*G;y3=py+2*G;x4=px;y4=py+2*G;}
    else{x3=px+2*G;y3=py+4*G;x4=px+2*G;y4=py;}
  }
  let x5=null,y5=null,x6=null,y6=null;
  if(type==='switch2g_uk'){
    if(rot===0){x3=px;y3=py+G;x4=px+3*G;y4=py+G;}
    else if(rot===1){x3=px+G;y3=py;x4=px+G;y4=py+3*G;}
    else if(rot===2){x3=px+3*G;y3=py-G;x4=px;y4=py-G;}
    else{x3=px-G;y3=py+3*G;x4=px-G;y4=py;}
  }
  if(type==='switch3g_uk'){
    if(rot===0){x3=px;y3=py+G;x4=px+3*G;y4=py+G;x5=px;y5=py+2*G;x6=px+3*G;y6=py+2*G;}
    else if(rot===1){x3=px+G;y3=py;x4=px+G;y4=py+3*G;x5=px+2*G;y5=py;x6=px+2*G;y6=py+3*G;}
    else if(rot===2){x3=px+3*G;y3=py-G;x4=px;y4=py-G;x5=px+3*G;y5=py-2*G;x6=px;y6=py-2*G;}
    else{x3=px-G;y3=py+3*G;x4=px-G;y4=py;x5=px-2*G;y5=py+3*G;x6=px-2*G;y6=py;}
  }
  const g=mk('g',{opacity:0.45});
  drawSymbol(g,type,x1,y1,x2,y2,{x3,y3,x4,y4,x5,y5,x6,y6,slots:6});
  layer.appendChild(g);
  const pts=type==='cunit'?[x1,y1]:[x1,y1,x2,y2];
  if(x3!=null) pts.push(x3,y3);
  if(x4!=null) pts.push(x4,y4);
  if(x5!=null) pts.push(x5,y5);
  if(x6!=null) pts.push(x6,y6);
  pts.forEach((v,i)=>{
    if(i%2===0){const cx=v,cy=pts[i+1];
    layer.appendChild(mk('circle',{cx,cy,r:4,fill:'#4da3ff',opacity:0.7}));}
  });
}

