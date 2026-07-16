import * as THREE from 'three';
import type { SceneModule, SceneContext, CameraFraming } from '../../core/engine/Scene';
import type { CoGResult } from '../../types';
import { CONTAINER_THEMES, type EnvTheme } from '../common/envTheme';
import { useAppStore } from '../../stores/appStore';
import { CONTAINER_DIMS } from '../../sim/stability';
import type { Placement } from '../../sim/stowageOptimizer';

/* ═══════════════════════════════════════════════
   Container Scene (L3 — Interior / loading view)

   Deepest drill-down level. Renders a single container
   shell loaded with the 配载数字员工's current plan — the naive
   manual baseline or the AI-optimised plan, toggled from
   the StowagePanel — plus a live centre-of-gravity marker:
   a glowing CoG sphere coloured by IMO risk level with a
   drop line to the floor. Switching the plan re-renders the
   cargo and visibly moves the CoG marker (critical → safe).
   ═══════════════════════════════════════════════ */

export class ContainerScene implements SceneModule {
  readonly level = 'container' as const;

  getCameraFraming(): CameraFraming {
    return { position: [120, 70, 130], target: [0, 13, 0], duration: 1.4 };
  }

  build(ctx: SceneContext) {
    const state = useAppStore.getState();
    const env = CONTAINER_THEMES[state.theme];
    ctx.manager.setToneExposure(env.exposure);
    ctx.scene.background = new THREE.Color(env.bg);
    ctx.scene.fog = new THREE.FogExp2(env.bg, env.fogDensity);

    const plan = state.stowageMode === 'ai' ? state.stowageOptimized : state.stowageBaseline;

    buildLighting(ctx.root, env);
    buildShell(ctx.root);
    buildCargoFromPlan(ctx.root, plan.placements);
    buildCoGMarker(ctx, plan.cog);
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
  const { length: L, height: H, depth: D } = CONTAINER_DIMS;

  // Floor
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(L, 1, D),
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
  const back = new THREE.Mesh(new THREE.PlaneGeometry(L, H), wallMat);
  back.position.set(0, H / 2, -D / 2);
  root.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
  left.rotation.y = Math.PI / 2;
  left.position.set(-L / 2, H / 2, 0);
  root.add(left);

  // Edge frame
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(L, H, D)),
    new THREE.LineBasicMaterial({ color: 0x5dcaa5, transparent: true, opacity: 0.5 })
  );
  edges.position.y = H / 2;
  root.add(edges);
}

/** Render the cargo exactly where the stowage optimizer placed it. */
function buildCargoFromPlan(root: THREE.Group, placements: Placement[]) {
  const palette = [0xf2a623, 0xe8593c, 0x9b59b6, 0x3b8bd4, 0x2ecc71];
  placements.forEach((p, i) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...p.size),
      new THREE.MeshStandardMaterial({ color: palette[i % palette.length], roughness: 0.6, metalness: 0.15 })
    );
    mesh.position.set(...p.center);
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
