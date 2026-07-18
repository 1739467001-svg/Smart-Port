import * as THREE from 'three';
import type { SceneContext } from '../../core/engine/Scene';

/* ═══════════════════════════════════════════════
   ContainerFlow — the full container lifecycle, animated

   Each "flow unit" is a single container that travels the
   real terminal process as an ordered list of segments.
   The data below IS the process model, so the animation
   follows the genuine stage sequence rather than random
   motion:

     EXPORT  闸口进场 → 堆场堆存 → AGV转运 → 岸桥装船 → 在船
     IMPORT  在船 → 岸桥卸船 → AGV转运 → 堆场堆存 → 集卡提柜 → 出闸

   Together they form the closed loop the mentor asked for:
   land → yard → quay → ship → quay → yard → land.

   The carrier under/over the box switches per stage
   (truck / AGV / crane spreader), so you can read what is
   moving the container at every step.
   ═══════════════════════════════════════════════ */

type Carrier = 'truck' | 'agv' | 'crane' | 'idle';
type Vec3 = [number, number, number];

interface Segment {
  stage: string;
  from: Vec3;
  to: Vec3;
  dur: number;
  carrier: Carrier;
}

const BOX_H = 8.5;
const HALF = BOX_H / 2;

// ── EXPORT: a box leaves the land and is loaded onto the ship ──
const EXPORT_SEGMENTS: Segment[] = [
  { stage: '集港进闸', from: [8, 7, 560], to: [8, 7, 95], dur: 6, carrier: 'truck' },
  { stage: '驶向堆场', from: [8, 7, 95], to: [-40, 7, 72], dur: 3, carrier: 'truck' },
  { stage: '轨道吊入场', from: [-40, 7, 72], to: [-40, 4.5, 55], dur: 2, carrier: 'crane' },
  { stage: '堆场堆存', from: [-40, 4.5, 55], to: [-40, 4.5, 55], dur: 3, carrier: 'idle' },
  { stage: '装上AGV', from: [-40, 4.5, 55], to: [-40, 6, 40], dur: 2, carrier: 'crane' },
  { stage: 'AGV转运至岸边', from: [-40, 6, 40], to: [0, 6, -68], dur: 5, carrier: 'agv' },
  { stage: '岸桥装船', from: [0, 6, -68], to: [0, 18, -116], dur: 4, carrier: 'crane' },
  { stage: '已装船', from: [0, 18, -116], to: [0, 18, -116], dur: 6, carrier: 'idle' },
];

// ── IMPORT: a box is discharged from the ship and delivered inland ──
const IMPORT_SEGMENTS: Segment[] = [
  // Discharge stays at the quay crane's x (85) so the crane trolley can sit
  // over the box and hoist it straight off the ship.
  { stage: '船舶在泊', from: [85, 18, -116], to: [85, 18, -116], dur: 5, carrier: 'idle' },
  { stage: '岸桥卸船', from: [85, 18, -116], to: [85, 6, -68], dur: 4, carrier: 'crane' },
  { stage: 'AGV转运至堆场', from: [85, 6, -68], to: [70, 6, 40], dur: 5, carrier: 'agv' },
  { stage: '轨道吊入场', from: [70, 6, 40], to: [70, 4.5, 55], dur: 2, carrier: 'crane' },
  { stage: '进口堆存', from: [70, 4.5, 55], to: [70, 4.5, 55], dur: 3, carrier: 'idle' },
  { stage: '装上集卡', from: [70, 4.5, 55], to: [70, 7, 88], dur: 2, carrier: 'crane' },
  { stage: '提柜出闸', from: [70, 7, 88], to: [26, 7, 560], dur: 7, carrier: 'truck' },
];

const PALETTE = [0x3b8bd4, 0xe8593c, 0x5dcaa5, 0xf2a623, 0x9b59b6, 0x2ecc71, 0x1abc9c];
const SPEED = 1.35;

/** Lets the quay cranes track whatever container they are currently working,
    so the trolley + hoist cable engage the real flow box instead of miming. */
export interface FlowHandle {
  craneHook(craneX: number): { z: number; y: number } | null;
}

export function buildContainerFlow(ctx: SceneContext): FlowHandle {
  const units: FlowUnit[] = [];

  const exportCycle = totalDuration(EXPORT_SEGMENTS);
  const importCycle = totalDuration(IMPORT_SEGMENTS);

  // Stagger units across the cycle so every stage is populated.
  const EXPORT_N = 5;
  const IMPORT_N = 5;

  for (let i = 0; i < EXPORT_N; i++) {
    const u = new FlowUnit(EXPORT_SEGMENTS, PALETTE[i % PALETTE.length], 0x2ecc71);
    u.offset = (i / EXPORT_N) * exportCycle;
    ctx.root.add(u.group);
    units.push(u);
  }
  for (let i = 0; i < IMPORT_N; i++) {
    const u = new FlowUnit(IMPORT_SEGMENTS, PALETTE[(i + 3) % PALETTE.length], 0x3b8bd4);
    u.offset = (i / IMPORT_N) * importCycle;
    ctx.root.add(u.group);
    units.push(u);
  }

  ctx.addAnimation('container-flow', (elapsed) => {
    for (const u of units) u.update(elapsed * SPEED);
  });

  return {
    craneHook(craneX: number) {
      for (const u of units) {
        if (u.craneActive && Math.abs(u.group.position.x - craneX) < 8) {
          return { z: u.group.position.z, y: u.group.position.y };
        }
      }
      return null;
    },
  };
}

function totalDuration(segs: Segment[]) {
  return segs.reduce((s, seg) => s + seg.dur, 0);
}

class FlowUnit {
  group: THREE.Group;
  offset = 0;
  craneActive = false; // true while a quay/yard crane carries this box

  private segs: Segment[];
  private cycle: number;
  private box: THREE.Mesh;
  private truck: THREE.Group;
  private agv: THREE.Group;
  private crane: THREE.Group;
  private heading = 0;

  constructor(segs: Segment[], boxColor: number, tagColor: number) {
    this.segs = segs;
    this.cycle = totalDuration(segs);
    this.group = new THREE.Group();

    // Container
    this.box = new THREE.Mesh(
      new THREE.BoxGeometry(12, BOX_H, 5.5),
      new THREE.MeshStandardMaterial({ color: boxColor, roughness: 0.55, metalness: 0.2 })
    );
    this.box.castShadow = true;
    this.group.add(this.box);

    // Direction tag on top (green = export, blue = import)
    const tag = new THREE.Mesh(
      new THREE.BoxGeometry(12.2, 0.6, 1.6),
      new THREE.MeshStandardMaterial({ color: tagColor, emissive: tagColor, emissiveIntensity: 1.4 })
    );
    tag.position.y = HALF + 0.2;
    this.group.add(tag);

    this.truck = makeTruck();
    this.agv = makeAGV();
    this.crane = makeSpreader();
    this.group.add(this.truck, this.agv, this.crane);
  }

  update(time: number) {
    const t = (time + this.offset) % this.cycle;

    // Locate the active segment
    let acc = 0;
    let seg = this.segs[0];
    let local = 0;
    for (const s of this.segs) {
      if (t < acc + s.dur) {
        seg = s;
        local = (t - acc) / s.dur;
        break;
      }
      acc += s.dur;
    }

    const e = local * local * (3 - 2 * local); // smoothstep ease
    const x = lerp(seg.from[0], seg.to[0], e);
    const y = lerp(seg.from[1], seg.to[1], e);
    const z = lerp(seg.from[2], seg.to[2], e);
    this.group.position.set(x, y, z);

    // Heading from horizontal travel direction
    const dx = seg.to[0] - seg.from[0];
    const dz = seg.to[2] - seg.from[2];
    if (dx * dx + dz * dz > 0.01) this.heading = Math.atan2(-dz, dx);
    this.group.rotation.y = this.heading;

    // Show the right carrier for this stage
    this.truck.visible = seg.carrier === 'truck';
    this.agv.visible = seg.carrier === 'agv';
    this.crane.visible = seg.carrier === 'crane';
    this.craneActive = seg.carrier === 'crane';
  }
}

// ── Carrier meshes (positioned relative to the container centre) ──

function makeTruck(): THREE.Group {
  const g = new THREE.Group();
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(15, 1.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.8 })
  );
  chassis.position.y = -(HALF + 0.9);
  g.add(chassis);

  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(5, 5, 6),
    new THREE.MeshStandardMaterial({ color: 0x2b6fb0, roughness: 0.5, metalness: 0.3 })
  );
  cab.position.set(8.5, -1.6, 0);
  g.add(cab);

  const hlMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xfff2c0, emissiveIntensity: 1.5 });
  [-2.2, 2.2].forEach((zz) => {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 6), hlMat);
    hl.position.set(11.2, -2, zz);
    g.add(hl);
  });
  return g;
}

function makeAGV(): THREE.Group {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(15, 1.8, 7.5),
    new THREE.MeshStandardMaterial({ color: 0xf2a623, roughness: 0.4, metalness: 0.5 })
  );
  deck.position.y = -(HALF + 1);
  g.add(deck);

  const light = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 1.2 })
  );
  light.position.set(7, -HALF, 0);
  g.add(light);
  return g;
}

function makeSpreader(): THREE.Group {
  const g = new THREE.Group();
  // Spreader bar locked on top of the box. The hoist cable up to the trolley
  // is now drawn by the quay crane itself (see buildQuayCranes), so the box no
  // longer carries its own dangling cables.
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(13, 1.2, 6),
    new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.4, metalness: 0.6 })
  );
  bar.position.y = HALF + 0.8;
  g.add(bar);
  return g;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
