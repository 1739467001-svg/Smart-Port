import * as THREE from 'three';
import type { SceneContext } from '../../core/engine/Scene';
import type { PortTheme } from './themes';

/* ═══════════════════════════════════════════════
   Landside — connects the terminal to land

   Turns the "floating" quay into a real coastline:
   sea on the seaward side (−z), solid land on the
   hinterland side (+z) carrying the road network, the
   truck gate, intermodal rail, a freight warehouse,
   moving trucks and a distant city skyline — the full
   land→yard→quay→ship chain.

   Plus buildPortLights(): high-mast floods, street
   lamps and lit windows that switch on at night.
   ═══════════════════════════════════════════════ */

const COAST_Z = -96; // shoreline (quay line). Land is z > COAST_Z, sea is z < COAST_Z.

const C = {
  land: 0x222834,
  road: 0x0a0d12,
  laneMark: 0xd9c98a,
  concrete: 0x2a3140,
  steel: 0x3a4150,
  truckCab: 0x2b6fb0,
  warehouse: 0x252b38,
  rail: 0x444b58,
  skyline: 0x161b27,
};

export function buildLandside(ctx: SceneContext, theme: PortTheme) {
  const { root } = ctx;
  buildHinterland(root);
  buildRoads(root);
  buildGate(root);
  buildWarehouse(root, theme);
  buildRail(ctx);
  buildSkyline(root, theme);
  buildTrucks(ctx);
}

// ── Coastline ground that hides the sea behind the quay ──
function buildHinterland(root: THREE.Group) {
  const depth = 1400;
  const land = new THREE.Mesh(
    new THREE.BoxGeometry(2600, 4, depth),
    new THREE.MeshStandardMaterial({ color: C.land, roughness: 0.98 })
  );
  land.position.set(0, -2, COAST_Z + depth / 2);
  land.receiveShadow = true;
  root.add(land);

  // Quay edge curb so the coastline reads crisply
  const curb = new THREE.Mesh(
    new THREE.BoxGeometry(2600, 2.4, 3),
    new THREE.MeshStandardMaterial({ color: C.concrete, roughness: 0.7 })
  );
  curb.position.set(0, 0.4, COAST_Z);
  root.add(curb);
}

// ── Roads + lane markings ──
function buildRoads(root: THREE.Group) {
  const roadMat = new THREE.MeshStandardMaterial({ color: C.road, roughness: 0.95 });

  // Apron haul road parallel to the quay
  const apron = new THREE.Mesh(new THREE.BoxGeometry(440, 0.4, 20), roadMat);
  apron.position.set(0, 0.5, -55);
  root.add(apron);

  // Gate road running inland (+z)
  const gateRoad = new THREE.Mesh(new THREE.BoxGeometry(46, 0.4, 560), roadMat);
  gateRoad.position.set(0, 0.5, 320);
  root.add(gateRoad);

  // Dashed centre line on the gate road
  const markMat = new THREE.MeshStandardMaterial({
    color: C.laneMark,
    emissive: C.laneMark,
    emissiveIntensity: 0.25,
    roughness: 0.6,
  });
  for (let z = 70; z < 590; z += 26) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 10), markMat);
    dash.position.set(0, 0.72, z);
    root.add(dash);
  }
  // Solid edge lines on the apron road
  [-9.5, 9.5].forEach((zz) => {
    const line = new THREE.Mesh(new THREE.BoxGeometry(420, 0.5, 0.8), markMat);
    line.position.set(0, 0.72, -55 + zz);
    root.add(line);
  });
}

// ── Truck gate (闸口) ──
function buildGate(root: THREE.Group) {
  const group = new THREE.Group();
  group.position.set(0, 0, 470);

  const pillarMat = new THREE.MeshStandardMaterial({ color: C.steel, roughness: 0.5, metalness: 0.4 });
  [-26, 26].forEach((x) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(4, 24, 4), pillarMat);
    pillar.position.set(x, 12, 0);
    group.add(pillar);
  });

  // Canopy
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(60, 3, 18),
    new THREE.MeshStandardMaterial({ color: 0x2f3645, roughness: 0.6, metalness: 0.3 })
  );
  canopy.position.set(0, 24, 0);
  group.add(canopy);

  // Booths between lanes
  const boothMat = new THREE.MeshStandardMaterial({ color: C.concrete, roughness: 0.7 });
  [-10, 10].forEach((x) => {
    const booth = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 8), boothMat);
    booth.position.set(x, 4, 0);
    group.add(booth);
  });

  root.add(group);
}

// ── Freight warehouse / unloading area (卸货区) ──
function buildWarehouse(root: THREE.Group, theme: PortTheme) {
  const group = new THREE.Group();
  group.position.set(-320, 0, 250);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(150, 34, 90),
    new THREE.MeshStandardMaterial({ color: C.warehouse, roughness: 0.85, metalness: 0.1 })
  );
  body.position.y = 17;
  body.castShadow = true;
  group.add(body);

  // Roof ridge
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(154, 3, 94),
    new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: 0.9 })
  );
  roof.position.y = 35;
  group.add(roof);

  // Roller doors on the seaward face (facing -z)
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x161b24, roughness: 0.8 });
  for (let i = -2; i <= 2; i++) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(20, 18, 1), doorMat);
    door.position.set(i * 28, 9, -45.6);
    group.add(door);
  }

  // Window strip (glows at night)
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x0a0e14,
    emissive: 0xcfe0ff,
    emissiveIntensity: theme.windowGlow,
  });
  const winStrip = new THREE.Mesh(new THREE.BoxGeometry(150, 4, 0.6), winMat);
  winStrip.position.set(0, 26, -45.4);
  group.add(winStrip);

  root.add(group);
}

// ── Intermodal rail siding (铁路装卸线 · 海铁联运) ──
function buildRail(ctx: SceneContext) {
  const { root } = ctx;
  const group = new THREE.Group();
  group.position.set(235, 0, 240);

  // Concrete loading pad grounds the whole siding (it used to float on the land)
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(80, 0.6, 430),
    new THREE.MeshStandardMaterial({ color: C.concrete, roughness: 0.85 })
  );
  pad.position.set(0, 0.3, 0);
  pad.receiveShadow = true;
  group.add(pad);

  const railMat = new THREE.MeshStandardMaterial({ color: C.rail, roughness: 0.4, metalness: 0.7 });

  // Two parallel loading tracks
  [-7, 7].forEach((tx) => {
    [-1.3, 1.3].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 400), railMat);
      rail.position.set(tx + rx, 0.9, 0);
      group.add(rail);
    });
  });
  // Sleepers spanning both tracks
  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x1a1f29, roughness: 0.95 });
  for (let z = -190; z <= 190; z += 12) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(30, 0.5, 2.4), sleeperMat);
    s.position.set(0, 0.75, z);
    group.add(s);
  }
  // Gantry runway rails
  [-18, 18].forEach((gx) => {
    const runway = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 400), railMat);
    runway.position.set(gx, 0.7, 0);
    group.add(runway);
  });

  // Container wagons filling the near track
  const palette = [0x3b8bd4, 0xe8593c, 0x5dcaa5, 0xf2a623, 0x9b59b6, 0x2ecc71];
  for (let i = 0; i < 6; i++) {
    const wagon = new THREE.Group();
    const flat = new THREE.Mesh(
      new THREE.BoxGeometry(9, 2, 26),
      new THREE.MeshStandardMaterial({ color: 0x20262f, roughness: 0.6, metalness: 0.4 })
    );
    flat.position.y = 2;
    wagon.add(flat);
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(8, 8.5, 24),
      new THREE.MeshStandardMaterial({ color: palette[i % palette.length], roughness: 0.55 })
    );
    box.position.y = 7.3;
    box.castShadow = true;
    wagon.add(box);
    wagon.position.set(-7, 0, -150 + i * 30);
    group.add(wagon);
  }

  // Locomotive at the head end — reads that the train is a train
  const loco = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(9, 8, 30),
    new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.5, metalness: 0.3 })
  );
  body.position.y = 5;
  body.castShadow = true;
  loco.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(9.4, 5, 11), new THREE.MeshStandardMaterial({ color: 0x2c3e50 }));
  cab.position.set(0, 11, -7);
  loco.add(cab);
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(9.2, 1.6, 30),
    new THREE.MeshStandardMaterial({ color: 0xf1c40f, emissive: 0xf1c40f, emissiveIntensity: 0.25 })
  );
  band.position.y = 3.2;
  loco.add(band);
  loco.position.set(-7, 0, 25);
  group.add(loco);

  // Rail-mounted gantry (轨道装卸桥) straddling both tracks, travelling along z
  const gLegMat = new THREE.MeshStandardMaterial({ color: 0x4a6b8a, roughness: 0.5, metalness: 0.4 });
  const gantry = new THREE.Group();
  const GH = 24;
  [-18, 18].forEach((gx) => {
    [-4, 4].forEach((gz) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(2.2, GH, 2.2), gLegMat);
      leg.position.set(gx, GH / 2, gz);
      leg.castShadow = true;
      gantry.add(leg);
    });
  });
  const gGirder = new THREE.Mesh(new THREE.BoxGeometry(42, 2.6, 8), new THREE.MeshStandardMaterial({ color: 0x5b7fa0 }));
  gGirder.position.set(0, GH + 1.3, 0);
  gantry.add(gGirder);
  const gTrolley = new THREE.Group();
  gTrolley.add(new THREE.Mesh(new THREE.BoxGeometry(5, 2, 6), new THREE.MeshStandardMaterial({ color: 0xf2a623 })));
  const gSpread = new THREE.Mesh(new THREE.BoxGeometry(9, 1, 24), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.5 }));
  gSpread.position.y = -6;
  gTrolley.add(gSpread);
  gTrolley.position.set(0, GH, 0);
  gantry.add(gTrolley);
  group.add(gantry);

  root.add(group);

  // Approach road linking the siding back to the terminal's gate road
  const approach = new THREE.Mesh(
    new THREE.BoxGeometry(235, 0.4, 16),
    new THREE.MeshStandardMaterial({ color: C.road, roughness: 0.95 })
  );
  approach.position.set(118, 0.5, 240);
  root.add(approach);

  ctx.addAnimation('rail-gantry', (t) => {
    gantry.position.z = Math.sin(t * 0.14) * 150;
    gTrolley.position.x = Math.sin(t * 0.5) * 14;
  });
}

// ── Distant city / industrial skyline on the horizon ──
function buildSkyline(root: THREE.Group, theme: PortTheme) {
  const rng = mulberry32(7);
  for (let i = 0; i < 26; i++) {
    const w = 20 + rng() * 40;
    const h = 30 + rng() * 110;
    const d = 20 + rng() * 40;
    const x = -700 + rng() * 1400;
    const z = 720 + rng() * 240;
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: C.skyline, roughness: 0.9 })
    );
    b.position.set(x, h / 2, z);
    root.add(b);

    // Lit windows at night
    if (theme.windowGlow > 0) {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.7, h * 0.7, d * 0.7),
        new THREE.MeshStandardMaterial({
          color: 0x0a0e14,
          emissive: rng() > 0.5 ? 0xffd9a0 : 0x9fc7e8,
          emissiveIntensity: theme.windowGlow * (0.3 + rng() * 0.5),
        })
      );
      win.position.copy(b.position);
      root.add(win);
    }
  }
}

// ── Moving trucks on the gate road ──
function buildTrucks(ctx: SceneContext) {
  const { root } = ctx;
  const lanes = [-11, 11];
  for (let i = 0; i < 6; i++) {
    const lane = lanes[i % 2];
    const inbound = i % 2 === 0; // one lane in, one lane out
    const truck = makeTruck(i);
    root.add(truck);

    const speed = 26 + (i % 3) * 7;
    const span = 540;
    const startOffset = (i / 6) * span;
    truck.rotation.y = inbound ? Math.PI : 0;

    ctx.addAnimation(`truck-${i}`, (t) => {
      const travelled = (t * speed + startOffset) % span;
      const z = inbound ? 600 - travelled : 60 + travelled;
      truck.position.set(lane, 0, z);
    });
  }
}

function makeTruck(seed: number): THREE.Group {
  const g = new THREE.Group();
  const cabColors = [0x2b6fb0, 0xc0392b, 0xe0a020, 0x4a4f5a];
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(7, 7, 8),
    new THREE.MeshStandardMaterial({ color: cabColors[seed % cabColors.length], roughness: 0.5, metalness: 0.3 })
  );
  cab.position.set(0, 4.5, 11);
  cab.castShadow = true;
  g.add(cab);

  // Chassis
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(7, 1.5, 18),
    new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.8 })
  );
  chassis.position.set(0, 2, -2);
  g.add(chassis);

  // Container on the trailer
  const ctrColors = [0x3b8bd4, 0xe8593c, 0x5dcaa5, 0xf2a623, 0x9b59b6];
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(6.6, 7.5, 16),
    new THREE.MeshStandardMaterial({ color: ctrColors[(seed + 2) % ctrColors.length], roughness: 0.55 })
  );
  box.position.set(0, 6.5, -3);
  box.castShadow = true;
  g.add(box);

  // Headlights (always faintly on; pop at night via emissive)
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xfff2c0, emissiveIntensity: 1.4 });
  [-2.2, 2.2].forEach((x) => {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 6), hlMat);
    hl.position.set(x, 4, 15.2);
    g.add(hl);
  });

  return g;
}

// ════════════════════════════════════════════════
//  Night lighting — high-mast floods, lamps, windows
// ════════════════════════════════════════════════

export function buildPortLights(ctx: SceneContext, theme: PortTheme) {
  const { root } = ctx;
  const bulbMat = () =>
    new THREE.MeshStandardMaterial({
      color: 0x4a4f58,
      emissive: theme.lampColor,
      emissiveIntensity: theme.lampGlow,
    });

  // ── High-mast flood towers (iconic port lighting) ──
  const masts: Array<[number, number]> = [
    [-185, -35], [185, -35], [-185, 120], [185, 120], [0, 360],
  ];
  masts.forEach(([x, z], i) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.8, 70, 8),
      new THREE.MeshStandardMaterial({ color: C.steel, roughness: 0.5, metalness: 0.5 })
    );
    pole.position.set(x, 35, z);
    root.add(pole);

    // Flood head — ring of emissive panels
    const head = new THREE.Group();
    head.position.set(x, 70, z);
    for (let k = 0; k < 5; k++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 1), bulbMat());
      const a = (k / 5) * Math.PI - Math.PI / 2;
      panel.position.set(Math.cos(a) * 5, 0, Math.sin(a) * 5 + 3);
      head.add(panel);
    }
    root.add(head);

    if (theme.lampIntensity > 0) {
      const light = new THREE.PointLight(theme.lampColor, theme.lampIntensity * 1.6, 360, 1.6);
      light.position.set(x, 66, z);
      root.add(light);
    }
    void i;
  });

  // ── Street lamps along roads ──
  const lampSpots: Array<[number, number]> = [
    // apron road
    [-150, -70], [-70, -70], [70, -70], [150, -70],
    // gate road both sides
    [-24, 140], [24, 140], [-24, 250], [24, 250], [-24, 360], [24, 360], [-24, 470], [24, 470],
  ];
  lampSpots.forEach(([x, z], i) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.5, 20, 6),
      new THREE.MeshStandardMaterial({ color: C.steel, roughness: 0.6, metalness: 0.4 })
    );
    pole.position.set(x, 10, z);
    root.add(pole);

    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 4),
      new THREE.MeshStandardMaterial({ color: C.steel })
    );
    arm.position.set(x, 20, z + (z < 0 ? 2 : x < 0 ? 2 : -2));
    root.add(arm);

    const bulb = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 1.6), bulbMat());
    bulb.position.set(x, 19.6, z + (z < 0 ? 4 : x < 0 ? 4 : -4));
    root.add(bulb);

    // Only every 3rd lamp casts a real light (keep light count sane)
    if (theme.lampIntensity > 0 && i % 3 === 0) {
      const light = new THREE.PointLight(theme.lampColor, theme.lampIntensity, 90, 1.8);
      light.position.copy(bulb.position);
      root.add(light);
    }
  });
}

// Small deterministic RNG so the skyline is stable across rebuilds
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
