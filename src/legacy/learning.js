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

This is the universal SPDT principle — it applies to any two-way arrangement, from staircase lighting to changeover relays. The UK plate-switch wiring practice (terminal layout and cable colours) is covered in its own lesson.`,
      takeaway: 'SPDT two-way switching: lamp is ON when both switches share the same strapper (both L1 or both L2). Either switch independently flips the circuit.',
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

  // ════════════════════════════════════════════════════════════════════════
  // Theory lessons (quiz-based, non-practical) — indices 14+
  // Mapped to the C&G 2365 Level 2 units: Health & Safety, Principles of
  // Electrical Science, Installations Technology, Installation of Wiring
  // Systems — referencing BS 7671 (IET Wiring Regulations), the IET On-Site
  // Guide, and the Electricity at Work Regulations 1989.
  // ════════════════════════════════════════════════════════════════════════

  // Ch 14 — What Is Electricity?
  {
    title: 'What Is Electricity?',
    theory: true,
    content: [
      "Everything is made of atoms, and atoms contain <strong>electrons</strong> — tiny particles carrying a negative charge. In metals like copper, the outer electrons are loosely held and free to move. <strong>Electric current</strong> is the organised flow of these electrons through a material.",
      "Current is measured in <strong>amperes (A)</strong> — one ampere is roughly six billion billion electrons passing a point every second. For electrons to flow, two things are needed: a source of <strong>electromotive force</strong> (a battery or generator providing voltage) and a <strong>closed circuit</strong> — an unbroken conductive loop from one terminal of the source to the other.",
      "<strong>Voltage (V)</strong> is the electrical pressure pushing electrons around the circuit, measured in volts. Think of a water analogy: voltage is the pump pressure, current is the flow rate, and the pipes are the conductors.",
      "Materials divide into <strong>conductors</strong> (copper, aluminium, brass — and also water and the human body) which allow current to flow, and <strong>insulators</strong> (PVC, rubber, glass, dry air) which resist it. Cable design uses both: copper cores to carry current, PVC sheathing to keep it where it belongs.",
    ],
    quiz: [
      {q: 'What is electric current?', options: ['Stored electrical pressure', 'The organised flow of electrons through a conductor', 'The resistance of a material', 'Energy stored in an atom'], a: 1},
      {q: 'What must a circuit have for current to flow?', options: ['A fuse and a switch', 'At least two lamps', 'A source of voltage and a complete (closed) loop', 'An earth connection'], a: 2},
      {q: 'Which of these is a conductor?', options: ['PVC', 'Dry rubber', 'Glass', 'Copper'], a: 3},
    ],
    explainer: {
      title: 'What Is Electricity?',
      body: `Current is the flow of electrons, driven by voltage, through a closed conductive loop. No closed loop, no current — which is exactly why a switch works: it opens the loop.

Conductors carry current; insulators contain it. Remember that water and the human body are conductors — this single fact underpins almost every safety rule you will learn.`,
      takeaway: 'Current (amperes) = electron flow. Voltage (volts) = the pressure driving it. It only flows around a complete circuit of conductive material.',
    },
  },

  // Ch 15 — Ohm's Law
  {
    title: "Ohm's Law: V = I × R",
    theory: true,
    content: [
      "<strong>Resistance (R)</strong>, measured in ohms (Ω), is how strongly a material opposes current. Long thin wires have more resistance than short fat ones; heating elements are deliberately resistive; copper cable is deliberately not.",
      "<strong>Ohm's Law</strong> ties the three quantities together: <strong>V = I × R</strong>. Rearranged: <strong>I = V ÷ R</strong> and <strong>R = V ÷ I</strong>. Cover the one you want in the V-I-R triangle and the layout tells you the formula — the floating triangle widget in this app does exactly that.",
      "Example: a 230 V supply across a 115 Ω heating element drives I = 230 ÷ 115 = <strong>2 A</strong>. Double the resistance to 230 Ω and the current halves to 1 A. Voltage and current are proportional; current and resistance are inversely proportional.",
      "Electricians use this constantly: predicting current draw, sizing protective devices, and recognising fault conditions — a near-zero resistance (short circuit) across 230 V gives an enormous current, which is why protective devices must operate fast.",
    ],
    quiz: [
      {q: 'A 230 V supply is connected across 23 Ω. What current flows?', options: ['0.1 A', '10 A', '23 A', '5290 A'], a: 1},
      {q: 'If resistance doubles and voltage stays the same, the current…', options: ['doubles', 'stays the same', 'halves', 'drops to zero'], a: 2},
      {q: 'What voltage drives 2 A through a 6 Ω resistor?', options: ['3 V', '8 V', '12 V', '0.33 V'], a: 2},
    ],
    explainer: {
      title: "Ohm's Law",
      body: `V = I × R is the single most-used equation in electrical work. Given any two of voltage, current and resistance, you can always find the third.

A short circuit is just Ohm's Law at the extreme: R approaches zero, so I approaches infinity — limited only by the supply and cable impedance. That is why fault protection exists.`,
      takeaway: "Ohm's Law: V = I × R, I = V ÷ R, R = V ÷ I. Current is proportional to voltage and inversely proportional to resistance.",
    },
  },

  // Ch 16 — Power & Energy
  {
    title: 'Power & Energy: P = V × I',
    theory: true,
    content: [
      "<strong>Power (P)</strong> is the rate at which electrical energy is converted into heat, light or motion, measured in <strong>watts (W)</strong>. The fundamental formula is <strong>P = V × I</strong>. Combining it with Ohm's Law gives two more forms: <strong>P = I² × R</strong> and <strong>P = V² ÷ R</strong>.",
      "Example: a 3 kW kettle on a 230 V supply draws I = 3000 ÷ 230 ≈ <strong>13 A</strong> — which is exactly why UK plug fuses top out at 13 A, and why a kettle should never share an adaptor with another heavy load.",
      "P = I²R explains why cable size matters: current flowing through cable resistance dissipates heat in the cable itself. Doubling the current quadruples the heating — an overloaded cable gets dangerously hot long before its insulation visibly fails.",
      "<strong>Energy</strong> is power sustained over time, billed in <strong>kilowatt-hours (kWh)</strong>: one kWh is 1 kW running for one hour. A 2 kW heater on for 3 hours uses 6 kWh — the units your electricity meter records.",
    ],
    quiz: [
      {q: 'A 2.3 kW immersion heater runs on 230 V. What current does it draw?', options: ['1 A', '10 A', '23 A', '100 A'], a: 1},
      {q: 'A 2 kW fire runs for 3 hours. How much energy is used?', options: ['1.5 kWh', '5 kWh', '6 kWh', '600 kWh'], a: 2},
      {q: 'Which formula gives power when you know current and resistance but not voltage?', options: ['P = V × I', 'P = I² × R', 'P = V² ÷ R', 'V = I × R'], a: 1},
    ],
    explainer: {
      title: 'Power & Energy',
      body: `P = V × I sizes everything: appliance ratings, plug fuses, circuit breakers, cable selection. At UK mains voltage a useful rule of thumb is 1 kW ≈ 4.3 A.

I²R heating is the hidden hazard — the same physics that makes a toaster glow makes an undersized cable a fire risk.`,
      takeaway: 'P = V × I = I²R = V²/R. Energy = power × time, billed in kWh. At 230 V, roughly 4.3 A flows per kW.',
    },
  },

  // Ch 17 — Series & Parallel Circuits
  {
    title: 'Series & Parallel Circuits',
    theory: true,
    content: [
      "In a <strong>series</strong> circuit, components form a single loop: the <strong>same current</strong> flows through every component, the supply voltage <strong>divides</strong> across them, and resistances simply <strong>add</strong>: R = R1 + R2 + … One break anywhere stops everything — old fairy lights were the classic example.",
      "In a <strong>parallel</strong> circuit, each component connects directly across the supply: every branch sees the <strong>full supply voltage</strong>, the current <strong>divides</strong> between branches, and total resistance is always <strong>less than the smallest branch</strong>. For two resistors: R = (R1 × R2) ÷ (R1 + R2). Two equal 10 Ω resistors in parallel give 5 Ω.",
      "Domestic installations are wired in <strong>parallel</strong>: every socket and light receives the full 230 V, each load draws its own design current, and switching one off does not affect the others.",
      "Series behaviour still matters on site: a loose terminal adds unwanted series resistance — it drops voltage, dissipates I²R heat right at the joint, and is a leading cause of scorched accessories.",
    ],
    quiz: [
      {q: 'Two 10 Ω resistors in series total…', options: ['5 Ω', '10 Ω', '20 Ω', '100 Ω'], a: 2},
      {q: 'Two 10 Ω resistors in parallel total…', options: ['5 Ω', '10 Ω', '20 Ω', '0 Ω'], a: 0},
      {q: 'Why are domestic circuits wired in parallel?', options: ['It uses less cable', 'Each load gets the full supply voltage and works independently', 'It limits the current to safe values', 'Parallel wiring needs no earth'], a: 1},
    ],
    explainer: {
      title: 'Series & Parallel',
      body: `Series: one path — current common, voltage divides, resistance adds. Parallel: many paths — voltage common, current divides, total resistance falls.

Houses are parallel so every load is independent at full voltage. Unintended series resistance (a loose connection) is a defect: it steals voltage and creates heat exactly where you do not want it.`,
      takeaway: 'Series: R adds, same I, V divides. Parallel: same V, I divides, total R is below the smallest branch. Domestic wiring is parallel.',
    },
  },

  // Ch 18 — AC, DC & the UK Supply
  {
    title: 'AC, DC & the UK Supply',
    theory: true,
    content: [
      "<strong>Direct current (DC)</strong> flows one way only — batteries, solar panels, electronics. <strong>Alternating current (AC)</strong> reverses direction in a smooth sine wave. The UK grid alternates at <strong>50 hertz</strong> — fifty full cycles every second.",
      "The UK declares <strong>230 V</strong> nominal (it was 240 V before European harmonisation, and measured supplies often still sit near 240). That 230 V is the <strong>RMS</strong> (root-mean-square) value — the effective value that delivers the same heating as DC. The actual sine wave peaks at about <strong>325 V</strong>.",
      "Why AC for distribution? <strong>Transformers</strong>. They only work with alternating current, and they let the grid step voltage up to 400,000 V for efficient long-distance transmission (high voltage means low current, so low I²R cable losses) and back down to 230 V for homes.",
      "A domestic single-phase supply arrives as two conductors — <strong>line</strong> and <strong>neutral</strong> — plus an earth facility. Larger premises take three-phase: three lines, 400 V between phases, 230 V from any phase to neutral.",
    ],
    quiz: [
      {q: 'What is the frequency of the UK mains supply?', options: ['60 Hz', '50 Hz', '230 Hz', '13 Hz'], a: 1},
      {q: 'The 230 V figure quoted for UK mains is…', options: ['the peak of the sine wave', 'the DC equivalent stored in the cable', 'the RMS (effective) value — the peak is about 325 V', 'the three-phase value'], a: 2},
      {q: 'Why is AC used for the national grid?', options: ['AC is safer to touch than DC', 'Transformers can step AC voltage up and down, cutting transmission losses', 'AC travels faster down the cable', 'Generators cannot produce DC'], a: 1},
    ],
    explainer: {
      title: 'AC, DC & the UK Supply',
      body: `UK mains: 230 V RMS nominal, 50 Hz single-phase for homes, 400 V three-phase for bigger loads. RMS is the working value — but remember the wave peaks at ~325 V, which is what your insulation actually withstands.

AC won the grid because transformers make voltage conversion almost lossless, and high-voltage transmission slashes I²R losses.`,
      takeaway: 'UK supply: 230 V RMS at 50 Hz (peak ≈ 325 V). AC enables transformers; transformers enable the grid.',
    },
  },

  // Ch 19 — The Law: EAWR 1989
  {
    title: 'The Law: Electricity at Work Regulations 1989',
    theory: true,
    content: [
      "The <strong>Electricity at Work Regulations 1989 (EAWR)</strong> are <strong>statutory</strong> — criminal law, made under the Health and Safety at Work etc. Act 1974. They apply to every workplace electrical system and place duties on employers, employees and the self-employed alike: everyone must comply so far as matters are within their control.",
      "Core requirements: electrical systems must be constructed and <strong>maintained to prevent danger</strong>; work activities must not give rise to danger; and equipment must be suitable for its environment.",
      "<strong>Regulation 14</strong> is the one every electrician can recite: no work on or near <strong>live</strong> conductors unless it is <strong>unreasonable</strong> to work dead, it is <strong>reasonable</strong> to work live, AND suitable precautions are taken. Convenience and saving time never qualify — dead working is the default, every time.",
      "<strong>BS 7671 (the IET Wiring Regulations)</strong> is different: it is a British Standard, <strong>non-statutory</strong> in itself. But compliance with BS 7671 is the accepted way to demonstrate you have satisfied the EAWR — which is why it is treated as mandatory in practice.",
    ],
    quiz: [
      {q: 'What is the legal status of the EAWR 1989?', options: ['Guidance only', 'Statutory — breaching them is a criminal offence', 'A British Standard', 'An IET code of practice'], a: 1},
      {q: 'Under Regulation 14, live working is permitted only when…', options: ['the job is small and quick', 'a second person is watching', 'it is unreasonable to work dead, reasonable to work live, and precautions are in place', 'the circuit is RCD protected'], a: 2},
      {q: 'BS 7671 itself is…', options: ['statutory law', 'non-statutory, but compliance demonstrates EAWR compliance', 'only relevant to new builds', 'an EU regulation'], a: 1},
    ],
    explainer: {
      title: 'EAWR 1989 & BS 7671',
      body: `EAWR 1989 is the law: maintain systems to prevent danger, and work dead unless live working is genuinely justified and properly safeguarded.

BS 7671 is the standard that tells you how. Follow it and you can demonstrate compliance with the law — which is why every UK installation is designed, installed and tested against it.`,
      takeaway: 'EAWR 1989 = statutory duty, dead working by default (Reg 14). BS 7671 = the non-statutory standard used to prove compliance.',
    },
  },

  // Ch 20 — Electric Shock & the Human Body
  {
    title: 'Electric Shock & the Human Body',
    theory: true,
    content: [
      "It is <strong>current</strong>, not voltage, that injures: voltage just determines how much current your body resistance lets through. A few milliamps is a tingle; around 10–20 mA muscles clamp and you may be <strong>unable to let go</strong> (AC is worse than DC for this); above roughly 30–50 mA across the chest, <strong>ventricular fibrillation</strong> — the heart quivering uselessly — becomes likely. That is why additional protection RCDs trip at <strong>30 mA</strong> within 40 ms.",
      "Body resistance varies hugely: dry intact skin may be 100 kΩ; wet or broken skin a few hundred ohms. The same 230 V contact can be a jolt one day and fatal the next. BS 7671 treats <strong>50 V AC</strong> as the conventional touch-voltage limit for dry conditions.",
      "Shock is not the only harm: current causes deep <strong>burns</strong> along its path, and arc flash from a short circuit causes radiant burns and eye damage without any contact at all.",
      "Finding someone receiving a shock: <strong>do not touch them</strong> — you become the next casualty. Isolate the supply first. If you cannot, push them clear with something non-conductive (dry wood, rolled clothing). Then call 999 and start CPR if they are not breathing normally.",
    ],
    quiz: [
      {q: 'What actually causes injury in an electric shock?', options: ['Voltage across the skin', 'Current flowing through the body', 'The frequency alone', 'Static charge'], a: 1},
      {q: 'Why are additional-protection RCDs rated at 30 mA?', options: ['It matches the 32 A MCB', 'Below the level likely to cause ventricular fibrillation', 'It is the maximum a cable can leak', 'It is one tenth of a plug fuse'], a: 1},
      {q: 'You find a colleague rigid and in contact with a live conductor. First action?', options: ['Pull them off by the arm', 'Throw water to break the contact', 'Isolate the supply — never touch them while they are live', 'Start CPR immediately while they are still in contact'], a: 2},
    ],
    explainer: {
      title: 'Electric Shock',
      body: `Milliamps kill: ~10–20 mA freezes muscles, ~30–50 mA through the chest can stop the heart. The 30 mA RCD exists precisely to disconnect before fibrillation territory.

Casualty drill: isolate first, never touch a live casualty, 999, CPR. Burns and arc flash injure too — shocks are not the whole story.`,
      takeaway: 'Current kills, from tens of milliamps. 30 mA RCDs protect against fibrillation. Isolate before touching any shock casualty.',
    },
  },

  // Ch 21 — Safe Isolation Procedure
  {
    title: 'Safe Isolation Procedure',
    theory: true,
    content: [
      "<strong>Safe isolation</strong> is the formal procedure proving a circuit is dead before you touch it. It is the practical heart of dead working under EAWR Regulation 14, and it must be followed in full, every time — most fatal accidents in the trade trace back to skipping a step.",
      "The sequence: <strong>1)</strong> Identify the circuit and obtain permission to isolate. <strong>2)</strong> Isolate — switch off and disconnect the means of supply. <strong>3)</strong> Secure the isolation: <strong>lock off</strong> the device with a unique key or multi-lock hasp that stays in your pocket, and fit warning signage. <strong>4)</strong> <strong>Prove</strong> your voltage indicator works on a known live source or proving unit. <strong>5)</strong> Test the circuit dead at the point of work — every combination: line–neutral, line–earth, neutral–earth. <strong>6)</strong> <strong>Re-prove</strong> the indicator on the known source — confirming it did not fail during the test.",
      "The instrument matters: an <strong>approved two-pole voltage indicator</strong> meeting HSE Guidance Note <strong>GS38</strong> — finger guards, minimal exposed probe tips, fused leads. Never a neon screwdriver (unreliable), and not a multimeter (too easy to set wrongly and read a dead circuit on the wrong range).",
      "Prove–test–prove is the unbreakable pattern: a voltage indicator that died between proving and testing would otherwise tell you a live circuit is dead.",
    ],
    quiz: [
      {q: 'What is the correct order?', options: ['Test dead → isolate → lock off → prove tester', 'Isolate → lock off → prove tester → test dead → re-prove tester', 'Prove tester → test dead → isolate → sign', 'Lock off → test dead → isolate → prove'], a: 1},
      {q: 'Why prove the voltage indicator both before AND after testing dead?', options: ['To warm the instrument up', 'Regulations require two readings for the certificate', 'To confirm the indicator was working during the dead test — a failed tester reads everything as dead', 'To discharge stored voltage'], a: 2},
      {q: 'Which instrument is correct for proving dead?', options: ['A neon screwdriver', 'Any digital multimeter', 'An approved two-pole voltage indicator to GS38', 'A clamp meter'], a: 2},
    ],
    explainer: {
      title: 'Safe Isolation',
      body: `Identify → isolate → lock off with a unique key → prove the tester → test dead (L–N, L–E, N–E) → re-prove the tester. Signage up, key in your pocket, GS38 two-pole indicator in hand.

The procedure has no optional steps. Prove–test–prove is what stands between you and a tester that failed at exactly the wrong moment.`,
      takeaway: 'Safe isolation: isolate, lock off (unique key), prove–test–prove with a GS38 two-pole voltage indicator, testing all conductor combinations.',
    },
  },

  // Ch 22 — PPE & Safe Working Practice
  {
    title: 'PPE & Safe Working Practice',
    theory: true,
    content: [
      "The <strong>hierarchy of control</strong> puts personal protective equipment <strong>last</strong>: eliminate the hazard (work dead), reduce it, isolate it, control it procedurally — and only then rely on PPE for whatever risk remains. PPE protects one person, only if worn, only if maintained.",
      "An electrician's core kit: <strong>insulated hand tools</strong> to BS EN 60900 (rated 1000 V, marked with the double-triangle symbol); a <strong>GS38 voltage indicator</strong> with fused leads; <strong>safety footwear</strong>; <strong>eye protection</strong> when drilling, chasing or anywhere arc flash is conceivable; and gloves appropriate to the task.",
      "Habits that count as controls: remove <strong>metallic jewellery</strong> and watches (a ring across a busbar is a molten ring); barriers and warning signs around open boards; never leave an exposed live part unattended; keep the work area dry and lit.",
      "Beyond electrical: safe use of <strong>steps and ladders</strong> (three points of contact, correct angle), dust control when chasing walls, and asbestos awareness in pre-2000 buildings — stop work and report if suspect materials are found.",
    ],
    quiz: [
      {q: 'Where does PPE sit in the hierarchy of control?', options: ['First — always start with PPE', 'Last — after elimination, reduction, isolation and procedural controls', 'Second, after signage', 'It replaces the need for safe isolation'], a: 1},
      {q: 'Insulated hand tools for electrical work are made to…', options: ['BS 1363', 'BS EN 60900, rated 1000 V', 'GS38', 'BS 7671 Part 6'], a: 1},
      {q: 'Why remove rings and metal watches before electrical work?', options: ['They scratch accessories', 'Metal jewellery can bridge live parts and cause severe burns', 'They interfere with test instruments', 'Regulation 14 bans jewellery outright'], a: 1},
    ],
    explainer: {
      title: 'PPE & Safe Working',
      body: `PPE is the last line of defence, not the first: the hierarchy starts with eliminating the hazard — which in this trade means working dead.

Insulated tools (BS EN 60900), GS38 tester, eye protection, no jewellery, barriers and signage: small disciplines that close off the most common accident routes.`,
      takeaway: 'Hierarchy of control: PPE comes last. Insulated tools to BS EN 60900, GS38 tester, no metallic jewellery, barriers and signs.',
    },
  },

  // Ch 23 — Inside the Consumer Unit
  {
    title: 'Inside the Consumer Unit',
    theory: true,
    content: [
      "The <strong>consumer unit</strong> (CU) is the heart of a domestic installation: it receives the supply via the meter <strong>tails</strong>, provides the <strong>main switch</strong>, and distributes power to every final circuit through individual protective devices.",
      "The main switch is a <strong>double-pole isolator</strong> — it breaks line AND neutral together, giving one place to make the whole installation dead. From it, a <strong>busbar</strong> runs along the row of protective devices, feeding each circuit 'way'. Neutrals and earths return to their respective terminal bars.",
      "Modern boards are commonly <strong>split-load</strong> or all-RCBO: either circuits grouped under shared RCDs (so one earth fault does not black out the whole house — and circuits like lighting and freezers sit on different banks), or one RCBO per circuit for full independence.",
      "Since Amendment 3 of the 17th Edition, domestic consumer units must have a <strong>non-combustible enclosure</strong> — in practice, steel — to contain any fire starting at a loose terminal. Boards increasingly also carry a <strong>surge protection device (SPD)</strong> protecting electronics from transient overvoltages.",
    ],
    quiz: [
      {q: 'What does the CU main switch disconnect?', options: ['Line only', 'Neutral only', 'Both line and neutral (double-pole)', 'Earth and neutral'], a: 2},
      {q: 'What does the busbar do?', options: ['Connects all earths together', 'Distributes the line supply along the row of protective devices', 'Limits the current to 100 A', 'Provides the earth electrode'], a: 1},
      {q: 'Why are modern domestic CUs metal?', options: ['Easier to earth', 'Cheaper than plastic', 'A non-combustible enclosure contains fires starting at loose terminals', 'Metal blocks electromagnetic interference'], a: 2},
    ],
    explainer: {
      title: 'The Consumer Unit',
      body: `Tails in → double-pole main switch → busbar → one protective device per final circuit, with neutral and earth bars completing the returns.

Split-load and all-RCBO designs limit how much of the house one fault can take down; the steel enclosure (Amendment 3) keeps a terminal fire inside the box.`,
      takeaway: 'CU: DP main switch, busbar to one device per circuit, neutral and earth bars. Metal-clad by regulation; RCD/RCBO arrangement decides what a single fault disconnects.',
    },
  },

  // Ch 24 — Protective Devices
  {
    title: 'Protective Devices: Fuses, MCBs, RCDs, RCBOs',
    theory: true,
    content: [
      "<strong>Fuses</strong> (BS 88, BS 1362 in plugs) are the original protection: a calibrated wire that melts on overcurrent. Simple and reliable, but single-use and slow to replace.",
      "<strong>MCBs</strong> (miniature circuit breakers) protect cables against <strong>overload</strong> (thermal element — slow, heat-driven) and <strong>short circuit</strong> (magnetic element — instant). Curve types set the instantaneous trip threshold: <strong>Type B</strong> trips at 3–5× rated current (domestic standard), <strong>Type C</strong> at 5–10× (motors, inductive loads), <strong>Type D</strong> at 10–20× (high-inrush industrial).",
      "<strong>RCDs</strong> (residual current devices) protect <strong>people</strong>: they compare line and neutral current, and any imbalance means current is escaping — through a fault, or through someone. A 30 mA RCD disconnects fast enough to prevent fibrillation. RCDs do NOT detect overload — an RCD alone never protects the cable.",
      "<strong>RCBOs</strong> combine MCB + RCD in one module, protecting a single circuit against overcurrent and earth leakage — so a fault on one circuit cannot trip the neighbours. <strong>SPDs</strong> clamp transient overvoltages (lightning, switching surges); <strong>AFDDs</strong> detect the signature of dangerous arcing in damaged cables.",
    ],
    quiz: [
      {q: 'Which device protects a person from earth-leakage shock current?', options: ['MCB', 'Fuse', 'RCD', 'SPD'], a: 2},
      {q: 'A Type B MCB trips instantly at…', options: ['1–2× rated current', '3–5× rated current', '5–10× rated current', '10–20× rated current'], a: 1},
      {q: 'The advantage of RCBOs over a shared RCD is…', options: ['they are cheaper', 'an earth fault on one circuit only disconnects that circuit', 'they trip faster than 30 ms', 'no MCBs are needed in the board'], a: 1},
    ],
    explainer: {
      title: 'Protective Devices',
      body: `MCBs protect cables: thermal for overload, magnetic for short circuit (B = 3–5×, C = 5–10×, D = 10–20× In). RCDs protect people: 30 mA imbalance and they are out in milliseconds — but they see no overload at all.

RCBO = both jobs in one module per circuit. SPD handles surges; AFDD listens for arcing.`,
      takeaway: 'MCB = cable protection (B/C/D curves). RCD = people protection (30 mA). RCBO = both per circuit. Neither replaces the other.',
    },
  },

  // Ch 25 — Cables: Twin & Earth
  {
    title: 'Cables: Twin & Earth',
    theory: true,
    content: [
      "The standard cable of UK domestic wiring is flat <strong>twin and earth</strong> (6242Y): two insulated conductors — line (brown) and neutral (blue) — plus a bare <strong>circuit protective conductor (CPC)</strong> between them, all inside a grey or white PVC sheath.",
      "The bare CPC must be sleeved <strong>green/yellow</strong> wherever it is exposed at accessories. Note the CPC is one size smaller than the live conductors in most T&E (e.g. 2.5 mm² cable carries a 1.5 mm² CPC) — it carries fault current briefly, not load current continuously.",
      "Common sizes: <strong>1.0/1.5 mm²</strong> lighting; <strong>2.5 mm²</strong> socket circuits; <strong>4–6 mm²</strong> cookers and small showers; <strong>10 mm²</strong> large showers. Meter tails are typically 25 mm² double-insulated singles.",
      "A cable's current-carrying capacity is not fixed — it must be <strong>derated</strong> for how it is installed: buried in insulation, grouped with other cables, or in high ambient temperature, it sheds heat poorly and carries less. The IET On-Site Guide tables turn these factors into practical cable choices.",
    ],
    quiz: [
      {q: 'A typical UK ring final circuit is wired in…', options: ['1.0 mm² T&E', '2.5 mm² T&E', '6 mm² T&E', '25 mm² tails'], a: 1},
      {q: 'The bare CPC in twin and earth must be…', options: ['left bare for ventilation', 'sleeved green/yellow where exposed at accessories', 'sleeved blue', 'cut back flush with the sheath'], a: 1},
      {q: 'Which factor reduces a cable\'s current-carrying capacity?', options: ['Painting the wall it runs in', 'Running it through thermal insulation', 'Connecting it to an RCBO', 'Using a metal back box'], a: 1},
    ],
    explainer: {
      title: 'Twin & Earth',
      body: `6242Y T&E: brown line, blue neutral, bare CPC (sleeve it green/yellow). Sizes follow the job: 1.0/1.5 lighting, 2.5 sockets, 4–10 for cookers and showers.

Ratings are conditional — insulation, grouping and ambient temperature all derate a cable. The On-Site Guide tables exist so you never guess.`,
      takeaway: 'T&E: brown/blue + bare CPC (sleeved G/Y). 1.0–1.5 lighting, 2.5 sockets, 6–10 showers — always derated for installation conditions.',
    },
  },

  // Ch 26 — Radial vs Ring Final Circuits
  {
    title: 'Radial vs Ring Final Circuits',
    theory: true,
    content: [
      "A <strong>radial</strong> circuit is the simple case: cable runs from the protective device to the first point, on to the next, and stops. Lighting circuits, cooker circuits, shower circuits — almost everything is a radial. Socket radials: <strong>2.5 mm² on a 20 A</strong> device, or <strong>4 mm² on a 32 A</strong>.",
      "The <strong>ring final circuit</strong> is the British speciality: a 2.5 mm² cable leaves the board, loops through every socket, and <strong>returns to the same terminals</strong>. Current reaches each socket by two parallel paths, sharing the load — which is how 2.5 mm² cable can sit behind a <strong>32 A</strong> MCB. It was devised post-war to deliver more sockets per tonne of scarce copper.",
      "<strong>Spurs</strong>: a non-fused spur (one single 2.5 mm² branch) may feed one socket outlet from each ring point; further or longer branches need a <strong>fused connection unit</strong> (FCU) to protect the spur cable.",
      "The ring's weakness is invisibility: if the loop <strong>breaks</strong>, every socket still works — but the remaining single 2.5 mm² leg now carries current it was never sized for, behind a 32 A device that will not notice. This is why ring continuity is a mandatory dead test at every inspection.",
    ],
    quiz: [
      {q: 'A standard UK ring final uses…', options: ['2.5 mm² cable on a 32 A device', '1.5 mm² cable on a 32 A device', '4 mm² cable on a 20 A device', '2.5 mm² cable on a 6 A device'], a: 0},
      {q: 'Why is a broken ring dangerous even though all sockets still work?', options: ['The RCD stops working', 'Sockets lose their earth', 'One 2.5 mm² leg can carry the full load, overloading the cable unnoticed behind the 32 A MCB', 'The voltage at the sockets drops to 115 V'], a: 2},
      {q: 'A 2.5 mm² socket radial is protected by at most…', options: ['6 A', '20 A', '32 A', '40 A'], a: 1},
    ],
    explainer: {
      title: 'Radial vs Ring',
      body: `Radial: one run, sized simply (2.5 mm² → 20 A, 4 mm² → 32 A). Ring: a 2.5 mm² loop back to the same device, two parallel paths sharing the load, 32 A protection.

A broken ring fails silently — every socket works while one leg quietly overloads. That is exactly why ring continuity testing is mandatory.`,
      takeaway: 'Ring final: 2.5 mm² loop on 32 A, two paths to every socket. Radial: single run, 20 A (2.5 mm²) or 32 A (4 mm²). Broken rings hide — test continuity.',
    },
  },

  // Ch 27 — Lighting Circuit Design
  {
    title: 'Lighting Circuit Design',
    theory: true,
    content: [
      "Domestic lighting circuits are <strong>radials</strong> in <strong>1.0 or 1.5 mm²</strong> T&E, protected at <strong>6 A</strong> (Type B) — ample for modern LED loads. Practice splits a house across at least two circuits so one fault never darkens the whole dwelling.",
      "The classic arrangement is <strong>loop-in at the ceiling rose</strong>: the permanent line loops from rose to rose; at each rose, a <strong>switch drop</strong> takes the line down to the wall switch and returns a <strong>switched line</strong> to feed the lampholder. Neutral stays at the rose — the switch needs no neutral (though smart switches are changing that habit).",
      "In a twin and earth switch drop, the blue conductor is used as the switched line — it must be <strong>over-sleeved brown</strong> at both ends to declare what it really is.",
      "The golden rule of switching: switches break the <strong>line</strong> conductor, never the neutral. A neutral-switched light goes out — but its fitting stays at 230 V, waiting for whoever changes the lamp. That is a polarity defect, and it is tested for.",
    ],
    quiz: [
      {q: 'A typical domestic lighting circuit is protected by…', options: ['a 32 A Type B MCB', 'a 6 A Type B MCB', 'a 13 A fuse', 'a 40 A RCBO'], a: 1},
      {q: 'In loop-in wiring, what does the wall switch receive and return?', options: ['Neutral down, earth back', 'Permanent line down, switched line back to the lamp', 'Both line and neutral to the switch', 'Switched neutral to the rose'], a: 1},
      {q: 'The blue conductor used as a switched line in a T&E switch drop must be…', options: ['left blue — colour does not matter', 'sleeved green/yellow', 'over-sleeved brown at both ends', 'replaced with single brown cable'], a: 2},
    ],
    explainer: {
      title: 'Lighting Circuits',
      body: `1.0/1.5 mm² radials on 6 A devices, looped-in at the roses, with switch drops breaking the line conductor only. Blue used as switched line gets brown sleeving at both ends.

Switch the line, never the neutral — a neutral-switched fitting is dark but still live, which is precisely what polarity testing exists to catch.`,
      takeaway: 'Lighting: 1.0/1.5 mm² radial on 6 A. Loop-in at the rose, switch drop breaks the LINE, blue switched-line sleeved brown.',
    },
  },

  // Ch 28 — Earthing Systems
  {
    title: 'Earthing Systems: TN-S, TN-C-S, TT',
    theory: true,
    content: [
      "<strong>Earthing</strong> gives fault current a deliberate low-impedance path back to the source, so a line-to-earth fault draws a current large enough to trip the protective device fast — <strong>Automatic Disconnection of Supply (ADS)</strong>, the core protective measure of BS 7671.",
      "<strong>TN-S</strong>: the distributor provides a separate earth — historically the lead sheath of the supply cable. Line, neutral and earth arrive as distinct conductors. Typical external earth loop impedance (Ze) up to about <strong>0.8 Ω</strong>.",
      "<strong>TN-C-S</strong> (also called <strong>PME</strong> — protective multiple earthing): the supply combines neutral and earth in one <strong>PEN conductor</strong>, split at the cutout into separate N and E. The most common system for newer UK supplies; typical Ze up to <strong>0.35 Ω</strong>. Its caveat: a lost PEN conductor can put supply neutral current onto everything earthed — why PME has special bonding demands and is restricted for caravans and EV chargers.",
      "<strong>TT</strong>: no distributor earth at all — the installation drives its own <strong>earth electrode</strong>. Electrode resistance is high (tens to hundreds of ohms), far too high for an MCB to see fault current, so <strong>RCD protection is essential</strong> for ADS on a TT system. Common for rural and overhead supplies.",
    ],
    quiz: [
      {q: 'PME is another name for which system?', options: ['TN-S', 'TN-C-S', 'TT', 'IT'], a: 1},
      {q: 'Why is an RCD essential on a TT system?', options: ['TT supplies are DC', 'The electrode earth path is too high-impedance for an MCB to trip on an earth fault', 'TT systems have no neutral', 'It is only needed for outdoor sockets'], a: 1},
      {q: 'The purpose of earthing is to…', options: ['absorb lightning strikes', 'give fault current a low-impedance return path so protection disconnects quickly (ADS)', 'reduce energy bills', 'stabilise the 50 Hz frequency'], a: 1},
    ],
    explainer: {
      title: 'Earthing Systems',
      body: `ADS needs a fault-current return path: TN-S gets it from a separate distributor earth (Ze ≤ ~0.8 Ω), TN-C-S/PME from the combined PEN (Ze ≤ ~0.35 Ω), TT from your own electrode — too high for MCBs, so RCDs do the disconnecting.

Know your system before designing anything: it decides bonding sizes, RCD strategy and what Zs values you must achieve.`,
      takeaway: 'TN-S: separate supply earth. TN-C-S/PME: combined PEN, split at the cutout. TT: own electrode + RCDs essential. Earthing exists to make ADS work.',
    },
  },

  // Ch 29 — Protective Bonding
  {
    title: 'Protective Bonding',
    theory: true,
    content: [
      "<strong>Earthing</strong> and <strong>bonding</strong> are different jobs. Earthing clears faults: it gives fault current a path that trips the device. <strong>Bonding</strong> prevents shocks during a fault: it connects metalwork together so everything you can touch simultaneously sits at the <strong>same potential</strong> — no dangerous voltage between your two hands.",
      "<strong>Main protective bonding</strong> connects <strong>extraneous-conductive-parts</strong> — metal parts entering from outside that may import earth potential, classically incoming metal gas, water and oil pipes — to the <strong>Main Earthing Terminal</strong>. On a PME supply the conductor is typically <strong>10 mm²</strong> copper, connected within 600 mm of the service entry, with a 'Safety Electrical Connection — Do Not Remove' label.",
      "<strong>Supplementary bonding</strong> is local equipotential bonding in special locations — bathrooms being the classic — linking exposed and extraneous metalwork. Under current regulations it may be <strong>omitted</strong> in a bathroom if all circuits are 30 mA RCD-protected, disconnection times are met, and main bonding is in place.",
      "What does NOT need bonding: isolated metalwork that cannot introduce a potential — a towel rail on plastic pipes, a metal window frame in a wooden wall. Bonding them adds risk paths rather than removing them.",
    ],
    quiz: [
      {q: 'The purpose of bonding is to…', options: ['carry load current back to the CU', 'hold touchable metalwork at the same potential during a fault', 'replace the CPC in old installations', 'increase fault current'], a: 1},
      {q: 'Main bonding on a typical PME domestic supply uses…', options: ['1.0 mm² conductor', '4 mm² conductor', '10 mm² conductor', '25 mm² conductor'], a: 2},
      {q: 'Which is an extraneous-conductive-part requiring main bonding?', options: ['A plastic incoming water main', 'A metal gas pipe entering from the ground', 'A free-standing metal lamp', 'A wooden door frame'], a: 1},
    ],
    explainer: {
      title: 'Bonding',
      body: `Earthing trips devices; bonding equalises potential so a fault cannot put a voltage across your body. Main bonding ties incoming metal services (gas, water, oil) to the MET — 10 mm² on typical PME supplies, labelled, near the point of entry.

Supplementary bathroom bonding can be omitted only when the RCD, disconnection-time and main-bonding conditions are all met.`,
      takeaway: 'Bonding = equipotential, not fault clearance. Main bonding: incoming metal services to the MET (10 mm² on PME). Supplementary bonding in bathrooms unless the RCD conditions allow omission.',
    },
  },

  // Ch 30 — The Dead Test Sequence
  {
    title: 'Inspection & Testing: The Dead Test Sequence',
    theory: true,
    content: [
      "Every new circuit gets <strong>initial verification</strong> under BS 7671 Part 6 before it is ever energised: detailed <strong>inspection</strong> first (with the supply off), then the <strong>dead tests</strong>, and only then energisation and the live tests. Results are recorded against design values on the certificate.",
      "The dead tests run in a fixed, logical order: <strong>1) Continuity of protective conductors</strong> (every CPC and bonding conductor actually connects) → <strong>2) Continuity of ring final conductors</strong> (the ring really is a ring) → <strong>3) Insulation resistance</strong> (no leakage paths between conductors) → <strong>4) Polarity</strong> (everything switched and fused in the line conductor).",
      "The order matters because each test underwrites the next: there is no point insulation-testing a circuit whose conductors may be broken or cross-connected, and polarity confirmation by continuity depends on the CPC results already proven.",
      "Only after the dead tests pass is the circuit energised for the <strong>live tests</strong>: earth fault loop impedance (Ze, Zs), prospective fault current, and RCD operation. Dead first, live last — never the reverse.",
    ],
    quiz: [
      {q: 'When are the dead tests performed?', options: ['After the circuit has run for 24 hours', 'Before the circuit is ever energised', 'Only when a fault is suspected', 'Live tests come first, then dead tests'], a: 1},
      {q: 'Which dead test comes FIRST?', options: ['Insulation resistance', 'Polarity', 'Continuity of protective conductors', 'RCD trip time'], a: 2},
      {q: 'Why must polarity be confirmed before energising?', options: ['It calibrates the meter', 'Reversed polarity leaves accessories live when switched off — energising would create immediate danger', 'It is only needed for three-phase', 'To warm up the conductors'], a: 1},
    ],
    explainer: {
      title: 'The Dead Test Sequence',
      body: `Inspect first, then test dead in order: protective-conductor continuity → ring continuity → insulation resistance → polarity. Each result makes the next test meaningful. Only then energise and run the live tests (Ze/Zs, PFC, RCD).

A circuit goes live only after it has proven, on paper, that it is safe to do so.`,
      takeaway: 'Dead tests, in order: CPC continuity → ring continuity → insulation resistance → polarity. Then energise. Then live tests.',
    },
  },

  // Ch 31 — Continuity Testing (R1+R2)
  {
    title: 'Continuity Testing (R1+R2)',
    theory: true,
    content: [
      "Continuity testing proves every protective conductor is actually connected, end to end, with acceptably low resistance. The instrument is a <strong>low-resistance ohmmeter</strong> with a test current of at least <strong>200 mA</strong> — and you <strong>null the leads</strong> first so their resistance does not pollute readings.",
      "The standard method is <strong>R1+R2</strong>: temporarily <strong>link line to CPC at the consumer unit</strong>, then measure between line and earth terminals at each point on the circuit. The reading is R1 (line conductor) + R2 (CPC) to that point — rising as you move further from the board, highest at the far end.",
      "That highest R1+R2 value is gold: added to the external impedance Ze it predicts <strong>Zs = Ze + (R1+R2)</strong>, the earth fault loop impedance that decides whether the MCB will disconnect in time. Measured dead, confirmed live later.",
      "<strong>Ring finals</strong> get their own three-step routine: measure each conductor <strong>end-to-end</strong> (line, neutral, CPC — values should be similar, CPC slightly higher), then <strong>cross-connect</strong> line and neutral and verify substantially equal readings at every socket — proving the loop is complete with no breaks and no interconnects.",
    ],
    quiz: [
      {q: 'What does an R1+R2 reading represent?', options: ['The insulation resistance of the cable', 'The combined resistance of the line conductor and CPC to that point', 'The earth electrode resistance', 'The RCD trip current'], a: 1},
      {q: 'How is the R1+R2 test set up?', options: ['Linking line to neutral at the far end', 'Linking line to CPC at the consumer unit, measuring L–E at each point', 'Injecting 500 V between conductors', 'Measuring at the meter tails'], a: 1},
      {q: 'Where on the circuit is the highest R1+R2 reading expected?', options: ['At the consumer unit', 'At the point electrically furthest from the board', 'At the earth bar', 'Readings are identical everywhere'], a: 1},
    ],
    explainer: {
      title: 'Continuity & R1+R2',
      body: `Null the leads, link L–CPC at the board, measure L–E at every point: that is R1+R2, peaking at the furthest point. It feeds straight into Zs = Ze + (R1+R2), the number that proves ADS will work.

Rings add the end-to-end and cross-connect steps — the only way to prove the loop is genuinely unbroken.`,
      takeaway: 'R1+R2: link L–CPC at the CU, measure L–E at each point with a 200 mA low-ohm meter. Highest reading + Ze predicts Zs.',
    },
  },

  // Ch 32 — Insulation Resistance Testing
  {
    title: 'Insulation Resistance Testing',
    theory: true,
    content: [
      "Insulation resistance (IR) testing proves the insulation between conductors is intact — no tracking paths, nicked cores or moisture giving current somewhere to leak. The tester applies a high DC voltage and reads the resistance in <strong>megohms (MΩ)</strong>.",
      "For 230/400 V circuits the test voltage is <strong>500 V DC</strong>, and the minimum acceptable result is <strong>1.0 MΩ</strong> — though a healthy new circuit reads in the hundreds of megohms, and anything under about 2 MΩ deserves investigation even though it technically passes.",
      "Preparation is most of the skill: circuit isolated; <strong>lamps removed</strong>, electronic and vulnerable equipment (dimmers, controls, smart devices) <strong>disconnected</strong> — 500 V destroys electronics; switches closed so the whole circuit is included. Then test between the live conductors joined together and earth (and between live conductors on initial verification of a new, unloaded install).",
      "Interpreting results: a hard zero is a short or a forgotten load; a low-but-passing reading suggests moisture or damaged insulation. And after testing, conductors can hold charge from the DC test voltage — discharge before touching.",
    ],
    quiz: [
      {q: 'What test voltage is used for IR testing on 230 V circuits?', options: ['9 V DC', '50 V AC', '500 V DC', '230 V AC'], a: 2},
      {q: 'The minimum acceptable insulation resistance is…', options: ['1.0 Ω', '0.05 MΩ', '1.0 MΩ', '500 MΩ exactly'], a: 2},
      {q: 'Before IR testing you must…', options: ['close the main switch and test live', 'disconnect electronic equipment and remove lamps — 500 V will damage them', 'connect all loads so they are tested too', 'earth the line conductor'], a: 1},
    ],
    explainer: {
      title: 'Insulation Resistance',
      body: `500 V DC, minimum 1 MΩ — but expect hundreds on healthy circuits and investigate anything marginal. Test with the circuit dead, lamps out, electronics disconnected, switches closed.

A failed IR test found dead is a fire and shock risk that never got the chance to happen.`,
      takeaway: 'IR test: 500 V DC, ≥1 MΩ minimum (investigate < 2 MΩ). Disconnect electronics and remove lamps first.',
    },
  },

  // Ch 33 — Polarity Testing
  {
    title: 'Polarity Testing',
    theory: true,
    content: [
      "Polarity testing confirms every conductor is connected where it should be: all single-pole switches, MCBs and fuses in the <strong>line</strong> conductor only; the centre contact of every Edison-screw lampholder on the <strong>switched line</strong>; and line, neutral and earth landed on the correct terminals of every socket.",
      "Why it matters: a light switch in the neutral still turns the lamp off — but the fitting remains at 230 V with the switch off. A reversed socket puts appliance switches and fuses in the neutral. Everything looks fine and works fine, while being silently dangerous: polarity faults are invisible without testing.",
      "Dead, polarity falls out of the continuity tests: with the L–CPC link in place, an R1+R2 reading through a closed switch proves the switch is in the line side; readings at each accessory confirm terminal-by-terminal correctness.",
      "After energising, polarity is <strong>confirmed live</strong> with an approved voltage indicator: 230 V from L to N and L to E, 0 V from N to E (approximately), at the origin and at points throughout — including that the correct socket terminal is the live one.",
    ],
    quiz: [
      {q: 'Single-pole switches and fuses must be connected in…', options: ['the neutral conductor', 'the line conductor only', 'the CPC', 'either conductor'], a: 1},
      {q: 'Why is a switch in the neutral dangerous when the light still works?', options: ['It wastes energy', 'The fitting stays at 230 V even when switched off', 'It trips the RCD constantly', 'The lamp burns out faster'], a: 1},
      {q: 'On an Edison-screw lampholder, the centre contact must connect to…', options: ['neutral', 'earth', 'the switched line', 'either — ES holders are unpolarised'], a: 2},
    ],
    explainer: {
      title: 'Polarity',
      body: `Line is the conductor that gets switched, fused and broken — always. Polarity testing proves it: dead via the continuity readings, then confirmed live with a two-pole indicator once energised.

A polarity fault is the most deceptive defect in the trade: everything works, and everything is wrong.`,
      takeaway: 'Polarity: switches/fuses in LINE only, ES centre contact on switched line, sockets terminated correctly. Proven dead, confirmed live.',
    },
  },
];

// Course catalogue — each course references CHALLENGES by index
const COURSES = [
  {
    id: 'science',
    title: 'Electrical Science',
    desc: 'Charge, Ohm\u2019s law, power, series & parallel, AC theory \u2014 the Principles of Electrical Science unit.',
    icon: '\ud83c\udf93',
    color: '#34d399',
    challenges: [14, 0, 15, 1, 16, 17, 18],
  },
  {
    id: 'safety',
    title: 'Health & Safety',
    desc: 'EAWR 1989, electric shock, safe isolation and PPE \u2014 the must-knows before any practical work.',
    icon: '\ud83e\uddba',
    color: '#f97316',
    challenges: [19, 20, 21, 22],
  },
  {
    id: 'components',
    title: 'Components & Protection',
    desc: 'Consumer units, MCBs, RCDs, RCBOs and cable selection.',
    icon: '\ud83d\udd0c',
    color: '#60a5fa',
    challenges: [23, 8, 24, 5, 9, 25, 7],
  },
  {
    id: 'lighting',
    title: 'Lighting Circuits',
    desc: 'Lighting design, one-way, two-way and intermediate switching.',
    icon: '\ud83d\udca1',
    color: '#e5c07b',
    challenges: [27, 6, 10, 11],
  },
  {
    id: 'design',
    title: 'Circuit Design & Installation',
    desc: 'Radial and ring final circuits, earthing systems and protective bonding.',
    icon: '\ud83c\udfe0',
    color: '#a78bfa',
    challenges: [26, 3, 13, 28, 29],
  },
  {
    id: 'testing',
    title: 'Inspection & Testing',
    desc: 'The dead tests \u2014 continuity, insulation resistance and polarity \u2014 performed before a circuit is ever energised.',
    icon: '\ud83e\uddea',
    color: '#22d3ee',
    challenges: [30, 31, 32, 33],
  },
  {
    id: 'faultfinding',
    title: 'Fault Finding',
    desc: 'Systematic diagnosis of common electrical faults.',
    icon: '\ud83d\udd0d',
    color: '#ef4d4d',
    challenges: [2, 12],
  },
  {
    id: 'advanced',
    title: 'Advanced / Trade',
    desc: 'For qualified or experienced electricians.',
    icon: '\u26a1',
    color: '#4da3ff',
    challenges: [3, 5, 8, 9, 4, 10, 11],
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
  const co = COURSES[courseIdx];
  const challengeIdx = co && co.challenges[lessonIdx];
  if (challengeIdx == null || !CHALLENGES[challengeIdx]) { renderCourseHome(); return; }
  _currentCourse = courseIdx;
  _currentChallengeIdx = lessonIdx;
  _currentChallenge = challengeIdx;
  _quizSel = {};
  _hintsShown = 0;
  _challengePassed = false;
  _mmRed = null; _mmBlack = null; _mmActiveProbe = null;
  mmLastReading = null;
  _saveCourseState();
  document.querySelectorAll('.mm-red-btn,.mm-black-btn').forEach(b => b.classList.remove('active'));
  SVG.style.cursor = '';
  renderProbes();
  refreshMMReading();
  const ch = CHALLENGES[challengeIdx];
  if (ch.setup) ch.setup();
  else if (ch.theory) fromSchema({components: [], wires: []});
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
    const btnColor = allDone ? '#34d399' : '#4da3ff';
    const borderColor = allDone ? co.color : '#28324a';
    return `<div onclick="selectCourse(${ci})" style="cursor:pointer;background:#0f1420;border:1px solid ${allDone?co.color:'#28324a'};border-radius:10px;padding:11px 13px;margin-bottom:8px;transition:border-color 0.15s;box-shadow:0 1px 3px rgba(0,0,0,0.3)" onmouseover="this.style.borderColor='${co.color}'" onmouseout="this.style.borderColor='${allDone?co.color:'#28324a'}'">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">
        <span style="font-size:19px">${co.icon}</span>
        <span style="color:#dce4f2;font-size:13.5px;font-weight:bold">${co.title}</span>
        <span style="margin-left:auto;background:${btnColor};color:#fff;font-size:10px;padding:3px 8px;border-radius:99px;font-weight:bold;white-space:nowrap">${btnLabel}</span>
      </div>
      <div style="color:#8e9cb8;font-size:11.5px;line-height:1.5;margin-bottom:7px">${co.desc}</div>
      <div style="display:flex;align-items:center;gap:5px">
        <div style="flex:1;background:#19202f;border-radius:3px;height:4px;overflow:hidden">
          <div style="background:${co.color};height:4px;width:${pct}%;transition:width 0.3s"></div>
        </div>
        <span style="color:#8e9cb8;font-size:11px;white-space:nowrap">${done}/${total}</span>
      </div>
    </div>`;
  }).join('');
  inner.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#4da3ff;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px">⚡ Choose a Course</div>
    ${rows}
    <div style="color:#5d6a85;font-size:11px;margin-top:10px;text-align:center">Click a course to see its lessons</div>
    <div style="border-top:1px solid #19202f;margin-top:14px;padding-top:10px">
      <button onclick="resetCourseProgress()" style="background:rgba(239,77,77,0.08);border:1px solid rgba(239,77,77,0.35);color:#ff7b78;font-size:11px;padding:7px 10px;border-radius:99px;cursor:pointer;width:100%;font-family:inherit" onmouseover="this.style.background='rgba(239,77,77,0.18)'" onmouseout="this.style.background='rgba(239,77,77,0.08)'">↺ Reset all progress</button>
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
    return `<div onclick="loadChallenge(${ci},${li})" style="cursor:pointer;display:flex;align-items:flex-start;gap:9px;padding:8px 10px;border-radius:7px;margin-bottom:3px;background:${active?'rgba(77,163,255,0.08)':'transparent'};border:1px solid ${active?'#4da3ff':'transparent'}" onmouseover="this.style.background='rgba(77,163,255,0.05)'" onmouseout="this.style.background='${active?'rgba(77,163,255,0.08)':'transparent'}'">
      <span style="font-size:14px;margin-top:1px;flex-shrink:0">${done?'✅':'⬜'}</span>
      <div>
        <div style="color:${done?'#34d399':'#dce4f2'};font-size:12.5px;line-height:1.45;font-weight:${active?'bold':'normal'}">${li+1}. ${ch.title} <span class="les-tag ${ch.theory?'th':'pr'}">${ch.theory?'theory':'practical'}</span></div>
      </div>
    </div>`;
  }).join('');
  const done = co.challenges.filter(idx => _completed.has(idx)).length;
  const pct = Math.round((done / co.challenges.length) * 100);
  inner.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
      <button onclick="renderCourseHome()" style="background:none;border:none;color:#4da3ff;cursor:pointer;font-size:17px;padding:0;line-height:1" title="Back to courses">←</button>
      <span style="font-size:19px">${co.icon}</span>
      <span style="color:#dce4f2;font-size:14px;font-weight:bold;flex:1">${co.title}</span>
    </div>
    <div style="color:#8e9cb8;font-size:11.5px;line-height:1.5;margin-bottom:8px">${co.desc}</div>
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
      <div style="flex:1;background:#19202f;border-radius:3px;height:5px;overflow:hidden">
        <div style="background:${co.color};height:5px;width:${pct}%"></div>
      </div>
      <span style="color:#8e9cb8;font-size:11px;white-space:nowrap">${done}/${co.challenges.length} done</span>
    </div>
    <div style="border-top:1px solid #19202f;padding-top:8px">${lessonRows}</div>
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
    return `<div onclick="loadChallenge(${_currentCourse},${li})" title="${CHALLENGES[chIdx].title}" style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:27px;height:27px;border-radius:50%;background:${active2?co.color:(done2?co.color+'22':'#19202f')};border:2px solid ${active2?co.color:(done2?co.color:'#28324a')};color:${active2?'#090c14':(done2?co.color:'#5d6a85')};font-size:11px;font-weight:bold;flex-shrink:0" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">${done2&&!active2?'✓':(li+1)}</div>`;
  }).join('');
  const header = `
    <div style="display:flex;align-items:center;gap:5px;margin-bottom:8px">
      <button onclick="renderCourseOutline(${_currentCourse})" style="background:none;border:none;color:#4da3ff;cursor:pointer;font-size:17px;padding:0;line-height:1" title="Back to outline">←</button>
      <span style="font-size:16px">${co.icon}</span>
      <span style="color:#8e9cb8;font-size:11px">${co.title}</span>
    </div>
    <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;align-items:center">${lessonList}</div>
    <div style="font-size:11px;color:#5d6a85;margin-bottom:9px">Lesson ${lessonIdx+1} of ${totalLessons} · ${ch.theory?'Theory':'Practical'}</div>
    <div class="ch-title">${ch.title}</div>`;
  const prevBtn = lessonIdx > 0 ? `<button class="btn" onclick="loadChallenge(${_currentCourse},${lessonIdx-1})" style="margin-top:6px;font-size:11.5px">← Prev</button>` : '';
  if (ch.theory) {
    const content = ch.content.map(p => `<p class="th-p">${p}</p>`).join('');
    const quiz = ch.quiz.map((q, qi) => `
      <div class="quiz-q">
        <div class="quiz-question">${qi+1}. ${q.q}</div>
        ${q.options.map((opt, oi) => `<div class="quiz-opt" id="qopt-${qi}-${oi}" onclick="selectQuizOpt(${qi},${oi})">${opt}</div>`).join('')}
      </div>`).join('');
    inner.innerHTML = header + `
      <div class="th-body">${content}</div>
      <div class="quiz-head">Check your understanding</div>
      ${quiz}
      <button class="ch-check-btn" onclick="checkChallenge()">✓ Check Answers</button>
      <div id="ch-result" class="ch-result" style="display:none"></div>` + prevBtn;
  } else {
    inner.innerHTML = header + `
      <div class="ch-scenario">${ch.scenario}</div>
      <div id="ch-hints-area"></div>
      <button class="ch-hint-btn" onclick="showNextHint()">💡 Hint</button>
      <button class="ch-check-btn" onclick="checkChallenge()">✓ Check</button>
      <div id="ch-result" class="ch-result" style="display:none"></div>` + prevBtn;
  }
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

let _quizSel = {};
function selectQuizOpt(qi, oi) {
  const ch = CHALLENGES[_currentChallenge];
  if (!ch.theory) return;
  _quizSel[qi] = oi;
  ch.quiz[qi].options.forEach((_, j) => {
    const el = document.getElementById(`qopt-${qi}-${j}`);
    if (el) { el.classList.toggle('selected', j === oi); el.classList.remove('wrong', 'correct'); }
  });
}

function _validateQuiz(ch) {
  const total = ch.quiz.length;
  let unanswered = 0, correct = 0;
  ch.quiz.forEach((q, qi) => {
    const sel = _quizSel[qi];
    if (sel == null) { unanswered++; return; }
    const ok = sel === q.a;
    if (ok) correct++;
    const el = document.getElementById(`qopt-${qi}-${sel}`);
    if (el) el.classList.add(ok ? 'correct' : 'wrong');
  });
  if (unanswered) return {pass: false, msg: `Answer all ${total} questions — ${unanswered} still blank.`};
  if (correct === total) return {pass: true, msg: `All ${total} answers correct!`};
  return {pass: false, msg: `${correct}/${total} correct — review the highlighted answers and try again.`};
}

function checkChallenge() {
  const ch = CHALLENGES[_currentChallenge];
  const res = ch.theory ? _validateQuiz(ch) : ch.validate();
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
    if (inner) inner.innerHTML = `<div style="text-align:center;padding:20px"><div style="font-size:32px">${co.icon}</div><div style="color:${co.color};font-size:16px;font-weight:bold;margin-top:8px">Course Complete!</div><div style="font-size:12px;color:#8e9cb8;margin-top:6px">${co.title} — all lessons done.</div><button class="btn" onclick="renderCourseHome()" style="margin-top:12px;font-size:12px">← All Courses</button></div>`;
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

// Place the armed multimeter probe at the clicked grid point. Returns true if
// the click was consumed. Element-level click handlers (components, wires,
// crossings) call this before their own behaviour so probes can be dropped on
// nodes, not just bare canvas.
function tryPlaceProbe(e) {
  if (typeof _mmActiveProbe === 'undefined' || !_mmActiveProbe) return false;
  const p = snapPt(e);
  if (_mmActiveProbe === 'red') _mmRed = {x:p.x, y:p.y};
  else _mmBlack = {x:p.x, y:p.y};
  _mmActiveProbe = null;
  document.querySelector('.mm-red-btn').classList.remove('active');
  document.querySelector('.mm-black-btn').classList.remove('active');
  SVG.style.cursor = '';
  renderProbes();
  refreshMMReading();
  return true;
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
    const t=mk('text',{x:_mmRed.x,y:_mmRed.y-10,'text-anchor':'middle',style:'fill:#ef4444;font-size:8px;font-family:JetBrains Mono Variable, ui-monospace, monospace'});
    t.textContent='R'; layer.appendChild(t);
  }
  if (_mmBlack) {
    layer.appendChild(mk('circle',{cx:_mmBlack.x,cy:_mmBlack.y,r:7,fill:'#1f2937',stroke:'#9ca3af','stroke-width':1.5,opacity:0.9}));
    const t=mk('text',{x:_mmBlack.x,y:_mmBlack.y-10,'text-anchor':'middle',style:'fill:#9ca3af;font-size:8px;font-family:JetBrains Mono Variable, ui-monospace, monospace'});
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

