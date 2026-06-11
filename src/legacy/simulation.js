// DC and AC circuit solvers.

// ── Complex number helpers for AC phasor solver ────────────────────────────
// All complex values are plain {re, im} objects.
const C0 = {re:0,im:0};
const Cmk = (re,im=0) => ({re,im});
const Cadd = (a,b) => ({re:a.re+b.re, im:a.im+b.im});
const Csub = (a,b) => ({re:a.re-b.re, im:a.im-b.im});
const Cmul = (a,b) => ({re:a.re*b.re-a.im*b.im, im:a.re*b.im+a.im*b.re});
const Cdiv = (a,b) => {
  const d=b.re*b.re+b.im*b.im;
  if(d===0) return {re:Infinity,im:0};
  return {re:(a.re*b.re+a.im*b.im)/d, im:(a.im*b.re-a.re*b.im)/d};
};
const Cabs = c => Math.sqrt(c.re*c.re+c.im*c.im);
const Carg = c => Math.atan2(c.im,c.re)*180/Math.PI; // degrees
const Cpolar = (mag,degPhase) => ({re:mag*Math.cos(degPhase*Math.PI/180), im:mag*Math.sin(degPhase*Math.PI/180)});
const CabsMax = c => Math.max(Math.abs(c.re),Math.abs(c.im));

// Complex Gaussian elimination for AC MNA
// A: n×n array of {re,im}, b: n-array of {re,im} → solution x or null
function gaussElimC(A,b,n){
  // Deep copy
  const M=A.map(r=>r.map(x=>({...x})));
  const v=b.map(x=>({...x}));
  for(let col=0;col<n;col++){
    let maxR=col, maxV=CabsMax(M[col][col]);
    for(let r=col+1;r<n;r++){const mv=CabsMax(M[r][col]);if(mv>maxV){maxV=mv;maxR=r;}}
    if(maxV<1e-14) return null;
    [M[col],M[maxR]]=[M[maxR],M[col]]; [v[col],v[maxR]]=[v[maxR],v[col]];
    const piv=M[col][col];
    for(let r=col+1;r<n;r++){
      const f=Cdiv(M[r][col],piv);
      for(let k=col;k<n;k++) M[r][k]=Csub(M[r][k],Cmul(f,M[col][k]));
      v[r]=Csub(v[r],Cmul(f,v[col]));
    }
  }
  const x=new Array(n);
  for(let i=n-1;i>=0;i--){
    let s=v[i];
    for(let j=i+1;j<n;j++) s=Csub(s,Cmul(M[i][j],x[j]));
    x[i]=Cdiv(s,M[i][i]);
  }
  return x;
}

// ── MNA Solver ─────────────────────────────────────────────────────────────

// Returns {subComps, subWires} — only elements reachable from any GND via wire network.
// Multiple GND symbols are unified as the same reference.
// Returns null if no GND exists at all.
function getGNDConnectedSubset() {
  const parent={};
  const find=k=>{if(!parent[k])parent[k]=k;if(parent[k]!==k)parent[k]=find(parent[k]);return parent[k];};
  const union=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[a]=b;};
  const singleTerm=new Set(['GND','probe','seg7']);

  // Build wire connectivity
  wires.forEach(w=>{
    union(nk(w.x1,w.y1),nk(w.x2,w.y2));
    if(w.x1===w.x2){const mn=Math.min(w.y1,w.y2),mx=Math.max(w.y1,w.y2);for(let y=mn;y<=mx;y+=G)union(nk(w.x1,y),nk(w.x1,w.y1));}
    else{const mn=Math.min(w.x1,w.x2),mx=Math.max(w.x1,w.x2);for(let x=mn;x<=mx;x+=G)union(nk(x,w.y1),nk(w.x1,w.y1));}
  });
  // Union component terminal pairs — each component body connects its own terminals,
  // so a component bridging two wire groups brings both into the same connectivity set.
  comps.forEach(c=>{
    find(nk(c.x1,c.y1));
    if(!singleTerm.has(c.type)){
      find(nk(c.x2,c.y2));
      union(nk(c.x1,c.y1),nk(c.x2,c.y2));
    }
    if(c.x3!=null){find(nk(c.x3,c.y3));union(nk(c.x1,c.y1),nk(c.x3,c.y3));}
    if(c.x4!=null){find(nk(c.x4,c.y4));union(nk(c.x1,c.y1),nk(c.x4,c.y4));}
    if(c.type==='cunit'&&c.mcbTerms) c.mcbTerms.forEach(mt=>{
      find(nk(mt.x,mt.y));
      if(!mt.blown) union(nk(c.x1,c.y1),nk(mt.x,mt.y)); // busbar connects L-in to MCB outputs
    });
  });

  const gndComps=comps.filter(c=>c.type==='GND');
  if(!gndComps.length) return null;

  // Union all GND symbols so multiple separate GNDs share the same group
  const k0=nk(gndComps[0].x1,gndComps[0].y1);
  gndComps.forEach(g=>union(nk(g.x1,g.y1),k0));
  const gndRoot=find(k0);
  const reach=k=>find(k)===gndRoot;

  const subComps=comps.filter(c=>
    reach(nk(c.x1,c.y1))||
    (!singleTerm.has(c.type)&&reach(nk(c.x2,c.y2)))||
    (c.x3!=null&&reach(nk(c.x3,c.y3)))||
    (c.x4!=null&&reach(nk(c.x4,c.y4)))||
    (c.type==='cunit'&&c.mcbTerms&&c.mcbTerms.some(mt=>reach(nk(mt.x,mt.y))))
  );
  const subWires=wires.filter(w=>reach(nk(w.x1,w.y1))||reach(nk(w.x2,w.y2)));
  return {subComps,subWires};
}

// Finds points where one wire's interior crosses a perpendicular wire's interior
// (an "X" crossing — as opposed to a corner/T-junction where a wire merely ends on
// another). These are the only crossings that are visually ambiguous about whether
// they're a real junction or just incidental routing, so they're the only ones
// eligible for the connect-dot / jump-hop toggle.
function findWireCrossings(){
  const out=[];
  for(let i=0;i<wires.length;i++){
    const a=wires[i], aVert=(a.x1===a.x2);
    for(let j=i+1;j<wires.length;j++){
      const b=wires[j], bVert=(b.x1===b.x2);
      if(aVert===bVert) continue; // only perpendicular pairs can form an X-crossing
      const v=aVert?a:b, h=aVert?b:a;
      const x=v.x1, y=h.y1;
      const vMin=Math.min(v.y1,v.y2), vMax=Math.max(v.y1,v.y2);
      const hMin=Math.min(h.x1,h.x2), hMax=Math.max(h.x1,h.x2);
      if(x>hMin && x<hMax && y>vMin && y<vMax){
        out.push({x,y,vId:v.id,hId:h.id});
      }
    }
  }
  return out;
}

function snapshotCrossings(){
  return new Set(findWireCrossings().map(p=>nk(p.x,p.y)));
}

// X-crossings that appear as a side effect of moving a component or drawing a
// wire default to a visual hop (not connected) — deliberate joins are made at
// endpoints/terminals or by toggling the crossing dot. Hop flags left at
// coordinates that no longer host a crossing are pruned so they can't silently
// disconnect a future junction.
function applyNewCrossingHops(before){
  const now=snapshotCrossings();
  now.forEach(k=>{ if(!before.has(k)) jumpPoints.add(k); });
  jumpPoints.forEach(k=>{ if(!now.has(k)) jumpPoints.delete(k); });
}

// Toggle a crossing point between "real connection" (junction dot) and
// "visual hop" (no electrical connection — drawn as one wire jumping over the other).
function toggleCrossing(x,y){
  pushHistory();
  const k=nk(x,y);
  if(jumpPoints.has(k)) jumpPoints.delete(k); else jumpPoints.add(k);
  clearSim(); render(); simulate();
}

// Crossing points double as handy snap targets for starting a new wire, so a plain
// click can't safely assume "toggle junction type" — it could equally mean "wire from
// here". Show a small quick-menu letting the user pick which they meant.
function _closeCrossingMenu(){
  const m=document.getElementById('xing-menu');
  if(m) m.remove();
  document.removeEventListener('click',_closeCrossingMenu,true);
}
function showCrossingMenu(x,y,clientX,clientY){
  _closeCrossingMenu();
  const isJump=jumpPoints.has(nk(x,y));
  const menu=document.createElement('div');
  menu.id='xing-menu';
  menu.style.cssText=`position:fixed;left:${clientX}px;top:${clientY}px;background:#0f1420;border:1px solid #28324a;border-radius:10px;box-shadow:0 16px 48px rgba(0,0,0,0.55);z-index:250;font-family:inherit;font-size:12px;color:#dce4f2;overflow:hidden;min-width:190px;`;
  const mkBtn=(label,fn)=>{
    const b=document.createElement('button');
    b.textContent=label;
    b.style.cssText='display:block;width:100%;text-align:left;padding:8px 12px;background:none;border:none;border-bottom:1px solid #19202f;color:inherit;cursor:pointer;font:inherit;';
    b.addEventListener('mouseenter',()=>b.style.background='#19202f');
    b.addEventListener('mouseleave',()=>b.style.background='none');
    b.addEventListener('click',e=>{e.stopPropagation();_closeCrossingMenu();fn();});
    menu.appendChild(b);
  };
  mkBtn(isJump ? '⚬  Mark as junction (connected)' : '⤴  Mark as hop (not connected)', ()=>toggleCrossing(x,y));
  mkBtn('➕  Start wire here', ()=>{
    setMode('wire');
    wireStart={x,y};
    setStatus('Wire started — click end point. Esc to cancel.');
  });
  document.body.appendChild(menu);
  setTimeout(()=>document.addEventListener('click',_closeCrossingMenu,true),0);
}

// Clicking a wire in select mode is ambiguous — the user might want to select it
// (to edit gauge/delete/etc.) or tap off a new wire from that exact point (corner,
// mid-span, anywhere). Show a small menu so both stay reachable, mirroring the
// crossing menu above.
function _closeWireMenu(){
  const m=document.getElementById('wire-tap-menu');
  if(m) m.remove();
  document.removeEventListener('click',_closeWireMenu,true);
}
function showWireTapMenu(wireId,x,y,clientX,clientY){
  _closeWireMenu();
  const menu=document.createElement('div');
  menu.id='wire-tap-menu';
  menu.style.cssText=`position:fixed;left:${clientX}px;top:${clientY}px;background:#0f1420;border:1px solid #28324a;border-radius:10px;box-shadow:0 16px 48px rgba(0,0,0,0.55);z-index:250;font-family:inherit;font-size:12px;color:#dce4f2;overflow:hidden;min-width:190px;`;
  const mkBtn=(label,fn)=>{
    const b=document.createElement('button');
    b.textContent=label;
    b.style.cssText='display:block;width:100%;text-align:left;padding:8px 12px;background:none;border:none;border-bottom:1px solid #19202f;color:inherit;cursor:pointer;font:inherit;';
    b.addEventListener('mouseenter',()=>b.style.background='#19202f');
    b.addEventListener('mouseleave',()=>b.style.background='none');
    b.addEventListener('click',e=>{e.stopPropagation();_closeWireMenu();fn();});
    menu.appendChild(b);
  };
  mkBtn('☑  Select wire', ()=>selectWire(wireId));
  mkBtn('➕  Start wire here', ()=>{
    setMode('wire');
    wireStart={x,y};
    setStatus('Wire started — click end point. Esc to cancel.');
  });
  document.body.appendChild(menu);
  setTimeout(()=>document.addEventListener('click',_closeWireMenu,true),0);
}

function buildNodeMap(){
  const parent={};
  const find=k=>{if(!parent[k])parent[k]=k;if(parent[k]!==k)parent[k]=find(parent[k]);return parent[k];};
  const union=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[a]=b;};

  // Each wire is unioned internally via its own anchor key (so current still flows
  // along its full length), and separately joined to the shared global-coordinate
  // node at every point EXCEPT ones marked in `jumpPoints` — those are crossings the
  // user has explicitly flagged as a visual "hop" with no real electrical connection.
  wires.forEach(w=>{
    if(w.x1===w.x2){const mn=Math.min(w.y1,w.y2),mx=Math.max(w.y1,w.y2);
      const anchor=`${w.id}@${w.x1},${mn}`;
      for(let y=mn;y<=mx;y+=G){
        const local=`${w.id}@${w.x1},${y}`;
        union(local,anchor);
        if(!jumpPoints.has(nk(w.x1,y))) union(local,nk(w.x1,y));
      }}
    else{const mn=Math.min(w.x1,w.x2),mx=Math.max(w.x1,w.x2);
      const anchor=`${w.id}@${mn},${w.y1}`;
      for(let x=mn;x<=mx;x+=G){
        const local=`${w.id}@${x},${w.y1}`;
        union(local,anchor);
        if(!jumpPoints.has(nk(x,w.y1))) union(local,nk(x,w.y1));
      }}
  });
  comps.forEach(c=>{
    find(nk(c.x1,c.y1));
    if(c.type!=='GND'&&c.type!=='probe'&&c.type!=='seg7') find(nk(c.x2,c.y2));
    if((c.type==='AND'||c.type==='OR'||c.type==='nmos')&&c.x3!=null) find(nk(c.x3,c.y3));
    if((c.type==='sw2'||c.type==='switch2_uk')&&c.x3!=null) find(nk(c.x3,c.y3));
    if((c.type==='intswitch'||c.type==='switchint_uk')&&c.x3!=null){find(nk(c.x3,c.y3));if(c.x4!=null)find(nk(c.x4,c.y4));}
    if(c.type==='switch2g_uk'&&c.x3!=null){find(nk(c.x3,c.y3));if(c.x4!=null)find(nk(c.x4,c.y4));}
    if(c.type==='switch3g_uk'&&c.x3!=null){find(nk(c.x3,c.y3));if(c.x4!=null)find(nk(c.x4,c.y4));if(c.x5!=null)find(nk(c.x5,c.y5));if(c.x6!=null)find(nk(c.x6,c.y6));}
    if(c.type==='dpswitch'&&c.x3!=null){find(nk(c.x3,c.y3));if(c.x4!=null)find(nk(c.x4,c.y4));}
    if(c.type==='3ph'&&c.x3!=null){find(nk(c.x3,c.y3));find(nk(c.x4,c.y4));}
    if(c.type==='xfmr'&&c.x3!=null){find(nk(c.x3,c.y3));find(nk(c.x4,c.y4));}
    if(c.type==='plug'&&c.x3!=null){
      find(nk(c.x3,c.y3)); find(nk(c.x4,c.y4));
      union(nk(c.x1,c.y1),nk(c.x3,c.y3)); // cable-L ↔ pin-L
      union(nk(c.x2,c.y2),nk(c.x4,c.y4)); // cable-N ↔ pin-N
    }
    if(c.type==='cunit'&&c.mcbTerms) c.mcbTerms.forEach(mt=>find(nk(mt.x,mt.y)));
  });

  const roots=new Map(); let nc=0;
  // Ground first → node 0. All GND symbols share the same reference node.
  const gnds=comps.filter(c=>c.type==='GND');
  let gndRoot=null;
  if(gnds.length>0){
    const k0=nk(gnds[0].x1,gnds[0].y1);
    gnds.forEach(g=>union(nk(g.x1,g.y1),k0)); // merge all GND symbols
    gndRoot=find(k0); roots.set(gndRoot,0); nc=1;
  }

  const nodeId=key=>{
    const r=find(key);
    if(!roots.has(r)){roots.set(r,nc++);}
    return roots.get(r);
  };

  // Pre-discover all terminal nodes so getCount() is accurate immediately
  comps.forEach(c=>{
    nodeId(nk(c.x1,c.y1));
    if(c.type!=='GND'&&c.type!=='probe'&&c.type!=='seg7') nodeId(nk(c.x2,c.y2));
    if((c.type==='AND'||c.type==='OR'||c.type==='nmos')&&c.x3!=null) nodeId(nk(c.x3,c.y3));
    if((c.type==='sw2'||c.type==='switch2_uk')&&c.x3!=null) nodeId(nk(c.x3,c.y3));
    if((c.type==='intswitch'||c.type==='switchint_uk')&&c.x3!=null){nodeId(nk(c.x3,c.y3));if(c.x4!=null)nodeId(nk(c.x4,c.y4));}
    if(c.type==='switch2g_uk'&&c.x3!=null){nodeId(nk(c.x3,c.y3));if(c.x4!=null)nodeId(nk(c.x4,c.y4));}
    if(c.type==='switch3g_uk'&&c.x3!=null){nodeId(nk(c.x3,c.y3));if(c.x4!=null)nodeId(nk(c.x4,c.y4));if(c.x5!=null)nodeId(nk(c.x5,c.y5));if(c.x6!=null)nodeId(nk(c.x6,c.y6));}
    if(c.type==='dpswitch'&&c.x3!=null){nodeId(nk(c.x3,c.y3));if(c.x4!=null)nodeId(nk(c.x4,c.y4));}
    if(c.type==='3ph'&&c.x3!=null){nodeId(nk(c.x3,c.y3));nodeId(nk(c.x4,c.y4));}
    if(c.type==='xfmr'&&c.x3!=null){nodeId(nk(c.x3,c.y3));nodeId(nk(c.x4,c.y4));}
    if(c.type==='plug'&&c.x3!=null){nodeId(nk(c.x3,c.y3));nodeId(nk(c.x4,c.y4));}
    if(c.type==='cunit'&&c.mcbTerms) c.mcbTerms.forEach(mt=>nodeId(nk(mt.x,mt.y)));
  });

  return {nodeId, getCount:()=>nc, find};
}

function gaussElim(A,b,n){
  const M=A.map(r=>Float64Array.from(r)); const v=Float64Array.from(b);
  for(let col=0;col<n;col++){
    let maxR=col, maxV=Math.abs(M[col][col]);
    for(let r=col+1;r<n;r++){if(Math.abs(M[r][col])>maxV){maxV=Math.abs(M[r][col]);maxR=r;}}
    if(maxV<1e-14) return null;
    [M[col],M[maxR]]=[M[maxR],M[col]]; [v[col],v[maxR]]=[v[maxR],v[col]];
    const piv=M[col][col];
    for(let r=col+1;r<n;r++){const f=M[r][col]/piv;for(let k=col;k<n;k++)M[r][k]-=f*M[col][k];v[r]-=f*v[col];}
  }
  const x=new Float64Array(n);
  for(let i=n-1;i>=0;i--){x[i]=v[i];for(let j=i+1;j<n;j++)x[i]-=M[i][j]*x[j];x[i]/=M[i][i];}
  return x;
}

// --- Buzzer audio (Web Audio API) ---
let _audioCtx = null;
const _buzzNodes = {};

function _getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function _startBuzz(id, voltage) {
  _stopBuzz(id);
  const ctx = _getAudioCtx();
  // Map voltage → frequency: 1V ≈ 110Hz, 5V ≈ 500Hz, 12V ≈ 1250Hz (linear, clamped)
  const freq = Math.max(60, Math.min(4000, voltage * 100));
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  // Soft fade-in to avoid click
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.02);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  _buzzNodes[id] = {osc, gain};
}

function _stopBuzz(id) {
  if (!_buzzNodes[id]) return;
  const {osc, gain} = _buzzNodes[id];
  // Soft fade-out to avoid click
  try {
    const t = _audioCtx.currentTime;
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.03);
    osc.stop(t + 0.04);
  } catch(e) {}
  delete _buzzNodes[id];
}

function _stopAllBuzz() {
  Object.keys(_buzzNodes).forEach(_stopBuzz);
}

function clearSim(){
  stopBulbAnim();
  _stopAllBuzz();
  window.simNodeV=null; window.simVoltages=null; window.simVoltagesC=null; window.flowWireDir=null;window.flowWireI=null;
  comps.forEach(c=>{delete c.simV;delete c.simI;delete c.simPower;delete c.damaged;delete c.blown;
    delete c.ledOn; delete c.buzzerOn; delete c.diodeState; delete c.gateOut; delete c.segVal;
    delete c.acV; delete c.acI; delete c.acVph; delete c.acIph;
    if(c.type==='cunit'&&c.mcbTerms) c.mcbTerms.forEach(mt=>{mt.blown=false;mt.simI=null;});});
  Object.keys(_flowParticles).forEach(k=>delete _flowParticles[k]);
  document.getElementById('results').innerHTML='<div style="color:#8e9cb8;font-size:10px;padding:4px">Run simulation to see results.</div>';
  document.getElementById('sim-err').style.display='none';
}

function simulate(){
  // Auto-detect AC or DC from sources
  syncACMode();
  if (_acMode) { simulateAC(); return; }

  // Reset sim state
  stopBulbAnim();
  _stopAllBuzz();
  window.simNodeV=null; window.simVoltages=null; window.simVoltagesC=null; window.flowWireDir=null;window.flowWireI=null;
  _particles.length=0;
  comps.forEach(c=>{delete c.simV;delete c.simI;delete c.simPower;delete c.damaged;delete c.blown;
    delete c.ledOn; delete c.buzzerOn; delete c.diodeState; delete c.gateOut; delete c.segVal;
    delete c.acV; delete c.acI; delete c.acVph; delete c.acIph;
    if(c.type==='cunit'&&c.mcbTerms) c.mcbTerms.forEach(mt=>{mt.blown=false;mt.simI=null;});});
  document.getElementById('sim-err').style.display='none';

  const errEl=document.getElementById('sim-err');
  const err=msg=>{errEl.textContent=msg;errEl.style.display='block';};

  const _sub=getGNDConnectedSubset();
  if(!_sub){
    err('No earth reference. Add a GND (earth) component and connect it to the circuit neutral.');
    window.simNodeV={}; window.simVoltages={0:0}; window.flowWireDir={};window.flowWireI={};
    render(); if(sel&&!_skipPropsRefresh) showProps(sel); markClean(); return;
  }
  const _allComps=comps,_allWires=wires;
  comps=_sub.subComps; wires=_sub.subWires;

  const {nodeId,getCount}=buildNodeMap();
  const N=getCount(); // total node count incl. ground
  const nodeN=N-1;   // non-ground nodes

  if(nodeN===0){
    err('No nodes found — connect components with wires to GND.');
    window.simNodeV={}; window.simVoltages={0:0}; window.flowWireDir={};window.flowWireI={};
    comps=_allComps; wires=_allWires; render(); if(sel&&!_skipPropsRefresh) showProps(sel); markClean(); return;
  }

  const ni=key=>{const id=nodeId(key);return id-1;};
  const nodeVoltages={0:0};
  let x=null;

  // Iterative solve: fuses/switches/diodes modelled as voltage sources; re-solve if any blow
  // Diode model state (from previous iteration)
  const diodeState={}; // compId → 'forward'|'reverse'|'breakdown'
  comps.forEach(c=>{if(c.type==='diode'||c.type==='zener'||c.type==='LED') diodeState[c.id]='reverse';});

  for(let iter=0;iter<6;iter++){
    const vsrcs  = comps.filter(c=>c.type==='V'||c.type==='supply');
    const fsrcs  = comps.filter(c=>(c.type==='fuse'||c.type==='mcb'||c.type==='fcu')&&!c.blown);
    // Closed switches → 0V sources
    const swsrcs = comps.filter(c=>(c.type==='sw'||c.type==='switch_uk'||c.type==='pullcord')&&c.closed);
    // Two-way switches → 0V source between COM and active terminal
    const sw2srcs = comps.filter(c=>c.type==='sw2'||c.type==='switch2_uk');
    // Logic gate outputs → controlled voltage sources
    // Compute gate outputs from previous iteration's nodeVoltages (or 0 initially)
    const gateSrcs = comps.filter(c=>c.type==='AND'||c.type==='OR'||c.type==='NOT');
    // Forward-biased diodes → 0.7V sources in series with 1Ω
    // (model: stamp as V=0.7 source between anode-cathode)
    const fwdDiodes = comps.filter(c=>(c.type==='diode'||c.type==='zener')&&diodeState[c.id]==='forward');
    const bkdnZeners = comps.filter(c=>c.type==='zener'&&diodeState[c.id]==='breakdown');

    // CU MCB internal busbar connections modelled as 0V sources (for current monitoring)
    const cuMCBSrcs=[];
    comps.forEach(c=>{if(c.type==='cunit'&&!c.blown&&c.mcbTerms) c.mcbTerms.forEach(mt=>{if(!mt.blown) cuMCBSrcs.push({c,mt});});});
    const M = vsrcs.length + fsrcs.length + swsrcs.length + sw2srcs.length + gateSrcs.length + fwdDiodes.length + bkdnZeners.length + cuMCBSrcs.length;
    const sz = nodeN + M;

    const A=Array.from({length:sz},()=>new Float64Array(sz));
    const b=new Float64Array(sz);
    let ok=true;
    let vsrcOff=nodeN;
    let fsrcOff=vsrcOff+vsrcs.length;
    let swOff=fsrcOff+fsrcs.length;
    let sw2Off=swOff+swsrcs.length;
    let gateOff=sw2Off+sw2srcs.length;
    let fwdDOff=gateOff+gateSrcs.length;
    let bkdnOff=fwdDOff+fwdDiodes.length;
    let cuMCBSrcOff=bkdnOff+bkdnZeners.length;

    comps.forEach(c=>{
      if(c.blown) return;
      const na=ni(nk(c.x1,c.y1));
      // For single-terminal types nb is irrelevant; for standard 2-terminal get nb normally
      const singleTerm=new Set(['GND','probe','seg7']);
      const nb=(singleTerm.has(c.type)||c.type==='AND'||c.type==='OR')?-1:ni(nk(c.x2,c.y2));

      const stamp=(g)=>{
        if(na>=0){A[na][na]+=g;} if(nb>=0){A[nb][nb]+=g;}
        if(na>=0&&nb>=0){A[na][nb]-=g;A[nb][na]-=g;}
      };
      const stampV=(row,na2,nb2,val)=>{
        if(na2>=0){A[na2][row]+=1;A[row][na2]+=1;}
        if(nb2>=0){A[nb2][row]-=1;A[row][nb2]-=1;}
        b[row]=val;
      };

      if(c.type==='R'||c.type==='bulb'||c.type==='crose'){
        if(!c.value||c.value<=0){err('Value must be > 0 Ω');ok=false;return;}
        stamp(1/c.value);
      } else if(c.type==='socket_uk'){
        // socket outlet — no self-resistance; plug-in load is a separate component
      } else if(c.type==='pot'){
        stamp(1/Math.max(c.value*(c.pos??0.5),0.01));
      } else if(c.type==='L'){
        stamp(1e9);
      } else if(c.type==='C'){
        // open in DC
      } else if(c.type==='I'){
        if(na>=0) b[na]+=c.value; if(nb>=0) b[nb]-=c.value;
      } else if(c.type==='cunit'){
        // Visual enclosure only — stamps nothing in MNA
      } else if(c.type==='V'||c.type==='supply'){
        const k=vsrcOff+vsrcs.indexOf(c);
        stampV(k,na,nb,c.value);
      } else if(c.type==='fuse'||c.type==='mcb'){
        const k=fsrcOff+fsrcs.indexOf(c);
        stampV(k,na,nb,0);
      } else if(c.type==='sw'||c.type==='switch_uk'){
        if(c.closed){
          const k=swOff+swsrcs.indexOf(c);
          stampV(k,na,nb,0);
        }
        // open switch → nothing (open circuit)
      } else if(c.type==='dpswitch'){
        if(c.closed){
          const g9=1e9;
          stamp(g9); // L path: x1↔x2
          const nc2=c.x3!=null?ni(nk(c.x3,c.y3)):-1;
          const nd2=c.x4!=null?ni(nk(c.x4,c.y4)):-1;
          if(nc2>=0&&nd2>=0){A[nc2][nc2]+=g9;A[nd2][nd2]+=g9;A[nc2][nd2]-=g9;A[nd2][nc2]-=g9;}
        }
        // open → both L and N paths isolated (open circuit)
      } else if(c.type==='sw2'||c.type==='switch2_uk'){
        // Two-way switch: stamp 0V source between COM and active terminal
        const k=sw2Off+sw2srcs.indexOf(c);
        const pos2=c.sw2pos??0;
        // na = COM (x1,y1); active output: L1=(x2,y2) or L2=(x3,y3)
        const nb2=pos2===0?nb:(c.x3!=null?ni(nk(c.x3,c.y3)):-1);
        stampV(k,na,nb2,0);
        // Inactive terminal: add tiny bleed (1 GΩ) to COM so the inactive-strapper node
        // is never completely isolated — prevents a singular matrix when neither switch
        // stamps through the unused strapper wire.
        const ni_inact=pos2===0?(c.x3!=null?ni(nk(c.x3,c.y3)):-1):nb;
        if(ni_inact>=0&&na>=0){const g=1e-9;A[na][na]+=g;A[ni_inact][ni_inact]+=g;A[na][ni_inact]-=g;A[ni_inact][na]-=g;}
      } else if(c.type==='meter'){
        stamp(1000); // 0.001Ω near-wire
      } else if(c.type==='rcd'){
        if(!c.tripped) stamp(1000);
        // tripped → open circuit, stamp nothing
      } else if(c.type==='intswitch'||c.type==='switchint_uk'){
        const nc2=c.x3!=null?ni(nk(c.x3,c.y3)):-1;
        const nd2=c.x4!=null?ni(nk(c.x4,c.y4)):-1;
        const g9=1e9, gb=1e-9;
        if((c.intpos??0)===0){
          stamp(g9); // x1↔x2
          if(nc2>=0&&nd2>=0){A[nc2][nc2]+=g9;A[nd2][nd2]+=g9;A[nc2][nd2]-=g9;A[nd2][nc2]-=g9;}
        } else {
          // crossed: x1↔x4, x3↔x2
          if(na>=0&&nd2>=0){A[na][na]+=g9;A[nd2][nd2]+=g9;A[na][nd2]-=g9;A[nd2][na]-=g9;}
          if(nc2>=0&&nb>=0){A[nc2][nc2]+=g9;A[nb][nb]+=g9;A[nc2][nb]-=g9;A[nb][nc2]-=g9;}
        }
        // 1GΩ bleed keeps inactive-path nodes non-isolated (prevents singular matrix)
        if(na>=0&&nc2>=0){A[na][na]+=gb;A[nc2][nc2]+=gb;A[na][nc2]-=gb;A[nc2][na]-=gb;}
        if(nb>=0&&nd2>=0){A[nb][nb]+=gb;A[nd2][nd2]+=gb;A[nb][nd2]-=gb;A[nd2][nb]-=gb;}
      } else if(c.type==='switch2g_uk'||c.type==='switch3g_uk'){
        // Multi-gang: each gang is an independent on/off switch
        // gang1: x1(COM1) ↔ x2(SW1)
        // gang2: x3(COM2) ↔ x4(SW2)
        // gang3 (3-gang only): x5(COM3) ↔ x6(SW3)
        const g9=1e9;
        const nc2=c.x3!=null?ni(nk(c.x3,c.y3)):-1;
        const nd2=c.x4!=null?ni(nk(c.x4,c.y4)):-1;
        if(c.gang1){stamp(g9);}  // gang1 closed: x1↔x2
        if(c.gang2&&nc2>=0&&nd2>=0){A[nc2][nc2]+=g9;A[nd2][nd2]+=g9;A[nc2][nd2]-=g9;A[nd2][nc2]-=g9;}
        if(c.type==='switch3g_uk'&&c.gang3&&c.x5!=null&&c.x6!=null){
          const ne2=ni(nk(c.x5,c.y5)), nf2=ni(nk(c.x6,c.y6));
          if(ne2>=0&&nf2>=0){A[ne2][ne2]+=g9;A[nf2][nf2]+=g9;A[ne2][nf2]-=g9;A[nf2][ne2]-=g9;}
        }
      } else if(c.type==='shower'||c.type==='cooker'||c.type==='kettle'||c.type==='toaster'||c.type==='tv'||c.type==='fridge'||c.type==='fan'){
        if(c.on===false){
          stamp(1e-9);
        } else {
          const P=Math.max(c.value,1);
          stamp(P/(230*230));
        }
      } else if(c.type==='fcu'){
        if(!c.blown){
          const k=fsrcOff+fsrcs.indexOf(c);
          stampV(k,na,nb,0);
        }
        // blown fcu → open circuit (nothing)
      } else if(c.type==='pullcord'){
        if(c.closed){
          const k=swOff+swsrcs.indexOf(c);
          stampV(k,na,nb,0);
        }
        // open → nothing
      } else if(c.type==='LED'){
        // Model as diode with forward voltage = c.value
        const fwdV=c.value||2.0, fwdR=10;
        const st=diodeState[c.id]??'reverse';
        if(st==='forward'){
          // small series R + voltage source not in fwdDiodes list (LED uses separate logic)
          // stamp as 1/fwdR conductance
          stamp(1/fwdR);
          // add the forward voltage as a current injection (simplified Thevenin)
          if(na>=0) b[na]-=fwdV/fwdR;
          if(nb>=0) b[nb]+=fwdV/fwdR;
        } else {
          // reverse: very high R
          stamp(1e-9);
        }
      } else if(c.type==='diode'){
        if(fwdDiodes.includes(c)){
          // Forward: V=0.7 voltage source (separate from small R — stamp small R here)
          stamp(1/1.0); // 1Ω
          const k=fwdDOff+fwdDiodes.indexOf(c);
          stampV(k,na,nb,0.7);
        } else {
          stamp(1e-9); // reverse blocked
        }
      } else if(c.type==='zener'){
        if(fwdDiodes.includes(c)){
          stamp(1/1.0);
          const k=fwdDOff+fwdDiodes.indexOf(c);
          stampV(k,na,nb,0.7);
        } else if(bkdnZeners.includes(c)){
          // Reverse breakdown: stamp Vz as voltage source (cathode at value c.value above anode)
          // In our convention x1=anode,x2=cathode; breakdown means Vb-Va=c.value
          stamp(1/1.0);
          const k=bkdnOff+bkdnZeners.indexOf(c);
          // Vb-Va = c.value (zener voltage) i.e. stamp negative: Va-Vb = -c.value
          stampV(k,na,nb,-c.value);
        } else {
          stamp(1e-9);
        }
      } else if(c.type==='nmos'){
        // N-channel MOSFET: voltage-controlled switch (Drain=x1, Source=x2, Gate=x3)
        const gk=nk(c.x3??c.x1,c.y3??c.y1);
        const vGate=nodeVoltages[nodeId(gk)]??0;
        const vSrc2=nodeVoltages[nodeId(nk(c.x2,c.y2))]??0;
        const vgs=vGate-vSrc2;
        const on=vgs>(c.value??2.0);
        c.mosfetOn=on;
        const Rds=on?0.1:1e6;
        const naM=ni(nk(c.x1,c.y1)), nbM=ni(nk(c.x2,c.y2));
        if(naM>=0){A[naM][naM]+=1/Rds;} if(nbM>=0){A[nbM][nbM]+=1/Rds;}
        if(naM>=0&&nbM>=0){A[naM][nbM]-=1/Rds;A[nbM][naM]-=1/Rds;}
      } else if(c.type==='AND'||c.type==='OR'){
        // Gate output node na; stamp a voltage source to GND
        const gi=gateSrcs.indexOf(c);
        const k=gateOff+gi;
        // Determine output voltage from previous iteration
        const vA2=nodeVoltages[nodeId(nk(c.x2,c.y2))]??0;
        const vB2=c.x3!=null?(nodeVoltages[nodeId(nk(c.x3,c.y3))]??0):0;
        let outV=0;
        if(c.type==='AND') outV=(vA2>2.5&&vB2>2.5)?5:0;
        else outV=(vA2>2.5||vB2>2.5)?5:0;
        c.gateOut=outV;
        // Stamp output voltage source between na and GND (nb=-1 means GND=row0 excluded)
        if(na>=0){A[na][k]+=1;A[k][na]+=1;}
        b[k]=outV;
      } else if(c.type==='NOT'){
        const gi=gateSrcs.indexOf(c);
        const k=gateOff+gi;
        const vIn=nodeVoltages[nb+1]??0; // nb = ni(x2,y2) = nodeId-1, so nb+1 = nodeId
        let outV=(vIn<2.5)?5:0;
        c.gateOut=outV;
        if(na>=0){A[na][k]+=1;A[k][na]+=1;}
        b[k]=outV;
      } else if(c.type==='motor'||c.type==='load3'){
        // DC: treat as R = V²/P using nominal voltage or a placeholder
        // Stamp as conductance; on first iteration vd=0 so use a 1Ω placeholder
        const vdPrev=nodeVoltages[nodeId(nk(c.x1,c.y1))]-nodeVoltages[nodeId(nk(c.x2,c.y2))];
        const P=Math.max(c.value,1);
        const effR=vdPrev!==0?(vdPrev*vdPrev/P):P;
        stamp(1/Math.max(effR,0.01));
      } else if(c.type==='3ph'){
        // In DC: neutral stamped; treat as three DC voltage sources
        // Phase A = x1(neutral) to x2; phase B = x1 to x3; phase C = x1 to x4
        // We only stamp phaseA in DC (rough approximation)
        // For a better DC approximation stamp 0V sources — circuits just see neutral connected to phases
        // This is a placeholder: stamp as 0V between neutral and phaseA
        // (full phasor behaviour only available in AC mode)
        const naP=na; // neutral node
        const nbP=ni(nk(c.x2,c.y2)); // phaseA
        // stamp 0V source as conductance 1e9 (wire)
        if(naP>=0&&nbP>=0){A[naP][naP]+=1e9;A[nbP][nbP]+=1e9;A[naP][nbP]-=1e9;A[nbP][naP]-=1e9;}
        // Similarly for B,C (x3,x4)
        if(c.x3!=null){const nbB=ni(nk(c.x3,c.y3));if(naP>=0&&nbB>=0){A[naP][naP]+=1e9;A[nbB][nbB]+=1e9;A[naP][nbB]-=1e9;A[nbB][naP]-=1e9;}}
        if(c.x4!=null){const nbC=ni(nk(c.x4,c.y4));if(naP>=0&&nbC>=0){A[naP][naP]+=1e9;A[nbC][nbC]+=1e9;A[naP][nbC]-=1e9;A[nbC][naP]-=1e9;}}
      } else if(c.type==='xfmr'){
        // In DC: ideal transformer → secondary voltage = n × primary voltage
        // Very simplified: stamp primary as short (1e9 G) and secondary as controlled source
        // For DC analysis just stamp as near-ideal coupling; full model only in AC
        const naP=na; // primary+
        const nbP=ni(nk(c.x2,c.y2)); // secondary+
        // Treat as 1:1 ratio in DC (short between primary and secondary ref)
        // Stamp as very high conductance pass-through
        if(naP>=0&&nbP>=0){stamp(1);}
      } else if(c.type==='cunit'){
        // Internal busbar: 0V sources from L-in (x1) to each non-blown MCB output terminal
        // This enables current monitoring so individual MCBs can blow when over-rated
        if(c.mcbTerms) c.mcbTerms.forEach(mt=>{
          if(mt.blown) return;
          const idx=cuMCBSrcs.findIndex(s=>s.c===c&&s.mt===mt);
          if(idx<0) return;
          const nm=ni(nk(mt.x,mt.y));
          stampV(cuMCBSrcOff+idx, na, nm, 0);
        });
      }
      // GND/probe/seg7: no stamp needed
      // buzzer: 1kΩ so it draws a token current and stays in the matrix
      if(c.type==='buzzer'&&na>=0&&nb>=0) stamp(1/1000);
    });
    if(!ok){ comps=_allComps; wires=_allWires; render(); if(sel&&!_skipPropsRefresh) showProps(sel); markClean(); return; }

    x=gaussElim(A,b,sz);
    if(!x){ err('Incomplete circuit — check for unconnected terminals (amber dots) or a direct short between live and neutral.'); x=new Array(sz).fill(0); }

    for(let i=0;i<nodeN;i++) nodeVoltages[i+1]=x[i];

    // Update diode states for next iteration
    let diodeChanged=false;
    comps.forEach(c=>{
      if(c.type!=='diode'&&c.type!=='zener'&&c.type!=='LED') return;
      const nA2=nodeId(nk(c.x1,c.y1)), nB2=nodeId(nk(c.x2,c.y2));
      const vA2=nodeVoltages[nA2]??0, vB2=nodeVoltages[nB2]??0;
      const vAB=vA2-vB2; // anode minus cathode
      let newState='reverse';
      if(c.type==='zener'&&vB2-vA2>c.value-0.1) newState='breakdown';
      else if(vAB>0.4) newState='forward';
      if(diodeState[c.id]!==newState){ diodeState[c.id]=newState; diodeChanged=true; }
    });

    // Check fuse currents; blow any that exceed rating
    let anyBlow=false;
    fsrcs.forEach((c,ki)=>{
      const fuseI=Math.abs(x[fsrcOff+ki]);
      if(fuseI>c.value){ c.blown=true; anyBlow=true; }
    });
    // Check cunit MCB currents
    cuMCBSrcs.forEach(({c:cc,mt},ki)=>{
      const mcbI=Math.abs(x[cuMCBSrcOff+ki]);
      mt.simI=mcbI;
      if(mcbI>mt.A){ mt.blown=true; anyBlow=true; }
    });
    if(!anyBlow&&!diodeChanged) break;
  }

  // Build point→nodeId map for rendering
  const ptMap={};
  const mapPt=(x,y)=>{const k=nk(x,y);if(jumpPoints.has(k))return;ptMap[k]=nodeId(k);};
  const singleTermSet=new Set(['GND','probe','seg7']);
  comps.forEach(c=>{
    mapPt(c.x1,c.y1);
    if(!singleTermSet.has(c.type)) mapPt(c.x2,c.y2);
    if(c.type==='cunit'&&c.mcbTerms) c.mcbTerms.forEach(mt=>mapPt(mt.x,mt.y));
    if((c.type==='AND'||c.type==='OR'||c.type==='nmos')&&c.x3!=null) mapPt(c.x3,c.y3);
    if(c.type==='sw2'&&c.x3!=null) mapPt(c.x3,c.y3);
    if(c.type==='intswitch'&&c.x3!=null){mapPt(c.x3,c.y3);if(c.x4!=null)mapPt(c.x4,c.y4);}
    if(c.type==='switch2g_uk'&&c.x3!=null){mapPt(c.x3,c.y3);if(c.x4!=null)mapPt(c.x4,c.y4);}
    if(c.type==='switch3g_uk'&&c.x3!=null){mapPt(c.x3,c.y3);if(c.x4!=null)mapPt(c.x4,c.y4);if(c.x5!=null)mapPt(c.x5,c.y5);if(c.x6!=null)mapPt(c.x6,c.y6);}
    if(c.type==='dpswitch'&&c.x3!=null){mapPt(c.x3,c.y3);if(c.x4!=null)mapPt(c.x4,c.y4);}
    if(c.type==='3ph'&&c.x3!=null){mapPt(c.x3,c.y3);mapPt(c.x4,c.y4);}
    if(c.type==='xfmr'&&c.x3!=null){mapPt(c.x3,c.y3);mapPt(c.x4,c.y4);}
  });
  wires.forEach(w=>{
    mapPt(w.x1,w.y1);mapPt(w.x2,w.y2);
    if(w.x1===w.x2){const mn=Math.min(w.y1,w.y2),mx=Math.max(w.y1,w.y2);for(let y=mn;y<=mx;y+=G)mapPt(w.x1,y);}
    else{const mn=Math.min(w.x1,w.x2),mx=Math.max(w.x1,w.x2);for(let x=mn;x<=mx;x+=G)mapPt(x,w.y1);}
  });
  window.simNodeV=ptMap;
  window.simVoltages=nodeVoltages;

  // Annotate components + damage detection
  const vsrcs2=comps.filter(c=>c.type==='V'||c.type==='supply');
  const fsrcs2=comps.filter(c=>(c.type==='fuse'||c.type==='mcb')&&!c.blown);
  const swsrcs2=comps.filter(c=>(c.type==='sw'||c.type==='switch_uk')&&c.closed);
  const sw2srcs2=comps.filter(c=>c.type==='sw2'||c.type==='switch2_uk');
  const resArr=[];
  comps.forEach(c=>{
    const nA=nodeId(nk(c.x1,c.y1));
    const singleTerm2=new Set(['GND','probe','seg7']);
    const nB=singleTerm2.has(c.type)?0:nodeId(nk(c.x2,c.y2));
    const vA=nodeVoltages[nA]??0, vB=nodeVoltages[nB]??0, vd=vA-vB;

    if(c.type==='R'||c.type==='bulb'||c.type==='pot'||c.type==='crose'){
      const effR=c.type==='pot'?Math.max(c.value*(c.pos??0.5),0.01):c.value;
      c.simV=vd; c.simI=vd/effR; c.simPower=Math.abs(vd*c.simI);
      const mr=MAX_RATINGS[c.type];
      if(mr){
        const rating=c.maxRating??mr.def;
        if(c.simPower>rating) c.damaged=true;
      }
      const isBulbType=c.type==='bulb'||c.type==='crose';
      const tag=isBulbType?'Bulb':c.type==='pot'?'Pot':'R';
      const extra=isBulbType?(c.simPower>1e-6?` ${fmtVal(c.simPower,'W')}`:'(off)'):'';
      resArr.push({label:`${tag} ${fmtVal(c.type==='pot'?effR:c.value,'Ω')}${extra}`,v:vd,i:c.simI,p:isBulbType?c.simPower:null});
    } else if(c.type==='socket_uk'){
      c.simV=vd;
      resArr.push({label:`Socket (13A)`,v:vd});
    } else if(c.type==='plug'){
      c.simV=vd;
      resArr.push({label:`Plug (BS 1363)`,v:vd});
    } else if(c.type==='cunit'){
      c.simV=vd;
      if(c.mcbTerms){
        const blownCount=c.mcbTerms.filter(m=>m.blown).length;
        const totalI=c.mcbTerms.reduce((s,m)=>s+(m.simI??0),0);
        resArr.push({label:`Consumer Unit (${c.mcbTerms.length} MCBs${blownCount?' — '+blownCount+' TRIPPED':''})`,v:vd,i:totalI});
      }
    } else if(c.type==='V'||c.type==='supply'){
      const vsrcIdx=vsrcs2.indexOf(c);
      const k=nodeN+vsrcIdx;
      c.simV=c.value; c.simI=x?-x[k]:0;
      const srcTag=c.type==='supply'?'Mains Supply':'V';
      resArr.push({label:`${srcTag} ${fmtVal(c.value,'V')}`,v:c.simV,i:c.simI});
    } else if(c.type==='I'){
      c.simV=vd; c.simI=c.value;
      resArr.push({label:`I Src ${fmtVal(c.value,'A')}`,v:vd,i:c.value});
    } else if(c.type==='C'){
      c.simV=vd; c.simI=0;
      const mr=MAX_RATINGS.C, rating=c.maxRating??mr.def;
      if(Math.abs(vd)>rating) c.damaged=true;
      resArr.push({label:`C ${fmtVal(c.value,'F')}`,v:vd,i:0});
    } else if(c.type==='L'){
      c.simV=0; c.simI=vd*1e9;
      const mr=MAX_RATINGS.L, rating=c.maxRating??mr.def;
      if(Math.abs(c.simI)>rating) c.damaged=true;
      resArr.push({label:`L ${fmtVal(c.value,'H')}`,v:0,i:c.simI});
    } else if(c.type==='fuse'||c.type==='mcb'){
      const fi=fsrcs2.indexOf(c);
      c.simV=vd; c.simI=c.blown?null:(fi>=0&&x?x[nodeN+vsrcs2.length+fi]:0);
      const fuseTag=c.type==='mcb'?'MCB':'Fuse';
      resArr.push({label:`${fuseTag} ${fmtVal(c.value,'A')}${c.blown?' BLOWN':''}`,v:vd,i:c.simI,warn:c.blown});
    } else if(c.type==='sw'||c.type==='switch_uk'){
      const si=swsrcs2.indexOf(c);
      const fsrcOff2=nodeN+vsrcs2.length+fsrcs2.length;
      c.simV=vd; c.simI=(!c.closed)?0:(si>=0&&x?Math.abs(x[fsrcOff2+si]):0);
      const swTag=c.type==='switch_uk'?'Plate Switch':'Switch';
      resArr.push({label:`${swTag} (${c.closed?'closed':'open'})`,v:vd,i:c.simI});
    } else if(c.type==='dpswitch'){
      c.simV=vd;
      resArr.push({label:`DP Isolator (${c.closed?'closed':'open'})`,v:vd});
    } else if(c.type==='sw2'||c.type==='switch2_uk'){
      const si2=sw2srcs2.indexOf(c);
      const sw2Off2=nodeN+vsrcs2.length+fsrcs2.length+swsrcs2.length;
      c.simV=vd; c.simI=si2>=0&&x?Math.abs(x[sw2Off2+si2]):0;
      const pos2=c.sw2pos??0;
      const sw2Tag=c.type==='switch2_uk'?'2-Way Plate Sw':'2-Way Sw';
      resArr.push({label:`${sw2Tag} (→${pos2===0?'L1':'L2'})`,v:vd,i:c.simI});
    } else if(c.type==='LED'){
      c.simV=vd;
      c.ledOn=(diodeState[c.id]==='forward');
      const fwdV=c.value||2.0;
      c.simI=c.ledOn?(vd-fwdV)/10:0;
      resArr.push({label:`LED (${c.ledColor||'red'}) ${c.ledOn?'ON':'off'}`,v:vd,i:c.simI});
    } else if(c.type==='diode'){
      c.simV=vd; c.diodeState=diodeState[c.id]||'reverse';
      c.simI=c.diodeState==='forward'?(vd-0.7)/1:0;
      resArr.push({label:`Diode [${c.diodeState}]`,v:vd,i:c.simI});
    } else if(c.type==='zener'){
      c.simV=vd; c.diodeState=diodeState[c.id]||'reverse';
      if(c.diodeState==='reverse-breakdown') c.diodeState='reverse-breakdown';
      if(diodeState[c.id]==='breakdown') c.diodeState='reverse-breakdown';
      c.simI=c.diodeState==='forward'?(vd-0.7)/1:c.diodeState==='reverse-breakdown'?(vd+c.value)/1:0;
      resArr.push({label:`Zener ${fmtVal(c.value,'V')} [${c.diodeState}]`,v:vd,i:c.simI});
    } else if(c.type==='probe'){
      c.simV=nodeVoltages[nA]??0; c.simI=null;
      resArr.push({label:`Probe (${c.x1/G},${c.y1/G})`,v:c.simV,i:null,probe:true});
    } else if(c.type==='seg7'){
      c.simV=nodeVoltages[nA]??0;
      c.segVal=((Math.round(c.simV)%10)+10)%10; // 0–9
      resArr.push({label:`7-Seg display`,v:c.simV,i:null,probe:true});
    } else if(c.type==='buzzer'){
      c.simV=vd; // voltage across + to -
      c.buzzerOn=Math.abs(vd)>=(c.value||2.0);
      if(c.buzzerOn) _startBuzz(c.id, Math.abs(vd));
      else _stopBuzz(c.id);
      resArr.push({label:`Buzzer ${c.buzzerOn?'BUZZ @ '+Math.abs(vd).toFixed(2)+'V':'off'}`,v:vd,i:null});
    } else if(c.type==='AND'||c.type==='OR'||c.type==='NOT'){
      const outV=c.gateOut??0;
      c.simV=outV;
      const inAV=nodeVoltages[nB]??0;
      const inBV=(c.x3!=null?(nodeVoltages[nodeId(nk(c.x3,c.y3))]??0):0);
      resArr.push({label:`${c.type} gate → ${outV>2.5?'HIGH':'LOW'}`,v:outV,i:null,probe:true});
    } else if(c.type==='motor'||c.type==='load3'){
      // In DC: treated as R = V²/P (rated power at nominal voltage)
      // We don't know nominal voltage, so just use resistance = value/(1) if no sim voltage
      const P = Math.max(c.value, 1);
      // Compute effective R from actual voltage (or a nominal estimate)
      const effR = vd!==0 ? vd*vd/P : P; // R = V²/P; fallback to P Ω
      const realR = Math.max(effR, 0.01);
      c.simV=vd; c.simI=vd/realR; c.simPower=Math.abs(vd*c.simI);
      const tag = c.type==='motor'?'Motor':'3Ph Load';
      resArr.push({label:`${tag} ${fmtVal(c.value,'W')}`,v:vd,i:c.simI,p:c.simPower});
    } else if(c.type==='3ph'){
      c.simV=vd; c.simI=0;
      resArr.push({label:`3Ph Source ${fmtVal(c.value,'V')} L-N`,v:vd,i:null,probe:true});
    } else if(c.type==='xfmr'){
      c.simV=vd; c.simI=0;
      resArr.push({label:`Xfmr n=${c.value}`,v:vd,i:null,probe:true});
    } else if(c.type==='meter'){
      c.simV=vd; c.simI=vd*1000; c.simPower=Math.abs(vd*c.simI);
      resArr.push({label:'Meter',v:vd,i:c.simI});
    } else if(c.type==='rcd'){
      c.simV=vd; c.simI=c.tripped?0:vd*1000;
      resArr.push({label:`RCD ${fmtVal(c.value,'mA')}${c.tripped?' TRIPPED':''}`,v:vd,i:c.simI,warn:c.tripped});
    } else if(c.type==='intswitch'){
      c.simV=vd;
      resArr.push({label:`Int Switch (${(c.intpos??0)===0?'straight':'crossed'})`,v:vd});
    } else if(c.type==='switch2g_uk'||c.type==='switch3g_uk'){
      c.simV=vd;
      const numG=c.type==='switch3g_uk'?3:2;
      const gangs=[c.gang1??0,c.gang2??0];
      if(numG===3) gangs.push(c.gang3??0);
      const stateStr=gangs.map((s,i)=>`G${i+1}:${s?'closed':'open'}`).join(' ');
      resArr.push({label:`${numG}-Gang Plate Sw (${stateStr})`,v:vd});
    } else if(c.type==='shower'||c.type==='cooker'||c.type==='kettle'||c.type==='toaster'||c.type==='tv'||c.type==='fridge'||c.type==='fan'){
      const P=Math.max(c.value,1);
      const R=c.on===false?1/1e-9:230*230/P;
      c.simV=vd; c.simI=vd/R; c.simPower=Math.abs(vd*c.simI);
      const mr=c.type==='fan'?MAX_RATINGS.fan:null;
      if(mr&&c.simPower>(c.maxRating??mr.def)) c.damaged=true;
      const tags={shower:'Shower',cooker:'Cooker',kettle:'Kettle',toaster:'Toaster',tv:'TV',fridge:'Fridge',fan:'Fan'};
      resArr.push({label:`${tags[c.type]||c.type} ${fmtVal(c.value,'W')}${c.on===false?' (off)':''}`,v:vd,i:c.simI,p:c.simPower});
    } else if(c.type==='fcu'){
      // fcu modelled as fuse — find its current from the voltage source row
      const vsrcs2=comps.filter(cc=>cc.type==='V'||cc.type==='supply');
      const fsrcs2=comps.filter(cc=>(cc.type==='fuse'||cc.type==='mcb'||cc.type==='fcu')&&!cc.blown);
      const fi=fsrcs2.indexOf(c);
      c.simV=vd; c.simI=c.blown?null:(fi>=0&&x?Math.abs(x[nodeN+vsrcs2.length+fi]):0);
      if(!c.blown&&c.simI!=null&&c.simI>c.value) c.blown=true;
      resArr.push({label:`FCU ${fmtVal(c.value,'A')}${c.blown?' BLOWN':''}`,v:vd,i:c.simI,warn:c.blown});
    } else if(c.type==='pullcord'){
      // pullcord modelled as switch
      const vsrcs2=comps.filter(cc=>cc.type==='V'||cc.type==='supply');
      const fsrcs2=comps.filter(cc=>(cc.type==='fuse'||cc.type==='mcb'||cc.type==='fcu')&&!cc.blown);
      const swsrcs2=comps.filter(cc=>(cc.type==='sw'||cc.type==='switch_uk'||cc.type==='pullcord')&&cc.closed);
      const si=swsrcs2.indexOf(c);
      const pcOff=nodeN+vsrcs2.length+fsrcs2.length;
      c.simV=vd; c.simI=(!c.closed)?0:(si>=0&&x?Math.abs(x[pcOff+si]):0);
      resArr.push({label:`Pull-Cord (${c.closed?'closed':'open'})`,v:vd,i:c.simI});
    }
  });

  // Results panel
  const nodeSet=new Map();
  for(const [pt,nid] of Object.entries(ptMap)) if(!nodeSet.has(nid)) nodeSet.set(nid,pt);
  let html='<div style="color:#8e9cb8;font-size:9px;padding:2px 0 4px">NODE VOLTAGES</div>';
  [...nodeSet.entries()].sort((a,b)=>a[0]-b[0]).forEach(([nid,pt])=>{
    const [cx,cy]=pt.split(',');
    html+=`<div class="ri"><div class="rl">Node ${nid} @ grid (${cx/G},${cy/G})</div>
    <div class="rv">${fmtVal(nodeVoltages[nid]??0,'V')}</div></div>`;
  });
  html+='<div style="color:#8e9cb8;font-size:9px;padding:6px 0 4px">COMPONENTS</div>';
  resArr.forEach(r=>{
    const col=r.warn?'color:#ff6166':'';
    html+=`<div class="ri" style="${col}"><div class="rl">${r.label}</div>
    <div class="rv" style="${col}">${r.probe?'':fmtVal(r.v,'V')}</div>
    ${r.i!=null?`<div class="ri2">${fmtVal(r.i,'A')}</div>`:''}
    ${r.p!=null?`<div class="ri2" style="color:#ffd700">${fmtVal(r.p,'W')}</div>`:''}
    </div>`;
  });
  document.getElementById('results').innerHTML=html;

  // Build per-wire flow direction via BFS from component terminal seeds
  {
    const _ftSrc=new Set(['V','battery','3ph','xfmr','acV','supply']);
    // terminal map: point → [{sign, simI}]
    const _ftm={};
    const ftAdd=(px,py,isX2,si)=>{const k=nk(px,py);if(!_ftm[k])_ftm[k]=[];_ftm[k].push({sign:isX2?-1:1,simI:si??0});};
    comps.forEach(c=>{
      if(_ftSrc.has(c.type)||c.x1==null||c.x2==null)return;
      const si=c.simI??0;
      ftAdd(c.x1,c.y1,false,si);ftAdd(c.x2,c.y2,true,si);
      if(c.type==='cunit'&&c.mcbTerms)c.mcbTerms.forEach(mt=>ftAdd(mt.x,mt.y,true,mt.simI??0));
    });
    // wire endpoint adjacency
    const _wePts={};
    wires.forEach(w=>{
      const k1=nk(w.x1,w.y1),k2=nk(w.x2,w.y2);
      if(!_wePts[k1])_wePts[k1]=[];if(!_wePts[k2])_wePts[k2]=[];
      _wePts[k1].push(w);_wePts[k2].push(w);
    });
    // BFS: exit terminals (sign*simI<0) seed forward propagation,
    //       entry terminals (sign*simI>0) seed backward propagation.
    // dir = (fwd===isX1) ? 1 : -1
    const _wdir={},_wI={},_seen={},_q=[];
    const seed=(k,fwd,I)=>{if(!_seen[k]){_seen[k]=true;_q.push({k,fwd,I});}};
    Object.keys(_ftm).forEach(k=>{
      _ftm[k].forEach(e=>{
        const v=e.sign*e.simI;
        if(v<-0.01)seed(k,true,Math.abs(e.simI));   // exit → forward
        if(v> 0.01)seed(k,false,Math.abs(e.simI));  // entry → backward
      });
    });
    let qi=0;
    while(qi<_q.length){
      const{k,fwd,I}=_q[qi++];
      (_wePts[k]||[]).forEach(w=>{
        if(_wdir[w.id]!==undefined)return;
        const isX1=nk(w.x1,w.y1)===k;
        _wdir[w.id]=(fwd===isX1)?1:-1;
        _wI[w.id]=I;
        seed(isX1?nk(w.x2,w.y2):nk(w.x1,w.y1),fwd,I);
      });
    }
    window.flowWireDir=_wdir;window.flowWireI=_wI;
  }

  // Restore full component/wire lists before rendering so floating elements are visible
  comps=_allComps; wires=_allWires;
  render();
  const litBulbs=comps.some(c=>(c.type==='bulb'||c.type==='crose')&&(c.simPower||0)>1e-6);
  const litLEDs=comps.some(c=>c.type==='LED'&&c.ledOn);
  const activeBuzzers=comps.some(c=>c.type==='buzzer'&&c.buzzerOn);
  const damaged=comps.some(c=>c.damaged||c.blown);
  if(litBulbs||litLEDs||activeBuzzers||damaged||_flowVisible) startBulbAnim();
  if(sel && !_skipPropsRefresh) showProps(sel);
  markClean();
  if(typeof refreshMMReading === 'function') refreshMMReading();
}

// ── AC Phasor Simulator ────────────────────────────────────────────────────
function simulateAC(){
  stopBulbAnim();
  _stopAllBuzz();
  window.simNodeV=null; window.simVoltages=null; window.simVoltagesC=null; window.flowWireDir=null;window.flowWireI=null;
  _particles.length=0;
  comps.forEach(c=>{delete c.simV;delete c.simI;delete c.simPower;delete c.damaged;delete c.blown;
    delete c.ledOn; delete c.buzzerOn; delete c.diodeState; delete c.gateOut; delete c.segVal;
    delete c.acV; delete c.acI; delete c.acVph; delete c.acIph;
    if(c.type==='cunit'&&c.mcbTerms) c.mcbTerms.forEach(mt=>{mt.blown=false;mt.simI=null;});});
  document.getElementById('sim-err').style.display='none';
  const errEl=document.getElementById('sim-err');
  const err=msg=>{errEl.textContent=msg;errEl.style.display='block';};

  const _subAC=getGNDConnectedSubset();
  if(!_subAC){
    err('No earth reference. Add a GND (earth) component and connect it to the circuit neutral.');
    window.simNodeV={}; window.simVoltages={0:0}; window.flowWireDir={};window.flowWireI={};
    render(); if(sel&&!_skipPropsRefresh) showProps(sel); markClean(); return;
  }
  const _allCompsAC=comps,_allWiresAC=wires;
  comps=_subAC.subComps; wires=_subAC.subWires;

  const {nodeId,getCount}=buildNodeMap();
  const N=getCount();
  const nodeN=N-1;
  if(nodeN===0){
    err('No nodes found — connect components with wires to GND.');
    window.simNodeV={}; window.simVoltages={0:0}; window.flowWireDir={};window.flowWireI={};
    comps=_allCompsAC; wires=_allWiresAC; render(); if(sel&&!_skipPropsRefresh) showProps(sel); markClean(); return;
  }

  const omega=2*Math.PI*_acFreq;
  const ni=key=>{const id=nodeId(key);return id-1;};

  // Collect voltage sources for AC:
  // V sources, 3ph (stamps 3 phasor V sources), xfmr (stamps 2 coupled V sources)
  const vsrcs=comps.filter(c=>c.type==='V'||c.type==='supply');
  const ph3srcs=comps.filter(c=>c.type==='3ph');
  const xfmrSrcs=comps.filter(c=>c.type==='xfmr');
  // Each 3ph stamps 3 V sources; each xfmr stamps 1 V source (secondary = n*V1)
  // Using extra voltage source rows for xfmr secondary
  const M=vsrcs.length + ph3srcs.length*3 + xfmrSrcs.length;
  const sz=nodeN+M;

  // Build complex MNA matrix
  const A=Array.from({length:sz},()=>Array.from({length:sz},()=>({re:0,im:0})));
  const b=Array.from({length:sz},()=>({re:0,im:0}));

  const addA=(r,c2,v)=>{A[r][c2]=Cadd(A[r][c2],v);};
  const stampC=(g)=>{
    // g is complex conductance
    // will be called with na,nb from closure below
    return (na,nb)=>{
      if(na>=0){addA(na,na,g);} if(nb>=0){addA(nb,nb,g);}
      if(na>=0&&nb>=0){addA(na,nb,{re:-g.re,im:-g.im});addA(nb,na,{re:-g.re,im:-g.im});}
    };
  };
  const stampVC=(row,na2,nb2,val)=>{
    if(na2>=0){addA(na2,row,Cmk(1));addA(row,na2,Cmk(1));}
    if(nb2>=0){addA(nb2,row,Cmk(-1));addA(row,nb2,Cmk(-1));}
    b[row]=Cadd(b[row],val);
  };

  let vsrcOff=nodeN;
  let ph3Off=vsrcOff+vsrcs.length;       // 3*ph3srcs.length slots
  let xfmrOff=ph3Off+ph3srcs.length*3;  // xfmrSrcs.length slots

  comps.forEach(c=>{
    const na=ni(nk(c.x1,c.y1));
    const singleTerm=new Set(['GND','probe','seg7']);
    const nb=(singleTerm.has(c.type)||c.type==='AND'||c.type==='OR'||c.type==='3ph')?-1:ni(nk(c.x2,c.y2));

    if(c.type==='fuse'||c.type==='mcb'){
      // Intact fuse/MCB = near-zero resistance wire; blown = open circuit
      const R=c.blown?1e9:0.001;
      stampC(Cmk(1/R))(na,nb);
    } else if(c.type==='R'||c.type==='bulb'||c.type==='crose'){
      const R=Math.max(c.value,0.001);
      stampC(Cmk(1/R))(na,nb);
    } else if(c.type==='socket_uk'){
      // socket outlet — no self-resistance in AC either
    } else if(c.type==='pot'){
      stampC(Cmk(1/Math.max(c.value*(c.pos??0.5),0.01)))(na,nb);
    } else if(c.type==='C'){
      // Z = 1/(jωC), Y = jωC
      const Y=Cmk(0, omega*c.value);
      stampC(Y)(na,nb);
    } else if(c.type==='L'){
      // Z = jωL, Y = 1/(jωL) = -j/(ωL)
      const Y=Cmk(0,-1/(omega*c.value));
      stampC(Y)(na,nb);
    } else if(c.type==='I'){
      const mag=c.value, ph=c.phaseDeg??0;
      const phasor=Cpolar(mag,ph);
      if(na>=0) b[na]=Cadd(b[na],phasor);
      if(nb>=0) b[nb]=Csub(b[nb],phasor);
    } else if(c.type==='cunit'){
      // Internal busbar: near-wire from L-in to each non-blown MCB output
      if(c.mcbTerms) c.mcbTerms.forEach(mt=>{
        if(mt.blown) return;
        const nm=ni(nk(mt.x,mt.y));
        if(na>=0&&nm>=0) stampC(Cmk(1e9))(na,nm);
      });
    } else if(c.type==='V'||c.type==='supply'){
      const k=vsrcOff+vsrcs.indexOf(c);
      const phasor=Cpolar(c.value, c.phaseDeg??0);
      stampVC(k,na,nb,phasor);
    } else if(c.type==='3ph'){
      const mag=c.value, i3=ph3srcs.indexOf(c);
      // Neutral = x1 node
      const nN=na; // neutral terminal index
      // PhaseA = x2, PhaseB = x3, PhaseC = x4
      const nA2=ni(nk(c.x2,c.y2));
      const nB2=c.x3!=null?ni(nk(c.x3,c.y3)):-1;
      const nC2=c.x4!=null?ni(nk(c.x4,c.y4)):-1;
      // Stamp V_A = mag∠0° between nA2(+) and nN(−)
      stampVC(ph3Off+i3*3+0, nA2, nN, Cpolar(mag,0));
      // Stamp V_B = mag∠-120° between nB2(+) and nN(−)
      stampVC(ph3Off+i3*3+1, nB2, nN, Cpolar(mag,-120));
      // Stamp V_C = mag∠+120° between nC2(+) and nN(−)
      stampVC(ph3Off+i3*3+2, nC2, nN, Cpolar(mag,+120));
    } else if(c.type==='xfmr'){
      // Ideal transformer: V_sec = n * V_pri, I_pri = n * I_sec
      // Pri terminals: x1(+), x3(−); Sec terminals: x2(+), x4(−)
      const n=Math.max(c.value,0.001);
      const nPp=na; // primary +
      const nPm=c.x3!=null?ni(nk(c.x3,c.y3)):-1; // primary −
      const nSp=nb; // secondary +
      const nSm=c.x4!=null?ni(nk(c.x4,c.y4)):-1; // secondary −
      // Stamp using controlled source model:
      // Extra row k: V_sec - n*V_pri = 0 (V source with controlled value)
      // Simplified stamp: secondary voltage source = n × primary voltage
      // Use a gyrator-like 2-row stamp for ideal transformer
      const k=xfmrOff+xfmrSrcs.indexOf(c);
      // Row k: nSp - nSm - n*(nPp - nPm) = 0
      if(nSp>=0){addA(k,nSp,Cmk(1));addA(nSp,k,Cmk(1));}
      if(nSm>=0){addA(k,nSm,Cmk(-1));addA(nSm,k,Cmk(-1));}
      if(nPp>=0){addA(k,nPp,Cmk(-n));addA(nPp,k,Cmk(-n));}
      if(nPm>=0){addA(k,nPm,Cmk(n));addA(nPm,k,Cmk(n));}
      b[k]=C0;
    } else if(c.type==='motor'||c.type==='load3'){
      // Motor/Load: R = V²/P (rated power). In AC, use rated RMS → same R.
      const P=Math.max(c.value,1);
      // Default nominal voltage for motor: use circuit V if available, else 230V
      const nomV=230;
      const R=nomV*nomV/P;
      stampC(Cmk(1/R))(na,nb);
    } else if(c.type==='sw'||c.type==='switch_uk'){
      if(c.closed) stampC(Cmk(1e9))(na,nb); // short
      // open: nothing
    } else if(c.type==='dpswitch'){
      if(c.closed){
        stampC(Cmk(1e9))(na,nb); // L path
        const nc2=c.x3!=null?ni(nk(c.x3,c.y3)):-1;
        const nd2=c.x4!=null?ni(nk(c.x4,c.y4)):-1;
        if(nc2>=0&&nd2>=0) stampC(Cmk(1e9))(nc2,nd2); // N path
      }
    } else if(c.type==='sw2'||c.type==='switch2_uk'){
      // Two-way switch: short between COM and active terminal
      const pos2=c.sw2pos??0;
      const nb2=pos2===0?nb:(c.x3!=null?ni(nk(c.x3,c.y3)):-1);
      stampC(Cmk(1e9))(na,nb2);
      // Inactive terminal: add tiny bleed (1 GΩ) to COM so the inactive-strapper node
      // is never completely isolated — prevents a singular matrix when neither switch
      // stamps through the unused strapper wire.
      const ni_inact2=pos2===0?(c.x3!=null?ni(nk(c.x3,c.y3)):-1):nb;
      stampC(Cmk(1e-9))(na,ni_inact2);
    } else if(c.type==='meter'){
      stampC(Cmk(1000))(na,nb); // 0.001Ω
    } else if(c.type==='rcd'){
      if(!c.tripped) stampC(Cmk(1000))(na,nb);
    } else if(c.type==='intswitch'||c.type==='switchint_uk'){
      const nc2=c.x3!=null?ni(nk(c.x3,c.y3)):-1;
      const nd2=c.x4!=null?ni(nk(c.x4,c.y4)):-1;
      if((c.intpos??0)===0){
        stampC(Cmk(1e9))(na,nb);   // x1↔x2
        stampC(Cmk(1e9))(nc2,nd2); // x3↔x4
      } else {
        stampC(Cmk(1e9))(na,nd2);  // x1↔x4
        stampC(Cmk(1e9))(nc2,nb);  // x3↔x2
      }
      // 1GΩ bleed keeps inactive-path nodes non-isolated
      stampC(Cmk(1e-9))(na,nc2);
      stampC(Cmk(1e-9))(nb,nd2);
    } else if(c.type==='switch2g_uk'||c.type==='switch3g_uk'){
      const nc2=c.x3!=null?ni(nk(c.x3,c.y3)):-1;
      const nd2=c.x4!=null?ni(nk(c.x4,c.y4)):-1;
      if(c.gang1) stampC(Cmk(1e9))(na,nb);
      if(c.gang2&&nc2>=0&&nd2>=0) stampC(Cmk(1e9))(nc2,nd2);
      if(c.type==='switch3g_uk'&&c.gang3&&c.x5!=null&&c.x6!=null){
        const ne2=ni(nk(c.x5,c.y5)), nf2=ni(nk(c.x6,c.y6));
        stampC(Cmk(1e9))(ne2,nf2);
      }
    } else if(c.type==='shower'||c.type==='cooker'||c.type==='kettle'||c.type==='toaster'||c.type==='tv'||c.type==='fridge'||c.type==='fan'){
      if(c.on===false){
        stampC(Cmk(1e-9))(na,nb);
      } else {
        const P=Math.max(c.value,1);
        stampC(Cmk(P/(230*230)))(na,nb);
      }
    } else if(c.type==='fcu'){
      // fcu in AC: near-zero resistance when intact, open when blown
      const R=c.blown?1e9:0.001;
      stampC(Cmk(1/R))(na,nb);
    } else if(c.type==='pullcord'){
      if(c.closed) stampC(Cmk(1e9))(na,nb);
      // open → nothing
    } else if(c.type==='LED'||c.type==='diode'||c.type==='zener'){
      // In AC: treat as 1/fwdR resistor (diodes don't rectify in phasor domain)
      stampC(Cmk(1/10))(na,nb);
    } else if(c.type==='nmos'){
      // In AC: use current on/off state (Rds) as resistor
      const Rds=c.mosfetOn?0.1:1e6;
      const nbM=ni(nk(c.x2,c.y2));
      stampC(Cmk(1/Rds))(na,nbM);
    }
    // buzzer: 1kΩ in AC too
    if(c.type==='buzzer'&&na>=0&&nb>=0) stampC(Cmk(1/1000))(na,nb);
    // GND/probe/seg7/logic gates: no stamp in AC
  });

  let xC=gaussElimC(A,b,sz);
  if(!xC){ err('Incomplete circuit — check for unconnected terminals (amber dots) or a direct short between live and neutral.'); xC=Array.from({length:sz},()=>({re:0,im:0})); }

  // Build complex node voltage map
  const nodeVoltagesC={0:C0};
  for(let i=0;i<nodeN;i++) nodeVoltagesC[i+1]=xC[i];
  window.simVoltagesC=nodeVoltagesC;

  // Build simple real node voltages (magnitudes) for rendering
  const nodeVoltages={0:0};
  for(let i=1;i<=nodeN;i++) nodeVoltages[i]=Cabs(nodeVoltagesC[i]||C0);

  // Build ptMap for node display
  const ptMap={};
  const mapPt2=(x2,y2)=>{const k=nk(x2,y2);if(jumpPoints.has(k))return;ptMap[k]=nodeId(k);};
  const singleTermSet2=new Set(['GND','probe','seg7']);
  comps.forEach(c=>{
    mapPt2(c.x1,c.y1);
    if(!singleTermSet2.has(c.type)) mapPt2(c.x2,c.y2);
    if(c.type==='cunit'&&c.mcbTerms) c.mcbTerms.forEach(mt=>mapPt2(mt.x,mt.y));
    if((c.type==='sw2'||c.type==='nmos'||c.type==='switch2_uk')&&c.x3!=null) mapPt2(c.x3,c.y3);
    if((c.type==='intswitch'||c.type==='switchint_uk')&&c.x3!=null){mapPt2(c.x3,c.y3);if(c.x4!=null)mapPt2(c.x4,c.y4);}
    if(c.type==='switch2g_uk'&&c.x3!=null){mapPt2(c.x3,c.y3);if(c.x4!=null)mapPt2(c.x4,c.y4);}
    if(c.type==='switch3g_uk'&&c.x3!=null){mapPt2(c.x3,c.y3);if(c.x4!=null)mapPt2(c.x4,c.y4);if(c.x5!=null)mapPt2(c.x5,c.y5);if(c.x6!=null)mapPt2(c.x6,c.y6);}
    if(c.type==='dpswitch'&&c.x3!=null){mapPt2(c.x3,c.y3);if(c.x4!=null)mapPt2(c.x4,c.y4);}
    if(c.type==='3ph'&&c.x3!=null){mapPt2(c.x3,c.y3);mapPt2(c.x4,c.y4);}
    if(c.type==='xfmr'&&c.x3!=null){mapPt2(c.x3,c.y3);mapPt2(c.x4,c.y4);}
  });
  wires.forEach(w=>{
    mapPt2(w.x1,w.y1);mapPt2(w.x2,w.y2);
    if(w.x1===w.x2){const mn=Math.min(w.y1,w.y2),mx=Math.max(w.y1,w.y2);for(let y=mn;y<=mx;y+=G)mapPt2(w.x1,y);}
    else{const mn=Math.min(w.x1,w.x2),mx=Math.max(w.x1,w.x2);for(let x=mn;x<=mx;x+=G)mapPt2(x,w.y1);}
  });
  window.simNodeV=ptMap;
  window.simVoltages=nodeVoltages;

  // Annotate components
  const resArr=[];
  comps.forEach(c=>{
    const nA=nodeId(nk(c.x1,c.y1));
    const singleTermAC=new Set(['GND','probe','seg7']);
    const nB=singleTermAC.has(c.type)?0:nodeId(nk(c.x2,c.y2));
    const vA=nodeVoltagesC[nA]??C0, vB=nodeVoltagesC[nB]??C0;
    const vd=Csub(vA,vB);
    const mag=Cabs(vd), ph=Carg(vd);

    if(c.type==='R'||c.type==='bulb'||c.type==='pot'||c.type==='crose'){
      const effR=c.type==='pot'?Math.max(c.value*(c.pos??0.5),0.01):c.value;
      c.acV=mag; c.acVph=ph; c.simV=mag;
      const imag=mag/effR;
      c.acI=imag; c.acIph=ph; c.simI=imag;
      c.simPower=mag*imag*0.5;
      const isBulbType=c.type==='bulb'||c.type==='crose';
      const tag=isBulbType?'Bulb':c.type==='pot'?'Pot':'R';
      resArr.push({label:`${tag} ${fmtVal(effR,'Ω')}`,acV:mag,acVph:ph,acI:imag,acIph:ph,p:c.simPower});
    } else if(c.type==='socket_uk'){
      c.simV=mag;
      resArr.push({label:`Socket (13A)`,acV:mag,acVph:ph});
    } else if(c.type==='plug'){
      c.simV=mag;
      resArr.push({label:`Plug (BS 1363)`,acV:mag,acVph:ph});
    } else if(c.type==='C'){
      c.acV=mag; c.acVph=ph; c.simV=mag;
      const Y=Cmk(0,omega*c.value);
      const iC=Cmul(Y,vd);
      c.acI=Cabs(iC); c.acIph=Carg(iC); c.simI=c.acI;
      c.simPower=0; // ideal capacitor: no real power
      resArr.push({label:`C ${fmtVal(c.value,'F')}`,acV:mag,acVph:ph,acI:c.acI,acIph:c.acIph});
    } else if(c.type==='L'){
      c.acV=mag; c.acVph=ph; c.simV=mag;
      const Y=Cmk(0,-1/(omega*c.value));
      const iL=Cmul(Y,vd);
      c.acI=Cabs(iL); c.acIph=Carg(iL); c.simI=c.acI;
      c.simPower=0;
      resArr.push({label:`L ${fmtVal(c.value,'H')}`,acV:mag,acVph:ph,acI:c.acI,acIph:c.acIph});
    } else if(c.type==='cunit'){
      c.acV=mag; c.simV=mag;
      if(c.mcbTerms) resArr.push({label:`Consumer Unit (${c.mcbTerms.length} MCBs)`,acV:mag,acVph:ph});
    } else if(c.type==='V'||c.type==='supply'){
      const vi=vsrcs.indexOf(c);
      const k=vsrcOff+vi;
      c.acV=c.value; c.acVph=c.phaseDeg??0; c.simV=c.value;
      const iC=xC[k]; c.acI=Cabs(iC); c.acIph=Carg(iC); c.simI=c.acI;
      const srcTag=c.type==='supply'?'Mains Supply':'V Src';
      resArr.push({label:`${srcTag} ${fmtPhasorU(c.value,c.phaseDeg??0,'V')}`,acV:c.acV,acVph:c.acVph,acI:c.acI,acIph:c.acIph});
    } else if(c.type==='I'){
      c.acV=mag; c.acVph=ph; c.simV=mag;
      c.acI=c.value; c.acIph=c.phaseDeg??0; c.simI=c.value;
      resArr.push({label:`I Src ${fmtPhasorU(c.value,c.phaseDeg??0,'A')}`,acV:mag,acVph:ph,acI:c.value,acIph:c.phaseDeg??0});
    } else if(c.type==='probe'){
      const vN=nodeVoltagesC[nA]??C0;
      c.acV=Cabs(vN); c.acVph=Carg(vN); c.simV=c.acV;
      resArr.push({label:`Probe (${c.x1/G},${c.y1/G})`,acV:c.acV,acVph:c.acVph,acI:null,probe:true});
    } else if(c.type==='fuse'||c.type==='mcb'){
      const fuseI = mag / 0.001;
      c.acV=mag; c.simV=mag; c.simI=fuseI;
      if(!c.blown && fuseI > c.value) { c.blown=true; }
      const fuseTag=c.type==='mcb'?'MCB':'Fuse';
      resArr.push({label:`${fuseTag} ${fmtVal(c.value,'A')}${c.blown?' BLOWN':''}`,acV:mag,acVph:ph,warn:c.blown});
    } else if(c.type==='motor'||c.type==='load3'){
      const P=Math.max(c.value,1), nomV=230;
      const R=nomV*nomV/P;
      c.acV=mag; c.acVph=ph; c.simV=mag;
      c.acI=mag/R; c.simI=c.acI;
      c.simPower=mag*c.acI*0.5;
      const tag=c.type==='motor'?'Motor':'3Ph Load';
      resArr.push({label:`${tag} ${fmtVal(c.value,'W')}`,acV:mag,acVph:ph,acI:c.acI,acIph:ph,p:c.simPower});
    } else if(c.type==='3ph'){
      const nPhA=nodeId(nk(c.x2,c.y2));
      const nPhB=c.x3!=null?nodeId(nk(c.x3,c.y3)):0;
      const nPhC=c.x4!=null?nodeId(nk(c.x4,c.y4)):0;
      const vPhA=nodeVoltagesC[nPhA]??C0;
      c.acV=Cabs(vPhA); c.acVph=Carg(vPhA); c.simV=c.acV;
      const iA=xC[ph3Off+ph3srcs.indexOf(c)*3];
      c.acI=Cabs(iA); c.simI=c.acI;
      resArr.push({label:`3Ph Src ${fmtVal(c.value,'V')} L-N`,acV:c.value,acVph:0,acI:c.acI,acIph:Carg(iA)});
    } else if(c.type==='xfmr'){
      c.acV=mag; c.acVph=ph; c.simV=mag;
      const iX=xC[xfmrOff+xfmrSrcs.indexOf(c)];
      c.acI=Cabs(iX); c.simI=c.acI;
      resArr.push({label:`Xfmr n=${c.value}`,acV:mag,acVph:ph,acI:c.acI});
    } else if(c.type==='LED'||c.type==='diode'||c.type==='zener'){
      c.acV=mag; c.simV=mag; c.simI=mag/10;
      resArr.push({label:`${c.type} (AC approx)`,acV:mag,acVph:ph,acI:c.simI,acIph:ph});
    } else if(c.type==='sw'||c.type==='switch_uk'){
      c.simV=mag;
      const swTag2=c.type==='switch_uk'?'Plate Switch':'Switch';
      resArr.push({label:`${swTag2} (${c.closed?'closed':'open'})`,acV:mag,acVph:ph});
    } else if(c.type==='sw2'||c.type==='switch2_uk'){
      c.simV=mag;
      const pos2=c.sw2pos??0;
      const sw2TagAC=c.type==='switch2_uk'?'2-Way Plate Sw':'2-Way Sw';
      resArr.push({label:`${sw2TagAC} (→${pos2===0?'L1':'L2'})`,acV:mag,acVph:ph});
    } else if(c.type==='dpswitch'){
      c.simV=mag;
      resArr.push({label:`DP Isolator (${c.closed?'closed':'open'})`,acV:mag,acVph:ph});
    } else if(c.type==='meter'){
      c.acV=mag; c.simV=mag; c.simI=mag*1000; c.acI=c.simI; c.acIph=ph;
      resArr.push({label:'Meter',acV:mag,acVph:ph,acI:c.acI,acIph:ph});
    } else if(c.type==='rcd'){
      c.simV=mag; c.simI=c.tripped?0:mag*1000;
      resArr.push({label:`RCD ${fmtVal(c.value,'mA')}${c.tripped?' TRIPPED':''}`,acV:mag,acVph:ph,warn:c.tripped});
    } else if(c.type==='intswitch'||c.type==='switchint_uk'){
      c.simV=mag;
      const intTag=c.type==='switchint_uk'?'UK Int Plate Sw':'Int Switch';
      resArr.push({label:`${intTag} (${(c.intpos??0)===0?'straight':'crossed'})`,acV:mag,acVph:ph});
    } else if(c.type==='switch2g_uk'||c.type==='switch3g_uk'){
      c.simV=mag;
      const numG=c.type==='switch3g_uk'?3:2;
      const gangs=[c.gang1??0,c.gang2??0];
      if(numG===3) gangs.push(c.gang3??0);
      const stateStr=gangs.map((s,i)=>`G${i+1}:${s?'closed':'open'}`).join(' ');
      resArr.push({label:`${numG}-Gang Plate Sw (${stateStr})`,acV:mag,acVph:ph});
    } else if(c.type==='shower'||c.type==='cooker'||c.type==='kettle'||c.type==='toaster'||c.type==='tv'||c.type==='fridge'||c.type==='fan'){
      const P=Math.max(c.value,1), R=c.on===false?1/1e-9:230*230/P;
      c.acV=mag; c.simV=mag; c.acI=mag/R; c.simI=c.acI; c.simPower=mag*c.acI*0.5;
      const tags={shower:'Shower',cooker:'Cooker',kettle:'Kettle',toaster:'Toaster',tv:'TV',fridge:'Fridge',fan:'Fan'};
      resArr.push({label:`${tags[c.type]||c.type} ${fmtVal(c.value,'W')}${c.on===false?' (off)':''}`,acV:mag,acVph:ph,acI:c.acI,acIph:ph,p:c.simPower});
    } else if(c.type==='fcu'){
      const fuseIAC=mag/0.001;
      c.acV=mag; c.simV=mag; c.simI=fuseIAC;
      if(!c.blown&&fuseIAC>c.value) c.blown=true;
      resArr.push({label:`FCU ${fmtVal(c.value,'A')}${c.blown?' BLOWN':''}`,acV:mag,acVph:ph,acI:c.simI,acIph:ph,warn:c.blown});
    } else if(c.type==='pullcord'){
      c.simV=mag;
      resArr.push({label:`Pull-Cord (${c.closed?'closed':'open'})`,acV:mag,acVph:ph});
    } else if(c.type==='GND'){
      c.simV=0;
    } else if(c.type==='seg7'||c.type==='buzzer'){
      c.simV=nodeVoltages[nA]??0;
    }
  });

  // Results panel
  const nodeSet=new Map();
  for(const [pt,nid] of Object.entries(ptMap)) if(!nodeSet.has(nid)) nodeSet.set(nid,pt);
  const totalW=resArr.reduce((s,r)=>s+(r.p??0),0);
  let html=`<div style="background:#1a2332;border:1px solid #fbbf24;border-radius:6px;padding:8px 10px;margin-bottom:8px"><div style="color:#fbbf24;font-size:11px;font-weight:bold">230V AC 50Hz &mdash; ${fmtVal(totalW,'W')} total load</div></div>`;
  html+=`<div style="color:#fbbf24;font-size:9px;padding:2px 0 4px">AC PHASOR @ ${_acFreq} Hz — NODE VOLTAGES (RMS mag)</div>`;
  [...nodeSet.entries()].sort((a,b)=>a[0]-b[0]).forEach(([nid,pt])=>{
    const [cx,cy]=pt.split(',');
    const vC=nodeVoltagesC[nid]??C0;
    html+=`<div class="ri"><div class="rl">Node ${nid} @ grid (${cx/G},${cy/G})</div>
    <div class="rv">${fmtPhasorU(Cabs(vC),Carg(vC),'V')}</div></div>`;
  });
  html+='<div style="color:#8e9cb8;font-size:9px;padding:6px 0 4px">COMPONENTS</div>';
  resArr.forEach(r=>{
    html+=`<div class="ri"><div class="rl">${r.label}</div>
    ${r.acV!=null&&!r.probe?`<div class="rv">${fmtPhasorU(r.acV,r.acVph??0,'V')}</div>`:''}
    ${r.acI!=null?`<div class="ri2">${fmtPhasorU(r.acI,r.acIph??0,'A')}</div>`:''}
    ${r.p!=null?`<div class="ri2" style="color:#ffd700">P = ${fmtVal(r.p,'W')}</div>`:''}
    </div>`;
  });
  document.getElementById('results').innerHTML=html;

  // Build per-wire flow direction via BFS (same algorithm as DC)
  {
    const _ftSrc=new Set(['V','battery','3ph','xfmr','acV','supply']);
    const _ftm={};
    const ftAdd=(px,py,isX2,si)=>{const k=nk(px,py);if(!_ftm[k])_ftm[k]=[];_ftm[k].push({sign:isX2?-1:1,simI:si??0});};
    comps.forEach(c=>{
      if(_ftSrc.has(c.type)||c.x1==null||c.x2==null)return;
      const si=c.simI??0;
      ftAdd(c.x1,c.y1,false,si);ftAdd(c.x2,c.y2,true,si);
      if(c.type==='cunit'&&c.mcbTerms)c.mcbTerms.forEach(mt=>ftAdd(mt.x,mt.y,true,mt.simI??0));
    });
    const _wePts={};
    wires.forEach(w=>{
      const k1=nk(w.x1,w.y1),k2=nk(w.x2,w.y2);
      if(!_wePts[k1])_wePts[k1]=[];if(!_wePts[k2])_wePts[k2]=[];
      _wePts[k1].push(w);_wePts[k2].push(w);
    });
    const _wdir={},_wI={},_seen={},_q=[];
    const seed=(k,fwd,I)=>{if(!_seen[k]){_seen[k]=true;_q.push({k,fwd,I});}};
    Object.keys(_ftm).forEach(k=>{
      _ftm[k].forEach(e=>{
        const v=e.sign*e.simI;
        if(v<-0.01)seed(k,true,Math.abs(e.simI));
        if(v> 0.01)seed(k,false,Math.abs(e.simI));
      });
    });
    let qi=0;
    while(qi<_q.length){
      const{k,fwd,I}=_q[qi++];
      (_wePts[k]||[]).forEach(w=>{
        if(_wdir[w.id]!==undefined)return;
        const isX1=nk(w.x1,w.y1)===k;
        _wdir[w.id]=(fwd===isX1)?1:-1;
        _wI[w.id]=I;
        seed(isX1?nk(w.x2,w.y2):nk(w.x1,w.y1),fwd,I);
      });
    }
    window.flowWireDir=_wdir;window.flowWireI=_wI;
  }

  comps=_allCompsAC; wires=_allWiresAC;
  render();
  const litBulbs=comps.some(c=>(c.type==='bulb'||c.type==='crose')&&(c.simPower||0)>1e-6);
  if(litBulbs||_flowVisible) startBulbAnim();
  if(sel && !_skipPropsRefresh) showProps(sel);
  markClean();
  if(typeof refreshMMReading === 'function') refreshMMReading();
}

