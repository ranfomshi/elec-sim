// Pointer interactions, animation, and schema import/export.

// ── Mouse events ───────────────────────────────────────────────────────────
SVG.addEventListener('mousemove',e=>{
  if(_panning){_pan.x=_panOrigin.x+(e.clientX-_panStart.x);_pan.y=_panOrigin.y+(e.clientY-_panStart.y);updateViewport();return;}
  const p=snapPt(e);
  document.getElementById('coords').textContent=`${p.x/G}, ${p.y/G}`;
  if(dragging){
    const raw=svgPt(e); const nx=snap(raw.x-dragOff.x), ny=snap(raw.y-dragOff.y);
    const c=comps.find(x=>x.id===dragging);
    if(c&&(nx!==c.px||ny!==c.py)) _dragMoved=true;
    if(c){
      const [x1,y1,x2,y2]=terminals(c.type,nx,ny,c.rotation);
      c.px=nx;c.py=ny;c.x1=x1;c.y1=y1;c.x2=x2;c.y2=y2;
      const r=c.rotation;
      if(c.type==='AND'||c.type==='OR'){
        if(r===0){c.x3=nx; c.y3=ny+2*G;}
        else if(r===1){c.x3=nx+2*G; c.y3=ny;}
        else if(r===2){c.x3=nx+3*G; c.y3=ny+2*G;}
        else{c.x3=nx+2*G; c.y3=ny+3*G;}
      }
      if(c.type==='sw2'||c.type==='switch2_uk'){
        if(r===0){c.x3=nx+3*G; c.y3=ny+G;}
        else if(r===1){c.x3=nx-G; c.y3=ny+3*G;}
        else if(r===2){c.x3=nx; c.y3=ny-G;}
        else{c.x3=nx+G; c.y3=ny;}
      }
      if(c.type==='switchint_uk'){
        if(r===0){c.x3=nx;   c.y3=ny+G;  c.x4=nx+3*G; c.y4=ny+G;}
        else if(r===1){c.x3=nx-G; c.y3=ny;  c.x4=nx-G; c.y4=ny+3*G;}
        else if(r===2){c.x3=nx+3*G; c.y3=ny-G; c.x4=nx; c.y4=ny-G;}
        else{c.x3=nx+G; c.y3=ny+3*G; c.x4=nx+G; c.y4=ny;}
      }
      if(c.type==='switch2g_uk'){
        if(r===0){c.x3=nx;     c.y3=ny+G;   c.x4=nx+3*G; c.y4=ny+G;}
        else if(r===1){c.x3=nx+G; c.y3=ny;   c.x4=nx+G; c.y4=ny+3*G;}
        else if(r===2){c.x3=nx+3*G; c.y3=ny-G; c.x4=nx; c.y4=ny-G;}
        else{c.x3=nx-G; c.y3=ny+3*G; c.x4=nx-G; c.y4=ny;}
      }
      if(c.type==='switch3g_uk'){
        if(r===0){
          c.x3=nx;     c.y3=ny+G;   c.x4=nx+3*G; c.y4=ny+G;
          c.x5=nx;     c.y5=ny+2*G; c.x6=nx+3*G; c.y6=ny+2*G;
        } else if(r===1){
          c.x3=nx+G;   c.y3=ny;     c.x4=nx+G;   c.y4=ny+3*G;
          c.x5=nx+2*G; c.y5=ny;     c.x6=nx+2*G; c.y6=ny+3*G;
        } else if(r===2){
          c.x3=nx+3*G; c.y3=ny-G;   c.x4=nx;     c.y4=ny-G;
          c.x5=nx+3*G; c.y5=ny-2*G; c.x6=nx;     c.y6=ny-2*G;
        } else {
          c.x3=nx-G;   c.y3=ny+3*G; c.x4=nx-G;   c.y4=ny;
          c.x5=nx-2*G; c.y5=ny+3*G; c.x6=nx-2*G; c.y6=ny;
        }
      }
      if(c.type==='plug'){
        if(r===0){c.x3=nx; c.y3=ny; c.x4=nx+3*G; c.y4=ny;}
        else if(r===1){c.x3=nx; c.y3=ny; c.x4=nx; c.y4=ny+3*G;}
        else if(r===2){c.x3=nx+3*G; c.y3=ny; c.x4=nx; c.y4=ny;}
        else{c.x3=nx; c.y3=ny+3*G; c.x4=nx; c.y4=ny;}
      }
      if(c.type==='socket_uk'||c.type==='switch_uk'){
        if(r===0){c.x3=x1+1.5*G;c.y3=y1-G;}
        else if(r===1){c.x3=x1+G;c.y3=y1+1.5*G;}
        else if(r===2){c.x3=x1-1.5*G;c.y3=y1+G;}
        else{c.x3=x1-G;c.y3=y1-1.5*G;}
      }
      if(c.type==='dpswitch'){
        if(r===0){c.x3=x1; c.y3=y1+G; c.x4=x2; c.y4=y2+G;}
        else if(r===1){c.x3=x1-G; c.y3=y1; c.x4=x2-G; c.y4=y2;}
        else if(r===2){c.x3=x1; c.y3=y1-G; c.x4=x2; c.y4=y2-G;}
        else{c.x3=x1+G; c.y3=y1; c.x4=x2+G; c.y4=y2;}
      }
      if(c.type==='3ph'){
        if(r===0){c.x3=nx+4*G;c.y3=ny+G;c.x4=nx+4*G;c.y4=ny-G;}
        else if(r===1){c.x3=nx-G;c.y3=ny+4*G;c.x4=nx+G;c.y4=ny+4*G;}
        else if(r===2){c.x3=nx;c.y3=ny-G;c.x4=nx;c.y4=ny+G;}
        else{c.x3=nx+G;c.y3=ny;c.x4=nx-G;c.y4=ny;}
      }
      if(c.type==='xfmr'){
        if(r===0){c.x3=nx;c.y3=ny+2*G;c.x4=nx+4*G;c.y4=ny+2*G;}
        else if(r===1){c.x3=nx+2*G;c.y3=ny;c.x4=nx+2*G;c.y4=ny+4*G;}
        else if(r===2){c.x3=nx+4*G;c.y3=ny+2*G;c.x4=nx;c.y4=ny+2*G;}
        else{c.x3=nx+2*G;c.y3=ny+4*G;c.x4=nx+2*G;c.y4=ny;}
      }
      if(c.type==='cunit') computeCUnitTerms(c);
      // Stretch connected wires to follow moved terminals
      if(_dragTermOld){
        const newT=_getTerminals(c);
        wires.forEach(w=>{
          _dragTermOld.forEach((old,i)=>{
            const nu=newT[i];
            if(w.x1===old.x&&w.y1===old.y){w.x1=nu.x;w.y1=nu.y;}
            if(w.x2===old.x&&w.y2===old.y){w.x2=nu.x;w.y2=nu.y;}
          });
        });
        _dragTermOld=newT;
      }
      clearSim();render();
    }
    return;
  }
  if(mode.startsWith('place-')) drawGhost(p.x,p.y);
  if(mode==='wire'){
    const snapped=nearestSnapPoint(p.x,p.y);
    const ep=snapped||p;
    if(wireStart){
      const layer=document.getElementById('ghost-g'); layer.innerHTML='';
      const ex=ep.x, ey=ep.y;
      const dx=Math.abs(ex-wireStart.x), dy=Math.abs(ey-wireStart.y);
      if(dx===0||dy===0){
        // Already aligned — single segment
        layer.appendChild(mk('line',{x1:wireStart.x,y1:wireStart.y,x2:ex,y2:ey,class:'wl',opacity:0.5}));
      } else {
        // L-route: H first then V
        const mid={x:ex,y:wireStart.y};
        layer.appendChild(mk('line',{x1:wireStart.x,y1:wireStart.y,x2:mid.x,y2:mid.y,class:'wl',opacity:0.5}));
        layer.appendChild(mk('line',{x1:mid.x,y1:mid.y,x2:ex,y2:ey,class:'wl',opacity:0.5}));
        layer.appendChild(mk('circle',{cx:mid.x,cy:mid.y,r:3,fill:'#4da3ff',opacity:0.7}));
      }
      layer.appendChild(mk('circle',{cx:wireStart.x,cy:wireStart.y,r:4,fill:'#4da3ff'}));
      if(snapped) layer.appendChild(mk('circle',{cx:ex,cy:ey,r:8,stroke:'#4da3ff',fill:'rgba(77,163,255,0.12)','stroke-width':1.5}));
    } else if(snapped){
      // No wire started yet — just show snap ring at terminal or wire endpoint
      const layer=document.getElementById('ghost-g'); layer.innerHTML='';
      layer.appendChild(mk('circle',{cx:snapped.x,cy:snapped.y,r:8,
        stroke:'#4da3ff',fill:'rgba(77,163,255,0.12)','stroke-width':1.5,opacity:0.9}));
    } else {
      document.getElementById('ghost-g').innerHTML='';
    }
  }
});

SVG.addEventListener('mousedown',e=>{
  if(e.button===1||e.button===2||(e.button===0&&mode==='pan')){
    e.preventDefault();_panning=true;
    _panStart={x:e.clientX,y:e.clientY};_panOrigin={x:_pan.x,y:_pan.y};
    SVG.style.cursor='grabbing';
  }
});
SVG.addEventListener('contextmenu',e=>e.preventDefault());
SVG.addEventListener('mouseup',e=>{
  if(_panning&&(e.button===1||e.button===2||(e.button===0&&mode==='pan'))){
    _panning=false;SVG.style.cursor=mode==='pan'?'grab':'default';return;
  }
  if(dragging){const moved=_dragMoved;dragging=null;_dragTermOld=null;_dragMoved=false;if(moved)markDirty();}
});
SVG.addEventListener('wheel',e=>{
  e.preventDefault();
  const r=SVG.getBoundingClientRect();
  zoomTo(e.clientX-r.left,e.clientY-r.top,_zoom*(e.deltaY<0?1.12:1/1.12));
},{passive:false});

SVG.addEventListener('click',e=>{
  if(dragging) return;
  // Intercept for multimeter probe placement
  if(typeof _mmActiveProbe !== 'undefined' && _mmActiveProbe) {
    const p = snapPt(e);
    if(_mmActiveProbe === 'red') _mmRed = {x:p.x, y:p.y};
    else _mmBlack = {x:p.x, y:p.y};
    _mmActiveProbe = null;
    document.querySelector('.mm-red-btn').classList.remove('active');
    document.querySelector('.mm-black-btn').classList.remove('active');
    SVG.style.cursor = '';
    renderProbes();
    refreshMMReading();
    return;
  }
  const p=snapPt(e);
  if(mode==='select'){if(_tryStartWireFromTerminal(svgPt(e)))return;sel=null;showProps(null);render();return;}
  if(mode==='wire'){
    const snapped=nearestSnapPoint(p.x,p.y);
    const ep=snapped||p;
    if(!wireStart){
      wireStart={x:ep.x,y:ep.y};
      setStatus('Wire started — click to place end point. Esc to cancel.');
    } else {
      const ex=ep.x, ey=ep.y;
      if(ex===wireStart.x&&ey===wireStart.y){return;} // zero-length — ignore
      if(ex===wireStart.x||ey===wireStart.y){
        // Single straight segment
        placeWire(wireStart.x,wireStart.y,ex,ey);
      } else {
        // L-route: H first then V
        const mid={x:ex,y:wireStart.y};
        placeWire(wireStart.x,wireStart.y,mid.x,mid.y);
        placeWire(mid.x,mid.y,ex,ey);
      }
      // Auto-switch to select if we landed on a component terminal or existing wire endpoint
      const snapsToComp=comps.some(c=>
        (c.x1===ex&&c.y1===ey)||(c.x2===ex&&c.y2===ey)||
        (c.x3!=null&&c.x3===ex&&c.y3===ey)
      )||wires.some(w=>
        (w.x1===ex&&w.y1===ey)||(w.x2===ex&&w.y2===ey)
      );
      if(snapsToComp||snapped) setMode('select');
      else wireStart={x:ex,y:ey}; // chain — keep drawing from here
    }
    return;
  }
  if(mode.startsWith('place-')){
    placeComp(mode.replace('place-',''),p.x,p.y,rot);
  }
});

document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT') return;
  if((e.key==='z'||e.key==='Z')&&(e.ctrlKey||e.metaKey)&&!e.shiftKey){e.preventDefault();undo();return;}
  if((e.ctrlKey||e.metaKey)&&(e.key==='y'||e.key==='Y'||(e.key==='z'&&e.shiftKey)||(e.key==='Z'&&e.shiftKey))){e.preventDefault();redo();return;}
  if(e.key==='Escape'){
    const gm=document.getElementById('guide-modal');
    if(gm.classList.contains('show')){gm.classList.remove('show');return;}
    wireStart=null;document.getElementById('ghost-g').innerHTML='';setStatus('Cancelled.');
  }
  if(e.key==='r'||e.key==='R'){
    if(mode==='select'&&sel){
      const c=comps.find(x=>x.id===sel);
      if(c){
        pushHistory();
        c.rotation=((c.rotation||0)+1)%4;
        recomputeExtraTerminals(c);
        render();simulate();markDirty();
      }
    } else {
      rot=(rot+1)%4;
    }
  }
  if(e.key==='s'||e.key==='S') setMode('select');
  if(e.key==='w'||e.key==='W') setMode('wire');
  if(e.key==='h'||e.key==='H') setMode('pan');
  if((e.key==='Delete'||e.key==='Backspace')&&sel){
    const c=comps.find(x=>x.id===sel);
    const w=wires.find(x=>x.id===sel);
    if(c) delComp(sel); else if(w) delWire(sel);
  }
});

// ── Smoke particles ───────────────────────────────────────────────────────
const _particles = [];
function _spawnSmoke(cx, cy, n=2){
  for(let i=0;i<n;i++) _particles.push({
    x:cx+(Math.random()-.5)*10, y:cy,
    vx:(Math.random()-.5)*0.5, vy:-(0.4+Math.random()*0.7),
    r:2+Math.random()*4, op:0.45+Math.random()*0.3,
    decay:0.005+Math.random()*0.007,
  });
}
function _tickParticles(){
  const layer=document.getElementById('damage-g');
  layer.innerHTML='';
  for(let i=_particles.length-1;i>=0;i--){
    const p=_particles[i];
    p.x+=p.vx; p.y+=p.vy; p.r*=1.018; p.op-=p.decay;
    if(p.op<=0){_particles.splice(i,1);continue;}
    const c=mk('circle',{cx:p.x,cy:p.y,r:p.r,fill:`rgba(90,70,50,${p.op.toFixed(2)})`,filter:'url(#smoke-blur)'});
    layer.appendChild(c);
  }
  // Spawn new puffs for damaged/blown components
  comps.forEach(c=>{
    if((c.damaged||c.blown)&&Math.random()<0.35){
      const mx=(c.x1+c.x2)/2, my=Math.min(c.y1,c.y2);
      _spawnSmoke(mx,my,1);
    }
  });
}

// ── Bulb animation ────────────────────────────────────────────────────────
let _raf = null;
const _bulbPhase = {}; // compId → phase offset (so bulbs don't pulse in sync)

function startBulbAnim() {
  if (_raf) cancelAnimationFrame(_raf);
  // Assign random phase offsets to bulbs/LEDs that don't have one yet
  comps.forEach(c => { if((c.type==='bulb'||c.type==='LED') && !_bulbPhase[c.id]) _bulbPhase[c.id] = Math.random()*Math.PI*2; });
  _raf = requestAnimationFrame(_bulbTick);
}

function stopBulbAnim() {
  if (_flowVisible) return; // keep loop alive while flow is visible
  if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
}

function toggleFlow() {
  _flowVisible = !_flowVisible;
  const btn = document.getElementById('flow-toggle-btn');
  if(btn) {
    btn.style.borderColor = _flowVisible ? '#4da3ff' : '#28324a';
    btn.style.color = _flowVisible ? '#4da3ff' : '#8e9cb8';
  }
  if(_flowVisible) startBulbAnim(); // ensure tick is running
}

function _bulbTick(ts) {
  const t = ts / 1000;
  const layer = document.getElementById('comps-g');
  comps.forEach(c => {
    const g = layer.querySelector(`g[data-id="${c.id}"]`);
    if (!g) return;

    if(c.type === 'bulb' && c.simPower !== undefined) {
      const brightness = Math.min(1, Math.log10(c.simPower * 1000 + 1) / 3);
      // In DC the brightness is constant; AC pulsing at 2× supply frequency is imperceptible,
      // so only animate in AC mode for aesthetic variety.
      const pulse = _acMode
        ? (Math.sin(t * (0.5 + brightness * 1.3) * Math.PI * 2 + (_bulbPhase[c.id]||0)) * 0.5 + 0.5)
        : 0.8;

      const glow = g.querySelector('.bulb-glow');
      if (glow) {
        const baseR = parseFloat(glow.getAttribute('data-base-r'));
        const baseBr = parseFloat(glow.getAttribute('data-brightness'));
        const r = baseR * (1 + pulse * 0.12);
        const alpha = (0.08 + baseBr * 0.35) * (0.88 + pulse * 0.24);
        const whiteness = Math.round(baseBr * 200);
        const green = Math.round(160 + baseBr * 95);
        const col = baseBr < 0.5
          ? `rgba(255,${green},0,${alpha.toFixed(3)})`
          : `rgba(255,255,${whiteness},${alpha.toFixed(3)})`;
        glow.setAttribute('r', r.toFixed(1));
        glow.setAttribute('fill', col);
      }

      const filOpacity = 0.55 + brightness * 0.45;
      const filPulse   = filOpacity * (0.82 + pulse * 0.18);
      const fr = Math.round(255);
      const fg = Math.round(140 + brightness * 115 + pulse * 20);
      const fb = Math.round(brightness * 180 * pulse);
      const filCol = `rgb(${fr},${fg},${fb})`;
      g.querySelectorAll('.bulb-fil').forEach(el => {
        el.setAttribute('stroke', filCol);
        el.setAttribute('stroke-opacity', filPulse.toFixed(2));
      });
      const ring = g.querySelector('.bulb-ring');
      if (ring) ring.setAttribute('stroke', filCol);
    }

    if(c.type === 'crose' && (c.simPower||0) > 0.1) {
      const brightness=Math.min(1, Math.log10((c.simPower||0)*10+1)/2.5);
      const pulse=_acMode
        ? (Math.sin(t*(0.5+brightness*1.3)*Math.PI*2+(_bulbPhase[c.id]||0))*0.5+0.5)
        : 0.8;
      const r=Math.round(255), gv=Math.round(180+brightness*75+pulse*30), bv=Math.round(brightness*150*pulse);
      const col=`rgb(${r},${gv},${bv})`;
      const innerBulb=g.querySelector('.crose-bulb');
      if(innerBulb){innerBulb.setAttribute('fill',col);innerBulb.setAttribute('opacity',(0.6+pulse*0.4).toFixed(2));}
      const ring=g.querySelector('.crose-ring');
      if(ring) ring.setAttribute('stroke',col);
    }

    if(c.type === 'LED' && c.ledOn) {
      const glow = g.querySelector('.led-glow');
      if(glow) {
        const pulse = _acMode
          ? (Math.sin(t * 2.5 * Math.PI * 2 + (_bulbPhase[c.id]||0)) * 0.5 + 0.5)
          : 0.8;
        const r = 16 + pulse * 5;
        const op = (0.2 + pulse * 0.15).toFixed(2);
        const col = glow.getAttribute('data-col') || '#f87171';
        glow.setAttribute('r', r.toFixed(1));
        glow.setAttribute('opacity', op);
        glow.setAttribute('fill', col);
      }
    }

    if(c.type === 'buzzer' && c.buzzerOn) {
      // Animate buzzer rings — pulse their opacity
      const pulse = Math.sin(t * 8 * Math.PI) * 0.5 + 0.5;
      g.querySelectorAll('.buzzer-ring').forEach((ring, i) => {
        ring.setAttribute('opacity', ((0.5 - i * 0.13) * (0.7 + pulse * 0.3)).toFixed(2));
      });
    }
  });
  // ── Current flow particles ────────────────────────────────────────────────
  const flowLayer = document.getElementById('flow-g');
  if(flowLayer) {
    if(!_flowVisible || !window.flowWireDir) {
      flowLayer.innerHTML = '';
    } else {
      flowLayer.innerHTML = '';
      const dt = Math.min((ts - (_flowLastTs||ts)) / 1000, 0.05);
      _flowLastTs = ts;

      const _fwd = window.flowWireDir || {};
      const _fwI = window.flowWireI  || {};
      wires.forEach(w => {
        const I = _fwI[w.id];
        if(!I || I < 0.01) return;
        const dir = _fwd[w.id] ?? 1;

        const dx = w.x2-w.x1, dy = w.y2-w.y1;
        const len = Math.sqrt(dx*dx+dy*dy)||1;
        const speed = Math.min(2.0, 0.3 + I * 3) * (G/len);
        // AC: electrons oscillate back and forth — use slow visual frequency so it's visible
        const acFactor = _acMode ? Math.sin(2 * Math.PI * 0.5 * ts * 0.001) : 1;

        if(!_flowParticles[w.id]) {
          _flowParticles[w.id] = [0.1,0.35,0.6,0.85].map(t=>({t}));
        }
        _flowParticles[w.id].forEach(p => {
          p.t += dir * acFactor * speed * dt;
          if(_acMode){ p.t = Math.max(0, Math.min(1, p.t)); } // AC: clamp so particles oscillate in place
          else { if(p.t > 1) p.t -= 1; if(p.t < 0) p.t += 1; } // DC: wrap so particles circulate
          const px = w.x1 + p.t * dx;
          const py = w.y1 + p.t * dy;
          const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
          c.setAttribute('cx', px.toFixed(1));
          c.setAttribute('cy', py.toFixed(1));
          c.setAttribute('r', '3');
          c.setAttribute('fill', _acMode ? '#f59e0b' : '#4da3ff');
          c.setAttribute('opacity', '0.75');
          c.setAttribute('pointer-events','none');
          flowLayer.appendChild(c);
        });
      });
    }
  }

  _tickParticles();
  _raf = requestAnimationFrame(_bulbTick);
}

// ── Schema export / import ────────────────────────────────────────────────
function toSchema() {
  return {
    acMode: _acMode,
    acFreq: _acFreq,
    components: comps.map(c => {
      const noVal=new Set(['GND','probe','seg7','buzzer','sw','sw2','AND','OR','NOT','switch_uk','cunit','plug','switch2_uk','switchint_uk','switch2g_uk','switch3g_uk','pullcord']);
      const o = {type:c.type, px:c.px/G, py:c.py/G, rotation:c.rotation};
      if(!noVal.has(c.type)) o.value=c.value;
      if(c.type==='pot') o.pos=c.pos??0.5;
      if(c.maxRating!=null) o.maxRating=c.maxRating;
      if(c.type==='LED') o.ledColor=c.ledColor||'red';
      if(c.type==='sw'||c.type==='switch_uk'||c.type==='pullcord') o.closed=c.closed||false;
      if(c.type==='shower'||c.type==='cooker'||c.type==='kettle'||c.type==='toaster'||c.type==='tv'||c.type==='fridge'||c.type==='fan') o.on=c.on!==false;
      if(c.type==='fcu') o.blown=c.blown||false;
      if((c.type==='socket_uk'||c.type==='switch_uk')&&c.x3!=null){o.x3=c.x3/G;o.y3=c.y3/G;}
      if(c.type==='plug'&&c.x3!=null){o.x3=c.x3/G;o.y3=c.y3/G;o.x4=c.x4/G;o.y4=c.y4/G;}
      if(c.type==='dpswitch'){o.closed=c.closed||false;if(c.x3!=null){o.x3=c.x3/G;o.y3=c.y3/G;o.x4=c.x4/G;o.y4=c.y4/G;}}
      if(c.type==='rcd') o.tripped=c.tripped||false;
      if(c.type==='intswitch') { o.intpos=c.intpos??0; if(c.x3!=null){o.x3=c.x3/G;o.y3=c.y3/G;o.x4=c.x4/G;o.y4=c.y4/G;} }
      if(c.type==='sw2'||c.type==='switch2_uk') { o.sw2pos=c.sw2pos??0; if(c.x3!=null){o.x3=c.x3/G;o.y3=c.y3/G;} }
      if(c.type==='switchint_uk') { o.intpos=c.intpos??0; if(c.x3!=null){o.x3=c.x3/G;o.y3=c.y3/G;o.x4=c.x4/G;o.y4=c.y4/G;} }
      if(c.type==='switch2g_uk'){o.gang1=c.gang1??0;o.gang2=c.gang2??0;if(c.x3!=null){o.x3=c.x3/G;o.y3=c.y3/G;o.x4=c.x4/G;o.y4=c.y4/G;}}
      if(c.type==='switch3g_uk'){o.gang1=c.gang1??0;o.gang2=c.gang2??0;o.gang3=c.gang3??0;if(c.x3!=null){o.x3=c.x3/G;o.y3=c.y3/G;o.x4=c.x4/G;o.y4=c.y4/G;}if(c.x5!=null){o.x5=c.x5/G;o.y5=c.y5/G;o.x6=c.x6/G;o.y6=c.y6/G;}}
      if((c.type==='AND'||c.type==='OR'||c.type==='nmos')&&c.x3!=null) { o.x3=c.x3/G; o.y3=c.y3/G; }
      if(c.type==='3ph'&&c.x3!=null){o.x3=c.x3/G;o.y3=c.y3/G;o.x4=c.x4/G;o.y4=c.y4/G;}
      if(c.type==='xfmr'&&c.x3!=null){o.x3=c.x3/G;o.y3=c.y3/G;o.x4=c.x4/G;o.y4=c.y4/G;}
      if(c.type==='V'||c.type==='I'){ if(c.phaseDeg!=null) o.phaseDeg=c.phaseDeg; o.isAC=c.isAC||false; }
      if(c.type==='cunit'){
        o.slots=c.slots??6;
        o.cuDP=c.cuDP??true;
        o.cuRCD=c.cuRCD??true;
        o.cuRCDma=c.cuRCDma??30;
        o.cuSPD=c.cuSPD??false;
        o.cuMCBs=c.cuMCBs??[];
      }
      return o;
    }),
    wires: wires.map(w => ({x1:w.x1/G,y1:w.y1/G,x2:w.x2/G,y2:w.y2/G})),
  };
}

function fromSchema(schema) {
  comps=[]; wires=[]; jumpPoints=new Set(); uid=1;
  // Restore frequency if saved (AC mode is auto-detected from components)
  if(schema.acFreq) _acFreq=schema.acFreq;
  (schema.components||[]).forEach(c=>{
    const [x1,y1,x2,y2]=terminals(c.type,c.px*G,c.py*G,c.rotation||0);
    const comp={id:'c'+(uid++),type:c.type,px:c.px*G,py:c.py*G,rotation:c.rotation||0,
                x1,y1,x2,y2,value:c.value??DEFS[c.type]?.value??0};
    if(c.pos!=null) comp.pos=c.pos;
    if(c.maxRating!=null) comp.maxRating=c.maxRating;
    if(c.type==='cunit'){
      comp.slots=c.slots??6;
      comp.cuDP=c.cuDP??true;
      comp.cuRCD=c.cuRCD??true;
      comp.cuRCDma=c.cuRCDma??30;
      comp.cuSPD=c.cuSPD??false;
      comp.cuMCBs=c.cuMCBs??[{A:6,label:'Lighting'},{A:6,label:'Lighting'},{A:32,label:'Sockets'},{A:32,label:'Kitchen'},{A:40,label:'Shower'},{A:32,label:'Cooker'}];
    }
    if(c.type==='LED') comp.ledColor=c.ledColor||'red';
    if(c.type==='sw'||c.type==='switch_uk'||c.type==='pullcord') comp.closed=c.closed||false;
    if(c.type==='shower'||c.type==='cooker'||c.type==='kettle'||c.type==='toaster'||c.type==='tv'||c.type==='fridge'||c.type==='fan') comp.on=c.on!==false;
    if(c.type==='fcu') comp.blown=c.blown||false;
    if(c.type==='socket_uk'||c.type==='switch_uk'){
      if(c.x3!=null){comp.x3=c.x3*G;comp.y3=c.y3*G;}
      else{const r2=comp.rotation,x1e=comp.x1,y1e=comp.y1;
        if(r2===0){comp.x3=x1e+1.5*G;comp.y3=y1e-G;}
        else if(r2===1){comp.x3=x1e+G;comp.y3=y1e+1.5*G;}
        else if(r2===2){comp.x3=x1e-1.5*G;comp.y3=y1e+G;}
        else{comp.x3=x1e-G;comp.y3=y1e-1.5*G;}}
    }
    if(c.type==='plug'){
      if(c.x3!=null){comp.x3=c.x3*G;comp.y3=c.y3*G;comp.x4=c.x4*G;comp.y4=c.y4*G;}
      else{
        const r2=c.rotation||0,px2=c.px*G,py2=c.py*G;
        if(r2===0){comp.x3=px2;comp.y3=py2;comp.x4=px2+3*G;comp.y4=py2;}
        else if(r2===1){comp.x3=px2;comp.y3=py2;comp.x4=px2;comp.y4=py2+3*G;}
        else if(r2===2){comp.x3=px2+3*G;comp.y3=py2;comp.x4=px2;comp.y4=py2;}
        else{comp.x3=px2;comp.y3=py2+3*G;comp.x4=px2;comp.y4=py2;}
      }
    }
    if(c.type==='dpswitch'){
      comp.closed=c.closed||false;
      if(c.x3!=null){comp.x3=c.x3*G;comp.y3=c.y3*G;comp.x4=c.x4*G;comp.y4=c.y4*G;}
      else{
        const r=c.rotation||0;
        if(r===0){comp.x3=x1;comp.y3=y1+G;comp.x4=x2;comp.y4=y2+G;}
        else if(r===1){comp.x3=x1-G;comp.y3=y1;comp.x4=x2-G;comp.y4=y2;}
        else if(r===2){comp.x3=x1;comp.y3=y1-G;comp.x4=x2;comp.y4=y2-G;}
        else{comp.x3=x1+G;comp.y3=y1;comp.x4=x2+G;comp.y4=y2;}
      }
    }
    if(c.type==='rcd') comp.tripped=c.tripped||false;
    if(c.type==='intswitch'){
      comp.intpos=c.intpos??0;
      if(c.x3!=null){comp.x3=c.x3*G;comp.y3=c.y3*G;comp.x4=c.x4*G;comp.y4=c.y4*G;}
      else{
        const r=c.rotation||0,px=c.px*G,py=c.py*G;
        if(r===0){comp.x3=px;comp.y3=py+G;comp.x4=px+3*G;comp.y4=py+G;}
        else if(r===1){comp.x3=px-G;comp.y3=py;comp.x4=px-G;comp.y4=py+3*G;}
        else if(r===2){comp.x3=px+3*G;comp.y3=py-G;comp.x4=px;comp.y4=py-G;}
        else{comp.x3=px+G;comp.y3=py+3*G;comp.x4=px+G;comp.y4=py;}
      }
    }
    if(c.type==='sw2'||c.type==='switch2_uk'){
      comp.sw2pos=c.sw2pos??0;
      if(c.x3!=null){ comp.x3=c.x3*G; comp.y3=c.y3*G; }
      else {
        const r2=c.rotation||0,px2=c.px*G,py2=c.py*G;
        if(r2===0){comp.x3=px2+3*G;comp.y3=py2+G;}
        else if(r2===1){comp.x3=px2-G;comp.y3=py2+3*G;}
        else if(r2===2){comp.x3=px2;comp.y3=py2+G;}
        else{comp.x3=px2+G;comp.y3=py2;}
      }
    }
    if(c.type==='switchint_uk'){
      comp.intpos=c.intpos??0;
      if(c.x3!=null){comp.x3=c.x3*G;comp.y3=c.y3*G;comp.x4=c.x4*G;comp.y4=c.y4*G;}
      else{
        const r=c.rotation||0,px=c.px*G,py=c.py*G;
        if(r===0){comp.x3=px;comp.y3=py+G;comp.x4=px+3*G;comp.y4=py+G;}
        else if(r===1){comp.x3=px-G;comp.y3=py;comp.x4=px-G;comp.y4=py+3*G;}
        else if(r===2){comp.x3=px+3*G;comp.y3=py-G;comp.x4=px;comp.y4=py-G;}
        else{comp.x3=px+G;comp.y3=py+3*G;comp.x4=px+G;comp.y4=py;}
      }
    }
    if(c.type==='switch2g_uk'){
      comp.gang1=c.gang1??0; comp.gang2=c.gang2??0;
      if(c.x3!=null){comp.x3=c.x3*G;comp.y3=c.y3*G;comp.x4=c.x4*G;comp.y4=c.y4*G;}
      else{
        const r=c.rotation||0,px=c.px*G,py=c.py*G;
        if(r===0){comp.x3=px;comp.y3=py+G;comp.x4=px+3*G;comp.y4=py+G;}
        else if(r===1){comp.x3=px+G;comp.y3=py;comp.x4=px+G;comp.y4=py+3*G;}
        else if(r===2){comp.x3=px+3*G;comp.y3=py-G;comp.x4=px;comp.y4=py-G;}
        else{comp.x3=px-G;comp.y3=py+3*G;comp.x4=px-G;comp.y4=py;}
      }
    }
    if(c.type==='switch3g_uk'){
      comp.gang1=c.gang1??0; comp.gang2=c.gang2??0; comp.gang3=c.gang3??0;
      if(c.x3!=null){comp.x3=c.x3*G;comp.y3=c.y3*G;comp.x4=c.x4*G;comp.y4=c.y4*G;}
      else{
        const r=c.rotation||0,px=c.px*G,py=c.py*G;
        if(r===0){comp.x3=px;comp.y3=py+G;comp.x4=px+3*G;comp.y4=py+G;}
        else if(r===1){comp.x3=px+G;comp.y3=py;comp.x4=px+G;comp.y4=py+3*G;}
        else if(r===2){comp.x3=px+3*G;comp.y3=py-G;comp.x4=px;comp.y4=py-G;}
        else{comp.x3=px-G;comp.y3=py+3*G;comp.x4=px-G;comp.y4=py;}
      }
      if(c.x5!=null){comp.x5=c.x5*G;comp.y5=c.y5*G;comp.x6=c.x6*G;comp.y6=c.y6*G;}
      else{
        const r=c.rotation||0,px=c.px*G,py=c.py*G;
        if(r===0){comp.x5=px;comp.y5=py+2*G;comp.x6=px+3*G;comp.y6=py+2*G;}
        else if(r===1){comp.x5=px+2*G;comp.y5=py;comp.x6=px+2*G;comp.y6=py+3*G;}
        else if(r===2){comp.x5=px+3*G;comp.y5=py-2*G;comp.x6=px;comp.y6=py-2*G;}
        else{comp.x5=px-2*G;comp.y5=py+3*G;comp.x6=px-2*G;comp.y6=py;}
      }
    }
    if(c.type==='V'||c.type==='I'){ comp.phaseDeg=c.phaseDeg??0; comp.isAC=c.isAC||false; }
    else if(c.phaseDeg!=null) comp.phaseDeg=c.phaseDeg;
    if((c.type==='AND'||c.type==='OR')&&c.x3!=null){ comp.x3=c.x3*G; comp.y3=c.y3*G; }
    else if(c.type==='AND'||c.type==='OR'){
      const r=c.rotation||0, px=c.px*G, py=c.py*G;
      if(r===0){comp.x3=px; comp.y3=py+2*G;}
      else if(r===1){comp.x3=px+2*G; comp.y3=py;}
      else if(r===2){comp.x3=px+3*G; comp.y3=py+2*G;}
      else{comp.x3=px+2*G; comp.y3=py+3*G;}
    }
    if(c.type==='nmos'){
      if(c.x3!=null){ comp.x3=c.x3*G; comp.y3=c.y3*G; }
      else {
        const r=c.rotation||0;
        if(r===0){comp.x3=comp.x1-G;comp.y3=(comp.y1+comp.y2)/2;}
        else if(r===1){comp.x3=(comp.x1+comp.x2)/2;comp.y3=comp.y1-G;}
        else if(r===2){comp.x3=comp.x1+G;comp.y3=(comp.y1+comp.y2)/2;}
        else{comp.x3=(comp.x1+comp.x2)/2;comp.y3=comp.y1+G;}
      }
    }
    if(c.type==='3ph'){
      if(c.x3!=null){comp.x3=c.x3*G;comp.y3=c.y3*G;comp.x4=c.x4*G;comp.y4=c.y4*G;}
      else {
        const r=c.rotation||0,px=c.px*G,py=c.py*G;
        if(r===0){comp.x3=px+4*G;comp.y3=py+G;comp.x4=px+4*G;comp.y4=py-G;}
        else if(r===1){comp.x3=px-G;comp.y3=py+4*G;comp.x4=px+G;comp.y4=py+4*G;}
        else if(r===2){comp.x3=px;comp.y3=py-G;comp.x4=px;comp.y4=py+G;}
        else{comp.x3=px+G;comp.y3=py;comp.x4=px-G;comp.y4=py;}
      }
      comp.phaseV=comp.value;
    }
    if(c.type==='xfmr'){
      if(c.x3!=null){comp.x3=c.x3*G;comp.y3=c.y3*G;comp.x4=c.x4*G;comp.y4=c.y4*G;}
      else {
        const r=c.rotation||0,px=c.px*G,py=c.py*G;
        if(r===0){comp.x3=px;comp.y3=py+2*G;comp.x4=px+4*G;comp.y4=py+2*G;}
        else if(r===1){comp.x3=px+2*G;comp.y3=py;comp.x4=px+2*G;comp.y4=py+4*G;}
        else if(r===2){comp.x3=px+4*G;comp.y3=py+2*G;comp.x4=px;comp.y4=py+2*G;}
        else{comp.x3=px+2*G;comp.y3=py+4*G;comp.x4=px+2*G;comp.y4=py;}
      }
    }
    comps.push(comp);
  });
  (schema.wires||[]).forEach(w=>{
    wires.push({id:'w'+(uid++),x1:w.x1*G,y1:w.y1*G,x2:w.x2*G,y2:w.y2*G});
  });
  sel=null; clearSim(); syncACMode(); render(); showProps(null);
}

function openSchemaModal() {
  document.getElementById('schema-ta').value=JSON.stringify(toSchema(),null,2);
  document.getElementById('schema-msg').textContent='';
  const m=document.getElementById('schema-modal');
  m.style.display='flex';
  document.getElementById('schema-ta').focus();
}
function closeSchemaModal(){document.getElementById('schema-modal').style.display='none';}

function copySchema(){
  navigator.clipboard.writeText(document.getElementById('schema-ta').value)
    .then(()=>{document.getElementById('schema-msg').textContent='Copied!';setTimeout(()=>document.getElementById('schema-msg').textContent='',2000);})
    .catch(()=>{document.getElementById('schema-ta').select();document.execCommand('copy');});
}

function importSchema(){
  const msg=document.getElementById('schema-msg');
  try{
    const s=JSON.parse(document.getElementById('schema-ta').value);
    if(!s.components&&!s.wires) throw new Error('Missing components or wires');
    fromSchema(s);
    msg.textContent='Loaded ✓';
    msg.style.color='#34d399';
    setTimeout(()=>{msg.textContent='';closeSchemaModal();},800);
  } catch(e){
    msg.textContent='Invalid JSON: '+e.message;
    msg.style.color='#ef4444';
  }
}

// Close on backdrop click
document.getElementById('schema-modal').addEventListener('click',e=>{
  if(e.target===document.getElementById('schema-modal')) closeSchemaModal();
});

