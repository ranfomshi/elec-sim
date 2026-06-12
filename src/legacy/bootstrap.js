// Example circuits and application bootstrap.

// ── Example circuit ────────────────────────────────────────────────────────
function loadExample() {
  // Typical UK domestic installation — BS 7671
  //
  //  Consumer unit backbone (x=1-14):
  //    [Supply]─[Meter]─[DP]─[RCD]─┐  live bus at x=11, y=3→33
  //
  //  MCBs on live bus (x=11→14), spread vertically:
  //    B6  y=3  → downstairs lights  (2 switches + 2 roses, y=3-4)
  //    B6  y=8  → upstairs lights    (2 switches + 2 roses, y=8-9)
  //    B32 y=13 → living room ring   (3 sockets + 3 loads,  y=13-19)
  //    B32 y=22 → kitchen sockets    (2 sockets + 2 loads,  y=22-26)
  //    B40 y=29 → shower (hardwired, y=29)
  //    B32 y=33 → cooker (hardwired, y=33)
  //
  //  N columns:
  //    x=21, y=3→38  — lighting rose Ns
  //    x=18, y=13→38 — socket/appliance Ns
  //  Neutral bar at y=38, x=1-21

  const ac = (type, px, py, r, value, extra={}) => {
    const [x1,y1,x2,y2] = terminals(type, px*G, py*G, r);
    const c = {id:'c'+(uid++), type, px:px*G, py:py*G, rotation:r,
               x1, y1, x2, y2, value: value ?? DEFS[type]?.value ?? 0};
    if(type==='socket_uk'||type==='switch_uk'){
      if(r===0){c.x3=x1+1.5*G;c.y3=y1-G;}
      else if(r===1){c.x3=x1+G;c.y3=y1+1.5*G;}
      else if(r===2){c.x3=x1-1.5*G;c.y3=y1+G;}
      else{c.x3=x1-G;c.y3=y1-1.5*G;}
    }
    if(type==='dpswitch'){
      if(r===0){c.x3=x1; c.y3=y1+G; c.x4=x2; c.y4=y2+G;}
      else if(r===1){c.x3=x1-G; c.y3=y1; c.x4=x2-G; c.y4=y2;}
      else if(r===2){c.x3=x1; c.y3=y1-G; c.x4=x2; c.y4=y2-G;}
      else{c.x3=x1+G; c.y3=y1; c.x4=x2+G; c.y4=y2;}
    }
    if(type==='switch2g_uk'){
      const ppx=px*G, ppy=py*G;
      if(r===0){c.x3=ppx;c.y3=ppy+G;c.x4=ppx+3*G;c.y4=ppy+G;}
      else if(r===1){c.x3=ppx+G;c.y3=ppy;c.x4=ppx+G;c.y4=ppy+3*G;}
      else if(r===2){c.x3=ppx+3*G;c.y3=ppy-G;c.x4=ppx;c.y4=ppy-G;}
      else{c.x3=ppx-G;c.y3=ppy+3*G;c.x4=ppx-G;c.y4=ppy;}
      c.gang1=extra.gang1??0; c.gang2=extra.gang2??0;
    }
    Object.assign(c, extra);
    comps.push(c); return c;
  };
  const aw = (x1,y1,x2,y2) => {
    if(x1!==x2||y1!==y2) wires.push({id:'w'+(uid++),x1:x1*G,y1:y1*G,x2:x2*G,y2:y2*G});
  };

  // ── Consumer unit backbone ───────────────────────────────────────────────────
  ac('supply',   1, 3, 1, 230);               // 230V: L=(1,3), N=(1,6)
  ac('meter',    2, 3, 0);                    // meter: in=(2,3), out=(5,3)
  ac('dpswitch', 5, 3, 0, 0, {closed:true});  // DP isolator: L=(5,3)↔(8,3), N=(5,4)↔(8,4)
  ac('rcd',      8, 3, 0);                    // RCD: in=(8,3), out=(11,3)
  aw(1,3, 2,3);

  // N path: supply N (1,6) → dp N-in (5,4) → dp N-out (8,4) → neutral bar (y=38)
  aw(1,6, 5,6);  aw(5,6, 5,4);
  aw(8,4, 8,38);                              // dp N-out → neutral bar
  aw(1,6, 1,38);                              // PME bond

  // Vertical live bus at x=11 (feeds all 6 MCBs)
  aw(11,3, 11,33);

  // ── 6 MCBs (r=0 horizontal, input on live bus x=11, output x=14) ────────────
  ac('mcb', 11,  3, 0,  6);   // B6  downstairs lighting  → (14,3)
  ac('mcb', 11,  8, 0,  6);   // B6  upstairs lighting    → (14,8)
  ac('mcb', 11, 13, 0, 32);   // B32 living room sockets  → (14,13)
  ac('mcb', 11, 22, 0, 32);   // B32 kitchen sockets      → (14,22)
  ac('mcb', 11, 29, 0, 45);   // B45 shower               → (14,29)
  ac('mcb', 11, 33, 0, 40);   // B40 cooker               → (14,33)

  // GND + neutral bar
  ac('GND', 1, 38, 0);
  aw(1,38, 21,38);             // neutral bar x=1→21

  // N return columns:
  aw(21,3,  21,38);            // rose Ns (lighting circuits) → neutral bar
  aw(18,13, 18,38);            // socket/appliance N column  → neutral bar

  // ── Circuit 1: Downstairs lighting — 2 switches + 2 roses ───────────────────
  aw(14,3, 15,3);
  ac('switch_uk', 15, 3, 0, 0, {closed:true}); // switch1 COM=(15,3), L1=(18,3)
  ac('crose',     18, 3, 0, 882);               // 60W rose1  L=(18,3), N=(21,3)
  aw(14,3, 14,4); aw(14,4, 15,4);              // bypass to switch2
  ac('switch_uk', 15, 4, 0, 0, {closed:true}); // switch2 COM=(15,4), L1=(18,4)
  ac('crose',     18, 4, 0, 882);               // 60W rose2  L=(18,4), N=(21,4)

  // ── Circuit 2: Upstairs lighting — 2 switches + 2 roses ─────────────────────
  aw(14,8, 15,8);
  ac('switch_uk', 15, 8, 0, 0, {closed:true}); // switch1 COM=(15,8), L1=(18,8)
  ac('crose',     18, 8, 0, 882);               // 60W rose1  L=(18,8), N=(21,8)
  aw(14,8, 14,9); aw(14,9, 15,9);              // bypass to switch2
  ac('switch_uk', 15, 9, 0, 0, {closed:true}); // switch2 COM=(15,9), L1=(18,9)
  ac('crose',     18, 9, 0, 1323);              // 40W rose2  L=(18,9), N=(21,9)

  // ── Circuit 3: Living room ring — 3 sockets ──────────────────────────────────
  aw(14,13, 15,13);
  ac('socket_uk', 15, 13, 0, 0);               // TV socket
  aw(15,13,15,15); aw(18,13,18,15);            // plug lead L+N (2-unit drop)
  ac('tv',        15, 15, 0, 100);             // 100W TV
  aw(15,15,15,17);
  ac('socket_uk', 15, 17, 0, 0);               // fridge socket
  aw(15,17,15,19); aw(18,17,18,19);            // plug lead L+N
  ac('fridge',    15, 19, 0, 150);             // 150W fridge
  aw(15,19,15,21);
  ac('socket_uk', 15, 21, 0, 0);               // toaster socket (end of ring)

  // ── Circuit 4: Kitchen sockets — 2 outlets ──────────────────────────────────
  aw(14,22, 15,22);
  ac('socket_uk', 15, 22, 0, 0);               // kettle socket
  aw(15,22,15,24); aw(18,22,18,24);            // plug lead L+N
  ac('kettle',    15, 24, 0, 3000);            // 3kW kettle
  aw(15,24,15,26);
  ac('socket_uk', 15, 26, 0, 0);               // toaster socket
  aw(15,26,15,28); aw(18,26,18,28);            // plug lead L+N
  ac('toaster',   15, 28, 0, 1000);            // 1kW toaster

  // ── Circuit 5: Shower (hardwired) ───────────────────────────────────────────
  aw(14,29, 15,29);
  ac('shower',    15, 29, 0, 8000);            // 8kW shower  (34.8A on B45)

  // ── Circuit 6: Cooker (hardwired) ───────────────────────────────────────────
  aw(14,33, 15,33);
  ac('cooker',    15, 33, 0, 6000);            // 6kW cooker   (26.1A on B40)

  // ── Circuit 7: 2-Gang Switch demo — one plate, two lights ───────────────────
  // Placed at y=5–6, between downstairs (y=3–4) and upstairs (y=8–9) lighting.
  // SW terminals land at x=18, y=5–6 — safely above the appliance N column (y=13→38).
  ac('mcb', 11, 5, 0, 6);                       // B6 2-gang lighting → (14,5)
  aw(14,5, 15,5);                               // MCB out → COM1
  aw(14,5, 14,6); aw(14,6, 15,6);              // tap to COM2
  ac('switch2g_uk', 15, 5, 0, 0, {gang1:1, gang2:1}); // COM1=(15,5) SW1=(18,5), COM2=(15,6) SW2=(18,6)
  ac('crose', 18, 5, 0, 882);                   // 60W rose1  L=(18,5), N=(21,5)
  ac('crose', 18, 6, 0, 882);                   // 60W rose2  L=(18,6), N=(21,6)
  // N returns via lighting N column (x=21, y=3→38) — no extra wires needed

}

function loadHouseView() {
  // UK domestic installation on a 2D house floorplan. G=40px, 1 unit ≈ 0.3m.
  // Building is at 2× grid scale to give clean cable routing space.
  //
  // Ground floor (y=2..56):
  //   Living Room: x=2..36, y=2..28    Kitchen: x=36..60, y=2..28
  //   Hall: x=2..16, y=28..56          Under-stairs/CU area: x=16..60, y=28..56
  //
  // First floor (y=60..100):
  //   Master Bedroom: x=2..32, y=60..84   Bedroom 2: x=32..60, y=60..84
  //   Landing: x=2..44, y=84..100         Bathroom: x=44..60, y=84..100
  //
  // Consumer unit sits in under-stairs/CU area (x=6..9, y=34..44).
  // Neutral bar at y=54: x=3..56.
  // UL riser at x=2 (outside neutral bar which starts at x=3).

  _circuits.push({name:'House View', comps:[], wires:[], uid:5000, history:[], sel:null, acMode:true, acFreq:50, background:'floorplan'});
  _currentIdx = _circuits.length - 1;
  comps=[]; wires=[]; jumpPoints=new Set(); uid=5000; sel=null; _history=[];

  const ac = (type, px, py, r, value, extra={}) => {
    const [x1,y1,x2,y2] = terminals(type, px*G, py*G, r);
    const c = {id:'c'+(uid++), type, px:px*G, py:py*G, rotation:r,
               x1, y1, x2, y2, value: value ?? DEFS[type]?.value ?? 0};
    if(type==='socket_uk'||type==='switch_uk'){
      if(r===0){c.x3=x1+1.5*G;c.y3=y1-G;}
      else if(r===1){c.x3=x1+G;c.y3=y1+1.5*G;}
      else if(r===2){c.x3=x1-1.5*G;c.y3=y1+G;}
      else{c.x3=x1-G;c.y3=y1-1.5*G;}
    }
    if(type==='dpswitch'){
      if(r===0){c.x3=x1;c.y3=y1+G;c.x4=x2;c.y4=y2+G;}
      else if(r===2){c.x3=x1;c.y3=y1-G;c.x4=x2;c.y4=y2-G;}
    }
    Object.assign(c, extra);
    comps.push(c); return c;
  };
  const aw = (x1,y1,x2,y2) => {
    if(x1!==x2||y1!==y2) wires.push({id:'w'+(uid++),x1:x1*G,y1:y1*G,x2:x2*G,y2:y2*G});
  };

  // ── External supply (PME) ────────────────────────────────────────────────
  ac('supply', 0, 38, 1, 230);   // L=(0,38), N=(0,41) — outside building
  ac('GND',    0, 41, 0);        // PME earth at supply N

  // PME bond: supply N to neutral bar
  aw(0,41, 0,54); aw(0,54, 3,54);

  // Live feed: supply L to live bus
  aw(0,38, 0,34); aw(0,34, 6,34);
  aw(6,34, 6,48);                // vertical live bus x=6, y=34..48

  // ── MCBs (r=0, input x=6, output x=9, 3 units wide) ─────────────────────
  ac('mcb', 6, 34, 0,  6);   // B6  DL lights  → output (9,34)
  ac('mcb', 6, 36, 0,  6);   // B6  UL lights  → output (9,36)
  ac('mcb', 6, 38, 0, 32);   // B32 Kitchen    → output (9,38)
  ac('mcb', 6, 40, 0, 40);   // B40 Cooker     → output (9,40)
  ac('mcb', 6, 42, 0, 32);   // B32 LR Sockets → output (9,42)
  ac('mcb', 6, 44, 0, 32);   // B32 US Sockets → output (9,44)

  // ── Neutral bar ──────────────────────────────────────────────────────────
  aw(3,54, 57,54);               // horizontal neutral bar y=54, x=3..57 (57 reaches the toaster's neutral riser)

  // ── Circuit 1: Downstairs lighting (B6, MCB output (9,34)) ───────────────
  aw(9,34, 8,34); aw(8,34, 8,6);  // step west from MCB, north to ceiling at y=6
  aw(8,6,  3,6);                   // ceiling west to x=3
  aw(8,6, 40,6);                   // ceiling east to x=40 (junction at (8,6))

  // LR switch drop and ceiling rose
  aw(3,6,  3,18);                  // switch-1 drop at x=3
  ac('switch_uk', 3, 18, 0, 0, {closed:true});  // COM=(3,18) L1=(6,18)
  // (The original path ran east along y=12 — the same row as Circuit 3's live
  // spine aw(7,12,30,12) — for its whole x=7..20 span: a long collinear overlap
  // that shorts the two circuits' lives together at every shared point, and its
  // y=12→16 drop at x=20 also crossed Circuit 3's socket-B neutral wire at
  // (20,14). Circuit 3's spine spans the full x=7..30 width at y=12, and its
  // socket spurs wall off x=10 for y=12..22 and x=24 for y=12..14, so there is
  // no route between this switch and this rose that avoids Circuit 3's
  // conductors entirely — but we can shrink the overlap to a single shared
  // point. Go up to y=11 — above the spine and clear of the spurs (they start
  // at y=12) — run the full east leg there, then drop down to the rose,
  // crossing the spine only once, at (20,12).)
  aw(6,18, 6,11);                  // L1 north, above the spine's row
  aw(6,11, 20,11);                 // L1 east at y=11 (clear of spine + spurs)
  aw(20,11, 20,16);                // L1 south to rose (crosses spine once, at (20,12))
  ac('crose', 20, 16, 0, 882);    // LR ceiling rose: L=(20,16) N=(23,16)
  aw(23,16, 28,16); aw(28,16, 28,54); // rose N east to neutral bus at x=28, south to bar

  // Kitchen light (east branch from junction (8,6) to x=40)
  aw(40,6, 40,18);                 // switch drop in kitchen
  ac('switch_uk', 40, 18, 0, 0, {closed:true}); // COM=(40,18) L1=(43,18)
  // (the L1 run used to jog east at y=12, which crosses the Fridge's neutral
  // riser aw(49,10,49,54) at (49,12) — a live-to-neutral short. The riser only
  // starts at y=10, so jog east at y=9 instead — above the riser, clear.)
  aw(43,18, 43,9);                 // L1 north (past original jog height)
  aw(43,9, 50,9);                  // L1 east at y=9 (clears Fridge N riser, which starts at y=10)
  aw(50,9, 50,16);                 // L1 south to kitchen rose
  ac('crose', 50, 16, 0, 882);    // Kitchen rose: L=(50,16) N=(53,16)
  aw(53,16, 53,54);                // kitchen rose N south to neutral bar

  // ── Circuit 2: Upstairs lighting (B6, MCB output (9,36)) ─────────────────
  // The neutral bar + PME bond occupy every grid point along y=54 from x=0
  // to x=56, so the only places a live conductor can cross down to the first
  // floor without shorting to neutral are west of x=0 or east of x=57. This
  // route threads entirely through empty grid space (no shared coordinates
  // with any other wire/terminal) west and around to x=-1, crosses y=54
  // there, then back east to the ceiling spine start at (2,60).
  aw(9,36, 8,36);
  aw(8,36, 8,41);
  aw(8,41, 10,41);
  aw(10,41, 10,43);
  aw(10,43, 7,43);
  aw(7,43, 7,49);
  aw(7,49, 1,49);
  aw(1,49, 1,40);
  aw(1,40, -1,40);
  aw(-1,40, -1,55);
  aw(-1,55, 2,55);
  aw(2,55, 2,60);
  aw(2,60, 32,60);                 // first floor ceiling west branch
  aw(32,60, 55,60);                // first floor ceiling east branch (stop at x=55 — x=56 is the bedroom-neutral riser column, ends would short live to neutral)

  // Master bedroom switch and rose (west side)
  aw(6,60, 6,76);                  // switch drop on west wall
  ac('switch_uk', 6, 76, 0, 0, {closed:true});  // COM=(6,76) L1=(9,76)
  aw(9,76, 9,70);                  // L1 north to rose
  ac('crose', 9, 70, 0, 882);     // Master bedroom rose: L=(9,70) N=(12,70)
  // N east along y=80 then south via east wall to neutral bar
  aw(12,70, 12,80); aw(12,80, 56,80); aw(56,80, 56,54);

  // Bedroom 2 switch and rose (east branch)
  // (a straight drop at x=48 would cross the bedroom-2 neutral return
  // aw(45,70,56,70) at (48,70) — live-to-neutral short. Detour west to x=44,
  // which is clear of that neutral run, then south and back east at y=77,
  // approaching the switch COM from below so it doesn't also touch the L1
  // terminal at (45,76).)
  aw(48,60, 44,60); aw(44,60, 44,77); aw(44,77, 48,77); aw(48,77, 48,76); // switch drop (rerouted around neutral return)
  ac('switch_uk', 45, 76, 2, 0, {closed:true}); // r=2: COM=(48,76) L1=(45,76)
  // (a straight run north from L1=(45,76) lands on (45,70) — which is this
  // rose's own N terminal, not its L terminal at (42,70): a live-to-neutral
  // short across the rose. Jog over the top, at y=71 — above the rose's row
  // and clear of its N-return wire aw(45,70,56,70) — to approach the L
  // terminal from the west instead.)
  aw(45,76, 45,71); aw(45,71, 42,71); aw(42,71, 42,70); // L1 to rose L terminal (routed clear of the N terminal)
  ac('crose', 42, 70, 0, 882);    // Bedroom 2 rose: L=(42,70) N=(45,70)
  aw(45,70, 56,70); aw(56,70, 56,54); // N east then south via east wall (merges with master N at y=54)

  // ── Circuit 3: LR sockets (B32, MCB output (9,42)) ───────────────────────
  aw(9,42, 7,42); aw(7,42, 7,12);  // step west, north to y=12
  aw(7,12, 30,12);                  // live spine east at y=12

  // Socket spurs south from spine
  aw(10,12, 10,14);                 // spur to socket B
  ac('socket_uk', 10, 14, 0, 0);  // Socket B: L=(10,14) N=(13,14)
  aw(10,14, 10,22);                 // spur continues south to socket A
  ac('socket_uk', 10, 22, 0, 0);  // Socket A: L=(10,22) N=(13,22)
  aw(24,12, 24,14);                 // spur to socket C
  ac('socket_uk', 24, 14, 0, 0);  // Socket C: L=(24,14) N=(27,14)

  // Socket neutrals routed east to neutral bus column at x=28, then south to bar
  // (socket B's neutral originally ran straight along y=14 to the bus, but that
  // path passes directly through socket C's L terminal at (24,14) — a live-to-
  // neutral short. A y=15 jog still crosses Circuit 1's rose drop wire
  // aw(20,11,20,16) at (20,15) — also a live-to-neutral short. The rose drop
  // ends at y=16 and the bus column only starts at x=28, so y=17 is clear
  // all the way across — jog down there instead.)
  aw(13,14, 13,17); aw(13,17, 28,17); aw(28,14, 28,54); // socket B N to bus (jog to y=17, clears both the rose drop and socket C's L terminal)
  aw(27,14, 28,14);                    // socket C N joins bus at (28,14)
  aw(13,22, 28,22); aw(28,22, 28,54); // socket A N to bus (28,54 already connected)

  // TV (plug-in on socket A)
  ac('tv', 10, 26, 0, 100);
  aw(10,22, 10,26); aw(13,22, 13,26);

  // ── Circuit 4: Kitchen sockets (B32, MCB output (9,38)) ──────────────────
  // (No routing from this MCB to the kitchen can avoid every other circuit's
  // conductors entirely — proven by exhaustive search. The x=28 neutral-bus
  // column runs continuously from y=14 to y=54 with no gap, and EVERY
  // socket/rose neutral in the living room runs east along y=15/16/22 to
  // join it — so any route through that zone crosses a NEUTRAL conductor,
  // which bridges live straight to the supply-neutral plane and creates a
  // true 230V dead short across the whole house (catastrophic — collapses
  // every circuit into one node). The only corridor with NO neutral wires is
  // the strip x<13 (west of where the LR socket spurs/neutrals start), which
  // costs only two LIVE-to-live crossings: Circuit 3's spine (at y=12) and
  // Circuit 1's lighting corridor (at y=11). A live-live crossing merges two
  // circuits' live networks but does not create a short to neutral — far
  // less damaging than touching the neutral plane.)
  aw(9,38, 11,38);                 // step east from MCB output, clear of the input busbar (x=6..8)
  aw(11,38, 11,9);                 // north up the clear x=11 corridor (crosses Circuit 3 spine at (11,12), Circuit 1 corridor at (11,11) — both live-live)
  aw(11,9, 38,9);                  // east at y=9 to the kitchen (clear corridor, above all neutral runs)
  aw(38,9, 38,8);                  // down to the kitchen socket spine junction
  // (the spine used to run straight along y=10 at socket-terminal height, which
  // means it also passed directly through Kettle's N=(41,10) and Fridge's
  // N=(49,10) — shorting each socket's L to its own N, and the live spine to
  // the neutral risers below. Route the spine one row up at y=8 — clear of all
  // terminals and risers (which start at y=10) — with short drops down to each
  // socket's L terminal.)
  aw(38,10, 38,8); aw(38,8, 54,8); aw(54,8, 54,10); aw(46,8, 46,10); // kitchen socket spine at y=8, drops to L terminals

  ac('socket_uk', 38, 10, 0, 0);   // Kettle socket: L=(38,10) N=(41,10)
  ac('kettle',    38, 14, 0, 3000);
  aw(38,10, 38,14); aw(41,10, 41,14); // kettle plug lead
  aw(41,10, 41,54);                    // kettle socket N south to neutral bar

  ac('socket_uk', 46, 10, 0, 0);   // Fridge socket: L=(46,10) N=(49,10)
  ac('fridge',    46, 14, 0, 150);
  aw(46,10, 46,14); aw(49,10, 49,14); // fridge plug lead
  aw(49,10, 49,54);                    // fridge socket N south to neutral bar

  ac('socket_uk', 54, 10, 0, 0);   // Toaster socket: L=(54,10) N=(57,10)
  ac('toaster',   54, 14, 0, 1000);
  aw(54,10, 54,14); aw(57,10, 57,14); // toaster plug lead
  aw(57,10, 57,54);                    // toaster socket N south to neutral bar

  // ── Circuit 5: Cooker (B40, MCB output (9,40)) ───────────────────────────
  // (Same structural problem as Circuit 4 — no neutral-free path exists once
  // the route enters the x=13..28 zone. Use the same safe western corridor
  // — a separate column (x=12, to avoid running collinear with Circuit 4's
  // x=11 feed and shorting the two circuits directly together) — up past
  // Circuit 3's spine and Circuit 1's lighting corridor, then over the top
  // of the house at y=5 (clear of every neutral run) and down to the cooker
  // from above, clear of the kitchen socket spine.)
  aw(9,40, 12,40);                 // step east from MCB output, clear of the input busbar
  aw(12,40, 12,5);                 // north up the x=12 corridor (crosses Circuit 3 spine, Circuit 1 corridor, and Circuit 1's ceiling spine — all live-live, all Circuit 1/3 again)
  aw(12,5, 42,5);                  // east along y=5, above the whole house (clear corridor)
  aw(42,5, 42,20);                 // south to the cooker L terminal
  ac('cooker', 42, 20, 0, 6000);     // L=(42,20) N=(45,20)
  aw(45,20, 45,54);                   // cooker N south to neutral bar

  // ── Circuit 6: Upstairs sockets (B32, MCB output (9,44)) ─────────────────
  // The under-stairs corridor x=10..27, y=44..59 carries no other circuit's
  // conductors, so the live feed runs straight up to a first-floor socket
  // spine at y=62 (just below Circuit 2's lighting ceiling spine at y=60),
  // crossing only the neutral bar (y=54) and that ceiling spine — both
  // single-point hops, marked below.
  aw(9,44, 20,44);                  // step east from MCB output, clear corridor
  aw(20,44, 20,62);                 // north to first-floor socket spine (hops at (20,54) neutral bar and (20,60) ceiling spine)
  aw(10,62, 50,62);                 // first-floor socket spine at y=62 (hop at (44,62): Circuit 2 bedroom-2 switch drop)

  // Master bedroom sockets
  ac('socket_uk', 10, 66, 0, 0);   // Socket M1: L=(10,66) N=(13,66)
  ac('socket_uk', 24, 66, 0, 0);   // Socket M2: L=(24,66) N=(27,66)
  aw(10,62, 10,66);                 // M1 drop (spine's west end)
  aw(24,62, 24,66);                 // M2 drop
  ac('tv', 10, 70, 0, 100);          // bedroom TV plugged into M1
  aw(10,66, 10,70); aw(13,66, 13,70); // TV plug lead

  // Bedroom 2 sockets
  ac('socket_uk', 36, 66, 0, 0);   // Socket B1: L=(36,66) N=(39,66)
  ac('socket_uk', 50, 66, 0, 0);   // Socket B2: L=(50,66) N=(53,66)
  aw(36,62, 36,66);                 // B1 drop
  aw(50,62, 50,66);                 // B2 drop (spine's east end)
  ac('tv', 36, 70, 0, 100);          // bedroom TV plugged into B1
  aw(36,66, 36,70); aw(39,66, 39,70); // TV plug lead

  // Socket neutrals: straight risers up to the neutral bar at y=54, each
  // crossing Circuit 2's ceiling spine once at y=60 (hops)
  aw(13,66, 13,54);   // M1 N to bar
  aw(27,66, 27,54);   // M2 N to bar
  aw(39,66, 39,54);   // B1 N to bar
  aw(53,66, 53,54);   // B2 N to bar (joins kitchen socket neutral riser at (53,54))

  // ── Wire crossings: mark as "hops" (no electrical connection) ───────────
  // The routes above can't avoid crossing each other (proven by exhaustive
  // search — see comments on Circuits 4/5), but buildNodeMap() treats every
  // point a wire passes through as a connection unless it's in `jumpPoints`.
  // Left unmarked, these crossings short circuits 1/3/4/5's lives together
  // (and bypass two switches), which is what was tripping the B6 DL-lights
  // MCB by default. In real life these are just cables crossing in the wall
  // cavity with no junction box, so mark each crossing a hop:
  [
    [8,11],   // Circuit 1 live riser × Circuit 1 LR-switch L1 run (bypassed the LR switch)
    [8,12],   // Circuit 1 live riser × Circuit 3 socket spine (B6 ↔ B32 sockets short)
    [12,6],   // Circuit 5 cooker feed × Circuit 1 ceiling spine (B40 ↔ B6 short)
    [11,11],  // Circuit 4 kitchen feed × Circuit 1 LR-switch L1 run (B32 kitchen ↔ B6 short)
    [12,11],  // Circuit 5 cooker feed × Circuit 1 LR-switch L1 run (B40 ↔ B6 short)
    [20,12],  // Circuit 1 LR rose drop × Circuit 3 socket spine (B6 ↔ B32 sockets short)
    [40,8],   // Circuit 1 kitchen-light feed × Circuit 4 socket spine (B6 ↔ B32 kitchen short)
    [46,9],   // Circuit 4 fridge L drop × Circuit 1 kitchen-light L1 run (B32 kitchen ↔ B6 short)
    [44,71],  // Circuit 2 bedroom-2 switch drop × its own L1-to-rose run (bypassed the bedroom-2 switch)
    [11,12],  // Circuit 4 kitchen feed × Circuit 3 socket spine (B32 kitchen ↔ B32 sockets short)
    [12,12],  // Circuit 5 cooker feed × Circuit 3 socket spine (B40 ↔ B32 sockets short)
    [12,9],   // Circuit 5 cooker feed × Circuit 4 kitchen corridor (B40 ↔ B32 kitchen short)
    [42,8],   // Circuit 5 cooker drop × Circuit 4 socket spine (B40 ↔ B32 kitchen short)
    [20,54],  // Circuit 6 live riser × neutral bar
    [20,60],  // Circuit 6 live riser × Circuit 2 ceiling spine (B32 US ↔ B6 UL short)
    [44,62],  // Circuit 6 socket spine × Circuit 2 bedroom-2 switch drop (B32 US ↔ B6 UL short)
    [13,60],  // Socket M1 neutral riser × Circuit 2 ceiling spine
    [13,62],  // Socket M1 neutral riser × Circuit 6's own live socket spine (would short B32 US live to neutral)
    [27,60],  // Socket M2 neutral riser × Circuit 2 ceiling spine
    [27,62],  // Socket M2 neutral riser × Circuit 6's own live socket spine
    [39,60],  // Socket B1 neutral riser × Circuit 2 ceiling spine
    [39,62],  // Socket B1 neutral riser × Circuit 6's own live socket spine
    [53,60],  // Socket B2 neutral riser × Circuit 2 ceiling spine
    [53,62],  // Socket B2 neutral riser × Circuit 6's own live socket spine
  ].forEach(([gx,gy]) => jumpPoints.add(nk(gx*G, gy*G)));

  saveCurrentCircuit();
}

// Init
_circuits = [{name:'Circuit 1', comps:[], wires:[], uid:1, history:[], sel:null, acMode:false, acFreq:50}];
_currentIdx = 0;
loadExample();
saveCurrentCircuit();

// Welcome modal — show on first visit
(function() {
  if (!localStorage.getItem('eleclab_visited')) {
    const modal = document.getElementById('welcome-modal');
    modal.style.display = 'flex';
    document.getElementById('welcome-start-btn').addEventListener('click', function() {
      localStorage.setItem('eleclab_visited', '1');
      modal.style.display = 'none';
      toggleCourse();
    });
    document.getElementById('welcome-free-btn').addEventListener('click', function() {
      localStorage.setItem('eleclab_visited', '1');
      modal.style.display = 'none';
    });
  }
})();

// ── Circuit 2: Logic Gates + MOSFET demo ──────────────────────────────────
(function(){
  _circuits.push({name:'Logic Gates', comps:[], wires:[], uid:1, history:[], sel:null, acFreq:50});
  _currentIdx = 1;
  comps=[]; wires=[]; jumpPoints=new Set(); uid=1; sel=null; _history=[];
  // Helpers (grid-unit coordinates)
  const lc = (type, gx, gy, r, value, extra={}) => {
    const [x1,y1,x2,y2] = terminals(type, gx*G, gy*G, r);
    const c = {id:'c'+(uid++), type, px:gx*G, py:gy*G, rotation:r,
               x1, y1, x2, y2, value: value ?? DEFS[type]?.value ?? 0};
    if(type==='AND'||type==='OR'){
      const px2=gx*G, py2=gy*G;
      if(r===0){c.x3=px2;c.y3=py2+2*G;}
      else if(r===1){c.x3=px2+2*G;c.y3=py2;}
      else if(r===2){c.x3=px2+3*G;c.y3=py2+2*G;}
      else{c.x3=px2+2*G;c.y3=py2+3*G;}
    }
    if(type==='nmos'){
      if(r===0){c.x3=c.x1-G;c.y3=(c.y1+c.y2)/2;}
      else if(r===1){c.x3=(c.x1+c.x2)/2;c.y3=c.y1-G;}
      else if(r===2){c.x3=c.x1+G;c.y3=(c.y1+c.y2)/2;}
      else{c.x3=(c.x1+c.x2)/2;c.y3=c.y1+G;}
    }
    if(type==='sw') c.closed = extra.closed ?? false;
    Object.assign(c, extra);
    comps.push(c); return c;
  };
  const lw = (x1,y1,x2,y2) => {
    if(x1!==x2||y1!==y2) wires.push({id:'w'+(uid++),x1:x1*G,y1:y1*G,x2:x2*G,y2:y2*G});
  };


  // ── Logic Gates + N-MOSFET demo ─────────────────────────────────────────
  //
  //  Layout (grid units, G=40px):
  //    y=-1: +5V bulb supply rail
  //    y=1:  gate-route corridor (AND out → MOSFET gate)
  //    y=2:  Switch A / AND inputA row
  //    y=3:  AND output
  //    y=4:  AND inputB / Signal B tap
  //    y=8:  OR inputA
  //    y=9:  OR output
  //    y=10: OR inputB
  //    y=11: Switch B row
  //    y=14: NOT gate (in=10,14  out=13,14)
  //
  //  x=1:  +5V supply
  //  x=3:  Switch COMs
  //  x=6:  Switch outputs = Signal A/B
  //  x=8:  Signal A column
  //  x=9:  Signal B column
  //  x=10: Gate inputs (r=0: inA/inB on left)
  //  x=13: Gate outputs (r=0 AND/OR: out right-centre)
  //  x=15: LED series R
  //  x=18: LED
  //  x=21: LED → GND
  //  x=23: MOSFET gate column
  //  x=24: MOSFET Drain/Source + Bulb

  // Power
  lc('V', 1, 2, 0, 5);
  lc('GND', 4, 2, 0);
  lw(1, 2, 3, 2);                 // +5V → SW_A COM
  lw(1, 2, 1, 11);                // +5V bus down
  lw(1, 11, 3, 11);               // +5V → SW_B COM
  lw(1, 2, 1, -1);                // +5V up to bulb rail
  lw(1, -1, 24, -1);              // +5V bulb rail

  // Switches (A=closed/HIGH, B=open/LOW)
  lc('sw', 3,  2, 0, 0, {closed:true});
  lc('sw', 3, 11, 0, 0, {closed:false});

  // Pull-down resistors
  lc('R', 6, 2, 1, 10000);
  lc('GND', 6, 5, 0);
  lc('R', 6, 11, 1, 10000);
  lc('GND', 6, 14, 0);

  // Signal A bus: (6,2) → AND inA (10,2), OR inA (10,8), NOT in (10,14)
  lw(6, 2, 10, 2);
  lw(8, 2, 8, 8);
  lw(8, 8, 10, 8);
  lw(8, 8, 8, 14);
  lw(8, 14, 10, 14);

  // Signal B bus: (6,11) → AND inB (10,4), OR inB (10,10)
  lw(6, 11, 9, 11);
  lw(9, 11, 9, 4);                // SigB up (passes y=10)
  lw(9, 4, 10, 4);                // → AND inputB (10,4)
  lw(9, 10, 10, 10);              // → OR inputB (10,10)

  // Logic gates — r=0: both inputs left, output right-centre
  lc('AND', 10,  2, 0);           // inA=(10,2) inB=(10,4) out=(13,3)
  lc('OR',  10,  8, 0);           // inA=(10,8) inB=(10,10) out=(13,9)
  lc('NOT', 10, 14, 2);           // in=(10,14) out=(13,14)

  // LED indicators
  lw(13,  3, 15,  3);
  lc('R',   15,  3, 0, 470);
  lc('LED', 18,  3, 0, 2.0, {ledColor:'green'});
  lc('GND', 21,  3, 0);

  lw(13,  9, 15,  9);
  lc('R',   15,  9, 0, 470);
  lc('LED', 18,  9, 0, 2.0, {ledColor:'amber'});
  lc('GND', 21,  9, 0);

  lw(13, 14, 15, 14);
  lc('R',   15, 14, 0, 470);
  lc('LED', 18, 14, 0, 2.0, {ledColor:'red'});
  lc('GND', 21, 14, 0);

  // AND output (13,3) → MOSFET gate via corridor y=1
  lw(13,  3, 13,  1);
  lw(13,  1, 23,  1);
  lw(23,  1, 23,  3);

  // N-MOSFET r=0: Drain=(24,2), Source=(24,4), Gate=(23,3)
  lc('nmos', 23, 2, 0, 2.0);
  lc('bulb', 24, -1, 1, 100);
  lc('GND',  24,  4, 0);


  saveCurrentCircuit();
})();

// House View tab — 2× grid scale, clean routing
loadHouseView();
// Auto-fit house view on load — will be overridden by loadCircuit(0) below

// ── Electronics Lab tab: bridge rectifier, relay, MOSFET dimmer, zener reg ──
(function(){
  _circuits.push({name:'Electronics Lab', comps:[], wires:[], uid:1, history:[], sel:null, acFreq:50});
  _currentIdx = _circuits.length - 1;
  comps=[]; wires=[]; jumpPoints=new Set(); uid=1; sel=null; _history=[];
  const lc = (type, gx, gy, r, value, extra={}) => {
    const [x1,y1,x2,y2] = terminals(type, gx*G, gy*G, r);
    const c = {id:'c'+(uid++), type, px:gx*G, py:gy*G, rotation:r,
               x1, y1, x2, y2, value: value ?? DEFS[type]?.value ?? 0};
    if(type==='nmos'){
      if(r===0){c.x3=c.x1-G;c.y3=(c.y1+c.y2)/2;}
      else if(r===1){c.x3=(c.x1+c.x2)/2;c.y3=c.y1-G;}
      else if(r===2){c.x3=c.x1+G;c.y3=(c.y1+c.y2)/2;}
      else{c.x3=(c.x1+c.x2)/2;c.y3=c.y1+G;}
    }
    if(type==='relay'){
      c.relayOn=false;
      if(r===0){c.x3=c.x1;c.y3=c.y1+G;c.x4=c.x2;c.y4=c.y2+G;}
      else if(r===1){c.x3=c.x1-G;c.y3=c.y1;c.x4=c.x2-G;c.y4=c.y2;}
      else if(r===2){c.x3=c.x1;c.y3=c.y1-G;c.x4=c.x2;c.y4=c.y2-G;}
      else{c.x3=c.x1+G;c.y3=c.y1;c.x4=c.x2+G;c.y4=c.y2;}
    }
    if(type==='sw') c.closed = extra.closed ?? false;
    Object.assign(c, extra);
    comps.push(c); return c;
  };
  const lw = (x1,y1,x2,y2) => {
    if(x1!==x2||y1!==y2) wires.push({id:'w'+(uid++),x1:x1*G,y1:y1*G,x2:x2*G,y2:y2*G});
  };

  // ── Demo 1: Bridge rectifier (top-left) ──────────────────────────────────
  // Four diodes around a central source. Flip the source value to −12 and the
  // LED stays lit — the bridge always delivers the same output polarity.
  lc('V',     6, 2, 1, 12);              // source between AC1 (6,2) and AC2 (6,5)
  lc('diode', 3, 2, 0, 0.7);             // − rail → AC1
  lc('diode', 6, 2, 0, 0.7);             // AC1 → + rail
  lc('diode', 3, 5, 0, 0.7);             // − rail → AC2
  lc('diode', 6, 5, 0, 0.7);             // AC2 → + rail
  lw(9,2, 9,5);                          // + rail
  lw(3,2, 3,5);                          // − rail
  lw(9,5, 9,7);                          // + rail down to the load
  lc('LED', 9, 7, 0, 2.0, {ledColor:'red'});
  lc('R',  12, 7, 0, 470);
  lw(15,7, 15,9);
  lw(3,9, 15,9);                         // return to − rail
  lw(3,5, 3,9);
  lc('GND', 3, 9, 0);

  // ── Demo 2: Relay — 5V signal switching a 120V lamp (top-right) ──────────
  lc('V',  20, 2, 1, 5);                 // control supply
  lw(20,2, 22,2);
  lc('sw', 22, 2, 0, 0, {closed:false}); // close me → coil energises
  lw(25,2, 27,2);
  lc('relay', 27, 2, 0, 5);              // coil (27,2)-(30,2), contact (27,3)-(30,3)
  lw(30,2, 31,2);
  lw(31,2, 31,5);                        // coil return (hops the contact feed)
  lw(20,5, 31,5);
  lc('GND', 20, 5, 0);
  lw(30,3, 33,3);                        // contact → 120V source
  lc('V',  33, 3, 1, 120);               // the big circuit the tiny coil controls
  lw(27,3, 26,3);
  lw(26,3, 26,6);                        // lamp drop (hops the coil return)
  lc('bulb', 26, 6, 0, 240);
  lw(29,6, 33,6);
  lc('GND', 33, 6, 0);

  // ── Demo 3: Potentiometer driving a MOSFET gate (bottom-left) ────────────
  // Pot + 1k form a divider on the gate. Slide the pot below ~2.2k and the
  // MOSFET switches the bulb on.
  lc('V', 2, 13, 1, 9);
  lw(2,13, 4,13);
  lc('pot', 4, 13, 0, 10000, {pos:0.5});
  lw(7,13, 11,13);                       // gate node rail
  lc('R', 9, 13, 1, 1000);               // divider lower leg
  lc('GND', 9, 16, 0);
  lw(11,13, 11,15);
  lw(11,15, 12,15);                      // → gate
  lc('nmos', 12, 14, 0, 2.0);            // D=(13,14) S=(13,16) gate=(12,15)
  lw(2,13, 2,12);
  lw(2,12, 10,12);                       // +9V to the bulb
  lc('bulb', 10, 12, 0, 100);
  lw(13,12, 13,14);                      // bulb → drain
  lc('GND', 13, 16, 0);
  lc('GND', 2, 16, 0);

  // ── Demo 4: Zener regulator feeding an LED (bottom-right) ────────────────
  // 12V in, rock-steady 5.1V at the zener node no matter the load.
  lc('V', 20, 14, 1, 12);
  lw(20,14, 22,14);
  lc('R', 22, 14, 0, 330);               // series dropper
  lc('zener', 25, 14, 2, 5.1);           // r=2 → cathode on the regulated node (25,14)
  lw(28,14, 28,17);                      // zener anode to the 0V rail
  lw(25,14, 25,12);
  lc('LED', 25, 12, 0, 2.0, {ledColor:'green'});
  lc('R', 28, 12, 0, 330);
  lw(31,12, 31,17);
  lw(20,17, 31,17);                      // 0V rail
  lc('GND', 20, 17, 0);

  // Crossings that are hops, not joins (relay demo wiring)
  [[31,3],[26,5]].forEach(([gx,gy]) => jumpPoints.add(nk(gx*G, gy*G)));

  saveCurrentCircuit();
})();

// ── AC Power Lab tab: transformer, RC/RL filters, series resonance ─────────
(function(){
  _circuits.push({name:'AC Power Lab', comps:[], wires:[], uid:1, history:[], sel:null, acFreq:50});
  _currentIdx = _circuits.length - 1;
  comps=[]; wires=[]; jumpPoints=new Set(); uid=1; sel=null; _history=[];
  const lc = (type, gx, gy, r, value, extra={}) => {
    const [x1,y1,x2,y2] = terminals(type, gx*G, gy*G, r);
    const c = {id:'c'+(uid++), type, px:gx*G, py:gy*G, rotation:r,
               x1, y1, x2, y2, value: value ?? DEFS[type]?.value ?? 0};
    if(type==='xfmr'){
      const px2=gx*G, py2=gy*G;
      if(r===0){c.x3=px2;c.y3=py2+2*G;c.x4=px2+4*G;c.y4=py2+2*G;}
      else if(r===1){c.x3=px2+2*G;c.y3=py2;c.x4=px2+2*G;c.y4=py2+4*G;}
      else if(r===2){c.x3=px2+4*G;c.y3=py2+2*G;c.x4=px2;c.y4=py2+2*G;}
      else{c.x3=px2+2*G;c.y3=py2+4*G;c.x4=px2+2*G;c.y4=py2;}
    }
    Object.assign(c, extra);
    comps.push(c); return c;
  };
  const lw = (x1,y1,x2,y2) => {
    if(x1!==x2||y1!==y2) wires.push({id:'w'+(uid++),x1:x1*G,y1:y1*G,x2:x2*G,y2:y2*G});
  };

  // ── Demo 1: Transformer stepping 230V down to 11.5V (n = 0.05) ───────────
  lc('V', 2, 2, 1, 230, {isAC:true});
  lw(2,2, 4,2);
  lc('xfmr', 4, 2, 0, 0.05);             // primary (4,2)/(4,4), secondary (8,2)/(8,4)
  lw(4,4, 2,4);
  lw(2,4, 2,5);
  lc('GND', 2, 5, 0);
  lw(8,2, 10,2);
  lc('R', 10, 2, 1, 100);                // secondary load — reads ~11.5V
  lw(8,4, 8,5);
  lw(8,5, 10,5);
  lc('GND', 8, 5, 0);

  // ── Demo 2: RC low-pass — the capacitor shorts out high frequencies ──────
  // ~9.5V out at 50Hz; raise the frequency (header) and watch it collapse.
  lc('V', 14, 2, 1, 10, {isAC:true});
  lw(14,2, 16,2);
  lc('R', 16, 2, 0, 1000);
  lc('C', 19, 2, 1, 1e-6);               // output node (19,2)
  lw(14,5, 19,5);
  lc('GND', 14, 5, 0);

  // ── Demo 3: RL high-pass — the inductor blocks high frequencies ──────────
  // ~3V out at 50Hz; raise the frequency and it climbs toward 10V.
  lc('V', 24, 2, 1, 10, {isAC:true});
  lw(24,2, 26,2);
  lc('R', 26, 2, 0, 1000);
  lc('L', 29, 2, 1, 1);                  // output node (29,2)
  lw(24,5, 29,5);
  lc('GND', 24, 5, 0);

  // ── Demo 4: A capacitor passes AC — this bulb would be dark on DC ────────
  lc('V', 2, 9, 1, 120, {isAC:true});
  lw(2,9, 4,9);
  lc('C', 4, 9, 0, 10e-6);
  lc('bulb', 7, 9, 0, 100);
  lw(10,9, 10,12);
  lw(2,12, 10,12);
  lc('GND', 2, 12, 0);

  // ── Demo 5: Series RLC tuned to resonate at exactly 50Hz ─────────────────
  // XL and XC cancel at 50Hz → maximum current. Change the frequency either
  // way and the current drops off.
  lc('V', 14, 9, 1, 10, {isAC:true});
  lw(14,9, 16,9);
  lc('R', 16, 9, 0, 10);
  lc('L', 19, 9, 0, 0.1);
  lc('C', 22, 9, 1, 100e-6);
  lw(14,12, 22,12);
  lc('GND', 14, 12, 0);

  saveCurrentCircuit();
})();

// ── Solar Lab tab: PV panels, battery storage, inverter, off-grid AC ────────
(function(){
  _circuits.push({name:'Solar Lab', comps:[], wires:[], uid:1, history:[], sel:null, acFreq:50});
  _currentIdx = _circuits.length - 1;
  comps=[]; wires=[]; jumpPoints=new Set(); uid=1; sel=null; _history=[];
  const lc = (type, gx, gy, r, value, extra={}) => {
    const [x1,y1,x2,y2] = terminals(type, gx*G, gy*G, r);
    const c = {id:'c'+(uid++), type, px:gx*G, py:gy*G, rotation:r,
               x1, y1, x2, y2, value: value ?? DEFS[type]?.value ?? 0};
    if(type==='inverter'){
      c.invOn=false;
      if(r===0){c.x3=c.x1;c.y3=c.y1+G;c.x4=c.x2;c.y4=c.y2+G;}
      else if(r===1){c.x3=c.x1-G;c.y3=c.y1;c.x4=c.x2-G;c.y4=c.y2;}
      else if(r===2){c.x3=c.x1;c.y3=c.y1-G;c.x4=c.x2;c.y4=c.y2-G;}
      else{c.x3=c.x1+G;c.y3=c.y1;c.x4=c.x2+G;c.y4=c.y2;}
    }
    if(type==='solar') c.sun=1;
    if(type==='sw') c.closed = extra.closed ?? false;
    Object.assign(c, extra);
    comps.push(c); return c;
  };
  const lw = (x1,y1,x2,y2) => {
    if(x1!==x2||y1!==y2) wires.push({id:'w'+(uid++),x1:x1*G,y1:y1*G,x2:x2*G,y2:y2*G});
  };

  // ── Demo 1: Off-grid solar system (top) ──────────────────────────────────
  // Panel charges the battery through a blocking diode (stops the battery
  // back-feeding the panel at night — drag the sun slider to 0 to see why it's
  // there). The inverter steps the ~12V DC bus up to 230V AC for the lamp.
  // Open the switch and the panel's spare power charges the battery instead.
  lc('solar', 2, 2, 2, 18);              // r=2 → + terminal at (5,2), facing the bus
  lc('diode', 5, 2, 0, 0.7);             // blocking diode: panel → bus only
  lw(8,2, 9,2);
  lw(9,2, 9,5);                          // + bus
  lc('battery', 4, 5, 2, 12);            // r=2 → + at (7,5)
  lw(7,5, 9,5);
  lc('sw', 9, 3, 0, 0, {closed:true});   // inverter feed switch
  lw(12,3, 14,3);
  lc('inverter', 14, 3, 0, 230);         // DC+ (14,3), DC− (14,4) → L (17,3), N (17,4)
  lw(17,3, 19,3);
  lc('bulb', 19, 3, 0, 240);             // 230V mains lamp (~220W)
  lw(22,3, 22,6);
  lw(17,6, 22,6);
  lw(17,4, 17,6);                        // N return
  lw(2,2, 1,2);
  lw(1,2, 1,8);                          // − bus
  lw(1,5, 4,5);
  lw(14,4, 13,4);
  lw(13,4, 13,8);
  lw(1,8, 13,8);
  lc('GND', 1, 8, 0);

  // ── Demo 2: Sunlight slider (bottom-left) ────────────────────────────────
  // Panel directly driving a 24Ω bulb. Select the panel and drag the ☀ slider
  // — the bulb dims as the clouds roll in.
  lc('solar', 3, 11, 0, 18);             // + at (3,11)
  lw(6,11, 8,11);
  lw(8,11, 8,14);
  lw(6,14, 8,14);
  lc('bulb', 3, 14, 0, 24);
  lw(1,14, 3,14);
  lw(1,11, 1,14);
  lw(1,11, 3,11);
  lc('GND', 8, 14, 0);                   // earth the − rail so readings are +ve

  // ── Demo 3: Panels in series (bottom-right) ──────────────────────────────
  // Two 18V panels in series make a 36V string — same trick real rooftop
  // arrays use to keep current (and cable size) down.
  lc('solar', 12, 11, 2, 18);            // r=2 → − at (12,11) on the earthed rail
  lw(15,11, 16,11);
  lc('solar', 16, 11, 2, 18);
  lw(19,11, 21,11);
  lc('R', 21, 11, 1, 100);               // string load — reads ~34V
  lw(12,14, 21,14);
  lw(12,11, 12,14);
  lc('GND', 12, 14, 0);

  saveCurrentCircuit();
})();

// Switch back to first circuit
loadCircuit(0);

updateTabBar();
render();
showProps(null);
simulate();
setStatus('UK domestic install loaded. Select a component to inspect it, or use the Course panel to start a guided lesson.');

// Toolbar resize handle
(()=>{
  const tb=document.getElementById('toolbar');
  const handle=document.getElementById('toolbar-resize');
  if(!tb||!handle) return;
  let _tbDrag=false,_tbStartX=0,_tbStartW=80;
  handle.addEventListener('mousedown',e=>{
    _tbDrag=true;_tbStartX=e.clientX;_tbStartW=tb.offsetWidth;
    document.body.style.cursor='ew-resize';e.preventDefault();
  });
  document.addEventListener('mousemove',e=>{
    if(!_tbDrag) return;
    const w=Math.max(60,Math.min(320,_tbStartW+(e.clientX-_tbStartX)));
    tb.style.width=w+'px';
  });
  document.addEventListener('mouseup',()=>{
    if(_tbDrag){_tbDrag=false;document.body.style.cursor='';}
  });
})();

// Restore course position from previous session
(()=>{
  try {
    const saved = JSON.parse(localStorage.getItem('elec_course_state') || 'null');
    if (saved && typeof saved.courseIdx === 'number' && typeof saved.lessonIdx === 'number') {
      const co = COURSES[saved.courseIdx];
      if (co && saved.lessonIdx >= 0 && saved.lessonIdx < co.challenges.length) {
        _currentCourse = saved.courseIdx;
        _currentChallengeIdx = saved.lessonIdx;
        _currentChallenge = co.challenges[saved.lessonIdx];
        // Open the course panel and go straight to the outline so the user
        // can see where they were without auto-loading the challenge setup.
        _courseOpen = true;
        const p = document.getElementById('course-panel');
        if (p) p.classList.add('open');
        const tog = document.getElementById('course-toggle');
        if (tog) tog.textContent = '◀';
        renderCourseOutline(saved.courseIdx);
      }
    }
  } catch(e) { /* ignore corrupt state */ }
})();
