// Core state, circuit management, editing, history, viewport, and selection.

const G = 40; // grid size px
const SVG = document.getElementById('circuit-svg');
const mk = (tag, attrs={}) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

// ── State ──────────────────────────────────────────────────────────────────
let mode = 'select', comps = [], wires = [], sel = null;
// Crossing points (global coord key "x,y") explicitly marked as NOT electrically joined —
// rendered as a hop/jump instead of a junction dot. Default (absent) = real connection.
let jumpPoints = new Set();
let wireStart = null, rot = 0, uid = 1;
let dragging = null, dragOff = {x:0,y:0}, _dragTermOld = null, _dragMoved = false, _dragWireBinds = null;
function _getTerminals(c){
  const t=[{x:c.x1,y:c.y1},{x:c.x2,y:c.y2}];
  if(c.type==='cunit'&&c.mcbTerms) c.mcbTerms.forEach(mt=>t.push({x:mt.x,y:mt.y}));
  if(c.x3!=null)t.push({x:c.x3,y:c.y3});
  if(c.x4!=null)t.push({x:c.x4,y:c.y4});
  return t;
}
// Snapshot which wire endpoints sit on the given terminals at drag start.
// Only these endpoints follow the drag — wires merely passed over mid-drag
// must not be adopted; they connect on drop (node merge by coordinates).
function captureWireBinds(terms){
  const binds=[];
  wires.forEach(w=>{
    terms.forEach((t,i)=>{
      if(w.x1===t.x&&w.y1===t.y) binds.push({w,end:1,ti:i});
      if(w.x2===t.x&&w.y2===t.y) binds.push({w,end:2,ti:i});
    });
  });
  return binds;
}
function filterTools(q){
  const lq=q.toLowerCase().trim();
  document.querySelectorAll('.tool-btn').forEach(b=>{
    b.style.display=(!lq||b.textContent.toLowerCase().includes(lq)||b.title.toLowerCase().includes(lq))?'':'none';
  });
  document.querySelectorAll('.tool-group').forEach(g=>{
    const vis=[...g.querySelectorAll('.tool-btn')].some(b=>b.style.display!=='none');
    g.style.display=vis?'':'none';
  });
}
let _simDirty = false;
let _skipPropsRefresh = false;
let _history = [];
let _future = [];
const MAX_HIST = 50;
let _zoom = 1, _pan = {x:0, y:0};
let _panning = false, _panStart = {x:0, y:0}, _panOrigin = {x:0, y:0};

// AC mode globals
let _acMode = false;
let _acFreq = 50; // Hz

// ── Current flow animation ────────────────────────────────────────────────
let _flowVisible = false;
let _flowLastTs = 0;
const _flowParticles = {}; // keyed by wire id → [{t: 0..1}]

// ── Multiple circuits ──────────────────────────────────────────────────────
let _circuits = [];
let _currentIdx = 0;

const DEFS = {
  R: {value:1000, unit:'Ω', label:'Resistor'},
  C: {value:1e-6,  unit:'F', label:'Capacitor'},
  L: {value:1e-3,  unit:'H', label:'Inductor'},
  V: {value:5,     unit:'V', label:'Voltage Src'},
  I: {value:0.001, unit:'A', label:'Current Src'},
  GND: {value:0, unit:'', label:'Ground'},
  probe: {value:0, unit:'V', label:'Probe'},
  bulb: {value:882, unit:'Ω', label:'Bulb'},
  fuse: {value:0.5,  unit:'A', label:'Fuse'},
  pot:  {value:1000, unit:'Ω', label:'Potentiometer'},
  LED:  {value:2.0,  unit:'V', label:'LED (Fwd V)'},
  seg7: {value:0,    unit:'V', label:'7-Seg Display'},
  buzzer:{value:2.0, unit:'V', label:'Buzzer'},
  diode:{value:0.7,  unit:'V', label:'Diode (Fwd)'},
  zener:{value:5.1,  unit:'V', label:'Zener (Bkdn V)'},
  sw:   {value:0,    unit:'',  label:'Switch'},
  sw2:  {value:0,    unit:'',  label:'Two-Way Switch'},
  AND:  {value:0,    unit:'',  label:'AND Gate'},
  OR:   {value:0,    unit:'',  label:'OR Gate'},
  NOT:  {value:0,    unit:'',  label:'NOT Gate'},
  nmos: {value:2.0, unit:'V', label:'N-MOSFET (Vth)'},
  // New components
  '3ph':  {value:230, unit:'V', label:'3-Phase Source'},
  motor:  {value:1500,unit:'W', label:'AC Motor'},
  xfmr:   {value:1.0, unit:'n', label:'Transformer'},
  load3:  {value:1000,unit:'W', label:'3-Ph Load'},
  // UK House wiring components
  socket_uk: {value:2300, unit:'Ω', label:'UK Socket'},
  switch_uk: {value:0,    unit:'',  label:'UK Plate Switch'},
  crose:     {value:10,   unit:'W', label:'Ceiling Rose'},
  mcb:       {value:6,    unit:'A', label:'MCB'},
  cunit:     {value:0,    unit:'',  label:'Consumer Unit'},
  supply:    {value:230,  unit:'V', label:'1-Ph Mains Supply'},
  rcd:       {value:30,   unit:'mA',label:'RCD (30mA)'},
  dpswitch:  {value:0,    unit:'',  label:'DP Isolator'},
  meter:     {value:0,    unit:'',  label:'Elec. Meter'},
  intswitch: {value:0,    unit:'',  label:'Interm. Switch'},
  switch2_uk: {value:0,  unit:'',  label:'UK 2-Way Switch'},
  switchint_uk:{value:0, unit:'',  label:'UK Interm. Switch'},
  switch2g_uk:{value:0,  unit:'',  label:'UK 2-Gang Switch'},
  switch3g_uk:{value:0,  unit:'',  label:'UK 3-Gang Switch'},
  shower:    {value:9000, unit:'W', label:'Elec. Shower'},
  cooker:    {value:7200, unit:'W', label:'Cooker/Range'},
  kettle:    {value:3000, unit:'W', label:'Kettle'},
  toaster:   {value:1000, unit:'W', label:'Toaster'},
  tv:        {value:100,  unit:'W', label:'TV'},
  fridge:    {value:150,  unit:'W', label:'Fridge'},
  plug:      {value:0,   unit:'', label:'UK Plug (BS 1363)'},
  fan:       {value:20,  unit:'W', label:'Extractor Fan'},
  fcu:       {value:3,   unit:'A', label:'Fused Connection Unit'},
  pullcord:  {value:0,   unit:'',  label:'Pull-Cord Switch'},
};

// Default max ratings before damage occurs
const MAX_RATINGS = {
  R:    {prop:'maxPower',   unit:'W',  def:0.25, label:'Max power'},
  bulb: {prop:'maxPower',   unit:'W',  def:2000, label:'Max power'},
  C:    {prop:'maxVoltage', unit:'V',  def:50,   label:'Max voltage'},
  L:    {prop:'maxCurrent', unit:'A',  def:1,    label:'Max current'},
  fuse: {prop:'maxCurrent', unit:'A',  def:0.5,  label:'Trip current'},
  mcb:  {prop:'maxCurrent', unit:'A',  def:6,    label:'Trip current'},
  fan:  {prop:'maxPower',   unit:'W',  def:100,  label:'Max power'},
};

// ── Helpers ────────────────────────────────────────────────────────────────
const snap = v => Math.round(v / G) * G;
const svgPt = e => { const r=SVG.getBoundingClientRect(); return {x:(e.clientX-r.left-_pan.x)/_zoom,y:(e.clientY-r.top-_pan.y)/_zoom}; };
const snapPt = e => { const p=svgPt(e); return {x:snap(p.x),y:snap(p.y)}; };
const nk = (x,y) => `${x},${y}`;

function terminals(type, px, py, r) {
  if (type==='GND'||type==='probe'||type==='seg7') return [px,py,px,py];
  if (type==='buzzer') {
    if (r===0) return [px, py, px+2*G, py];
    if (r===1) return [px, py, px, py+2*G];
    if (r===2) return [px+2*G, py, px, py];
    return             [px, py+2*G, px, py];
  }
  if (type==='cunit') return [px, py+2*G, px+G, py+4*G];
  //  x1,y1 = L-in: left edge of box, 2G below anchor
  //  x2,y2 = N-bar: bottom of supply section (1G right, 4G below anchor)
  // Logic gates: x1/y1 = output, x2/y2 = input A (AND/OR also have x3/y3 = input B)
  // NOT gate: 2-terminal (output=x1y1, input=x2y2)
  // AND/OR: treat x1y1=output, x2y2=inputA — x3y3 computed separately in placeComp
  // 3ph source: x1=neutral (left), x2=phase-A output (right, top of stack)
  //   x3=phaseB, x4=phaseC stored on component directly; terminals() only returns 2 primary
  // motor: 2-terminal like R
  // xfmr: 4-terminal (primary: x1,y1/x2,y2; secondary: x3,y3/x4,y4) — x1y1,x2y2 are primary
  // load3: 2-terminal (line, neutral)
  const L2 = 2*G;
  const L3 = 3*G;
  const L4 = 4*G;

  // 3-phase source: 4 grid units wide; neutral at left, phase outputs stacked at right
  if (type==='3ph') {
    // x1,y1 = neutral terminal (left), x2,y2 = phase A terminal (right, centre)
    if (r===0) return [px,py, px+L4,py];
    if (r===1) return [px,py, px,py+L4];
    if (r===2) return [px+L4,py, px,py];
    return [px,py+L4, px,py];
  }
  // Transformer: 4-terminal, 4 grid units wide
  // Primary: x1,y1 (top-left) and x3,y3 (bot-left); Secondary: x2,y2 (top-right) and x4,y4 (bot-right)
  // For terminals() we return primary top/bottom so it fits the 2-terminal dragging model
  if (type==='xfmr') {
    if (r===0) return [px,py, px+L4,py];
    if (r===1) return [px,py, px,py+L4];
    if (r===2) return [px+L4,py, px,py];
    return [px,py+L4, px,py];
  }
  // motor, load3: standard 2-terminal, 3G wide
  if (type==='motor'||type==='load3') {
    if (r===0) return [px,py, px+L3,py];
    if (r===1) return [px,py, px,py+L3];
    if (r===2) return [px+L3,py, px,py];
    return [px,py+L3, px,py];
  }
  // Two-way switch (SPDT): COM at origin, L1 at (3G, -G), L2 stored on component as x3,y3
  if (type==='sw2') {
    if (r===0) return [px,    py,    px+L3, py-G];
    if (r===1) return [px,    py,    px+G,  py+L3];
    if (r===2) return [px+L3, py,    px,    py-G];
    return             [px,    py+L3, px-G,  py];
  }
  // UK 2-way plate switch: same terminal layout as sw2
  if (type==='switch2_uk') {
    if (r===0) return [px,    py,    px+L3, py-G];
    if (r===1) return [px,    py,    px+G,  py+L3];
    if (r===2) return [px+L3, py,    px,    py-G];
    return             [px,    py+L3, px-G,  py];
  }
  // UK intermediate plate switch: same terminal layout as intswitch
  if (type==='switchint_uk') {
    if (r===0) return [px,    py-G,  px+L3, py-G];
    if (r===1) return [px+G,  py,    px+G,  py+L3];
    if (r===2) return [px+L3, py+G,  px,    py+G];
    return             [px-G,  py+L3, px-G,  py];
  }
  // 2-gang UK plate switch: gang1 COM at (px,py), gang1 SW at (px+L3,py)
  // gang2 terminals (x3,y3)/(x4,y4) set in placeComp
  if (type==='switch2g_uk') {
    if (r===0) return [px,    py,    px+L3, py];
    if (r===1) return [px,    py,    px,    py+L3];
    if (r===2) return [px+L3, py,    px,    py];
    return             [px,    py+L3, px,    py];
  }
  // 3-gang UK plate switch: gang1 COM at (px,py), gang1 SW at (px+L3,py)
  // gang2 terminals (x3,y3)/(x4,y4) and gang3 (x5,y5)/(x6,y6) set in placeComp
  if (type==='switch3g_uk') {
    if (r===0) return [px,    py,    px+L3, py];
    if (r===1) return [px,    py,    px,    py+L3];
    if (r===2) return [px+L3, py,    px,    py];
    return             [px,    py+L3, px,    py];
  }
  // Intermediate switch: 4-terminal (2 rows of the matrix), 3G wide
  // Primary row: x1,y1 (left, upper), x2,y2 (right, upper)
  // Secondary row (stored via placeComp): x3,y3 (left, lower), x4,y4 (right, lower)
  if (type==='intswitch') {
    if (r===0) return [px,    py-G,  px+L3, py-G];
    if (r===1) return [px+G,  py,    px+G,  py+L3];
    if (r===2) return [px+L3, py+G,  px,    py+G];
    return             [px-G,  py+L3, px-G,  py];
  }
  // AND/OR gate: 3G span. Output=x1y1 (centre-right for r=0), InputA=x2y2 (top of flat side), InputB=x3y3 (bottom of flat side)
  if (type==='AND'||type==='OR') {
    if (r===0) return [px+L3, py+G,  px,    py];
    if (r===1) return [px+G,  py+L3, px,    py];
    if (r===2) return [px,    py+G,  px+L3, py];
    return            [px+G,  py,    px,    py+L3];
  }
  // N-channel MOSFET: 3-terminal, 2G tall. Drain=x1y1, Source=x2y2, Gate stored as x3,y3 in placeComp.
  if (type==='nmos') {
    if (r===0) return [px+G, py,    px+G, py+L2];  // D top, S bottom (gate at px,py+G)
    if (r===1) return [px+L2,py+G,  px,   py+G];   // D right, S left  (gate at px+G,py)
    if (r===2) return [px+G, py+L2, px+G, py];      // D bot, S top    (gate at px+2G,py+G)
    return            [px,   py+G,  px+L2,py+G];    // D left, S right (gate at px+G,py+2G)
  }
  // UK plug: cable-L/cable-N exit perpendicular to the socket face, 2G out from pin positions.
  // Pin positions (x3,y3 and x4,y4) are set by placeComp() to match socket_uk terminals at same px,py,r.
  if (type==='plug') {
    if (r===0) return [px,      py+2*G, px+L3,  py+2*G]; // pins top, cable exits down
    if (r===1) return [px-2*G, py,     px-2*G, py+L3];   // pins right, cable exits left
    if (r===2) return [px+L3,  py-2*G, px,     py-2*G];  // pins bottom, cable exits up
    return            [px+2*G, py+L3,  px+2*G, py];      // pins left, cable exits right
  }
  // UK House components — same terminal layout as their base equivalents
  // socket_uk: same as R (3G horizontal)
  // switch_uk: same as sw (3G horizontal)
  // crose: same as bulb (3G horizontal)
  // mcb: same as fuse (3G horizontal)
  // cunit: single-point (handled above via early return — visual enclosure only)
  // rcd, dpswitch, meter, shower, cooker — all 3G horizontal (fall through)
  // fan: 2G wide (like small appliance)
  if (type==='fan'||type==='pullcord') {
    if (r===0) return [px,py, px+L2,py];
    if (r===1) return [px,py, px,py+L2];
    if (r===2) return [px+L2,py, px,py];
    return [px,py+L2, px,py];
  }
  // fcu: 3G wide (like switch_uk) — falls through to default L3 case
  if (r===0) return [px,py, px+L3,py];
  if (r===1) return [px,py, px,py+L3];
  if (r===2) return [px+L3,py, px,py];
  return [px,py+L3, px,py];
}

function fmtVal(v, unit) {
  if (v===null||v===undefined) return '—';
  const a=Math.abs(v);
  if (a===0) return `0 ${unit}`;
  if (a>=1e9)  return `${(v/1e9).toPrecision(3)} G${unit}`;
  if (a>=1e6)  return `${(v/1e6).toPrecision(3)} M${unit}`;
  if (a>=1e3)  return `${(v/1e3).toPrecision(3)} k${unit}`;
  if (a>=1)    return `${v.toPrecision(4)} ${unit}`;
  if (a>=1e-3) return `${(v*1e3).toPrecision(3)} m${unit}`;
  if (a>=1e-6) return `${(v*1e6).toPrecision(3)} µ${unit}`;
  if (a>=1e-9) return `${(v*1e9).toPrecision(3)} n${unit}`;
  return `${v.toExponential(2)} ${unit}`;
}

function fmtPhasor(mag, phaseDeg) {
  // Formats a phasor as "4.24V ∠-23°" — unit (V or A) supplied by caller
  return null; // placeholder, see fmtPhasorU below
}
function fmtPhasorU(mag, phaseDeg, unit) {
  const mStr = fmtVal(mag, unit);
  const pStr = phaseDeg.toFixed(1);
  return `${mStr} ∠${pStr}°`;
}

// ── AC Mode — auto-detected from sources ───────────────────────────────────
function syncACMode() {
  const was = _acMode;
  _acMode = comps.some(c => c.isAC || c.type==='supply' || c.type==='3ph');
  if (_acMode !== was) updateACUI();
}
function toggleSourceAC(id) {
  const c = comps.find(x => x.id === id); if(!c) return;
  pushHistory(); c.isAC = !c.isAC;
  clearSim(); syncACMode(); render(); simulate(); showProps(id);
}
function onFreqChange() {
  const v = parseFloat(document.getElementById('ac-freq').value);
  if (!isNaN(v) && v > 0) { _acFreq = v; clearSim(); render(); markDirty(); }
}

// ── Circuit management ─────────────────────────────────────────────────────
function saveCurrentCircuit() {
  if (!_circuits.length) return;
  const prev = _circuits[_currentIdx];
  _circuits[_currentIdx] = {
    name: prev.name,
    comps: JSON.parse(JSON.stringify(comps)),
    wires: JSON.parse(JSON.stringify(wires)),
    jumpPoints: Array.from(jumpPoints),
    uid, sel,
    history: JSON.parse(JSON.stringify(_history)),
    acFreq: _acFreq,
    view: { zoom: _zoom, panX: _pan.x, panY: _pan.y },
  };
  if (prev.background) _circuits[_currentIdx].background = prev.background;
}

// Each tab keeps its own camera — restore it (or the default) on switch.
function restoreView(ct) {
  if (ct && ct.view) { _zoom = ct.view.zoom; _pan = { x: ct.view.panX, y: ct.view.panY }; }
  else { _zoom = 1; _pan = { x: 0, y: 0 }; }
  updateViewport();
}

function loadCircuit(idx) {
  saveCurrentCircuit();
  _currentIdx = idx;
  const ct = _circuits[idx];
  comps = JSON.parse(JSON.stringify(ct.comps));
  wires = JSON.parse(JSON.stringify(ct.wires));
  jumpPoints = new Set(ct.jumpPoints || []);
  uid = ct.uid; sel = ct.sel;
  _history = JSON.parse(JSON.stringify(ct.history));
  if(ct.acFreq) _acFreq = ct.acFreq;
  restoreView(ct);
  clearSim(); syncACMode(); render(); showProps(sel);
  updateUndoBtn(); updateTabBar(); updateACUI(); markDirty();
  setMode('select');
}

function addCircuit() {
  saveCurrentCircuit();
  const name = 'Circuit ' + (_circuits.length + 1);
  _circuits.push({name, comps:[], wires:[], uid:1, history:[], sel:null, acFreq:50});
  _currentIdx = _circuits.length - 1;
  comps=[]; wires=[]; uid=1; sel=null; _history=[]; _acMode=false; _acFreq=50;
  jumpPoints = new Set();
  restoreView(null);
  clearSim(); syncACMode(); render(); showProps(null);
  updateUndoBtn(); updateTabBar(); updateACUI(); markClean();
  setMode('select');
}

function deleteCircuit(idx) {
  if (_circuits.length <= 1) return;
  if (!confirm(`Delete "${_circuits[idx].name}"?`)) return;
  _circuits.splice(idx, 1);
  const newIdx = Math.min(idx, _circuits.length - 1);
  _currentIdx = newIdx;
  const ct = _circuits[newIdx];
  comps = JSON.parse(JSON.stringify(ct.comps));
  wires = JSON.parse(JSON.stringify(ct.wires));
  jumpPoints = new Set(ct.jumpPoints || []);
  uid = ct.uid; sel = ct.sel;
  _history = JSON.parse(JSON.stringify(ct.history));
  if(ct.acFreq) _acFreq = ct.acFreq;
  restoreView(ct);
  clearSim(); syncACMode(); render(); showProps(sel);
  updateUndoBtn(); updateTabBar(); updateACUI(); markDirty();
}

function updateTabBar(editIdx=-1) {
  const bar = document.getElementById('tab-bar');
  bar.innerHTML = '';
  _circuits.forEach((ct, i) => {
    const tab = document.createElement('div');
    const active = i === _currentIdx;
    tab.className = active ? 'tab active' : 'tab';
    tab.onclick = () => { if (i !== _currentIdx) loadCircuit(i); };

    if (editIdx === i) {
      const inp = document.createElement('input');
      inp.value = ct.name;
      inp.className = 'tab-rename';
      inp.onclick = e => e.stopPropagation();
      const commit = () => { const n=inp.value.trim()||ct.name; _circuits[i].name=n; updateTabBar(); };
      inp.addEventListener('blur', commit);
      inp.addEventListener('keydown', e => {
        if (e.key==='Enter') inp.blur();
        if (e.key==='Escape') { inp.value=ct.name; inp.blur(); }
      });
      tab.appendChild(inp);
      setTimeout(() => { inp.focus(); inp.select(); }, 0);
    } else {
      const lbl = document.createElement('span');
      lbl.textContent = ct.name;
      lbl.ondblclick = e => { e.stopPropagation(); updateTabBar(i); };
      tab.appendChild(lbl);
      if (_circuits.length > 1) {
        const x = document.createElement('span');
        x.textContent = '×';
        x.className = 'tab-close';
        x.onclick = ev => { ev.stopPropagation(); deleteCircuit(i); };
        tab.appendChild(x);
      }
    }
    bar.appendChild(tab);
  });
  const addBtn = document.createElement('button');
  addBtn.textContent = '+ New';
  addBtn.className = 'tab-add';
  addBtn.onclick = addCircuit;
  bar.appendChild(addBtn);
}

function updateACUI() {
  const badge=document.getElementById('ac-mode-badge');
  const wrap=document.getElementById('ac-freq-wrap');
  const lbl=document.getElementById('hdr-mode-lbl');
  const freqInp=document.getElementById('ac-freq');
  if (_acMode) {
    badge.textContent='AC'; badge.style.color='#fbbf24'; badge.style.borderColor='#fbbf24';
    wrap.style.display='flex'; lbl.textContent='AC Phasor Simulator'; lbl.style.color='#fbbf24';
    freqInp.value=_acFreq;
  } else {
    badge.textContent='DC'; badge.style.color='#8e9cb8'; badge.style.borderColor='#28324a';
    wrap.style.display='none'; lbl.textContent='DC Circuit Simulator'; lbl.style.color='';
  }
}

// ── Mode ───────────────────────────────────────────────────────────────────
function setMode(m) {
  mode=m; wireStart=null; rot=0;
  document.getElementById('ghost-g').innerHTML='';
  document.querySelectorAll('.tool-btn').forEach(b=>b.classList.remove('active'));
  const id='tool-'+m.replace('place-','');
  const btn=document.getElementById(id);
  if(btn) btn.classList.add('active');
  const msgs={
    select:'Click to select. Drag to move. Del to delete.',
    wire:'Click to start wire. Click again to end (H/V only). Esc to cancel.',
    'place-R':'Click to place resistor. R=rotate.',
    'place-C':'Click to place capacitor. R=rotate.',
    'place-L':'Click to place inductor. R=rotate.',
    'place-V':'Click to place voltage source (+terminal at x1). R=rotate.',
    'place-I':'Click to place current source (arrow into x1). R=rotate.',
    'place-GND':'Click to place ground.',
    'place-probe':'Click a grid point to place voltmeter probe.',
    'place-bulb':'Click to place bulb (resistance in Ω). R=rotate.',
    'place-fuse':'Click to place fuse (current rating in A). R=rotate.',
    'place-pot':'Click to place potentiometer. Select it to drag the live slider.',
    'place-LED':'Click to place LED. x1=anode(+), x2=cathode(−). Set forward voltage and colour in props. R=rotate.',
    'place-diode':'Click to place diode. x1=anode(+), x2=cathode(−). Forward drop 0.7V. R=rotate.',
    'place-zener':'Click to place zener diode. x1=anode, x2=cathode. Value=breakdown voltage. R=rotate.',
    'place-sw':'Click to place switch (open by default). Toggle in properties panel. R=rotate.',
    'place-sw2':'Click to place two-way (SPDT) switch. COM=input, L1/L2=alternate outputs. Click switch to toggle. R=rotate.',
    'place-buzzer':'Click to place buzzer. Single terminal — connect x1 to signal, x2 to GND. Sounds when V ≥ threshold.',
    'place-seg7':'Click to place 7-segment display. Connect x1 to a node — shows digit from node voltage.',
    'place-nmos':'Click to place N-channel MOSFET. Drain=x1, Source=x2, Gate=x3 (left side). R=rotate. Value=Vth.',
    'place-AND':'Click to place AND gate. x1=output, x2=inputA, x3=inputB (offset below).',
    'place-OR':'Click to place OR gate. x1=output, x2=inputA, x3=inputB.',
    'place-NOT':'Click to place NOT gate. x1=output, x2=input. R=rotate.',
    'place-3ph':'Click to place 3-phase source. Neutral=left, phases A/B/C stacked at right. AC mode recommended.',
    'place-motor':'Click to place AC motor (modelled as R=V²/P). R=rotate.',
    'place-xfmr':'Click to place transformer. Left=primary, right=secondary. Value=turn ratio n. R=rotate.',
    'place-load3':'Click to place balanced 3-phase star load (modelled as 3×R per phase). R=rotate.',
    'place-cunit':'Click to place Consumer Unit enclosure box (visual annotation). Set slots in properties panel.',
    'place-mcb':'Click to place MCB circuit breaker (current rating in A). R=rotate.',
    'place-switch_uk':'Click to place UK plate switch. Toggle in properties panel. R=rotate.',
    'place-socket_uk':'Click to place UK socket outlet BS 1363 (modelled as load resistance in Ω). R=rotate.',
    'place-plug':'Click to place UK plug (BS 1363). Place on top of a socket at the same rotation — pin terminals connect electrically. Wire cable-L and cable-N to the load. R=rotate.',
    'place-crose':'Click to place ceiling rose / light point (modelled as bulb resistance in Ω). R=rotate.',
    'place-supply':'Click to place single-phase 230V AC mains supply (L and N terminals). R=rotate.',
    'place-rcd':'Click to place RCD. Acts as wire when not tripped; click to trip/reset. R=rotate.',
    'place-dpswitch':'Click to place double-pole switch (main isolator). Click to open/close. R=rotate.',
    'place-meter':'Click to place energy meter (modelled as near-zero resistance). R=rotate.',
    'place-intswitch':'Click to place intermediate switch (4-terminal crossing). Click to toggle. R=rotate.',
    'place-switch2_uk':'Click to place UK 2-way plate switch (COM/L1/L2). Use between two-way pairs for staircase wiring. R=rotate.',
    'place-switchint_uk':'Click to place UK intermediate plate switch (L1/L2 → L1\'/L2\'). Fits between two 2-way switches for 3+ point control. R=rotate.',
    'place-switch2g_uk':'Click to place UK 2-gang plate switch. Two independent on/off gangs on one plate. Toggle each gang in properties panel. R=rotate.',
    'place-switch3g_uk':'Click to place UK 3-gang plate switch. Three independent on/off gangs on one plate. Toggle each gang in properties panel. R=rotate.',
    'place-shower':'Click to place electric shower (value in kW). R=rotate.',
    'place-cooker':'Click to place cooker/hob (value in W). R=rotate.',
    'place-kettle':'Click to place kettle (3kW load, value in W). Connect L and N to a socket circuit. R=rotate.',
    'place-toaster':'Click to place toaster (1kW load, value in W). Connect L and N to a socket circuit. R=rotate.',
    'place-tv':'Click to place TV (100W load, value in W). Connect L and N to a socket circuit. R=rotate.',
    'place-fridge':'Click to place fridge (150W load, value in W). Connect L and N to a socket circuit. R=rotate.',
    'place-fan':'Click to place extractor fan (value in W). Default 20W. R=rotate.',
    'place-fcu':'Click to place Fused Connection Unit (3A fuse, value in A). Spur outlet for fans and lighting. R=rotate.',
    'place-pullcord':'Click to place pull-cord switch. Toggle in properties panel. R=rotate.',
    pan:'Click and drag to pan the canvas. Scroll to zoom.',
  };
  setStatus(msgs[m]||m);
  SVG.style.cursor=m==='select'?'default':m==='pan'?'grab':'crosshair';
  document.body.classList.toggle('body-select',m==='select');
}
function setStatus(s){document.getElementById('status-msg').textContent=s;}

// ── Place / Delete ──────────────────────────────────────────────────────────
function placeComp(type, px, py, r=0, extra={}) {
  const [x1,y1,x2,y2]=terminals(type,px,py,r);
  const c={id:'c'+(uid++),type,px,py,rotation:r,x1,y1,x2,y2,value:DEFS[type].value};
  // Type-specific defaults
  if(type==='cunit'){
    c.slots=extra.slots??6;
    c.cuDP=true; c.cuRCD=true; c.cuRCDma=30; c.cuSPD=false;
    c.cuMCBs=[{A:6,label:'Lighting'},{A:6,label:'Lighting'},{A:32,label:'Sockets'},{A:32,label:'Kitchen'},{A:40,label:'Shower'},{A:32,label:'Cooker'}];
    computeCUnitTerms(c);
  }
  if(type==='LED') c.ledColor='red';
  if(type==='sw')  c.closed=false;
  if(type==='switch_uk') c.closed=false;
  if(type==='shower'||type==='cooker'||type==='kettle'||type==='toaster'||type==='tv'||type==='fridge'||type==='fan') c.on=true;
  if(type==='sw2'){
    // 3-terminal SPDT: COM=(x1,y1), L1=(x2,y2), L2=(x3,y3)
    if(r===0){c.x3=px+3*G; c.y3=py+G;}
    else if(r===1){c.x3=px-G; c.y3=py+3*G;}
    else if(r===2){c.x3=px; c.y3=py+G;}
    else{c.x3=px+G; c.y3=py;}
    c.sw2pos=0; // 0 = COM→L1, 1 = COM→L2
  }
  if(type==='switch2_uk'){
    // UK 2-way plate switch: COM=(x1,y1), L1=(x2,y2), L2=(x3,y3)
    if(r===0){c.x3=px+3*G; c.y3=py+G;}
    else if(r===1){c.x3=px-G; c.y3=py+3*G;}
    else if(r===2){c.x3=px; c.y3=py+G;}
    else{c.x3=px+G; c.y3=py;}
    c.sw2pos=0;
  }
  if(type==='switchint_uk'){
    // UK intermediate plate switch: 4 terminals same as intswitch
    if(r===0){c.x3=px;   c.y3=py+G;  c.x4=px+3*G; c.y4=py+G;}
    else if(r===1){c.x3=px-G; c.y3=py;  c.x4=px-G; c.y4=py+3*G;}
    else if(r===2){c.x3=px+3*G; c.y3=py-G; c.x4=px; c.y4=py-G;}
    else{c.x3=px+G; c.y3=py+3*G; c.x4=px+G; c.y4=py;}
    c.intpos=0;
  }
  if(type==='switch2g_uk'){
    // 2-gang: gang2 COM=(x3,y3), gang2 SW=(x4,y4)
    // rotation=0: gangs stacked vertically (G apart)
    if(r===0){c.x3=px;     c.y3=py+G;   c.x4=px+3*G; c.y4=py+G;}
    else if(r===1){c.x3=px+G; c.y3=py;   c.x4=px+G; c.y4=py+3*G;}
    else if(r===2){c.x3=px+3*G; c.y3=py-G; c.x4=px; c.y4=py-G;}
    else{c.x3=px-G; c.y3=py+3*G; c.x4=px-G; c.y4=py;}
    c.gang1=0; c.gang2=0;
  }
  if(type==='switch3g_uk'){
    // 3-gang: gang2 (x3,y3)/(x4,y4), gang3 (x5,y5)/(x6,y6)
    if(r===0){
      c.x3=px;     c.y3=py+G;   c.x4=px+3*G; c.y4=py+G;
      c.x5=px;     c.y5=py+2*G; c.x6=px+3*G; c.y6=py+2*G;
    } else if(r===1){
      c.x3=px+G;   c.y3=py;     c.x4=px+G;   c.y4=py+3*G;
      c.x5=px+2*G; c.y5=py;     c.x6=px+2*G; c.y6=py+3*G;
    } else if(r===2){
      c.x3=px+3*G; c.y3=py-G;   c.x4=px;     c.y4=py-G;
      c.x5=px+3*G; c.y5=py-2*G; c.x6=px;     c.y6=py-2*G;
    } else {
      c.x3=px-G;   c.y3=py+3*G; c.x4=px-G;   c.y4=py;
      c.x5=px-2*G; c.y5=py+3*G; c.x6=px-2*G; c.y6=py;
    }
    c.gang1=0; c.gang2=0; c.gang3=0;
  }
  if(type==='AND'||type==='OR'){
    // 3-terminal: output=(x1,y1), inputA=(x2,y2), inputB=(x3,y3)
    if(r===0){c.x3=px; c.y3=py+2*G;}
    else if(r===1){c.x3=px+2*G; c.y3=py;}
    else if(r===2){c.x3=px+3*G; c.y3=py+2*G;}
    else{c.x3=px+2*G; c.y3=py+3*G;}
  }
  if(c.type==='nmos'){
    if(r===0){c.x3=c.x1-G;c.y3=(c.y1+c.y2)/2;}
    else if(r===1){c.x3=(c.x1+c.x2)/2;c.y3=c.y1-G;}
    else if(r===2){c.x3=c.x1+G;c.y3=(c.y1+c.y2)/2;}
    else{c.x3=(c.x1+c.x2)/2;c.y3=c.y1+G;}
  }
  // 3-phase source: 4 terminals — neutral(x1,y1=left), phA(x2,y2), phB(x3,y3), phC(x4,y4)
  // For rotation=0: neutral at left, phases at right stacked vertically at G intervals
  if(type==='3ph'){
    if(r===0){c.x3=px+4*G;c.y3=py+G;c.x4=px+4*G;c.y4=py-G;}
    else if(r===1){c.x3=px-G;c.y3=py+4*G;c.x4=px+G;c.y4=py+4*G;}
    else if(r===2){c.x3=px;c.y3=py-G;c.x4=px;c.y4=py+G;}
    else{c.x3=px+G;c.y3=py;c.x4=px-G;c.y4=py;}
    c.phaseV=c.value; // volts line-to-neutral RMS
  }
  // Transformer: 4-terminal — primary (x1,y1)/(x3,y3), secondary (x2,y2)/(x4,y4)
  // rotation=0: x1=top-left, x3=bot-left, x2=top-right, x4=bot-right
  if(type==='xfmr'){
    if(r===0){c.x3=px;c.y3=py+2*G;c.x4=px+4*G;c.y4=py+2*G;}
    else if(r===1){c.x3=px+2*G;c.y3=py;c.x4=px+2*G;c.y4=py+4*G;}
    else if(r===2){c.x3=px+4*G;c.y3=py+2*G;c.x4=px;c.y4=py+2*G;}
    else{c.x3=px+2*G;c.y3=py+4*G;c.x4=px+2*G;c.y4=py;}
  }
  // Intermediate switch: 4-terminal; x3,y3 = lower-left, x4,y4 = lower-right
  if(type==='intswitch'){
    if(r===0){c.x3=px;   c.y3=py+G;  c.x4=px+3*G; c.y4=py+G;}
    else if(r===1){c.x3=px-G; c.y3=py;  c.x4=px-G; c.y4=py+3*G;}
    else if(r===2){c.x3=px+3*G; c.y3=py-G; c.x4=px; c.y4=py-G;}
    else{c.x3=px+G; c.y3=py+3*G; c.x4=px+G; c.y4=py;}
    c.intpos=0; // 0=straight, 1=cross
  }
  if(type==='rcd')      { c.tripped=false; }
  if(type==='dpswitch') {
    c.closed=false;
    if(r===0){c.x3=c.x1; c.y3=c.y1+G; c.x4=c.x2; c.y4=c.y2+G;}
    else if(r===1){c.x3=c.x1-G; c.y3=c.y1; c.x4=c.x2-G; c.y4=c.y2;}
    else if(r===2){c.x3=c.x1; c.y3=c.y1-G; c.x4=c.x2; c.y4=c.y2-G;}
    else{c.x3=c.x1+G; c.y3=c.y1; c.x4=c.x2+G; c.y4=c.y2;}
  }
  if(type==='pullcord') c.closed=false;
  if(type==='fcu') c.blown=false;
  // V/I sources: default phaseDeg=0, isAC=false (DC by default)
  if(type==='V'||type==='I') { c.phaseDeg=0; c.isAC=false; }
  // Plug: set x3,y3 (pin-L) and x4,y4 (pin-N) to match socket_uk L/N at same px,py,r.
  // buildNodeMap unions cable terminals to pin terminals making them same electrical node.
  if(type==='plug'){
    if(r===0){c.x3=px;c.y3=py;c.x4=px+3*G;c.y4=py;}
    else if(r===1){c.x3=px;c.y3=py;c.x4=px;c.y4=py+3*G;}
    else if(r===2){c.x3=px+3*G;c.y3=py;c.x4=px;c.y4=py;}
    else{c.x3=px;c.y3=py+3*G;c.x4=px;c.y4=py;}
  }
  // Socket + plate switch: earth terminal on the BACK side (opposite to plug insertion/cable direction)
  if(type==='socket_uk'||type==='switch_uk'){
    if(r===0){c.x3=c.x1+1.5*G;c.y3=c.y1-G;}
    else if(r===1){c.x3=c.x1+G;c.y3=c.y1+1.5*G;}
    else if(r===2){c.x3=c.x1-1.5*G;c.y3=c.y1+G;}
    else{c.x3=c.x1-G;c.y3=c.y1-1.5*G;}
  }
  Object.assign(c, extra);
  pushHistory(); comps.push(c); syncACMode(); render(); selectComp(c.id); markDirty();
  setMode('select');
  return c;
}
function placeWire(x1,y1,x2,y2){
  if(x1===x2&&y1===y2) return;
  pushHistory(); wires.push({id:'w'+(uid++),x1,y1,x2,y2}); render(); markDirty();
}
// Recompute primary + extra terminals for an existing component after rotation.
// Mirrors the extra-terminal logic from placeComp() without creating a new object.
function recomputeExtraTerminals(c){
  const r=c.rotation||0;
  const px=c.px, py=c.py;
  const [x1,y1,x2,y2]=terminals(c.type,px,py,r);
  c.x1=x1; c.y1=y1; c.x2=x2; c.y2=y2;
  if(c.type==='sw2'||c.type==='switch2_uk'){
    if(r===0){c.x3=px+3*G;c.y3=py+G;}
    else if(r===1){c.x3=px-G;c.y3=py+3*G;}
    else if(r===2){c.x3=px;c.y3=py+G;}
    else{c.x3=px+G;c.y3=py;}
  }
  if(c.type==='switchint_uk'||c.type==='intswitch'){
    if(r===0){c.x3=px;   c.y3=py+G;  c.x4=px+3*G;c.y4=py+G;}
    else if(r===1){c.x3=px-G;c.y3=py;  c.x4=px-G; c.y4=py+3*G;}
    else if(r===2){c.x3=px+3*G;c.y3=py-G;c.x4=px; c.y4=py-G;}
    else{c.x3=px+G;c.y3=py+3*G;c.x4=px+G;c.y4=py;}
  }
  if(c.type==='switch2g_uk'){
    if(r===0){c.x3=px;    c.y3=py+G;  c.x4=px+3*G;c.y4=py+G;}
    else if(r===1){c.x3=px+G;c.y3=py;  c.x4=px+G; c.y4=py+3*G;}
    else if(r===2){c.x3=px+3*G;c.y3=py-G;c.x4=px;c.y4=py-G;}
    else{c.x3=px-G;c.y3=py+3*G;c.x4=px-G;c.y4=py;}
  }
  if(c.type==='switch3g_uk'){
    if(r===0){
      c.x3=px;    c.y3=py+G;   c.x4=px+3*G;c.y4=py+G;
      c.x5=px;    c.y5=py+2*G; c.x6=px+3*G;c.y6=py+2*G;
    } else if(r===1){
      c.x3=px+G;  c.y3=py;     c.x4=px+G;  c.y4=py+3*G;
      c.x5=px+2*G;c.y5=py;     c.x6=px+2*G;c.y6=py+3*G;
    } else if(r===2){
      c.x3=px+3*G;c.y3=py-G;   c.x4=px;    c.y4=py-G;
      c.x5=px+3*G;c.y5=py-2*G; c.x6=px;    c.y6=py-2*G;
    } else {
      c.x3=px-G;  c.y3=py+3*G; c.x4=px-G;  c.y4=py;
      c.x5=px-2*G;c.y5=py+3*G; c.x6=px-2*G;c.y6=py;
    }
  }
  if(c.type==='AND'||c.type==='OR'){
    if(r===0){c.x3=px;      c.y3=py+2*G;}
    else if(r===1){c.x3=px+2*G;c.y3=py;}
    else if(r===2){c.x3=px+3*G;c.y3=py+2*G;}
    else{c.x3=px+2*G;c.y3=py+3*G;}
  }
  if(c.type==='nmos'){
    if(r===0){c.x3=c.x1-G;  c.y3=(c.y1+c.y2)/2;}
    else if(r===1){c.x3=(c.x1+c.x2)/2;c.y3=c.y1-G;}
    else if(r===2){c.x3=c.x1+G;  c.y3=(c.y1+c.y2)/2;}
    else{c.x3=(c.x1+c.x2)/2;c.y3=c.y1+G;}
  }
  if(c.type==='3ph'){
    if(r===0){c.x3=px+4*G;c.y3=py+G; c.x4=px+4*G;c.y4=py-G;}
    else if(r===1){c.x3=px-G;c.y3=py+4*G;c.x4=px+G;c.y4=py+4*G;}
    else if(r===2){c.x3=px;  c.y3=py-G;  c.x4=px;  c.y4=py+G;}
    else{c.x3=px+G;c.y3=py;  c.x4=px-G; c.y4=py;}
  }
  if(c.type==='xfmr'){
    if(r===0){c.x3=px;      c.y3=py+2*G;c.x4=px+4*G;c.y4=py+2*G;}
    else if(r===1){c.x3=px+2*G;c.y3=py;   c.x4=px+2*G;c.y4=py+4*G;}
    else if(r===2){c.x3=px+4*G;c.y3=py+2*G;c.x4=px;  c.y4=py+2*G;}
    else{c.x3=px+2*G;c.y3=py+4*G;c.x4=px+2*G;c.y4=py;}
  }
  if(c.type==='dpswitch'){
    if(r===0){c.x3=c.x1;   c.y3=c.y1+G;c.x4=c.x2;   c.y4=c.y2+G;}
    else if(r===1){c.x3=c.x1-G;c.y3=c.y1;  c.x4=c.x2-G;c.y4=c.y2;}
    else if(r===2){c.x3=c.x1;   c.y3=c.y1-G;c.x4=c.x2;   c.y4=c.y2-G;}
    else{c.x3=c.x1+G;c.y3=c.y1;  c.x4=c.x2+G;c.y4=c.y2;}
  }
  if(c.type==='plug'){
    if(r===0){c.x3=px;    c.y3=py;    c.x4=px+3*G;c.y4=py;}
    else if(r===1){c.x3=px;    c.y3=py;    c.x4=px;    c.y4=py+3*G;}
    else if(r===2){c.x3=px+3*G;c.y3=py;    c.x4=px;    c.y4=py;}
    else{c.x3=px;    c.y3=py+3*G;c.x4=px;    c.y4=py;}
  }
  if(c.type==='socket_uk'||c.type==='switch_uk'){
    if(r===0){c.x3=c.x1+1.5*G;c.y3=c.y1-G;}
    else if(r===1){c.x3=c.x1+G;  c.y3=c.y1+1.5*G;}
    else if(r===2){c.x3=c.x1-1.5*G;c.y3=c.y1+G;}
    else{c.x3=c.x1-G;    c.y3=c.y1-1.5*G;}
  }
  if(c.type==='cunit') computeCUnitTerms(c);
}
function delComp(id){pushHistory();comps=comps.filter(c=>c.id!==id);if(sel===id){sel=null;showProps(null);}syncACMode();render();simulate();markDirty();}
function delWire(id){pushHistory();wires=wires.filter(w=>w.id!==id);if(sel===id){sel=null;showProps(null);}render();markDirty();}
function clearAll(){if(!confirm('Clear everything?'))return;pushHistory();comps=[];wires=[];jumpPoints=new Set();sel=null;clearSim();render();showProps(null);markClean();}

// ── History (undo/redo) ────────────────────────────────────────────────────
function pushHistory(){
  _history.push({comps:JSON.parse(JSON.stringify(comps)),wires:JSON.parse(JSON.stringify(wires)),jumpPoints:Array.from(jumpPoints),uid});
  if(_history.length>MAX_HIST)_history.shift();
  _future=[];
  updateUndoBtn(); updateRedoBtn();
}
function undo(){
  if(!_history.length) return;
  _future.push({comps:JSON.parse(JSON.stringify(comps)),wires:JSON.parse(JSON.stringify(wires)),jumpPoints:Array.from(jumpPoints),uid});
  const snap=_history.pop();
  comps=snap.comps; wires=snap.wires; jumpPoints=new Set(snap.jumpPoints||[]); uid=snap.uid;
  sel=null; clearSim(); render(); showProps(null); markDirty(); updateUndoBtn(); updateRedoBtn();
}
function redo(){
  if(!_future.length) return;
  _history.push({comps:JSON.parse(JSON.stringify(comps)),wires:JSON.parse(JSON.stringify(wires)),jumpPoints:Array.from(jumpPoints),uid});
  if(_history.length>MAX_HIST)_history.shift();
  const snap=_future.pop();
  comps=snap.comps; wires=snap.wires; jumpPoints=new Set(snap.jumpPoints||[]); uid=snap.uid;
  sel=null; clearSim(); render(); showProps(null); markDirty(); updateUndoBtn(); updateRedoBtn();
}
function updateUndoBtn(){const b=document.getElementById('undo-btn');if(b)b.disabled=!_history.length;}
function updateRedoBtn(){const b=document.getElementById('redo-btn');if(b)b.disabled=!_future.length;}

// ── Dirty / Re-run ─────────────────────────────────────────────────────────
function markDirty(){
  _simDirty=true;
  simulate();
}
function markClean(){
  _simDirty=false;
}

// ── Viewport (zoom/pan) ────────────────────────────────────────────────────
function updateViewport(){
  document.getElementById('viewport-g').setAttribute('transform',`translate(${_pan.x.toFixed(1)},${_pan.y.toFixed(1)}) scale(${_zoom.toFixed(4)})`);
  const b=document.getElementById('zoom-pct');
  if(b)b.textContent=Math.round(_zoom*100)+'%';
}
function zoomTo(sx,sy,nz){
  nz=Math.max(0.1,Math.min(8,nz));
  const s=nz/_zoom;
  _pan.x=sx-s*(sx-_pan.x); _pan.y=sy-s*(sy-_pan.y); _zoom=nz;
  updateViewport();
}
function _svgCenter(){const r=SVG.getBoundingClientRect();return{x:r.width/2,y:r.height/2};}
function zoomIn(){const c=_svgCenter();zoomTo(c.x,c.y,_zoom*1.25);}
function zoomOut(){const c=_svgCenter();zoomTo(c.x,c.y,_zoom/1.25);}
function zoomReset(){_zoom=1;_pan={x:0,y:0};updateViewport();}

// ── Selection ──────────────────────────────────────────────────────────────
function selectComp(id){sel=id;render();showProps(id);}
function selectWire(id){sel=id;render();showWireProps(id);}

function showProps(id) {
  const el=document.getElementById('props');
  if(!id){el.innerHTML='<div style="color:#8e9cb8;font-size:10px">Select a component.</div>';return;}
  const c=comps.find(x=>x.id===id);
  if(!c){el.innerHTML='';return;}
  const d=DEFS[c.type];
  if(c.type==='GND'||c.type==='probe'||c.type==='seg7'){
    const vStr=c.simV!=null?`<div style="color:#34d399;font-size:11px;margin-bottom:4px">${fmtVal(c.simV,'V')}</div>`:'';
    const extra=c.type==='seg7'&&c.simV!=null?`<div style="color:#0891b2;font-size:10px">Digit: ${c.segVal??0}</div>`:
                c.type==='buzzer'&&c.simV!=null?`<div style="color:${c.buzzerOn?'#facc15':'#5d6a85'};font-size:10px">${c.buzzerOn?'BUZZING':'silent'}</div>`:'';
    el.innerHTML=`<div style="color:#8e9cb8;font-size:10px">${d.label}</div>
    ${c.type==='buzzer'?`<div class="prop-row"><label>Threshold (V)</label><input type="number" id="pv" value="${c.value}" step="any"/></div>`:''}
    ${vStr}${extra}
    <button class="btn danger" onclick="delComp('${id}')" style="margin-top:4px">Delete</button>`;
    if(document.getElementById('pv'))
      document.getElementById('pv').addEventListener('input', ()=>applyProp(id));
    return;
  }
  if(c.type==='AND'||c.type==='OR'||c.type==='NOT'){
    const outV=c.gateOut!=null?c.gateOut:null;
    const stateStr=outV!=null?(outV>2.5?'HIGH (5V)':'LOW (0V)'):'(not simulated)';
    const col=outV!=null?(outV>2.5?'#4ade80':'#5d6a85'):'#5d6a85';
    el.innerHTML=`<div style="color:#8e9cb8;font-size:10px">${d.label}</div>
    <div style="color:${col};font-size:12px;font-weight:bold;margin:6px 0">Output: ${stateStr}</div>
    <div style="color:#8e9cb8;font-size:9px;margin-bottom:4px">Threshold: 2.5V. HIGH=5V, LOW=0V.</div>
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    return;
  }
  if(c.type==='sw'||c.type==='switch_uk'){
    const col=c.closed?'#34d399':'#5d6a85';
    const lbl=c.closed?'CLOSED':'OPEN';
    const swLabel=c.type==='switch_uk'?'UK Plate Switch':'Switch';
    el.innerHTML=`<div style="color:#8e9cb8;font-size:10px">${swLabel}</div>
    <div style="color:${col};font-size:13px;font-weight:bold;margin:6px 0">${lbl}</div>
    <button class="btn" onclick="toggleSwitch('${id}')" style="border-color:${col};color:${col};margin-bottom:4px">${c.closed?'Open switch':'Close switch'}</button>
    ${c.simI!=null?`<div style="color:#e3ad33;font-size:10px;margin-bottom:4px">I = ${fmtVal(c.simI,'A')}</div>`:''}
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    return;
  }
  if(c.type==='dpswitch'){
    const dpcol=c.closed?'#34d399':'#5d6a85';
    el.innerHTML=`<div style="color:#8e9cb8;font-size:10px">DP Isolator (Double-Pole Switch)</div>
    <div style="color:#8e9cb8;font-size:9px;margin-bottom:6px">Isolates both Live and Neutral simultaneously.</div>
    <div style="color:${dpcol};font-size:13px;font-weight:bold;margin:6px 0">${c.closed?'CLOSED':'OPEN'}</div>
    <button class="btn" onclick="toggleSwitch('${id}')" style="border-color:${dpcol};color:${dpcol};margin-bottom:4px">${c.closed?'Open (isolate)':'Close (connect)'}</button>
    ${c.simI!=null?`<div style="color:#e3ad33;font-size:10px;margin-bottom:4px">I = ${fmtVal(c.simI,'A')}</div>`:''}
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    return;
  }
  if(c.type==='rcd'){
    const rcdcol=c.tripped?'#ef4444':'#34d399';
    el.innerHTML=`<div style="color:#8e9cb8;font-size:10px">RCD — Residual Current Device</div>
    <div style="color:#8e9cb8;font-size:9px;margin-bottom:6px">Trips on earth fault &gt; ${c.value}mA. Protects against electric shock.</div>
    <div style="color:${rcdcol};font-size:13px;font-weight:bold;margin:6px 0">${c.tripped?'TRIPPED':'OK'}</div>
    <button class="btn" onclick="toggleSwitch('${id}')" style="border-color:${rcdcol};color:${rcdcol};margin-bottom:4px">${c.tripped?'Reset RCD':'Trip RCD'}</button>
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    return;
  }
  if(c.type==='intswitch'){
    const ipos=c.intpos??0;
    el.innerHTML=`<div class="prop-row"><label>Intermediate Switch</label></div>
    <div style="color:#a78bfa;font-size:11px;font-weight:bold;margin-bottom:6px">${ipos===0?'STRAIGHT (→)':'CROSSED (×)'}</div>
    <div style="font-size:9px;color:#8e9cb8;margin-bottom:8px;line-height:1.5">
      4-terminal for 3-switch staircase wiring.<br>
      Straight: top↔top, bottom↔bottom<br>
      Crossed: top-L↔bottom-R, top-R↔bottom-L
    </div>
    <button class="btn" onclick="toggleSwitch('${id}')" style="border-color:#a78bfa;color:#a78bfa;margin-bottom:4px">Toggle → ${ipos===0?'Crossed ×':'Straight →'}</button>
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    return;
  }
  if(c.type==='meter'){
    el.innerHTML=`<div style="color:#8e9cb8;font-size:10px">Electricity Meter</div>
    <div style="color:#8e9cb8;font-size:9px;margin-bottom:6px">Records energy (kWh). Models as 0.001Ω pass-through.</div>
    ${c.simI!=null?`<div style="color:#34d399;font-size:11px;margin-bottom:4px">I = ${fmtVal(c.simI,'A')}</div>`:''}
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    return;
  }
  if(c.type==='cunit'){
    // Ensure defaults
    if(!c.cuMCBs) c.cuMCBs=[{A:6,label:'Lighting'},{A:6,label:'Lighting'},{A:32,label:'Sockets'},{A:32,label:'Kitchen'},{A:40,label:'Shower'},{A:32,label:'Cooker'}];
    if(c.cuDP===undefined) c.cuDP=true;
    if(c.cuRCD===undefined) c.cuRCD=true;
    if(c.cuRCDma===undefined) c.cuRCDma=30;
    if(c.cuSPD===undefined) c.cuSPD=false;
    const mcbRows=c.cuMCBs.map((m,i)=>{
      const mt=c.mcbTerms?.[i];
      const blown2=mt?.blown??false;
      const simI2=mt?.simI!=null?` — ${fmtVal(mt.simI,'A')}`:'';
      const statusStyle=blown2?'color:#ef4d4d;font-size:8px':'color:#16a34a;font-size:8px';
      const statusText=blown2?'TRIPPED':(mt?.simI!=null?simI2:'');
      return `<div style="display:flex;align-items:center;gap:4px;margin-bottom:3px">
        <select onchange="updateCUnitMCB('${id}',${i},'A',this.value)" style="background:#090c14;border:1px solid ${blown2?'#ff6166':'#28324a'};color:#dce4f2;padding:2px 3px;font-family:inherit;font-size:10px;border-radius:3px;width:52px">
          ${[6,10,16,20,25,32,40,50,63].map(a=>`<option value="${a}"${m.A==a?' selected':''}>${a}A</option>`).join('')}
        </select>
        <input type="text" value="${m.label||''}" placeholder="Label" maxlength="16"
          onchange="updateCUnitMCB('${id}',${i},'label',this.value)"
          style="flex:1;background:#090c14;border:1px solid #28324a;color:#dce4f2;padding:2px 4px;font-family:inherit;font-size:10px;border-radius:3px;min-width:0"/>
        ${blown2?`<span style="${statusStyle}">TRIP</span>`:(mt?.simI!=null?`<span style="${statusStyle}">${fmtVal(mt.simI,'A')}</span>`:'')}
        <button onclick="removeCUnitMCB('${id}',${i})" style="background:rgba(239,77,77,0.1);border:1px solid rgba(239,77,77,0.35);color:#ff7b78;padding:1px 6px;cursor:pointer;border-radius:5px;font-size:10px;flex-shrink:0">&#x2715;</button>
      </div>`;
    }).join('');
    el.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="color:#4da3ff;font-size:11px;font-weight:bold;letter-spacing:1px">CONSUMER UNIT BUILDER</div>
        <button onclick="toggleGuide()" style="background:#0c2040;border:1px solid #2f7df6;color:#4da3ff;font-size:9px;padding:2px 7px;border-radius:3px;cursor:pointer;font-family:inherit" title="Open Consumer Unit guide">? Guide</button>
      </div>
      <div class="prop-row" style="align-items:center;gap:6px;margin-bottom:4px">
        <input type="checkbox" id="cu-dp" ${c.cuDP?'checked':''} onchange="toggleCUnitProp('${id}','cuDP',this.checked)" style="margin:0;cursor:pointer"/>
        <label for="cu-dp" style="color:#2563eb;cursor:pointer;flex:1">DP Isolator</label>
      </div>
      <div class="prop-row" style="align-items:center;gap:6px;margin-bottom:4px">
        <input type="checkbox" id="cu-rcd" ${c.cuRCD?'checked':''} onchange="toggleCUnitProp('${id}','cuRCD',this.checked)" style="margin:0;cursor:pointer"/>
        <label for="cu-rcd" style="color:#f5a623;cursor:pointer;flex:1">RCD</label>
        <select onchange="toggleCUnitProp('${id}','cuRCDma',+this.value)" style="background:#090c14;border:1px solid #28324a;color:#dce4f2;padding:2px 3px;font-family:inherit;font-size:10px;border-radius:3px;width:60px">
          ${[10,30,100,300].map(v=>`<option value="${v}"${c.cuRCDma==v?' selected':''}>${v}mA</option>`).join('')}
        </select>
      </div>
      <div class="prop-row" style="align-items:center;gap:6px;margin-bottom:8px">
        <input type="checkbox" id="cu-spd" ${c.cuSPD?'checked':''} onchange="toggleCUnitProp('${id}','cuSPD',this.checked)" style="margin:0;cursor:pointer"/>
        <label for="cu-spd" style="color:#ca8a04;cursor:pointer;flex:1">Surge Protection (SPD)</label>
      </div>
      <div style="color:#8e9cb8;font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">MCB Circuits</div>
      <div id="cu-mcb-list" style="max-height:200px;overflow-y:auto;border:1px solid #19202f;border-radius:4px;padding:5px;margin-bottom:5px">
        ${mcbRows}
      </div>
      <button class="btn" onclick="addCUnitMCB('${id}')" style="margin-bottom:10px;font-size:10px">+ Add MCB Circuit</button>
      <div style="background:rgba(52,211,153,0.07);border:1px solid rgba(52,211,153,0.3);border-radius:8px;padding:9px;margin-bottom:6px">
        <div style="color:#34d399;font-size:10px;font-weight:bold;margin-bottom:3px">Apply Configuration</div>
        <div style="color:#8e9cb8;font-size:9px;margin-bottom:6px;line-height:1.4">Updates the CU terminals to match the MCB list above. Wire mains L to the red terminal, circuit loads to the green MCB outputs, and circuit N returns to the blue N-bar.</div>
        <button class="btn primary" onclick="applyCUnitConfig('${id}')" style="font-size:10px;margin:0">&#10003; Apply Configuration</button>
      </div>
      ${c.mcbTerms?.some(m=>m.blown)?`<button class="btn" onclick="resetCUnitMCBs('${id}')" style="font-size:10px;margin-bottom:4px;border-color:#f5a623;color:#f5a623">&#8635; Reset Tripped MCBs</button><br>`:''}
      <button class="btn danger" onclick="delComp('${id}')" style="margin-top:2px">Delete</button>`;
    return;
  }
  if(c.type==='shower'||c.type==='cooker'||c.type==='kettle'||c.type==='toaster'||c.type==='tv'||c.type==='fridge'||c.type==='fan'){
    const tags={shower:'Electric Shower',cooker:'Cooker / Range',kettle:'Kettle',toaster:'Toaster',tv:'TV / Monitor',fridge:'Fridge / Freezer',fan:'Extractor Fan'};
    const tag=tags[c.type]||c.type;
    const isOn=c.on!==false;
    const oncol=isOn?'#34d399':'#5d6a85';
    el.innerHTML=`<div style="color:#8e9cb8;font-size:10px">${tag}</div>
    <div class="prop-row"><label>Power (W)</label><input type="number" id="pv" value="${c.value}" step="${c.type==='tv'||c.type==='fridge'||c.type==='fan'?10:100}"/></div>
    <div style="color:${oncol};font-size:13px;font-weight:bold;margin:6px 0">${isOn?'ON':'OFF'}</div>
    <button class="btn" onclick="toggleSwitch('${id}')" style="border-color:${oncol};color:${oncol};margin-bottom:4px">${isOn?'Turn off':'Turn on'}</button>
    ${isOn&&c.simPower!=null?`<div style="color:#ffd700;font-size:11px;margin-bottom:4px">P = ${fmtVal(c.simPower,'W')}</div>`:''}
    ${isOn&&c.simI!=null?`<div style="color:#e3ad33;font-size:10px;margin-bottom:4px">I = ${fmtVal(c.simI,'A')}</div>`:''}
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    document.getElementById('pv').addEventListener('input', ()=>applyProp(id));
    return;
  }
  if(c.type==='fcu'){
    const fcucol=c.blown?'#ef4444':'#34d399';
    el.innerHTML=`<div style="color:#8e9cb8;font-size:10px">Fused Connection Unit</div>
    <div style="color:#8e9cb8;font-size:9px;margin-bottom:6px">Spur outlet with integrated fuse. Trips if I exceeds rating.</div>
    <div style="color:${fcucol};font-size:13px;font-weight:bold;margin:6px 0">${c.blown?'BLOWN':'OK'}</div>
    <div class="prop-row"><label>Fuse rating (A)</label><input type="number" id="pv" value="${c.value}" step="0.5" min="0.5"/></div>
    ${c.simI!=null?`<div style="color:#e3ad33;font-size:10px;margin-bottom:4px">I = ${fmtVal(c.simI,'A')}</div>`:''}
    ${c.blown?`<button class="btn" onclick="resetDamage('${id}')" style="color:#ffd700;border-color:#ffd700;margin-bottom:4px">↺ Replace Fuse</button>`:''}
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    document.getElementById('pv').addEventListener('input', ()=>applyProp(id));
    return;
  }
  if(c.type==='pullcord'){
    const pccol=c.closed?'#34d399':'#5d6a85';
    el.innerHTML=`<div style="color:#8e9cb8;font-size:10px">Pull-Cord Switch</div>
    <div style="color:${pccol};font-size:13px;font-weight:bold;margin:6px 0">${c.closed?'CLOSED':'OPEN'}</div>
    <button class="btn" onclick="toggleSwitch('${id}')" style="border-color:${pccol};color:${pccol};margin-bottom:4px">${c.closed?'Open switch':'Close switch'}</button>
    ${c.simI!=null?`<div style="color:#e3ad33;font-size:10px;margin-bottom:4px">I = ${fmtVal(c.simI,'A')}</div>`:''}
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    return;
  }
  if(c.type==='sw2'){
    const pos=c.sw2pos??0;
    el.innerHTML=`<div class="prop-row"><label>Two-Way Switch (SPDT)</label></div>
    <div style="color:#60a5fa;font-size:11px;font-weight:bold;margin-bottom:6px">COM → ${pos===0?'L1 (active)':'L2 (active)'}</div>
    <div style="font-size:9px;color:#8e9cb8;margin-bottom:8px;line-height:1.5">
      COM: Live input terminal<br>
      L1 / L2: alternate switched outputs<br>
      Click switch on canvas to toggle
    </div>
    <button class="btn" onclick="toggleSwitch('${id}')" style="border-color:#60a5fa;color:#60a5fa;margin-bottom:4px">Toggle → ${pos===0?'L2':'L1'}</button>
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    return;
  }
  if(c.type==='switch2_uk'){
    const pos=c.sw2pos??0;
    const stateCol=pos===0?'#22c55e':'#3b82f6';
    el.innerHTML=`<div class="prop-row"><label>UK 2-Way Plate Switch</label></div>
    <div style="font-size:9px;color:#8e9cb8;margin-bottom:6px;line-height:1.5">
      <b style="color:#b45309">COM</b> = Live in (Brown)<br>
      <b style="color:#1e40af">L1</b> = Strapper 1 (Blue)<br>
      <b style="color:#6b7280">L2</b> = Strapper 2 (Grey/Black)
    </div>
    <div style="color:${stateCol};font-size:12px;font-weight:bold;margin-bottom:8px">COM → ${pos===0?'L1':'L2'}</div>
    <button class="btn" onclick="toggleSwitch('${id}')" style="border-color:${stateCol};color:${stateCol};margin-bottom:4px">Toggle → ${pos===0?'L2':'L1'}</button>
    ${c.simI!=null?`<div style="color:#e3ad33;font-size:10px;margin-bottom:4px">I = ${fmtVal(c.simI,'A')}</div>`:''}
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    return;
  }
  if(c.type==='switchint_uk'){
    const ipos=c.intpos??0;
    el.innerHTML=`<div class="prop-row"><label>UK Intermediate Plate Switch</label></div>
    <div style="color:#f97316;font-size:11px;font-weight:bold;margin-bottom:6px">${ipos===0?'STRAIGHT (L1→L1\', L2→L2\')':'CROSSED (L1→L2\', L2→L1\')'}</div>
    <div style="font-size:9px;color:#8e9cb8;margin-bottom:8px;line-height:1.5">
      Fitted between two 2-way switches for 3+ point control.<br>
      <b>L1/L2</b>: strapper inputs from one 2-way switch<br>
      <b>L1'/L2'</b>: strapper outputs to the next switch
    </div>
    <button class="btn" onclick="toggleSwitch('${id}')" style="border-color:#f97316;color:#f97316;margin-bottom:4px">Toggle → ${ipos===0?'Crossed':'Straight'}</button>
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    return;
  }
  if(c.type==='switch2g_uk'){
    const g1=c.gang1??0, g2=c.gang2??0;
    const col1=g1?'#34d399':'#5d6a85', col2=g2?'#34d399':'#5d6a85';
    el.innerHTML=`<div style="color:#60a5fa;font-size:11px;font-weight:bold;margin-bottom:6px">UK 2-Gang Plate Switch</div>
    <div style="color:#8e9cb8;font-size:9px;margin-bottom:8px;line-height:1.5">Two independent on/off switches on one plate.<br>Each gang: COM (left) → SW (right).</div>
    <div style="margin-bottom:6px">
      <div style="color:${col1};font-size:11px;font-weight:bold;margin-bottom:3px">Gang 1: ${g1?'CLOSED':'OPEN'}</div>
      <button class="btn" onclick="toggleGang('${id}',1)" style="border-color:${col1};color:${col1};margin-bottom:6px">${g1?'Open Gang 1':'Close Gang 1'}</button>
    </div>
    <div style="margin-bottom:6px">
      <div style="color:${col2};font-size:11px;font-weight:bold;margin-bottom:3px">Gang 2: ${g2?'CLOSED':'OPEN'}</div>
      <button class="btn" onclick="toggleGang('${id}',2)" style="border-color:${col2};color:${col2};margin-bottom:6px">${g2?'Open Gang 2':'Close Gang 2'}</button>
    </div>
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    return;
  }
  if(c.type==='switch3g_uk'){
    const g1=c.gang1??0, g2=c.gang2??0, g3=c.gang3??0;
    const col1=g1?'#34d399':'#5d6a85', col2=g2?'#34d399':'#5d6a85', col3=g3?'#34d399':'#5d6a85';
    el.innerHTML=`<div style="color:#60a5fa;font-size:11px;font-weight:bold;margin-bottom:6px">UK 3-Gang Plate Switch</div>
    <div style="color:#8e9cb8;font-size:9px;margin-bottom:8px;line-height:1.5">Three independent on/off switches on one plate.<br>Each gang: COM (left) → SW (right).</div>
    <div style="margin-bottom:6px">
      <div style="color:${col1};font-size:11px;font-weight:bold;margin-bottom:3px">Gang 1: ${g1?'CLOSED':'OPEN'}</div>
      <button class="btn" onclick="toggleGang('${id}',1)" style="border-color:${col1};color:${col1};margin-bottom:6px">${g1?'Open Gang 1':'Close Gang 1'}</button>
    </div>
    <div style="margin-bottom:6px">
      <div style="color:${col2};font-size:11px;font-weight:bold;margin-bottom:3px">Gang 2: ${g2?'CLOSED':'OPEN'}</div>
      <button class="btn" onclick="toggleGang('${id}',2)" style="border-color:${col2};color:${col2};margin-bottom:6px">${g2?'Open Gang 2':'Close Gang 2'}</button>
    </div>
    <div style="margin-bottom:6px">
      <div style="color:${col3};font-size:11px;font-weight:bold;margin-bottom:3px">Gang 3: ${g3?'CLOSED':'OPEN'}</div>
      <button class="btn" onclick="toggleGang('${id}',3)" style="border-color:${col3};color:${col3};margin-bottom:6px">${g3?'Open Gang 3':'Close Gang 3'}</button>
    </div>
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    return;
  }
  if(c.type==='LED'){
    const ledCols=['red','green','blue','white'];
    const colorBtns=ledCols.map(col=>`<button class="btn" onclick="setLEDColor('${id}','${col}')"
      style="width:auto;padding:3px 8px;margin:1px;${c.ledColor===col?'border-color:#4da3ff;color:#4da3ff':''}">${col}</button>`).join('');
    const onStr=c.ledOn!=null?(c.ledOn?'ON (conducting)':'OFF (below Vf)'):'(not simulated)';
    const onCol=c.ledOn?'#4ade80':'#5d6a85';
    el.innerHTML=`<div style="color:#8e9cb8;font-size:10px">${d.label}</div>
    <div class="prop-row"><label>Forward V (V)</label><input type="number" id="pv" value="${c.value}" step="0.1"/></div>
    <div style="font-size:10px;color:#8e9cb8;margin-bottom:4px">Colour:</div>
    <div style="display:flex;flex-wrap:wrap;gap:2px;margin-bottom:6px">${colorBtns}</div>
    <div style="color:${onCol};font-size:10px;margin-bottom:4px">${onStr}</div>
    <button class="btn danger" onclick="delComp('${id}')" style="margin-top:4px">Delete</button>`;
    document.getElementById('pv').addEventListener('input', ()=>applyProp(id));
    return;
  }
  const mr=MAX_RATINGS[c.type];
  const ratingRow = mr ? `<div class="prop-row"><label>${mr.label} (${mr.unit})</label>
    <input type="number" id="pmr" value="${c.maxRating??mr.def}" step="any"/></div>` : '';
  const dmgRow = (c.damaged||c.blown)
    ? `<button class="btn" onclick="resetDamage('${id}')" style="color:#ffd700;border-color:#ffd700;margin-top:4px">↺ Replace / Reset</button>` : '';
  const fuseNote = (c.type==='fuse'||c.type==='mcb')
    ? `<div style="color:${c.blown?'#ef4444':'#64748b'};font-size:10px;margin-bottom:4px">${c.blown?(c.type==='mcb'?`MCB tripped — current exceeded ${c.value}A rating. Check for a short circuit or overloaded circuit.`:`Fuse blown — current exceeded ${c.value}A rating. Check for a short circuit or overloaded circuit.`):'Rating = value. Trips if I exceeds it.'}</div>` : '';

  if(c.type==='pot'){
    const pos=c.pos??0.5;
    const effR=(c.value*Math.max(pos,0.001)).toFixed(1);
    el.innerHTML=`<div class="prop-row"><label>Potentiometer</label></div>
    <div class="prop-row"><label>Max R (Ω)</label><input type="number" id="pv" value="${c.value}" step="any"/></div>
    <input type="range" id="pot-slider" min="0" max="1" step="0.01" value="${pos}" style="width:100%"/>
    <div class="prop-row" style="margin-top:2px">
      <label style="color:#a78bfa">Position</label>
      <input type="number" id="pot-pct" value="${Math.round(pos*100)}" min="0" max="100" step="1" style="width:56px;color:#a78bfa;border-color:#a78bfa44"/>
      <span style="color:#a78bfa;font-size:10px">%</span>
    </div>
    <div style="color:#a78bfa;font-size:10px;margin-bottom:4px">Effective R: <b id="pot-effr">${effR} Ω</b></div>
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    document.getElementById('pv').addEventListener('input', ()=>applyProp(id));
    const slider=document.getElementById('pot-slider');
    const pctInp=document.getElementById('pot-pct');
    const updatePot=(v)=>{
      v=Math.max(0,Math.min(1,v)); c.pos=v;
      slider.value=v; pctInp.value=Math.round(v*100);
      document.getElementById('pot-effr').textContent=(c.value*Math.max(v,0.001)).toFixed(1)+' Ω';
      render(); _skipPropsRefresh=true; simulate(); _skipPropsRefresh=false;
    };
    slider.addEventListener('input',()=>updatePot(parseFloat(slider.value)));
    pctInp.addEventListener('input',()=>updatePot(parseFloat(pctInp.value||0)/100));
    pctInp.addEventListener('change',()=>updatePot(parseFloat(pctInp.value||0)/100));
    return;
  }

  // Per-source AC/DC toggle + phase angle row for V and I sources
  const srcACRow = (c.type==='V'||c.type==='I')
    ? `<div class="prop-row"><label>Mode</label>
       <button onclick="toggleSourceAC('${c.id}')" style="font-size:10px;padding:2px 8px;border-radius:3px;border:1px solid ${c.isAC?'#fbbf24':'#28324a'};background:${c.isAC?'#1c1609':'#19202f'};color:${c.isAC?'#f5a623':'#8e9cb8'};cursor:pointer" title="Toggle AC / DC for this source">${c.isAC?'AC':'DC'}</button></div>`
    : '';
  const phaseRow = (c.isAC) && (c.type==='V'||c.type==='I')
    ? `<div class="prop-row"><label>Phase (°)</label>
       <input type="number" id="pph" value="${c.phaseDeg??0}" step="1" min="-360" max="360"/></div>`
    : '';

  // 3-phase source props
  if(c.type==='3ph'){
    el.innerHTML=`<div class="prop-row"><label>${d.label}</label></div>
    <div class="prop-row"><label>V L-N RMS (V)</label>
    <input type="number" id="pv" value="${c.value}" step="any"/></div>
    <div style="color:#8e9cb8;font-size:9px;margin-bottom:4px">A∠0° · B∠-120° · C∠+120°</div>
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    document.getElementById('pv').addEventListener('input', ()=>applyProp(id));
    return;
  }
  // Transformer props
  if(c.type==='xfmr'){
    el.innerHTML=`<div class="prop-row"><label>${d.label}</label></div>
    <div class="prop-row"><label>Turns ratio n</label>
    <input type="number" id="pv" value="${c.value}" step="0.01" min="0.001"/></div>
    <div style="color:#8e9cb8;font-size:9px;margin-bottom:4px">V2 = n × V1</div>
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    document.getElementById('pv').addEventListener('input', ()=>applyProp(id));
    return;
  }
  // Motor props
  if(c.type==='motor'){
    const vStr=c.simV!=null?`<div style="color:#34d399;font-size:10px;margin-bottom:3px">V = ${c.acV!=null?fmtPhasorU(c.acV,c.acVph??0,'V'):fmtVal(c.simV,'V')}</div>`:'';
    const pStr=c.simPower!=null?`<div style="color:#e3ad33;font-size:10px;margin-bottom:3px">P = ${fmtVal(c.simPower,'W')}</div>`:'';
    el.innerHTML=`<div class="prop-row"><label>${d.label}</label></div>
    <div class="prop-row"><label>Rated Power (W)</label>
    <input type="number" id="pv" value="${c.value}" step="any"/></div>
    <div style="color:#8e9cb8;font-size:9px;margin-bottom:4px">Modelled as R = V²/P</div>
    ${vStr}${pStr}
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    document.getElementById('pv').addEventListener('input', ()=>applyProp(id));
    return;
  }
  // 3-phase load props
  if(c.type==='load3'){
    el.innerHTML=`<div class="prop-row"><label>${d.label}</label></div>
    <div class="prop-row"><label>Total Power (W)</label>
    <input type="number" id="pv" value="${c.value}" step="any"/></div>
    <div style="color:#8e9cb8;font-size:9px;margin-bottom:4px">Star connection — 3 × R_phase</div>
    <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
    document.getElementById('pv').addEventListener('input', ()=>applyProp(id));
    return;
  }

  el.innerHTML=`<div class="prop-row"><label>${d.label}</label></div>
  ${fuseNote}
  <div class="prop-row"><label>Value (${d.unit})</label>
  <input type="number" id="pv" value="${c.value}" step="any"/></div>
  ${srcACRow}
  ${phaseRow}
  ${ratingRow}
  ${dmgRow}
  <button class="btn danger" onclick="delComp('${id}')">Delete</button>`;
  document.getElementById('pv').addEventListener('input', ()=>applyProp(id));
  document.getElementById('pmr')?.addEventListener('input', ()=>applyProp(id));
  document.getElementById('pph')?.addEventListener('input', ()=>applyPropPhase(id));
}

function toggleSwitch(id){
  const c=comps.find(x=>x.id===id); if(!c) return;
  if(c.type==='shower'||c.type==='cooker'||c.type==='kettle'||c.type==='toaster'||c.type==='tv'||c.type==='fridge'||c.type==='fan'){
    pushHistory();
    c.on=c.on===false?true:false;
    clearSim(); render(); simulate(); showProps(id);
    return;
  }
  if(c.type==='sw2'||c.type==='switch2_uk'){
    pushHistory();
    c.sw2pos=c.sw2pos===0?1:0;
    clearSim(); render(); simulate(); showProps(id);
    return;
  }
  if(c.type==='dpswitch'){
    pushHistory(); c.closed=!c.closed;
    clearSim(); render(); simulate(); showProps(id); return;
  }
  if(c.type==='rcd'){
    pushHistory(); c.tripped=!c.tripped;
    clearSim(); render(); simulate(); showProps(id); return;
  }
  if(c.type==='intswitch'||c.type==='switchint_uk'){
    pushHistory(); c.intpos=(c.intpos??0)===0?1:0;
    clearSim(); render(); simulate(); showProps(id); return;
  }
  if(c.type!=='sw'&&c.type!=='switch_uk'&&c.type!=='pullcord') return;
  pushHistory();
  c.closed=!c.closed;
  clearSim(); render(); simulate(); showProps(id);
}

function toggleGang(id, gang){
  const c=comps.find(x=>x.id===id); if(!c) return;
  if(c.type!=='switch2g_uk'&&c.type!=='switch3g_uk') return;
  pushHistory();
  if(gang===1) c.gang1=c.gang1?0:1;
  else if(gang===2) c.gang2=c.gang2?0:1;
  else if(gang===3) c.gang3=c.gang3?0:1;
  clearSim(); render(); simulate(); showProps(id);
}

function setLEDColor(id, color){
  const c=comps.find(x=>x.id===id); if(!c||c.type!=='LED') return;
  c.ledColor=color;
  render(); showProps(id);
}

function resetDamage(id){
  const c=comps.find(x=>x.id===id);
  if(!c) return;
  delete c.damaged; delete c.blown; delete c.simV; delete c.simI; delete c.simPower;
  simulate(); showProps(id);
}
function showWireProps(id){
  const w=wires.find(x=>x.id===id); if(!w) return;
  const g=w.gauge||'2.5';
  const gauges=['1.5','2.5','4','6','10'];
  const ratings={'1.5':'13A','2.5':'20A','4':'27A','6':'34A','10':'46A'};
  const btns=gauges.map(v=>`<button onclick="setWireGauge('${id}','${v}')" style="flex:1;padding:3px 0;border-radius:3px;font-size:9px;font-family:inherit;cursor:pointer;border:1px solid ${v===g?'#4da3ff':'#28324a'};background:${v===g?'#4da3ff':'#19202f'};color:${v===g?'#090c14':'#8e9cb8'}" title="${ratings[v]}">${v}mm²</button>`).join('');
  document.getElementById('props').innerHTML=`
  <div style="color:#8e9cb8;font-size:10px;margin-bottom:6px">Wire</div>
  <div style="color:#8e9cb8;font-size:9px;margin-bottom:4px">Cable cross-section (gauge):</div>
  <div style="display:flex;gap:2px;margin-bottom:6px;flex-wrap:wrap">${btns}</div>
  <div style="color:#8e9cb8;font-size:9px;margin-bottom:6px">Rating: <b style="color:#34d399">${ratings[g]||'?'}</b> — ${g}mm² cable</div>
  <button class="btn danger" onclick="delWire('${id}')">Delete Wire</button>`;
}
function setWireGauge(id,gauge){
  const w=wires.find(x=>x.id===id); if(!w) return;
  pushHistory(); w.gauge=gauge; render(); showWireProps(id); markDirty();
}
function applyProp(id){
  const c=comps.find(x=>x.id===id); if(!c)return;
  const v=parseFloat(document.getElementById('pv')?.value);
  if(!isNaN(v)&&v!==c.value) c.value=v;
  const mrEl=document.getElementById('pmr');
  if(mrEl){ const mr=parseFloat(mrEl.value); if(!isNaN(mr)) c.maxRating=mr; }
  _skipPropsRefresh=true; simulate(); _skipPropsRefresh=false;
}
function applyPropPhase(id){
  const c=comps.find(x=>x.id===id); if(!c)return;
  const ph=parseFloat(document.getElementById('pph')?.value);
  if(!isNaN(ph)) c.phaseDeg=ph;
  _skipPropsRefresh=true; simulate(); _skipPropsRefresh=false;
}

// ── Consumer Unit Builder helpers ─────────────────────────────────────────
function computeCUnitTerms(c){
  c.mcbTerms=(c.cuMCBs||[]).map((m,i)=>({
    x: c.px+(2+i)*G,
    y: c.py+4*G,
    A: m.A,
    label: m.label||'',
    blown: false,
    simI: null
  }));
}

function toggleCUnitProp(id, prop, val){
  const c=comps.find(x=>x.id===id); if(!c||c.type!=='cunit') return;
  c[prop]=val;
  if(prop==='cuMCBs'){ c.slots=val.length; }
  computeCUnitTerms(c);
  render(); showProps(id); markDirty();
}
function updateCUnitMCB(id, i, key, val){
  const c=comps.find(x=>x.id===id); if(!c||c.type!=='cunit') return;
  if(!c.cuMCBs||i<0||i>=c.cuMCBs.length) return;
  if(key==='A') c.cuMCBs[i].A=parseInt(val)||6;
  else c.cuMCBs[i].label=val;
  c.slots=c.cuMCBs.length;
  computeCUnitTerms(c);
  render(); showProps(id); markDirty();
}
function addCUnitMCB(id){
  const c=comps.find(x=>x.id===id); if(!c||c.type!=='cunit') return;
  if(!c.cuMCBs) c.cuMCBs=[];
  c.cuMCBs.push({A:32,label:'Circuit'});
  c.slots=c.cuMCBs.length;
  computeCUnitTerms(c);
  render(); showProps(id); markDirty();
}
function removeCUnitMCB(id, i){
  const c=comps.find(x=>x.id===id); if(!c||c.type!=='cunit') return;
  if(!c.cuMCBs||c.cuMCBs.length<=1) return; // keep at least one
  c.cuMCBs.splice(i,1);
  c.slots=c.cuMCBs.length;
  computeCUnitTerms(c);
  render(); showProps(id); markDirty();
}

function resetCUnitMCBs(id){
  const c=comps.find(x=>x.id===id); if(!c||c.type!=='cunit') return;
  if(c.mcbTerms) c.mcbTerms.forEach(mt=>{mt.blown=false;mt.simI=null;});
  render(); simulate(); markDirty();
  setStatus('MCBs reset — re-running simulation.');
}

function applyCUnitConfig(id){
  const c=comps.find(x=>x.id===id); if(!c||c.type!=='cunit') return;
  pushHistory();
  computeCUnitTerms(c);
  // Recalculate x1,y1,x2,y2 from terminals() in case config changed slot count
  const [nx1,ny1,nx2,ny2]=terminals('cunit',c.px,c.py,c.rotation||0);
  c.x1=nx1;c.y1=ny1;c.x2=nx2;c.y2=ny2;
  render(); simulate(); markDirty();
  setStatus(`CU updated — ${c.cuMCBs.length} circuit outputs ready. Wire mains L to the red dot, circuit Ns to the blue N-bar dot, loads to green MCB dots.`);
}

// ── Label placement helpers ────────────────────────────────────────────────
function labelSide(c){
  // Returns a unit vector pointing to the best perpendicular side for labels.
  // Picks the side with fewest connected wires; breaks ties toward SVG "up".
  const dx=c.x2-c.x1, dy=c.y2-c.y1;
  const L=Math.sqrt(dx*dx+dy*dy)||1;
  const p1={x:-dy/L,y:dx/L}, p2={x:dy/L,y:-dx/L};
  let s1=0, s2=0;
  const terms=[{x:c.x1,y:c.y1},{x:c.x2,y:c.y2}];
  wires.forEach(w=>{
    terms.forEach(t=>{
      let ex,ey;
      if(w.x1===t.x&&w.y1===t.y){ex=w.x2;ey=w.y2;}
      else if(w.x2===t.x&&w.y2===t.y){ex=w.x1;ey=w.y1;}
      else return;
      if((ex-t.x)*p1.x+(ey-t.y)*p1.y>G*0.4) s1++;
      if((ex-t.x)*p2.x+(ey-t.y)*p2.y>G*0.4) s2++;
    });
  });
  if(s1!==s2) return s1<s2?p1:p2;
  return p1.y<p2.y?p1:p2; // prefer upward in SVG when tied
}
function perpOff(type){
  // Approximate half-size of component body perpendicular to its axis (px)
  return {bulb:24,V:24,I:24,diode:18,LED:18,zener:18,R:10,C:12,L:15,fuse:8,pot:18,sw:14,sw2:20,
          '3ph':28,motor:24,xfmr:20,load3:14}[type]??12;
}

