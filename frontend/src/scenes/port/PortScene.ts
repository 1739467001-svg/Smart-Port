import * as THREE from 'three';
import type { SceneModule, SceneContext, CameraFraming } from '../../core/engine/Scene';
import { DEFAULT_PORT, type PortLayout } from './portLayout';
import { PORT_THEMES, type PortTheme } from './themes';
import { buildOcean } from '../ocean/Ocean';
import { buildLandside, buildPortLights } from './Landside';
import { buildContainerFlow } from './ContainerFlow';
import { useAppStore } from '../../stores/appStore';

/* ═══════════════════════════════════════════════
   Port Scene (L1 — Bird's-eye view)

   Builds sea, ground, berths, quay cranes, container
   yard, ship, AGVs and OC markers — all driven by a
   PortLayout config. Clicking a yard block drills to L2.
   ═══════════════════════════════════════════════ */

const COLORS = {
  sea: 0x0d1926,
  ground: 0x1a1f2e,
  berth: 0x2a3040,
  crane: 0xe8593c,
  craneArm: 0xcc4433,
  containers: [0x3b8bd4, 0xe8593c, 0x5dcaa5, 0xf2a623, 0x9b59b6, 0x2ecc71, 0xe74c3c, 0x1abc9c],
  agv: 0xf2a623,
  grid: 0x1e2a3a,
};

export class PortScene implements SceneModule {
  readonly level = 'port' as const;
  private layout: PortLayout;

  constructor(layout: PortLayout = DEFAULT_PORT) {
    this.layout = layout;
  }

  getCameraFraming(): CameraFraming {
    // High 3/4 aerial from the landside: gate & rail in the
    // foreground, yard & quay mid-ground, ship & sea beyond —
    // the whole land → yard → quay → ship chain in one frame.
    return { position: [300, 340, 560], target: [0, 0, 70], duration: 1.7 };
  }

  build(ctx: SceneContext) {
    const theme = PORT_THEMES[useAppStore.getState().theme];

    ctx.manager.setToneExposure(theme.exposure);
    ctx.scene.background = new THREE.Color(theme.skyHorizon);
    ctx.scene.fog = new THREE.FogExp2(theme.skyHorizon, theme.fogDensity);

    buildSky(ctx.root, theme);
    buildSun(ctx.root, theme);
    buildLighting(ctx.root, theme);
    buildOceanSurface(ctx, theme);
    buildLandside(ctx, theme);
    buildGround(ctx.root);
    buildBerth(ctx.root);
    buildShip(ctx);
    buildQuayCranes(ctx, this.layout);
    buildContainerYard(ctx, this.layout);
    buildAGVs(ctx, this.layout);
    buildContainerFlow(ctx);
    buildOCMarkers(ctx);
    buildPortLights(ctx, theme);
  }
}

// ── Sky dome (vertical gradient) ──
function buildSky(root: THREE.Group, theme: PortTheme) {
  const geo = new THREE.SphereGeometry(1600, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(theme.skyTop) },
      uHorizon: { value: new THREE.Color(theme.skyHorizon) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      varying vec3 vWorldPos;
      void main() {
        float h = clamp(normalize(vWorldPos).y, 0.0, 1.0);
        vec3 col = mix(uHorizon, uTop, pow(h, 0.55));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(geo, mat);
  root.add(sky);
}

// ── Sun / moon disc with glow ──
function buildSun(root: THREE.Group, theme: PortTheme) {
  const dir = new THREE.Vector3(...theme.sunDirection).normalize();
  const pos = dir.multiplyScalar(1300);

  const disc = new THREE.Mesh(
    new THREE.SphereGeometry(theme.sunSize, 24, 24),
    new THREE.MeshBasicMaterial({ color: theme.sunColor, fog: false })
  );
  disc.position.copy(pos);
  root.add(disc);

  // Soft glow billboard
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radialGlowTexture(theme.sunColor),
      transparent: true,
      depthWrite: false,
      opacity: theme.sunGlow * 0.6,
      fog: false,
    })
  );
  glow.scale.setScalar(theme.sunSize * 10);
  glow.position.copy(pos);
  root.add(glow);
}

let glowTexCache: { color: number; tex: THREE.CanvasTexture } | null = null;
function radialGlowTexture(color: number): THREE.CanvasTexture {
  if (glowTexCache && glowTexCache.color === color) return glowTexCache.tex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = new THREE.Color(color);
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const rgb = `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}`;
  grad.addColorStop(0, `rgba(${rgb}, 1)`);
  grad.addColorStop(0.25, `rgba(${rgb}, 0.5)`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  glowTexCache = { color, tex };
  return tex;
}

// ── Lighting ──
function buildLighting(root: THREE.Group, theme: PortTheme) {
  // Sky/ground fill keeps the whole port legible
  root.add(new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, theme.hemiIntensity));
  root.add(new THREE.AmbientLight(theme.ambient, theme.ambientIntensity));

  // Sun / moon directional, aligned with the celestial body
  const dir = new THREE.DirectionalLight(theme.sunLightColor, theme.sunLightIntensity);
  dir.position.set(...theme.sunDirection);
  dir.castShadow = true;
  dir.shadow.camera.near = 10;
  dir.shadow.camera.far = 600;
  dir.shadow.camera.left = -220;
  dir.shadow.camera.right = 220;
  dir.shadow.camera.top = 220;
  dir.shadow.camera.bottom = -220;
  dir.shadow.mapSize.set(2048, 2048);
  root.add(dir);

  // Warm apron / crane accent — strong at night, faint by day
  const warm = new THREE.PointLight(theme.warmAccent, theme.warmIntensity, 500);
  warm.position.set(-100, 80, 0);
  root.add(warm);

  [-80, 0, 80].forEach((x) => {
    const spot = new THREE.PointLight(theme.warmAccent, theme.warmIntensity * 0.7, 200);
    spot.position.set(x, 70, -80);
    root.add(spot);
  });
}

// ── Ocean ──
function buildOceanSurface(ctx: SceneContext, theme: PortTheme) {
  const ocean = buildOcean(theme);
  ctx.root.add(ocean.mesh);
  ctx.addAnimation('ocean', (t) => ocean.update(t));
}

// ── Ground ──
function buildGround(root: THREE.Group) {
  const geo = new THREE.BoxGeometry(420, 1, 320);
  const mat = new THREE.MeshStandardMaterial({ color: COLORS.ground, roughness: 0.9 });
  const ground = new THREE.Mesh(geo, mat);
  ground.position.set(0, 0, 50);
  ground.receiveShadow = true;
  root.add(ground);

  const grid = new THREE.GridHelper(420, 42, COLORS.grid, COLORS.grid);
  grid.position.set(0, 0.6, 50);
  (grid.material as THREE.Material).opacity = 0.12;
  (grid.material as THREE.Material).transparent = true;
  root.add(grid);
}

// ── Berth (quay wall) ──
function buildBerth(root: THREE.Group) {
  const geo = new THREE.BoxGeometry(380, 8, 6);
  const mat = new THREE.MeshStandardMaterial({ color: COLORS.berth, roughness: 0.7 });
  const quay = new THREE.Mesh(geo, mat);
  quay.position.set(0, 4, -98);
  root.add(quay);

  const bollardGeo = new THREE.CylinderGeometry(1.2, 1.5, 4, 8);
  const bollardMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
  for (let i = -170; i <= 170; i += 40) {
    const b = new THREE.Mesh(bollardGeo, bollardMat);
    b.position.set(i, 2, -95);
    root.add(b);
  }
}

// ── Ship ──
function buildShip(ctx: SceneContext) {
  const { root } = ctx;
  const group = new THREE.Group();
  group.userData = { id: 'vessel-001', type: 'vessel' };

  const hullGeo = new THREE.BoxGeometry(170, 18, 30);
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.7, metalness: 0.3 });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.position.y = 2;
  group.add(hull);

  const bowGeo = new THREE.ConeGeometry(15, 30, 4);
  const bow = new THREE.Mesh(bowGeo, hullMat);
  bow.rotation.z = -Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.position.set(95, 5, 0);
  group.add(bow);

  const deckGeo = new THREE.BoxGeometry(165, 1.5, 28);
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 0.8 });
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.position.y = 11.5;
  group.add(deck);

  const bridgeGeo = new THREE.BoxGeometry(22, 22, 18);
  const bridge = new THREE.Mesh(bridgeGeo, new THREE.MeshStandardMaterial({ color: 0x3a4a5a }));
  bridge.position.set(-62, 23, 0);
  group.add(bridge);

  const containerGeo = new THREE.BoxGeometry(11.5, 8.5, 5.2);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 9; c++) {
      const stack = 2 + Math.floor(Math.random() * 2);
      for (let l = 0; l < stack; l++) {
        const color = COLORS.containers[Math.floor(Math.random() * COLORS.containers.length)];
        const box = new THREE.Mesh(containerGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
        box.position.set(-25 + c * 13, 13 + l * 8.8, -10 + r * 5.5);
        group.add(box);
      }
    }
  }

  group.position.set(0, 0, -135);
  root.add(group);
  ctx.registerClickable(group);

  ctx.addAnimation('ship-bob', (t) => {
    group.position.y = Math.sin(t * 0.3) * 0.6;
    group.rotation.z = Math.sin(t * 0.25) * 0.002;
  });
}

// ── Quay Cranes ──
function buildQuayCranes(ctx: SceneContext, layout: PortLayout) {
  const { root } = ctx;
  layout.craneXPositions.forEach((x, i) => {
    const group = new THREE.Group();
    group.position.set(x, 0, -88);
    group.userData = { id: `qc-${i + 1}`, type: 'crane' };

    const legMat = new THREE.MeshStandardMaterial({ color: COLORS.crane, roughness: 0.5, metalness: 0.4 });
    const legGeo = new THREE.BoxGeometry(3.5, 62, 3.5);
    [[-11, -14], [-11, 14], [11, -14], [11, 14]].forEach(([ox, oz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(ox, 31, oz);
      leg.castShadow = true;
      group.add(leg);
    });

    const boom = new THREE.Mesh(
      new THREE.BoxGeometry(26, 4.5, 115),
      new THREE.MeshStandardMaterial({ color: COLORS.craneArm, roughness: 0.4, metalness: 0.5 })
    );
    boom.position.set(0, 63, -18);
    boom.castShadow = true;
    group.add(boom);

    const top = new THREE.Mesh(new THREE.BoxGeometry(18, 10, 18), new THREE.MeshStandardMaterial({ color: 0x444c5c }));
    top.position.set(0, 69, 10);
    group.add(top);

    const trolley = new THREE.Group();
    trolley.add(new THREE.Mesh(new THREE.BoxGeometry(7, 2.5, 7), new THREE.MeshStandardMaterial({ color: 0xffa500 })));
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 48, 4),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    cable.position.y = -25;
    trolley.add(cable);
    const spreader = new THREE.Mesh(
      new THREE.BoxGeometry(13, 1.2, 5.5),
      new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.5 })
    );
    spreader.position.y = -49;
    trolley.add(spreader);
    trolley.position.set(0, 62, -18);
    group.add(trolley);

    const light = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 2 })
    );
    light.position.set(0, 75, 10);
    group.add(light);

    root.add(group);
    ctx.registerClickable(group);

    ctx.addAnimation(`crane-trolley-${i}`, (t) => {
      trolley.position.z = -18 + Math.sin(t * 0.35 + i * 2.1) * 28;
      (light.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + Math.sin(t * 3 + i) * 0.5;
    });
  });
}

// ── Container Yard (InstancedMesh for performance, clickable blocks) ──
function buildContainerYard(ctx: SceneContext, layout: PortLayout) {
  const { root } = ctx;
  const sz = layout.containerSize;
  const containerGeo = new THREE.BoxGeometry(sz.length, sz.height, sz.depth);

  const instancesPerColor = new Map<number, THREE.Matrix4[]>();
  COLORS.containers.forEach((c) => instancesPerColor.set(c, []));

  layout.yardBlocks.forEach((block) => {
    const [ox, oz] = block.origin;
    const blockGroup = new THREE.Group();
    blockGroup.userData = { id: block.id, type: 'yardBlock' };

    for (let row = 0; row < block.rows; row++) {
      for (let col = 0; col < block.bays; col++) {
        const stack = Math.floor(Math.random() * 3) + 1;
        for (let level = 0; level < stack; level++) {
          const color = COLORS.containers[Math.floor(Math.random() * COLORS.containers.length)];
          const m = new THREE.Matrix4();
          m.setPosition(ox + col * 14, 4.5 + level * 9, oz + row * 7);
          instancesPerColor.get(color)!.push(m);
        }
      }
    }

    // Clickable footprint marker for the whole block
    const marker = new THREE.Mesh(
      new THREE.PlaneGeometry(block.bays * 14, block.rows * 7 + 10),
      new THREE.MeshBasicMaterial({ color: 0x3b8bd4, transparent: true, opacity: 0.12 })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(ox + (block.bays * 14) / 2 - 7, 0.8, oz + (block.rows * 7) / 2);
    blockGroup.add(marker);
    root.add(blockGroup);
    ctx.registerClickable(blockGroup);
  });

  instancesPerColor.forEach((matrices, color) => {
    if (matrices.length === 0) return;
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3 });
    const instMesh = new THREE.InstancedMesh(containerGeo, mat, matrices.length);
    matrices.forEach((m, i) => instMesh.setMatrixAt(i, m));
    instMesh.instanceMatrix.needsUpdate = true;
    instMesh.castShadow = true;
    instMesh.receiveShadow = true;
    root.add(instMesh);
  });
}

// ── AGVs ──
function buildAGVs(ctx: SceneContext, layout: PortLayout) {
  const { root } = ctx;
  const agvGeo = new THREE.BoxGeometry(5.5, 1.8, 2.8);
  const agvMat = new THREE.MeshStandardMaterial({ color: COLORS.agv, roughness: 0.4, metalness: 0.5 });

  for (let i = 0; i < layout.agvCount; i++) {
    const group = new THREE.Group();
    group.userData = { id: `agv-${i + 1}`, type: 'agv' };
    group.add(new THREE.Mesh(agvGeo, agvMat));

    const headlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 1 })
    );
    headlight.position.set(3, 0.4, 0);
    group.add(headlight);

    group.position.set(-80 + i * 28, 1.5, -20 + Math.random() * 40);
    root.add(group);

    const speed = 0.3 + Math.random() * 0.35;
    const phase = Math.random() * Math.PI * 2;
    ctx.addAnimation(`agv-${i}`, (t) => {
      const p = t * speed + phase;
      group.position.x = Math.sin(p * 0.5) * 85;
      group.position.z = -15 + Math.cos(p * 0.3 + i) * 35;
      group.rotation.y = Math.cos(p * 0.5) * 0.5 + Math.PI / 2;
    });
  }
}

// ── OC Agent Markers ──
function buildOCMarkers(ctx: SceneContext) {
  const { root } = ctx;
  // Each marker maps to an OC agent — clicking it opens that agent's detail page.
  const ocPositions: Array<{ id: string; name: string; color: number; pos: [number, number, number] }> = [
    { id: 'data-agent', name: '箱单OC', color: 0x3b8bd4, pos: [145, 30, 85] },
    { id: 'lobster-agent', name: '堆叠OC', color: 0xe8593c, pos: [0, 78, -88] },
    { id: 'safety-agent', name: '安全OC', color: 0x5dcaa5, pos: [-105, 30, 65] },
    { id: 'dispatch-agent', name: '调度OC', color: 0xf2a623, pos: [0, 52, 0] },
    { id: 'exec-agent', name: '指令OC', color: 0x9b59b6, pos: [105, 30, -45] },
  ];

  ocPositions.forEach((oc, i) => {
    const group = new THREE.Group();
    group.userData = { id: oc.id, type: 'agent' };

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.5, 0.25, 8, 32),
      new THREE.MeshStandardMaterial({
        color: oc.color, emissive: oc.color, emissiveIntensity: 2, transparent: true, opacity: 0.8,
      })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 12, 12),
      new THREE.MeshStandardMaterial({ color: oc.color, emissive: oc.color, emissiveIntensity: 3 })
    ));

    // Outer pulse ring — telegraphs "clickable"
    const pulse = new THREE.Mesh(
      new THREE.TorusGeometry(5.2, 0.12, 8, 40),
      new THREE.MeshBasicMaterial({ color: oc.color, transparent: true, opacity: 0.5 })
    );
    pulse.rotation.x = Math.PI / 2;
    group.add(pulse);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 22, 4),
      new THREE.MeshStandardMaterial({
        color: oc.color, emissive: oc.color, emissiveIntensity: 0.8, transparent: true, opacity: 0.25,
      })
    );
    beam.position.y = -11;
    group.add(beam);

    // Invisible larger hit target so the marker is easy to click
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(8, 8, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    group.add(hit);

    group.position.set(...oc.pos);
    root.add(group);
    ctx.registerClickable(group);

    ctx.addAnimation(`oc-marker-${i}`, (t) => {
      group.position.y = oc.pos[1] + Math.sin(t * 1.3 + i * 1.1) * 1.5;
      group.rotation.y = t * 0.4 + i;
      const s = 1 + Math.sin(t * 2 + i) * 0.25;
      pulse.scale.set(s, s, s);
      (pulse.material as THREE.MeshBasicMaterial).opacity = 0.5 - Math.sin(t * 2 + i) * 0.3;
    });
  });
}
