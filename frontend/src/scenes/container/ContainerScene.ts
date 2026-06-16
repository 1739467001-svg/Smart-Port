import * as THREE from 'three';
import type { SceneModule, SceneContext, CameraFraming } from '../../core/engine/Scene';
import type { CoGResult } from '../../types';
import { CONTAINER_THEMES, type EnvTheme } from '../common/envTheme';
import { useAppStore } from '../../stores/appStore';
import { computeCoG, type CargoBox } from '../../sim/stability';

/* ═══════════════════════════════════════════════
   Container Scene (L3 — Interior / loading view)

   Deepest drill-down level. Renders a single container
   shell with stacked cargo and a live centre-of-gravity
   visualisation: a glowing CoG sphere coloured by IMO
   risk level, with a drop line to the floor. This is the
   visual seed of the roadmap's "Safety OC".
   ═══════════════════════════════════════════════ */

// Interior dimensions (world units, ~40ft proportions)
const BOX = { length: 120, height: 26, depth: 24 };

export class ContainerScene implements SceneModule {
  readonly level = 'container' as const;

  getCameraFraming(): CameraFraming {
    return { position: [120, 70, 130], target: [0, 13, 0], duration: 1.4 };
  }

  build(ctx: SceneContext) {
    const env = CONTAINER_THEMES[useAppStore.getState().theme];
    ctx.manager.setToneExposure(env.exposure);
    ctx.scene.background = new THREE.Color(env.bg);
    ctx.scene.fog = new THREE.FogExp2(env.bg, env.fogDensity);

    buildLighting(ctx.root, env);
    buildShell(ctx.root);
    const cargo = generateCargo();
    buildCargo(ctx.root, cargo);
    const cog = computeCoG(cargo, BOX);
    buildCoGMarker(ctx, cog);
  }
}

function buildLighting(root: THREE.Group, env: EnvTheme) {
  root.add(new THREE.HemisphereLight(env.hemiSky, env.hemiGround, env.hemiIntensity));
  root.add(new THREE.AmbientLight(env.ambient, env.ambientIntensity));

  const key = new THREE.DirectionalLight(env.keyColor, env.keyIntensity);
  key.position.set(80, 120, 100);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  root.add(key);

  const rim = new THREE.PointLight(env.fillColor, env.fillIntensity, 400);
  rim.position.set(-90, 50, -60);
  root.add(rim);
}

function buildShell(root: THREE.Group) {
  // Floor
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(BOX.length, 1, BOX.depth),
    new THREE.MeshStandardMaterial({ color: 0x2a3140, roughness: 0.85 })
  );
  floor.position.y = -0.5;
  floor.receiveShadow = true;
  root.add(floor);

  // Translucent walls so cargo stays visible
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x3b8bd4,
    transparent: true,
    opacity: 0.06,
    side: THREE.DoubleSide,
    roughness: 0.4,
  });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(BOX.length, BOX.height), wallMat);
  back.position.set(0, BOX.height / 2, -BOX.depth / 2);
  root.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(BOX.depth, BOX.height), wallMat);
  left.rotation.y = Math.PI / 2;
  left.position.set(-BOX.length / 2, BOX.height / 2, 0);
  root.add(left);

  // Edge frame
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(BOX.length, BOX.height, BOX.depth)),
    new THREE.LineBasicMaterial({ color: 0x5dcaa5, transparent: true, opacity: 0.5 })
  );
  edges.position.y = BOX.height / 2;
  root.add(edges);
}

/** Deterministic cargo with a deliberate forward weight bias (demo: CoG offset). */
function generateCargo(): CargoBox[] {
  const boxes: CargoBox[] = [];
  const cols = 6;
  const colW = BOX.length / cols;
  for (let c = 0; c < cols; c++) {
    const stack = c < 4 ? 2 : 1; // taller stacks toward the rear
    for (let s = 0; s < stack; s++) {
      const h = 11;
      const x = -BOX.length / 2 + colW * (c + 0.5);
      // heavier toward +x end to push the CoG off-centre
      const weight = 600 + c * 280 + s * 120;
      boxes.push({
        size: [colW - 3, h, BOX.depth - 5],
        center: [x, h / 2 + s * (h + 1), 0],
        weight,
      });
    }
  }
  return boxes;
}

function buildCargo(root: THREE.Group, cargo: CargoBox[]) {
  const palette = [0xf2a623, 0xe8593c, 0x9b59b6, 0x3b8bd4, 0x2ecc71];
  cargo.forEach((b, i) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...b.size),
      new THREE.MeshStandardMaterial({ color: palette[i % palette.length], roughness: 0.6, metalness: 0.15 })
    );
    mesh.position.set(...b.center);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  });
}

function buildCoGMarker(ctx: SceneContext, cog: CoGResult) {
  const { root } = ctx;
  const color = cog.riskLevel === 'safe' ? 0x2ecc71 : cog.riskLevel === 'warning' ? 0xf2a623 : 0xe74c3c;

  const group = new THREE.Group();
  group.position.set(cog.center.x, cog.center.y, cog.center.z);

  // Glowing CoG sphere
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(3, 24, 24),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4, transparent: true, opacity: 0.9 })
  );
  group.add(sphere);

  // Halo
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(4.2, 5, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  );
  group.add(halo);

  // Drop line to the floor
  const drop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, cog.center.y, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 })
  );
  drop.position.y = -cog.center.y / 2;
  group.add(drop);

  root.add(group);

  // Geometric-centre reference marker on the floor
  const ref = new THREE.Mesh(
    new THREE.RingGeometry(2, 2.5, 24),
    new THREE.MeshBasicMaterial({ color: 0x5dcaa5, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
  );
  ref.rotation.x = -Math.PI / 2;
  ref.position.set(0, 0.2, 0);
  root.add(ref);

  ctx.addAnimation('cog-pulse', (t) => {
    const s = 1 + Math.sin(t * 2.5) * 0.12;
    sphere.scale.setScalar(s);
    halo.rotation.z = t * 0.8;
    (halo.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(t * 2.5) * 0.2;
  });
}
