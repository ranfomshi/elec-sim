// Courses, challenges, multimeter, and Ohm law tools.

// ── Course & Challenge System ──────────────────────────────────────────────

const CHALLENGES = [
  // Ch 0 — A Simple Light Circuit
  {
    title: 'A Simple Light Circuit',
    scenario: 'A bedroom light won\'t turn on. Wire a 230V supply through a switch to a 60W bulb — then close the switch. The supply and components are already placed; connect the wires and close the switch.',
    hints: [
      'Click the switch on the canvas to close it',
      'Make sure Live goes: Supply → Switch → Bulb → back to Neutral (GND)',
      'Use the Wire tool (W) to connect any missing wire segments',
    ],
    setup() {
      _acMode = true; _acFreq = 50;
      updateACUI();
      fromSchema({
        acMode: true, acFreq: 50,
        components: [
          {type:'V',   px:2, py:4, rotation:1, value:230},
          {type:'sw',  px:5, py:4, rotation:0, closed:false},
          {type:'bulb',px:8, py:4, rotation:0, value:882},
          {type:'GND', px:2, py:7, rotation:0},
        ],
        wires: [
          {x1:2,y1:4,x2:5,y2:4},
          {x1:11,y1:4,x2:11,y2:7},
          {x1:2,y1:7,x2:11,y2:7},
        ]
      });
      simulate();
    },
    validate() {
      const sw = comps.find(c => c.type === 'sw');
      const bulb = comps.find(c => c.type === 'bulb');
      if (!sw) return {pass:false, msg:'No switch found in circuit.'};
      if (!sw.closed) return {pass:false, msg:'The switch is still open — click the switch to close it.'};
      if (!bulb || !(bulb.simPower > 30)) return {pass:false, msg:'Bulb is not lit. Check your wiring and make sure all connections are made.'};
      return {pass:true, msg:'The light is on! Switch closed, bulb drawing power.'};
    },
    explainer: {
      title: 'The Basic Lighting Circuit',
      body: `In UK wiring, the Live conductor (Brown) always passes through the switch. This means the switch breaks the live conductor, making it safe to change the bulb without risk of shock — the bulb holder remains at neutral potential when switched off.

The Neutral (Blue) runs directly from the supply to the lamp. Earth (Green/Yellow) connects to the lamp body for safety, providing a fault path back to the consumer unit.

A 60W bulb at 230V has a resistance of ~882Ω when hot. I = V/R = 230/882 = 0.26A, giving P = V×I = 60W. That current flows through the switch, which is why switch ratings matter.`,
      takeaway: 'Always switch the Live conductor, never the Neutral. This is a legal requirement under BS 7671 (the IET Wiring Regulations).',
    },
  },

  // Ch 1 — Measuring Voltage
  {
    title: 'Measuring Voltage',
    scenario: 'The circuit is already wired and live. Use the multimeter in Voltage mode (V) to confirm 230V at the supply terminals. Place the Red probe on the Live (+) node of the supply, and the Black probe on the GND/Neutral node.',
    hints: [
      'Click the V button on the multimeter widget to select Voltage mode',
      'Click 🔴 Red on the multimeter, then click the Live (+) terminal of the voltage source on the canvas',
      'Click ⚫ Black on the multimeter, then click the GND/Neutral node (bottom of circuit)',
    ],
    setup() {
      _acMode = true; _acFreq = 50;
      updateACUI();
      fromSchema({
        acMode: true, acFreq: 50,
        components: [
          {type:'V',    px:2, py:4, rotation:1, value:230},
          {type:'bulb', px:7, py:4, rotation:0, value:100},
          {type:'GND',  px:2, py:7, rotation:0},
        ],
        wires: [
          {x1:2,y1:4,x2:7,y2:4},
          {x1:10,y1:4,x2:10,y2:7},
          {x1:2,y1:7,x2:10,y2:7},
        ]
      });
      simulate();
    },
    validate() {
      if (_mmMode !== 'V') return {pass:false, msg:'Set the multimeter to Voltage (V) mode first.'};
      if (!_mmRed || !_mmBlack) return {pass:false, msg:'Place both Red and Black probes on the circuit.'};
      if (typeof mmLastReading !== 'number' || isNaN(mmLastReading)) return {pass:false, msg:'Could not get a reading — check probe positions.'};
      if (Math.abs(mmLastReading) < 180) return {pass:false, msg:`Reading is ${mmLastReading.toFixed(1)}V — make sure Red is on the Live node and Black on GND.`};
      return {pass:true, msg:`Reading: ${Math.abs(mmLastReading).toFixed(1)}V — correct UK mains voltage confirmed!`};
    },
    explainer: {
      title: 'Measuring Voltage',
      body: `Mains voltage in the UK is 230V RMS (root mean square). The supply alternates 50 times per second (50 Hz). Your multimeter measures the equivalent DC voltage that would deliver the same power — this is the RMS value.

Peak voltage is actually about 325V (230 × √2 ≈ 325V). The RMS value of a sine wave is always peak/√2.

Always use a CAT III or CAT IV rated meter for mains measurements. CAT ratings define how much transient overvoltage the meter can safely withstand.`,
      takeaway: '230V RMS is the UK standard. Never measure live voltages without proper PPE and a suitably rated multimeter (CAT III minimum).',
    },
  },

  // Ch 2 — Open Circuit Fault Finding
  {
    title: 'Open Circuit Fault Finding',
    scenario: 'A circuit is completely dead — the bulb will not light. The wire between the supply and the bulb appears intact but has an internal break. Use the multimeter in Continuity mode (≋) to locate the fault by testing along the live conductor.',
    hints: [
      'Set multimeter to ≋ (continuity) mode by clicking the ≋ button',
      'Start at the supply Live terminal and work towards the bulb — where the reading changes from CONT to OPEN, that is where the break is',
      'The break is in the live wire between x=4 and x=5 — test one probe each side of the gap to confirm',
    ],
    setup() {
      _acMode = true; _acFreq = 50;
      updateACUI();
      fromSchema({
        acMode: true, acFreq: 50,
        components: [
          {type:'V',    px:2, py:4, rotation:1, value:230},
          {type:'bulb', px:7, py:4, rotation:0, value:100},
          {type:'GND',  px:2, py:7, rotation:0},
        ],
        wires: [
          // Broken live wire: two stubs with a 1-grid gap at x=4..5 — looks connected but isn't
          {x1:2,y1:4,x2:4,y2:4},
          {x1:5,y1:4,x2:7,y2:4},
          {x1:10,y1:4,x2:10,y2:7},
          {x1:2,y1:7,x2:10,y2:7},
        ]
      });
      simulate();
    },
    validate() {
      if (_mmMode !== '≋') return {pass:false, msg:'Set the multimeter to Continuity (≋) mode first.'};
      if (!_mmRed || !_mmBlack) return {pass:false, msg:'Place both Red and Black probes on the circuit.'};
      // Check if probes are placed near the gap region (supply output area and bulb input area)
      // Supply output is at grid (2,4) = pixel (80,160), bulb x1 is at grid (7,4) = pixel (280,160)
      // Accept any probe placement within 1 grid square of either side of the gap
      const redNearGap = _mmRed && (
        (Math.abs(_mmRed.x - 2*G) <= 2*G && Math.abs(_mmRed.y - 4*G) <= G) ||
        (Math.abs(_mmRed.x - 7*G) <= 2*G && Math.abs(_mmRed.y - 4*G) <= G)
      );
      const blackNearGap = _mmBlack && (
        (Math.abs(_mmBlack.x - 2*G) <= 2*G && Math.abs(_mmBlack.y - 4*G) <= G) ||
        (Math.abs(_mmBlack.x - 7*G) <= 2*G && Math.abs(_mmBlack.y - 4*G) <= G)
      );
      if (redNearGap && blackNearGap) {
        return {pass:true, msg:'You found the break! OPEN between the supply and the bulb input — that is where the missing wire belongs.'};
      }
      return {pass:false, msg:'Probes placed, but not across the gap. Test between the supply output terminal and the bulb input terminal.'};
    },
    explainer: {
      title: 'Open Circuit Fault Finding',
      body: `An open circuit means there is a break somewhere in the conducting path — current cannot flow. Symptoms: no voltage at the load, circuit completely dead.

The systematic approach is to start at the supply and work towards the load, testing continuity between successive points. Where you get OPEN instead of a beep, you have found the break.

Important: Always ISOLATE (switch off and lock off) before using continuity mode — continuity mode uses its own internal battery and gives false readings on live circuits. Using it on a live circuit can damage the meter and is dangerous.`,
      takeaway: 'Always isolate before continuity testing. Work systematically from supply to load. Where OPEN appears, that is your fault.',
    },
  },

  // Ch 3 — Ring Main
  {
    title: 'Ring Main: Two Paths to Every Socket',
    scenario: 'This is a UK ring main circuit. The consumer unit feeds Socket A and Socket B in a loop, so each socket gets supply from two directions. Use the multimeter in Voltage mode to verify that both sockets measure ~230V.',
    hints: [
      'Set multimeter to Voltage (V) mode',
      'Place Red probe on the Socket A node (probe at grid 5,5) and Black on the GND rail (grid 2,8)',
      'Both sockets get supply from two directions — this is why ring mains are reliable even if one cable is damaged',
    ],
    setup() {
      _acMode = true; _acFreq = 50;
      updateACUI();
      fromSchema({
        acMode: true, acFreq: 50,
        components: [
          {type:'V',     px:2, py:5, rotation:1, value:230},
          {type:'probe', px:5, py:5, rotation:0},
          {type:'probe', px:9, py:5, rotation:0},
          {type:'R',     px:5, py:6, rotation:1, value:1000, maxRating:1000},
          {type:'R',     px:9, py:6, rotation:1, value:1000, maxRating:1000},
          {type:'GND',   px:2, py:8, rotation:0},
        ],
        wires: [
          {x1:2,y1:5,x2:5,y2:5},
          {x1:5,y1:5,x2:9,y2:5},
          {x1:9,y1:5,x2:12,y2:5},
          {x1:12,y1:5,x2:12,y2:8},
          {x1:2,y1:8,x2:12,y2:8},
          {x1:5,y1:7,x2:5,y2:8},
          {x1:9,y1:7,x2:9,y2:8},
        ]
      });
      simulate();
    },
    validate() {
      if (_mmMode !== 'V') return {pass:false, msg:'Set the multimeter to Voltage (V) mode first.'};
      if (!_mmRed || !_mmBlack) return {pass:false, msg:'Place both Red and Black probes on the circuit.'};
      if (typeof mmLastReading !== 'number') return {pass:false, msg:'Could not get a reading — check probe positions.'};
      if (Math.abs(mmLastReading) > 180) return {pass:true, msg:`${Math.abs(mmLastReading).toFixed(1)}V confirmed at socket — the ring main keeps both sockets live!`};
      return {pass:false, msg:`Reading is only ${Math.abs(mmLastReading).toFixed(1)}V. Place Red on a socket node and Black on the GND rail.`};
    },
    explainer: {
      title: 'The Ring Main Circuit',
      body: `The ring main (ring circuit) is unique to the UK and Ireland. Cable runs from the consumer unit to socket A, then to socket B, then loops back to the same MCB. Each socket is supplied from two directions simultaneously, halving the current in each cable run.

This allowed cheaper, thinner 2.5mm² cable to be used when ring mains were introduced in 1947, compared to the radial circuits used elsewhere in Europe.

The ring is protected by a single 32A MCB. Fused plugs (BS 1363) provide additional protection at each appliance — a design that balances safety with the flexibility of using thinner cable throughout.`,
      takeaway: 'A ring main supplies each socket from two directions. The 32A MCB + fused plugs system is unique to the UK. Testing a ring: disconnect one end and measure resistance end-to-end — it should read very low (the copper resistance of the full ring length).',
    },
  },

  // Ch 4 — Two-Way Switching (real SPDT switches)
  {
    title: 'Two-Way Switching',
    scenario: 'A staircase light must be switched from both bottom and top. Real SPDT two-way switches are fitted and the strapper cable is wired. The light is currently off. Click the bottom switch (left) to turn it on — then try the top switch (right) and notice it turns it off again. Click Check when the bulb is lit.',
    hints: [
      'Click the left two-way switch on the canvas to select it, then click "Toggle" in the properties panel',
      'The bottom switch connects COM to L1 or L2. When both switches route through the same strapper wire, the circuit is complete',
      'Try both switches — each independently flips the light. This is how a real two-way staircase works',
    ],
    setup() {
      _acMode = true; _acFreq = 50;
      updateACUI();
      fromSchema({
        acMode: true, acFreq: 50,
        components: [
          {type:'V',   px:2, py:5, rotation:1, value:230},
          {type:'sw2', px:4, py:5, rotation:0, sw2pos:0, x3:7, y3:6},
          {type:'sw2', px:9, py:5, rotation:2, sw2pos:1, x3:9, y3:6},
          {type:'bulb',px:12,py:5, rotation:0, value:882},
          {type:'GND', px:2, py:8, rotation:0},
        ],
        wires: [
          {x1:2,y1:5,x2:4,y2:5},
          {x1:7,y1:4,x2:9,y2:4},
          {x1:7,y1:6,x2:9,y2:6},
          {x1:15,y1:5,x2:15,y2:8},
          {x1:2,y1:8,x2:15,y2:8},
        ]
      });
      simulate();
    },
    validate() {
      const bulb = comps.find(c => c.type === 'bulb');
      const sw2s = comps.filter(c => c.type === 'sw2');
      if (!bulb) return {pass:false, msg:'No bulb found in circuit.'};
      if (sw2s.length < 2) return {pass:false, msg:'Two SPDT switches are needed.'};
      if (bulb.simPower > 30) return {pass:true, msg:`Staircase light on at ${bulb.simPower.toFixed(0)}W — SPDT switching working!`};
      return {pass:false, msg:'Bulb not lit. Click a two-way switch to select it, then use the Toggle button in the properties panel.'};
    },
    explainer: {
      title: 'Two-Way Switching (SPDT)',
      body: `Two-way switching uses SPDT (single pole, double throw) switches. Each switch has one Common terminal (COM) and two outputs (L1 and L2). A 3-core strapper cable connects the L1 outputs of both switches together, and the L2 outputs together.

The circuit is complete (lamp ON) only when both switches route through the same strapper wire — both on L1, or both on L2. If they take different strappers, the circuit is broken (lamp OFF).

Flipping either switch independently moves its COM from one strapper to the other, changing the state of the lamp. This is why you can turn the light on from downstairs and off from upstairs.

Under the 2004 UK cable colour harmonisation: Common wires are Brown, strapper wires are Blue and Grey (historically Black and Red).`,
      takeaway: 'SPDT two-way switching: lamp is ON when both switches share the same strapper (both L1 or both L2). Either switch independently flips the circuit. COM wires are Brown; strapper wires are Blue and Grey.',
    },
  },

  // Ch 5 — MCB Overload
  {
    title: 'MCB Overload: Protecting the Circuit',
    scenario: 'A 0.5A fuse protects this 230V lighting circuit. The single 60W bulb draws 0.26A — safely within the limit. Add another 60W bulb in parallel to push the current above 0.5A and blow the fuse.',
    hints: [
      'A 60W bulb at 230V draws I = P/V = 60/230 = 0.26A',
      'Two 60W bulbs in parallel draw 0.52A — just over the 0.5A fuse rating',
      'Select the Bulb tool from the toolbar and click between the live rail (row 4) and neutral rail (row 7) to add a parallel bulb',
    ],
    setup() {
      _acMode = true; _acFreq = 50;
      updateACUI();
      fromSchema({
        acMode: true, acFreq: 50,
        components: [
          {type:'V',    px:2, py:4, rotation:1, value:230},
          {type:'fuse', px:4, py:4, rotation:0, value:0.5},
          {type:'bulb', px:7, py:4, rotation:0, value:882},
          {type:'GND',  px:2, py:7, rotation:0},
        ],
        wires: [
          {x1:2,y1:4,x2:4,y2:4},
          {x1:10,y1:4,x2:10,y2:7},
          {x1:2,y1:7,x2:10,y2:7},
        ]
      });
      simulate();
    },
    validate() {
      const fuse = comps.find(c => c.type === 'fuse');
      if (!fuse) return {pass:false, msg:'No fuse found in circuit.'};
      if (fuse.blown) return {pass:true, msg:'Fuse blown! The combined load exceeded 0.5A — circuit protected.'};
      const bulbs = comps.filter(c => c.type === 'bulb');
      const totalR = bulbs.reduce((acc, b) => {
        if (b.value > 0) return 1 / (1/acc + 1/b.value);
        return acc;
      }, Infinity);
      const current = 230 / totalR;
      return {pass:false, msg:`Current is ${current.toFixed(2)}A — need > 0.5A to trip. Add another 60W bulb in parallel.`};
    },
    explainer: {
      title: 'MCB Overload Protection',
      body: `A Miniature Circuit Breaker (MCB) protects cable from overheating by tripping when current exceeds its rating.

Ohm's Law: I = V/R. A 60W bulb has a hot resistance of ~882Ω at 230V, drawing 0.26A. Two in parallel give 441Ω total: I = 230/441 = 0.52A — just enough to trip a 0.5A fuse. Adding loads in parallel reduces total resistance and increases current: 1/R_total = 1/R1 + 1/R2 + ...

MCBs have two trip mechanisms: thermal (slow bimetallic strip, for sustained overload) and magnetic (instant electromagnet, for short circuits). A Type B MCB trips magnetically at 3–5× rated current; Type C at 5–10×; Type D at 10–20×.`,
      takeaway: 'I = V/R. Parallel loads reduce total resistance and increase current. Always size your MCB to the cable, not the load — the MCB protects the wire, not the appliance.',
    },
  },

  // Ch 6 — UK Plate Switch Circuit
  {
    title: 'UK Plate Switch: Wire the Lighting Circuit',
    scenario: 'Wire a UK plate switch to control a ceiling rose. The 230V supply and components are placed. Connect: Live from supply → switch COM; switch L1 → ceiling rose Live terminal; Neutral direct to ceiling rose. Then close the switch.',
    hints: [
      'Connect a wire from the supply Live (+) terminal to the switch COM terminal (left terminal)',
      'Connect a wire from the switch L1 terminal (right terminal) to the ceiling rose left terminal',
      'Connect Neutral from the supply GND rail directly to the ceiling rose right terminal, then close the switch',
    ],
    setup() {
      _acMode = true; _acFreq = 50;
      updateACUI();
      fromSchema({
        acMode: true, acFreq: 50,
        components: [
          {type:'V',         px:2, py:4, rotation:1, value:230},
          {type:'switch_uk', px:6, py:4, rotation:0, closed:false},
          {type:'crose',     px:10,py:4, rotation:0, value:60},
          {type:'GND',       px:2, py:7, rotation:0},
        ],
        wires: [
          {x1:2,y1:7,x2:13,y2:7},
          {x1:13,y1:4,x2:13,y2:7},
        ]
      });
      simulate();
    },
    validate() {
      const sw = comps.find(c => c.type === 'switch_uk');
      const cr = comps.find(c => c.type === 'crose');
      if (!sw) return {pass:false, msg:'No UK plate switch found.'};
      if (!sw.closed) return {pass:false, msg:'Switch is open — click the switch and use Toggle in the properties panel to close it.'};
      if (!cr || !(cr.simPower > 1)) return {pass:false, msg:'Ceiling rose is not lit. Check wiring: Supply → Switch COM → Switch L1 → Ceiling rose.'};
      return {pass:true, msg:`Ceiling rose lit at ${cr.simPower.toFixed(0)}W — switch circuit complete!`};
    },
    explainer: {
      title: 'UK Lighting Circuit: Switch in the Live',
      body: `In UK wiring, the switch ALWAYS breaks the Live conductor (Brown). This is a legal requirement under BS 7671 (18th Edition Wiring Regulations). The switch is connected between the supply Live and the lamp Live terminal.

The Neutral (Blue) runs directly from the consumer unit to the lamp. When the switch is open, the lamp is at neutral potential — safe to change the bulb without risk of shock.

The switch L1 terminal is the switched live output. When the rocker is in the ON position, COM connects to L1, completing the circuit. The plate switch you used here is the standard BS EN 60669 pattern used in virtually every UK home.`,
      takeaway: 'Always switch the Live (Brown). In a one-way switch: wire Live to COM, L1 to the load. Never put the switch in the Neutral conductor.',
    },
  },

  // Ch 7 — UK Wiring Colours
  {
    title: 'UK Cable Colours: Identify the Conductors',
    scenario: 'A lighting circuit uses a 3-core-and-earth cable. Using the multimeter in Voltage mode, measure voltage on the Brown wire (Live node at the supply). Then measure the Blue wire (Neutral node). Both the supply and ceiling rose are wired — just measure.',
    hints: [
      'Set the multimeter to Voltage (V) mode by clicking the V button on the meter widget',
      'Click Red probe → click the supply Live terminal (left terminal of the V source, at grid 2,4)',
      'Click Black probe → click the GND node (grid 2,7). Brown=Live ~230V, Blue=Neutral ~0V, Green/Yellow=Earth',
    ],
    setup() {
      _acMode = true; _acFreq = 50;
      updateACUI();
      fromSchema({
        acMode: true, acFreq: 50,
        components: [
          {type:'V',         px:2, py:4, rotation:1, value:230},
          {type:'switch_uk', px:6, py:4, rotation:0, closed:true},
          {type:'crose',     px:10,py:4, rotation:0, value:60},
          {type:'GND',       px:2, py:7, rotation:0},
        ],
        wires: [
          {x1:2,y1:4,x2:6,y2:4},
          {x1:9,y1:4,x2:10,y2:4},
          {x1:13,y1:4,x2:13,y2:7},
          {x1:2,y1:7,x2:13,y2:7},
        ]
      });
      simulate();
    },
    validate() {
      if (_mmMode !== 'V') return {pass:false, msg:'Set multimeter to Voltage (V) mode first.'};
      if (!_mmRed || !_mmBlack) return {pass:false, msg:'Place both Red and Black probes on the circuit.'};
      if (typeof mmLastReading !== 'number') return {pass:false, msg:'No reading — check probe positions.'};
      if (Math.abs(mmLastReading) >= 180) return {pass:true, msg:`${Math.abs(mmLastReading).toFixed(1)}V on Brown (Live). Correct — Brown wire is always Live at 230V.`};
      if (Math.abs(mmLastReading) < 20) return {pass:false, msg:`Reading is ${Math.abs(mmLastReading).toFixed(1)}V — that looks like the Neutral (Blue) or Earth. Move the Red probe to the Live terminal.`};
      return {pass:false, msg:`Reading is ${Math.abs(mmLastReading).toFixed(1)}V — place Red probe on the supply Live terminal and Black on GND.`};
    },
    explainer: {
      title: 'UK Cable Colour Harmonisation (2004)',
      body: `Since April 2004, UK wiring uses harmonised European cable colours:
• Brown = Live (formerly Red)
• Blue = Neutral (formerly Black)
• Green/Yellow = Protective Earth (CPC — unchanged)

Old colours (pre-2004): Red=Live, Black=Neutral. You will still find old red-and-black wiring in existing installations — always verify with a meter before touching, never assume by colour alone.

3-core-and-earth cable (used for two-way switching) adds a Grey conductor as the second strapper, alongside Brown (COM) and Blue (L1/L2).

Mains voltage in the UK is 230V AC at 50Hz. The Brown conductor is live at all times unless the circuit is isolated at the consumer unit.`,
      takeaway: 'Brown=Live, Blue=Neutral, Green/Yellow=Earth. Never assume — always test with a meter. Old red/black cables still exist in existing installations.',
    },
  },

  // Ch 8 — Consumer Unit MCB Ratings
  {
    title: 'Consumer Unit: MCB Ratings',
    scenario: 'This consumer unit has several circuits. A 6A MCB protects the lighting circuit (1.0mm² cable, max 6A). A 32A MCB protects the ring main (2.5mm² cable, max 32A). Verify the lighting circuit draws less than 6A by using the multimeter in Voltage mode — place probes across the fuse/MCB.',
    hints: [
      'Set the multimeter to Ω (resistance/continuity) mode — for this challenge, use V mode',
      'The lighting circuit has a 60W bulb at 230V: I = P/V = 60/230 = 0.26A, well within the 6A MCB limit',
      'Place Red probe on the MCB input (grid 5,4) and Black on GND (grid 2,8) to measure 230V supply voltage',
    ],
    setup() {
      _acMode = true; _acFreq = 50;
      updateACUI();
      fromSchema({
        acMode: true, acFreq: 50,
        components: [
          {type:'V',    px:2, py:4, rotation:1, value:230},
          {type:'fuse', px:5, py:4, rotation:0, value:6},
          {type:'bulb', px:8, py:4, rotation:0, value:882},
          {type:'GND',  px:2, py:7, rotation:0},
        ],
        wires: [
          {x1:2,y1:4,x2:5,y2:4},
          {x1:11,y1:4,x2:11,y2:7},
          {x1:2,y1:7,x2:11,y2:7},
        ]
      });
      simulate();
    },
    validate() {
      if (_mmMode !== 'V') return {pass:false, msg:'Set multimeter to Voltage (V) mode.'};
      if (!_mmRed || !_mmBlack) return {pass:false, msg:'Place both probes on the circuit.'};
      if (typeof mmLastReading !== 'number') return {pass:false, msg:'No reading — place probes.'};
      if (Math.abs(mmLastReading) >= 180) return {pass:true, msg:`${Math.abs(mmLastReading).toFixed(1)}V confirmed — lighting circuit is live. At 60W, current = ${(60/230).toFixed(2)}A, safely within the 6A MCB rating.`};
      return {pass:false, msg:`Reading ${Math.abs(mmLastReading).toFixed(1)}V — place Red probe on the MCB input node and Black on GND.`};
    },
    explainer: {
      title: 'MCB Ratings and Cable Sizes',
      body: `MCB ratings must match the cable they protect — not the load:
• 6A MCB → 1.0mm² cable → lighting circuits (max ~1.3kW at 230V)
• 16A MCB → 1.5mm² cable → individual appliance circuits
• 32A MCB → 2.5mm² cable → ring main socket circuits (max ~7.3kW)
• 40A MCB → 4.0mm² or 6.0mm² cable → cooker/shower circuits

The MCB protects the cable from overheating. If you fit a 32A MCB on 1.0mm² cable, the MCB won't trip until the cable is already overloaded and at risk of fire.

BS 7671 (18th Edition) requires all circuits to be both under-rated (MCB ≤ cable capacity) and correctly earthed.`,
      takeaway: 'Size the MCB to the cable, not the appliance. 6A for lighting (1.0mm²), 32A for ring main sockets (2.5mm²).',
    },
  },

  // Ch 9 — RCD Protection
  {
    title: 'RCD Protection: Earth Fault Current',
    scenario: 'A 30mA RCD protects this circuit. Add a fault by reducing the bulb resistance to very low (e.g. 1Ω) to simulate an earth fault causing excessive current. A properly functioning RCD trips at 30mA — but in this sim, trip it manually to see what happens. Click the RCD in the properties panel and press "Trip RCD".',
    hints: [
      'Click the RCD component to select it — the properties panel will show Trip/Reset options',
      'Click "Trip RCD" to simulate an earth fault trip — the circuit goes dead',
      'Click "Reset RCD" to restore — in real life you must find and clear the fault before resetting',
    ],
    setup() {
      _acMode = true; _acFreq = 50;
      updateACUI();
      fromSchema({
        acMode: true, acFreq: 50,
        components: [
          {type:'V',         px:2, py:4, rotation:1, value:230},
          {type:'rcd',       px:5, py:4, rotation:0, value:30, tripped:false},
          {type:'switch_uk', px:8, py:4, rotation:0, closed:true},
          {type:'crose',     px:11,py:4, rotation:0, value:60},
          {type:'GND',       px:2, py:7, rotation:0},
        ],
        wires: [
          {x1:2,y1:4,x2:5,y2:4},
          {x1:14,y1:4,x2:14,y2:7},
          {x1:2,y1:7,x2:14,y2:7},
        ]
      });
      simulate();
    },
    validate() {
      const rcd = comps.find(c => c.type === 'rcd');
      if (!rcd) return {pass:false, msg:'No RCD found.'};
      if (rcd.tripped) return {pass:true, msg:'RCD tripped — circuit isolated! In a real installation, investigate and clear the earth fault before resetting.'};
      return {pass:false, msg:'RCD has not tripped. Click the RCD component then "Trip RCD" in the properties panel.'};
    },
    explainer: {
      title: 'RCD Protection',
      body: `A Residual Current Device (RCD) measures the difference between current flowing in the Live and Neutral conductors. In a healthy circuit, these are equal. If current is leaking to earth (through a fault or through a person), the difference triggers the RCD.

A 30mA RCD trips in under 40ms — fast enough to prevent a fatal shock. The human heart can go into fibrillation at around 50–100mA, so a 30mA trip provides a significant safety margin.

Under BS 7671 (18th Edition), RCD protection is required for most socket circuits, lighting in bathrooms, and all outdoor circuits. Many consumer units now have an RCBO (RCD+MCB combined) on each circuit.

If an RCD keeps tripping: look for faulty appliances (damaged flex, failed capacitors in PSUs, poorly wired equipment) before assuming the RCD itself is at fault.`,
      takeaway: 'RCDs trip at 30mA imbalance between Live and Neutral — fast enough to prevent electrocution. Required on most socket, bathroom and outdoor circuits under BS 7671.',
    },
  },

  // Ch 10 — UK 2-Way Switching
  {
    title: 'UK 2-Way Switches: Staircase Wiring',
    scenario: 'Wire a staircase lighting circuit using two UK 2-way plate switches. Supply enters the bottom switch COM. L1 and L2 strappers run between the two switches. L1 of the top switch connects to the ceiling rose. Toggle the switches to confirm the lamp turns on and off from either position.',
    hints: [
      'The bottom switch (left): wire supply Live to COM, then L1 and L2 run as strappers to the top switch L1 and L2',
      'Top switch (right, rotation 2): L1 connects to the ceiling rose Live; COM is a dead end',
      'Close one switch — if the lamp lights, both switches now route through the same strapper wire',
    ],
    setup() {
      _acMode = true; _acFreq = 50;
      updateACUI();
      fromSchema({
        acMode: true, acFreq: 50,
        components: [
          {type:'V',         px:2,  py:5, rotation:1, value:230},
          {type:'switch2_uk',px:5,  py:5, rotation:0, sw2pos:0},
          {type:'switch2_uk',px:10, py:5, rotation:2, sw2pos:1},
          {type:'crose',     px:14, py:5, rotation:0, value:60},
          {type:'GND',       px:2,  py:8, rotation:0},
        ],
        wires: [
          {x1:2, y1:5, x2:5, y2:5},
          {x1:8, y1:4, x2:10,y2:4},
          {x1:8, y1:6, x2:10,y2:6},
          {x1:13,y1:5, x2:14,y2:5},
          {x1:17,y1:5, x2:17,y2:8},
          {x1:2, y1:8, x2:17,y2:8},
        ]
      });
      simulate();
    },
    validate() {
      const cr = comps.find(c => c.type === 'crose');
      const sw2s = comps.filter(c => c.type === 'switch2_uk');
      if (!cr) return {pass:false, msg:'No ceiling rose found.'};
      if (sw2s.length < 2) return {pass:false, msg:'Two UK 2-way switches needed.'};
      if (cr.simPower > 1) return {pass:true, msg:`Staircase light on at ${cr.simPower.toFixed(0)}W — 2-way switching working!`};
      return {pass:false, msg:'Ceiling rose not lit. Click a switch and use Toggle in the properties panel, or check the strapper wires between the two switches.'};
    },
    explainer: {
      title: 'UK 2-Way Lighting Switch',
      body: `Two-way switching controls one lamp from two locations. Each UK 2-way plate switch has three terminals:
• COM (Common) — Live feed enters at the bottom switch; lamp connection exits from the top switch
• L1 — Strapper wire 1 (Brown)
• L2 — Strapper wire 2 (Blue or Grey)

The lamp is ON when both switches are set to the same strapper (both on L1, or both on L2). Toggling either switch alone changes which strapper is active, toggling the lamp state.

Under the 2004 harmonisation: COM wires are Brown, strapper L1 is Blue, strapper L2 is Grey. In older wiring you may find Red/Black strappers — always verify with a meter.

This circuit is most commonly used for staircase lighting, hallways, and bedrooms where you want to control a light from both ends.`,
      takeaway: '2-way switching: COM→L1 on both = lamp ON (both on L1). COM→L1 on one, COM→L2 on other = lamp OFF. Strappers are Blue (L1) and Grey (L2).',
    },
  },

  // Ch 11 — UK Intermediate Switching
  {
    title: 'UK Intermediate Switch: Three-Point Control',
    scenario: 'A long corridor needs a light controlled from three positions. Two UK 2-way switches are at each end; a UK intermediate plate switch is in the middle. The strappers from the bottom 2-way switch connect to L1 and L2 of the intermediate. The intermediate L1\' and L2\' connect to the top 2-way switch. Try all three switches.',
    hints: [
      'The intermediate switch sits between the two 2-way switches in the strapper cable run',
      'Straight position (→): L1→L1\' and L2→L2\' — same as no intermediate switch',
      'Crossed position (×): L1→L2\' and L2→L1\' — reverses the strapper, effectively "un-toggling" one of the end switches',
    ],
    setup() {
      _acMode = true; _acFreq = 50;
      updateACUI();
      fromSchema({
        acMode: true, acFreq: 50,
        components: [
          {type:'V',           px:2,  py:5, rotation:1, value:230},
          {type:'switch2_uk',  px:5,  py:5, rotation:0, sw2pos:0},
          {type:'switchint_uk',px:9,  py:5, rotation:0, intpos:1},
          {type:'switch2_uk',  px:13, py:5, rotation:2, sw2pos:0},
          {type:'crose',       px:17, py:5, rotation:0, value:60},
          {type:'GND',         px:2,  py:8, rotation:0},
        ],
        wires: [
          {x1:2, y1:5, x2:5, y2:5},
          {x1:8, y1:4, x2:9, y2:4},
          {x1:8, y1:6, x2:9, y2:6},
          {x1:12,y1:4, x2:13,y2:4},
          {x1:12,y1:6, x2:13,y2:6},
          {x1:16,y1:5, x2:17,y2:5},
          {x1:20,y1:5, x2:20,y2:8},
          {x1:2, y1:8, x2:20,y2:8},
        ]
      });
      simulate();
    },
    validate() {
      const cr = comps.find(c => c.type === 'crose');
      const sw2s = comps.filter(c => c.type === 'switch2_uk');
      const sint = comps.find(c => c.type === 'switchint_uk');
      if (!cr) return {pass:false, msg:'No ceiling rose found.'};
      if (sw2s.length < 2) return {pass:false, msg:'Two UK 2-way switches needed.'};
      if (!sint) return {pass:false, msg:'No intermediate switch found.'};
      if (cr.simPower > 1) return {pass:true, msg:`Three-point corridor light on at ${cr.simPower.toFixed(0)}W — intermediate switching working!`};
      return {pass:false, msg:'Light is off. Toggle any of the three switches to turn it on. Each switch independently controls the lamp.'};
    },
    explainer: {
      title: 'UK Intermediate Switch: 3+ Point Control',
      body: `For three or more control points, an intermediate (4-terminal) switch is inserted in the strapper cable run between the two end 2-way switches.

The intermediate switch has two positions:
• Straight (→): L1 connects to L1\', L2 connects to L2\' — passes through unchanged
• Crossed (×): L1 connects to L2\', L2 connects to L1\' — reverses the strapper pair

Toggling the intermediate switch has the same visible effect as toggling one of the 2-way end switches — it changes which strapper connects through, toggling the lamp state.

You can add more intermediate switches in series for very long corridors (e.g., a long hospital ward). Each additional intermediate switch adds one more control point. The 2-way switches always remain at each end.`,
      takeaway: 'Intermediate switches insert into the strapper cable run. Straight=pass-through, Crossed=reversal. Add one per extra control point beyond two.',
    },
  },

  // Ch 12 — Short Circuit Diagnosis
  {
    title: 'Fault Finding: Short Circuit',
    scenario: 'The MCB on this lighting circuit trips every time it is reset. The circuit is now isolated (MCB manually set blown). With the circuit dead, use the multimeter in Voltage mode (V) to confirm there is no voltage, then switch to Continuity (≋) mode and place one probe on the Live rail (grid 2,4) and one on Neutral (grid 2,7) — a beep here confirms the short. Use the Hint button if needed.',
    hints: [
      'First confirm the circuit is dead: V mode, Red on Live (grid 2,4), Black on Neutral (grid 2,7) — should read 0V because MCB is open',
      'Switch to Continuity (≋) mode, then place Red on Live (grid 2,4) and Black on Neutral (grid 2,7)',
      'If you get continuity (CONT) with the circuit isolated, the fault is in the fixed wiring — a short between L and N somewhere in the circuit',
    ],
    setup() {
      _acMode = true; _acFreq = 50;
      updateACUI();
      fromSchema({
        acMode: true, acFreq: 50,
        components: [
          {type:'V',    px:2, py:4, rotation:1, value:230},
          {type:'fuse', px:5, py:4, rotation:0, value:6, blown:true},
          {type:'bulb', px:8, py:4, rotation:0, value:100, maxRating:2000},
          {type:'R',    px:8, py:4, rotation:1, value:2},
          {type:'GND',  px:2, py:7, rotation:0},
        ],
        wires: [
          {x1:2,y1:4,x2:5,y2:4},
          {x1:11,y1:4,x2:11,y2:7},
          {x1:2,y1:7,x2:11,y2:7},
        ]
      });
      simulate();
    },
    validate() {
      if (_mmMode !== '≋') return {pass:false, msg:'Switch to Continuity (≋) mode to test for a short between Live and Neutral.'};
      if (!_mmRed || !_mmBlack) return {pass:false, msg:'Place both probes on the circuit.'};
      // Check if probes span the L and N rails (live rail ≈ (2,4) and neutral rail ≈ (2,7))
      const liveY = 4*G, neutralY = 7*G, liveX = 2*G;
      const redOnLive   = _mmRed   && Math.abs(_mmRed.x   - liveX)   < 3*G && Math.abs(_mmRed.y   - liveY)   < 2*G;
      const blackOnLive = _mmBlack && Math.abs(_mmBlack.x  - liveX)   < 3*G && Math.abs(_mmBlack.y  - liveY)   < 2*G;
      const redOnNeut   = _mmRed   && Math.abs(_mmRed.x   - liveX)   < 3*G && Math.abs(_mmRed.y   - neutralY) < 2*G;
      const blackOnNeut = _mmBlack && Math.abs(_mmBlack.x  - liveX)   < 3*G && Math.abs(_mmBlack.y  - neutralY) < 2*G;
      const spansRails  = (redOnLive && blackOnNeut) || (redOnNeut && blackOnLive);
      if (spansRails) return {pass:true, msg:'Continuity confirmed between Live and Neutral — CONT reading proves a short circuit in the fixed wiring. Trace the circuit to find the damaged cable or component.'};
      return {pass:false, msg:'Place one probe on the Live rail (near grid 2,4) and the other on Neutral (near grid 2,7) to test for continuity across the circuit.'};
    },
    explainer: {
      title: 'Short Circuit Fault Finding',
      body: `A short circuit creates a near-zero resistance path between conductors — Live to Neutral, or Live to Earth. The resulting current is enormous (V/R = 230/2 = 115A in this example), tripping the MCB instantly.

With the circuit ISOLATED (MCB off and locked), continuity testing between Live and Neutral should show OPEN in a healthy circuit. If you get CONT (continuity beep), there is a short somewhere in the fixed wiring.

Systematic approach:
1. Isolate and lock off at the MCB
2. Disconnect all loads (unplug, remove lamp covers)
3. Continuity test L-to-N with nothing connected
4. If CONT: fault is in the fixed wiring — check for pinched cables, water damage, or melted insulation
5. If OPEN: reconnect loads one at a time, continuity-testing after each — the load that causes CONT is the faulty appliance

Always use a CAT III rated meter and follow safe isolation procedure before touching any fixed wiring.`,
      takeaway: 'CONT between L and N with circuit isolated = short in fixed wiring. CONT only when a load is reconnected = faulty appliance. Always isolate before probing.',
    },
  },

  // Ch 13 — Ring Main Plug Load
  {
    title: 'Ring Main: Connect a Plug-in Load',
    scenario: 'A ring main has two sockets. Place a UK Plug on Socket A and set its resistance to 1000Ω (a 230V/53W appliance). Verify the appliance draws the correct power using the multimeter.',
    hints: [
      'Select the Plug tool from the toolbar and click on Socket A (left socket) to snap it in place',
      'Select the plug and set its value to 1000 in the properties panel',
      'Use the multimeter in Voltage mode — Red probe on the socket Live node, Black on GND — you should read ~230V',
    ],
    setup() {
      _acMode = true; _acFreq = 50;
      updateACUI();
      fromSchema({
        acMode: true, acFreq: 50,
        components: [
          {type:'V',         px:2,  py:5, rotation:1, value:230},
          {type:'socket_uk', px:5,  py:5, rotation:0, value:2300},
          {type:'socket_uk', px:9,  py:5, rotation:0, value:2300},
          {type:'GND',       px:2,  py:8, rotation:0},
        ],
        wires: [
          {x1:2, y1:5, x2:5, y2:5},
          {x1:5, y1:5, x2:9, y2:5},
          {x1:9, y1:5, x2:12,y2:5},
          {x1:12,y1:5, x2:12,y2:8},
          {x1:2, y1:8, x2:12,y2:8},
          {x1:5, y1:7, x2:5, y2:8},
          {x1:9, y1:7, x2:9, y2:8},
        ]
      });
      simulate();
    },
    validate() {
      if (_mmMode !== 'V') return {pass:false, msg:'Set multimeter to Voltage (V) mode.'};
      if (!_mmRed || !_mmBlack) return {pass:false, msg:'Place both probes.'};
      if (typeof mmLastReading !== 'number') return {pass:false, msg:'No reading — place probes on a socket node and GND.'};
      if (Math.abs(mmLastReading) >= 180) return {pass:true, msg:`${Math.abs(mmLastReading).toFixed(1)}V at socket — ring main delivering full voltage!`};
      return {pass:false, msg:`Reading ${Math.abs(mmLastReading).toFixed(1)}V — place Red probe on a socket Live terminal and Black on GND.`};
    },
    explainer: {
      title: 'Ring Main: UK Socket Circuit',
      body: `The UK ring main runs cable from the consumer unit to each socket and then loops back to the same MCB. Each socket receives supply from two directions simultaneously, reducing current in each cable run.

UK sockets (BS 1363) are 13A rated. The ring is protected by a 32A MCB, but each plug has an internal fuse (typically 3A for low-power loads, 13A for high-power appliances like kettles and toasters) providing additional protection at the appliance.

Modern ring mains are wired as 2.5mm² twin-and-earth cable. The ring has three conductors: Live (Brown), Neutral (Blue), and Earth CPC (Green/Yellow).

Plugging in an appliance: the plug connects to the socket Live (L), Neutral (N), and Earth (E) — the fused plug limits current to its fuse rating.`,
      takeaway: 'UK ring main: 2.5mm² cable, 32A MCB, 13A sockets. Each socket has two supply paths. Fused plugs (3A or 13A) protect individual appliances.',
    },
  },
];

// Course catalogue — each course references CHALLENGES by index
const COURSES = [
  {
    id: 'beginner',
    title: 'Complete Beginner',
    desc: 'No prior knowledge needed — start from absolute scratch.',
    icon: '🔌',
    color: '#3fb950',
    challenges: [0, 1, 6, 7, 8, 3, 13, 9, 5, 2],
  },
  {
    id: 'lighting',
    title: 'Lighting Circuits',
    desc: 'One-way, two-way and intermediate switching.',
    icon: '💡',
    color: '#e5c07b',
    challenges: [0, 6, 4, 10, 11],
  },
  {
    id: 'advanced',
    title: 'Advanced / Trade',
    desc: 'For qualified or experienced electricians.',
    icon: '⚡',
    color: '#60a5fa',
    challenges: [3, 5, 8, 9, 10, 11, 4],
  },
  {
    id: 'faultfinding',
    title: 'Fault Finding',
    desc: 'Systematic diagnosis of common electrical faults.',
    icon: '🔍',
    color: '#f97316',
    challenges: [2, 12],
  },
];

let _courseOpen = false;
let _currentCourse = 0;       // index into COURSES
let _currentChallengeIdx = 0; // index within current course's challenge list
let _hintsShown = 0;
let _challengePassed = false;
// Completion set — stores challenge indices (from CHALLENGES) that have been passed
let _completed = new Set(JSON.parse(localStorage.getItem('elec_completed') || '[]'));
function _markComplete(idx) {
  _completed.add(idx);
  localStorage.setItem('elec_completed', JSON.stringify([..._completed]));
}
// Persist current position within a course so reopening the page restores it
function _saveCourseState() {
  localStorage.setItem('elec_course_state', JSON.stringify({courseIdx: _currentCourse, lessonIdx: _currentChallengeIdx}));
}
// Legacy compat: keep _currentChallenge pointing at the CHALLENGES index
let _currentChallenge = 0;

function toggleGuide() {
  const m = document.getElementById('guide-modal');
  m.classList.toggle('show');
}

function toggleCourse() {
  _courseOpen = !_courseOpen;
  const p = document.getElementById('course-panel');
  p.classList.toggle('open', _courseOpen);
  document.getElementById('course-toggle').textContent = _courseOpen ? '◀' : '▶';
  if (_courseOpen) renderCourseHome();
}

function loadChallenge(courseIdx, lessonIdx) {
  // courseIdx = index in COURSES, lessonIdx = index within course's challenge list
  _currentCourse = courseIdx;
  _currentChallengeIdx = lessonIdx;
  const challengeIdx = COURSES[courseIdx].challenges[lessonIdx];
  _currentChallenge = challengeIdx;
  _hintsShown = 0;
  _challengePassed = false;
  _mmRed = null; _mmBlack = null; _mmActiveProbe = null;
  mmLastReading = null;
  _saveCourseState();
  document.querySelectorAll('.mm-red-btn,.mm-black-btn').forEach(b => b.classList.remove('active'));
  SVG.style.cursor = '';
  renderProbes();
  refreshMMReading();
  CHALLENGES[challengeIdx].setup();
  renderCoursePanel();
}

function renderCourseHome() {
  const inner = document.getElementById('course-inner');
  if (!inner) return;
  const rows = COURSES.map((co, ci) => {
    const done = co.challenges.filter(idx => _completed.has(idx)).length;
    const total = co.challenges.length;
    const pct = Math.round((done / total) * 100);
    const allDone = done === total;
    const started = done > 0;
    const btnLabel = allDone ? '✓ Review' : (started ? '▶ Continue' : '▶ Start');
    const btnColor = allDone ? '#3fb950' : '#58a6ff';
    const borderColor = allDone ? co.color : '#30363d';
    return `<div onclick="selectCourse(${ci})" style="cursor:pointer;background:#161b22;border:1px solid ${allDone?co.color:'#30363d'};border-radius:8px;padding:8px 10px;margin-bottom:6px;transition:border-color 0.15s;box-shadow:0 1px 3px rgba(0,0,0,0.3)" onmouseover="this.style.borderColor='${co.color}'" onmouseout="this.style.borderColor='${allDone?co.color:'#30363d'}'">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">
        <span style="font-size:16px">${co.icon}</span>
        <span style="color:#c9d1d9;font-size:11px;font-weight:bold">${co.title}</span>
        <span style="margin-left:auto;background:${btnColor};color:#fff;font-size:8px;padding:2px 6px;border-radius:3px;font-weight:bold;white-space:nowrap">${btnLabel}</span>
      </div>
      <div style="color:#8b949e;font-size:9px;margin-bottom:5px">${co.desc}</div>
      <div style="display:flex;align-items:center;gap:5px">
        <div style="flex:1;background:#21262d;border-radius:3px;height:4px;overflow:hidden">
          <div style="background:${co.color};height:4px;width:${pct}%;transition:width 0.3s"></div>
        </div>
        <span style="color:#8b949e;font-size:9px;white-space:nowrap">${done}/${total}</span>
      </div>
    </div>`;
  }).join('');
  inner.innerHTML = `
    <div style="font-size:9px;color:#58a6ff;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">⚡ Choose a Course</div>
    ${rows}
    <div style="color:#6e7681;font-size:9px;margin-top:8px;text-align:center">Click a course to see its lessons</div>
    <div style="border-top:1px solid #21262d;margin-top:14px;padding-top:10px">
      <button onclick="resetCourseProgress()" style="background:#fff;border:1px solid #fca5a5;color:#dc2626;font-size:9px;padding:4px 8px;border-radius:3px;cursor:pointer;width:100%;font-family:inherit" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='#fff'">↺ Reset all progress</button>
    </div>
  `;
}

function resetCourseProgress() {
  if (!confirm('Reset all course progress? This cannot be undone.')) return;
  _completed.clear();
  localStorage.removeItem('elec_completed');
  localStorage.removeItem('elec_course_state');
  renderCourseHome();
}

function selectCourse(ci) {
  _currentCourse = ci;
  renderCourseOutline(ci);
}

function renderCourseOutline(ci) {
  const co = COURSES[ci];
  const inner = document.getElementById('course-inner');
  if (!inner) return;
  const lessonRows = co.challenges.map((chIdx, li) => {
    const ch = CHALLENGES[chIdx];
    const done = _completed.has(chIdx);
    const active = _currentCourse === ci && _currentChallengeIdx === li;
    return `<div onclick="loadChallenge(${ci},${li})" style="cursor:pointer;display:flex;align-items:flex-start;gap:7px;padding:6px 8px;border-radius:4px;margin-bottom:2px;background:${active?'rgba(88,166,255,0.08)':'transparent'};border:1px solid ${active?'#58a6ff':'transparent'}" onmouseover="this.style.background='rgba(88,166,255,0.05)'" onmouseout="this.style.background='${active?'rgba(88,166,255,0.08)':'transparent'}'">
      <span style="font-size:12px;margin-top:1px;flex-shrink:0">${done?'✅':'⬜'}</span>
      <div>
        <div style="color:${done?'#3fb950':'#c9d1d9'};font-size:10px;font-weight:${active?'bold':'normal'}">${li+1}. ${ch.title}</div>
      </div>
    </div>`;
  }).join('');
  const done = co.challenges.filter(idx => _completed.has(idx)).length;
  const pct = Math.round((done / co.challenges.length) * 100);
  inner.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
      <button onclick="renderCourseHome()" style="background:none;border:none;color:#58a6ff;cursor:pointer;font-size:14px;padding:0;line-height:1" title="Back to courses">←</button>
      <span style="font-size:16px">${co.icon}</span>
      <span style="color:#c9d1d9;font-size:11px;font-weight:bold;flex:1">${co.title}</span>
    </div>
    <div style="color:#6e7681;font-size:9px;margin-bottom:6px">${co.desc}</div>
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
      <div style="flex:1;background:#21262d;border-radius:3px;height:5px;overflow:hidden">
        <div style="background:${co.color};height:5px;width:${pct}%"></div>
      </div>
      <span style="color:#6e7681;font-size:9px;white-space:nowrap">${done}/${co.challenges.length} done</span>
    </div>
    <div style="border-top:1px solid #21262d;padding-top:8px">${lessonRows}</div>
  `;
}

function renderCoursePanel() {
  const co = COURSES[_currentCourse];
  const ch = CHALLENGES[_currentChallenge];
  const lessonIdx = _currentChallengeIdx;
  const totalLessons = co.challenges.length;
  const inner = document.getElementById('course-inner');
  if (!inner) return;
  const lessonList = co.challenges.map((chIdx, li) => {
    const done2 = _completed.has(chIdx);
    const active2 = li === lessonIdx;
    return `<div onclick="loadChallenge(${_currentCourse},${li})" title="${CHALLENGES[chIdx].title}" style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${active2?co.color:(done2?co.color+'22':'#21262d')};border:2px solid ${active2?co.color:(done2?co.color:'#30363d')};color:${active2?'#0d1117':(done2?co.color:'#6e7681')};font-size:9px;font-weight:bold;flex-shrink:0" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">${done2&&!active2?'✓':(li+1)}</div>`;
  }).join('');
  inner.innerHTML = `
    <div style="display:flex;align-items:center;gap:5px;margin-bottom:8px">
      <button onclick="renderCourseOutline(${_currentCourse})" style="background:none;border:none;color:#58a6ff;cursor:pointer;font-size:13px;padding:0;line-height:1" title="Back to outline">←</button>
      <span style="font-size:14px">${co.icon}</span>
      <span style="color:#8b949e;font-size:9px">${co.title}</span>
    </div>
    <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;align-items:center">${lessonList}</div>
    <div style="font-size:9px;color:#6e7681;margin-bottom:8px">Lesson ${lessonIdx+1} of ${totalLessons}</div>
    <div class="ch-title">${ch.title}</div>
    <div class="ch-scenario">${ch.scenario}</div>
    <div id="ch-hints-area"></div>
    <button class="ch-hint-btn" onclick="showNextHint()">💡 Hint</button>
    <button class="ch-check-btn" onclick="checkChallenge()">✓ Check</button>
    <div id="ch-result" class="ch-result" style="display:none"></div>
    ${lessonIdx > 0 ? `<button class="btn" onclick="loadChallenge(${_currentCourse},${lessonIdx-1})" style="margin-top:6px;font-size:10px">← Prev</button>` : ''}
  `;
}

function showNextHint() {
  const ch = CHALLENGES[_currentChallenge];
  if (_hintsShown >= ch.hints.length) return;
  const area = document.getElementById('ch-hints-area');
  const d = document.createElement('div');
  d.className = 'ch-hint-text';
  d.textContent = ch.hints[_hintsShown++];
  area.appendChild(d);
  if (_hintsShown >= ch.hints.length) {
    const btn = document.querySelector('.ch-hint-btn');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.4'; }
  }
}

function checkChallenge() {
  const ch = CHALLENGES[_currentChallenge];
  const res = ch.validate();
  const el = document.getElementById('ch-result');
  el.style.display = 'block';
  if (res.pass) {
    el.className = 'ch-result pass';
    el.textContent = '✓ ' + (res.msg || 'Correct! Well done.');
    _markComplete(_currentChallenge);
    setTimeout(() => showExplainer(_currentChallenge), 1200);
  } else {
    el.className = 'ch-result fail';
    el.textContent = '✗ ' + (res.msg || 'Not quite — check the hints and try again.');
  }
}

function showExplainer(idx) {
  const ch = CHALLENGES[idx];
  const modal = document.getElementById('explainer-modal');
  document.getElementById('explainer-title').textContent = '📖 ' + ch.explainer.title;
  document.getElementById('explainer-body').innerHTML = ch.explainer.body.split('\n').map(p=>p.trim()).filter(Boolean).map(p=>`<p style="margin-bottom:10px">${p}</p>`).join('');
  document.getElementById('explainer-takeaway-text').textContent = ch.explainer.takeaway;
  modal.classList.add('show');
}

function closeExplainer() {
  document.getElementById('explainer-modal').classList.remove('show');
  const co = COURSES[_currentCourse];
  if (_currentChallengeIdx + 1 < co.challenges.length) {
    loadChallenge(_currentCourse, _currentChallengeIdx + 1);
  } else {
    const inner = document.getElementById('course-inner');
    if (inner) inner.innerHTML = `<div style="text-align:center;padding:20px"><div style="font-size:32px">${co.icon}</div><div style="color:${co.color};font-size:13px;font-weight:bold;margin-top:8px">Course Complete!</div><div style="font-size:10px;color:#8b949e;margin-top:6px">${co.title} — all lessons done.</div><button class="btn" onclick="renderCourseHome()" style="margin-top:12px;font-size:10px">← All Courses</button></div>`;
  }
}

// ── Multimeter ─────────────────────────────────────────────────────────────

let _mmMode = 'V';
let _mmRed = null, _mmBlack = null;
let _mmActiveProbe = null;
let mmLastReading = null;

// ── Ohm's Law triangle calculator ─────────────────────────────────────────
let _ohmTarget = null; // 'V', 'I', or 'R'

const _ohmFormulas = {
  V: 'V = I × R',
  I: 'I = V ÷ R',
  R: 'R = V ÷ I',
};
const _ohmFmt = n => {
  if(!isFinite(n)||isNaN(n)) return '?';
  const a=Math.abs(n);
  if(a===0) return '0';
  if(a>=1e6) return parseFloat((n/1e6).toPrecision(4))+'M';
  if(a>=1e3) return parseFloat((n/1e3).toPrecision(4))+'k';
  if(a>=1)   return parseFloat(n.toPrecision(4))+'';
  if(a>=1e-3)return parseFloat((n*1e3).toPrecision(3))+'m';
  return parseFloat((n*1e6).toPrecision(3))+'µ';
};

function ohmSelect(key) {
  _ohmTarget = key;
  ['V','I','R'].forEach(k => {
    const sec = document.getElementById('ohm-sec-'+k);
    const inp = document.getElementById('ohm-in-'+k);
    const res = document.getElementById('ohm-res-'+k);
    const unt = document.getElementById('ohm-unit-'+k);
    const frm = document.getElementById('ohm-formula-'+k);
    sec.classList.toggle('ohm-target', k === key);
    if(k === key) {
      // this section is the output — show formula, hide input, show result area
      inp.style.display = 'none';
      frm.textContent = _ohmFormulas[k];
      frm.style.display = '';
      res.style.display = '';
      unt.style.display = '';
    } else {
      // this section is an input
      frm.style.display = 'none';
      inp.style.display = '';
      res.style.display = 'none';
      unt.style.display = 'none';
    }
  });
  document.getElementById('ohm-hint').textContent = 'Enter the two known values →';
  ohmRun();
  // focus first input
  const others = ['V','I','R'].filter(k=>k!==key);
  const first = document.getElementById('ohm-in-'+others[0]);
  if(first) first.focus();
}

function ohmRun() {
  if(!_ohmTarget) return;
  const pEl = document.getElementById('ohm-power');
  const resEl = document.getElementById('ohm-res-'+_ohmTarget);
  const untEl = document.getElementById('ohm-unit-'+_ohmTarget);
  const others = ['V','I','R'].filter(k=>k!==_ohmTarget);
  const a = parseFloat(document.getElementById('ohm-in-'+others[0]).value);
  const b = parseFloat(document.getElementById('ohm-in-'+others[1]).value);
  if(isNaN(a)||isNaN(b)) { resEl.textContent='?'; pEl.textContent=''; return; }
  let result, P;
  if(_ohmTarget==='V') { result=a*b; }           // I × R
  else if(_ohmTarget==='I') { result=b===0?NaN:a/b; } // V ÷ R
  else { result=b===0?NaN:a/b; }                // V ÷ I
  if(!isFinite(result)||isNaN(result)||result<0) {
    resEl.textContent='⚠'; pEl.textContent=''; return;
  }
  const V = _ohmTarget==='V'?result:(others[0]==='V'?a:b);
  const I = _ohmTarget==='I'?result:(others[0]==='I'?a:b);
  resEl.textContent = _ohmFmt(result);
  untEl.style.display = '';
  P = V * I;
  pEl.style.color = '#fbbf24';
  pEl.textContent = `P = ${_ohmFmt(P)}W`;
}

function ohmClear() {
  _ohmTarget = null;
  ['V','I','R'].forEach(k=>{
    document.getElementById('ohm-in-'+k).value='';
    document.getElementById('ohm-in-'+k).style.display='none';
    document.getElementById('ohm-res-'+k).textContent='';
    document.getElementById('ohm-res-'+k).style.display='none';
    document.getElementById('ohm-unit-'+k).style.display='none';
    document.getElementById('ohm-formula-'+k).textContent='tap to calculate';
    document.getElementById('ohm-formula-'+k).style.display='';
    document.getElementById('ohm-sec-'+k).classList.remove('ohm-target');
  });
  document.getElementById('ohm-power').textContent='';
  document.getElementById('ohm-hint').textContent='Tap a section to calculate it';
}

function setMMMode(m) {
  _mmMode = m;
  document.querySelectorAll('.mm-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
  refreshMMReading();
}

function activateProbe(color) {
  _mmActiveProbe = _mmActiveProbe === color ? null : color;
  document.querySelector('.mm-red-btn').classList.toggle('active', _mmActiveProbe === 'red');
  document.querySelector('.mm-black-btn').classList.toggle('active', _mmActiveProbe === 'black');
  SVG.style.cursor = _mmActiveProbe ? 'crosshair' : '';
}

function resetProbes() {
  _mmRed = null; _mmBlack = null; _mmActiveProbe = null;
  document.querySelector('.mm-red-btn').classList.remove('active');
  document.querySelector('.mm-black-btn').classList.remove('active');
  SVG.style.cursor = '';
  renderProbes();
  refreshMMReading();
}

function renderProbes() {
  const layer = document.getElementById('probe-g');
  if (!layer) return;
  layer.innerHTML = '';
  if (_mmRed) {
    layer.appendChild(mk('circle',{cx:_mmRed.x,cy:_mmRed.y,r:7,fill:'#ef4444',stroke:'#fff','stroke-width':1.5,opacity:0.9}));
    const t=mk('text',{x:_mmRed.x,y:_mmRed.y-10,'text-anchor':'middle',style:'fill:#ef4444;font-size:8px;font-family:Courier New'});
    t.textContent='R'; layer.appendChild(t);
  }
  if (_mmBlack) {
    layer.appendChild(mk('circle',{cx:_mmBlack.x,cy:_mmBlack.y,r:7,fill:'#1f2937',stroke:'#9ca3af','stroke-width':1.5,opacity:0.9}));
    const t=mk('text',{x:_mmBlack.x,y:_mmBlack.y-10,'text-anchor':'middle',style:'fill:#9ca3af;font-size:8px;font-family:Courier New'});
    t.textContent='B'; layer.appendChild(t);
  }
}

function getNodeVAt(pt) {
  if (!pt || !window.simNodeV) return undefined;
  return window.simNodeV[nk(pt.x, pt.y)];
}

function getVoltageAt(pt) {
  const nid = getNodeVAt(pt);
  if (nid === undefined || !window.simVoltages) return null;
  return window.simVoltages[nid] ?? null;
}

function refreshMMReading() {
  const disp = document.getElementById('mm-reading');
  const unitEl = document.getElementById('mm-unit');
  if (!disp) return;

  if (!_mmRed && !_mmBlack) { disp.textContent = '---'; unitEl.textContent = ''; mmLastReading=null; return; }

  if (_mmMode === 'V') {
    const vr = getVoltageAt(_mmRed), vb = getVoltageAt(_mmBlack);
    if (vr === null || vb === null) { disp.textContent = '---'; unitEl.textContent = 'V'; mmLastReading=null; return; }
    const diff = vr - vb; mmLastReading = diff;
    disp.textContent = Math.abs(diff) >= 1000 ? (diff/1000).toFixed(2)+'k' : diff.toFixed(2);
    unitEl.textContent = 'V';
  } else if (_mmMode === 'A') {
    let best = null, bestD = 1e9;
    comps.forEach(c => {
      [[c.x1,c.y1],[c.x2,c.y2]].forEach(([tx,ty]) => {
        if (!_mmRed) return;
        const d = Math.hypot(tx-_mmRed.x, ty-_mmRed.y);
        if (d < bestD && c.simI != null) { bestD=d; best=c; }
      });
    });
    if (!best) { disp.textContent = '---'; unitEl.textContent = 'A'; mmLastReading=null; return; }
    const i = Math.abs(best.simI); mmLastReading = i;
    if (i < 1) { disp.textContent = (i*1000).toFixed(1); unitEl.textContent = 'mA'; }
    else { disp.textContent = i.toFixed(3); unitEl.textContent = 'A'; }
  } else if (_mmMode === 'Ω') {
    let found = null;
    comps.forEach(c => {
      if (!_mmRed || !_mmBlack) return;
      const m1 = (Math.hypot(c.x1-_mmRed.x,c.y1-_mmRed.y)<G && Math.hypot(c.x2-_mmBlack.x,c.y2-_mmBlack.y)<G);
      const m2 = (Math.hypot(c.x2-_mmRed.x,c.y2-_mmRed.y)<G && Math.hypot(c.x1-_mmBlack.x,c.y1-_mmBlack.y)<G);
      if ((m1||m2) && (c.type==='R'||c.type==='bulb')) found=c;
    });
    if (!found) { disp.textContent = '---'; unitEl.textContent = 'Ω'; mmLastReading=null; return; }
    mmLastReading = found.value;
    disp.textContent = found.value >= 1000 ? (found.value/1000).toFixed(2)+'k' : found.value.toFixed(0);
    unitEl.textContent = 'Ω';
  } else if (_mmMode === '≋') {
    const nidR = getNodeVAt(_mmRed), nidB = getNodeVAt(_mmBlack);
    if (nidR === undefined || nidB === undefined) { disp.textContent = '?'; unitEl.textContent = 'CONT'; mmLastReading=null; return; }
    if (nidR === nidB) {
      disp.textContent = 'BEEP'; unitEl.textContent = '✓ CONT'; mmLastReading = 0;
      try {
        const ctx = new (window.AudioContext||window.webkitAudioContext)();
        const osc = ctx.createOscillator(); osc.frequency.value = 880;
        osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime+0.1);
      } catch(e){}
    } else { disp.textContent = 'OPEN'; unitEl.textContent = '✗ CONT'; mmLastReading = Infinity; }
  }
}

// Tool widget: minimise/expand + drag
(function(){
  function makeDraggable(widgetId, headerId) {
    const w = document.getElementById(widgetId);
    const h = document.getElementById(headerId);
    let sx, sy, or, ob;
    h.addEventListener('mousedown', e => {
      if(e.target.classList.contains('tool-mini-btn')) return;
      if(w.classList.contains('tool-mini')) return; // no drag when docked
      e.preventDefault();
      const r = w.getBoundingClientRect();
      sx=e.clientX; sy=e.clientY;
      or=window.innerWidth-r.right; ob=window.innerHeight-r.bottom;
      w.style.right=or+'px'; w.style.bottom=ob+'px';
      const onMove = e => {
        w.style.right=(or-(e.clientX-sx))+'px';
        w.style.bottom=(ob-(e.clientY-sy))+'px';
      };
      const onUp = () => {
        document.removeEventListener('mousemove',onMove);
        document.removeEventListener('mouseup',onUp);
      };
      document.addEventListener('mousemove',onMove);
      document.addEventListener('mouseup',onUp);
    });
  }
  makeDraggable('ohm-widget','ohm-header');
  makeDraggable('mm-widget','mm-header');
})();

function toggleToolMini(which) {
  const w = document.getElementById(which+'-widget');
  const btn = document.getElementById(which+'-mini-btn');
  const isMini = w.classList.toggle('tool-mini');
  btn.textContent = '−';
  btn.title = isMini ? 'Expand' : 'Minimise';
  if(!isMini) {
    // restore to a sensible expanded position above the dock
    if(which==='mm') { w.style.right='20px'; w.style.bottom='20px'; }
    else             { w.style.right='210px'; w.style.bottom='20px'; }
  }
}

