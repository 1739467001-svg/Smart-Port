import * as THREE from 'three';
import type { SceneModule, SceneContext, CameraFraming } from '../../core/engine/Scene';
import { YARD_THEMES, type EnvTheme } from '../common/envTheme';
import { useAppStore } from '../../stores/appStore';

/* ═══════════════════════════════════════════════
   Yard Scene (L2 — Block close-up)

   Drill-down target from the port view. Renders one
   container block as individually clickable stacks plus
   a rail-mounted gantry crane (RMG) sliding along the
   bays. Clicking any container drills to L3 (interior).
   ═══════════════════════════════════════════════ */

const PALETTE = [0x3b8bd4, 0xe8593c, 0x5dcaa5, 0xf2a623, 0x9b59b6, 0x2ecc71, 0x1abc9c];

const BAYS = 10;
const ROWS = 6;
const MAX_TIERS = 4;
const BAY_GAP = 14;
const ROW_GAP = 7;
const TIER_GAP = 9;

const CTR = { length: 12, height: 8.5, depth: 5.5 };

export class YardScene implements SceneModule {
  readonly level = 'yard' as const;

  getCameraFraming(): CameraFraming {
    return { position: [95, 78, 110], target: [0, 12, 0], duration: 1.5 };
  }

  build(ctx: SceneContext) {
    const env = YARD_THEMES[useAppStore.getState().theme];
    ctx.manager.setToneExposure(env.exposure);
    ctx.scene.background = new THREE.Color(env.bg);
    ctx.scene.fog = new THREE.FogExp2(env.bg, env.fogDensity);

    const spanX = (BAYS - 1) * BAY_GAP;
    const spanZ = (ROWS - 1) * ROW_GAP;
    const offX = -spanX / 2;
    const offZ = -spanZ / 2;

    buildLighting(ctx.root, env);
    buildGround(ctx.root, spanX, spanZ);
    buildContainers(ctx, offX, offZ);
    buildGantry(ctx, spanX, spanZ);
  }
}

function buildLighting(root: THREE.Group, env: EnvTheme) {
  root.add(new THREE.HemisphereLight(env.hemiSky, env.hemiGround, env.hemiIntensity));
  root.add(new THREE.AmbientLight(env.ambient, env.ambientIntensity));

  const dir = new THREE.DirectionalLight(env.keyColor, env.keyIntensity);
  dir.position.set(60, 120, 80);
  dir.castShadow = true;
  dir.shadow.camera.near = 10;
  dir.shadow.camera.far = 400;
  dir.shadow.camera.left = -120;
  dir.shadow.camera.right = 120;
  dir.shadow.camera.top = 120;
  dir.shadow.camera.bottom = -120;
  dir.shadow.mapSize.set(2048, 2048);
  root.add(dir);

  const fill = new THREE.PointLight(env.fillColor, env.fillIntensity, 300);
  fill.position.set(-80, 60, -40);
  root.add(fill);
}

function buildGround(root: THREE.Group, spanX: number, spanZ: number) {
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(spanX + 80, 1, spanZ + 60),
    new THREE.MeshStandardMaterial({ color: 0x161b26, roughness: 0.95 })
  );
  ground.position.y = -0.5;
  ground.receiveShadow = true;
  root.add(ground);

  const grid = new THREE.GridHelper(Math.max(spanX, spanZ) + 80, 28, 0x2a3a52, 0x1e2a3a);
  grid.position.y = 0.1;
  (grid.material as THREE.Material).opacity = 0.25;
  (grid.material as THREE.Material).transparent = true;
  root.add(grid);
}

function buildContainers(ctx: SceneContext, offX: number, offZ: number) {
  const { root } = ctx;
  const geo = new THREE.BoxGeometry(CTR.length, CTR.height, CTR.depth);

  for (let bay = 0; bay < BAYS; bay++) {
    for (let row = 0; row < ROWS; row++) {
      const tiers = 1 + Math.floor(Math.random() * MAX_TIERS);
      for (let tier = 0; tier < tiers; tier++) {
        const color = PALETTE[(bay + row + tier) % PALETTE.length];
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.25 });
        const box = new THREE.Mesh(geo, mat);
        box.castShadow = true;
        box.receiveShadow = true;
        box.position.set(offX + bay * BAY_GAP, CTR.height / 2 + tier * TIER_GAP, offZ + row * ROW_GAP);
        box.userData = { id: `ctr-${bay + 1}-${row + 1}-${tier + 1}`, type: 'container' };
        root.add(box);
        ctx.registerClickable(box);
      }
    }
  }
}

function buildGantry(ctx: SceneContext, spanX: number, spanZ: number) {
  const { root } = ctx;
  const gantry = new THREE.Group();

  const legMat = new THREE.MeshStandardMaterial({ color: 0xf2a623, roughness: 0.5, metalness: 0.5 });
  const legGeo = new THREE.BoxGeometry(2.4, 48, 2.4);
  const halfZ = spanZ / 2 + 8;
  [-halfZ, halfZ].forEach((z) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(0, 24, z);
    leg.castShadow = true;
    gantry.add(leg);
  });

  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(4, 4, spanZ + 22),
    new THREE.MeshStandardMaterial({ color: 0xcc8a1a, roughness: 0.4, metalness: 0.5 })
  );
  beam.position.y = 48;
  beam.castShadow = true;
  gantry.add(beam);

  const trolley = new THREE.Group();
  trolley.add(new THREE.Mesh(
    new THREE.BoxGeometry(6, 3, 6),
    new THREE.MeshStandardMaterial({ color: 0x222831 })
  ));
  const spreader = new THREE.Mesh(
    new THREE.BoxGeometry(CTR.length + 1, 1, CTR.depth + 1),
    new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.6 })
  );
  spreader.position.y = -18;
  trolley.add(spreader);
  trolley.position.set(0, 46, 0);
  gantry.add(trolley);

  root.add(gantry);

  const railHalf = spanX / 2 + 6;
  ctx.addAnimation('rmg-gantry', (t) => {
    gantry.position.x = Math.sin(t * 0.25) * railHalf;
    trolley.position.z = Math.sin(t * 0.6) * (spanZ / 2);
  });
}
