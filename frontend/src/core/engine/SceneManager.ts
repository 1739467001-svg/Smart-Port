import * as THREE from 'three';
import type { SceneModule, SceneContext } from './Scene';

/* ═══════════════════════════════════════════════
   SceneManager — Core 3D Engine Controller

   Manages the Three.js lifecycle independently
   from React. React communicates via methods,
   the manager owns the render loop.

   Holds a single *active* SceneModule and swaps
   modules cleanly (geometry + clickables + scene-
   scoped animations are all torn down on swap).
   ═══════════════════════════════════════════════ */

export interface SceneManagerConfig {
  canvas: HTMLCanvasElement;
  onObjectClick?: (id: string, type: string) => void;
  onFrameUpdate?: (deltaTime: number, elapsed: number) => void;
}

export class SceneManager {
  // Three.js core
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  clock: THREE.Clock;

  // Orbit control state
  private isDragging = false;
  private prevMouse = { x: 0, y: 0 };
  private orbit = { theta: Math.PI / 4, phi: Math.PI / 4.5, radius: 350 };
  private orbitTarget = new THREE.Vector3(0, 10, 0);

  // Raycaster for click detection
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private clickableObjects: THREE.Object3D[] = [];

  // Animation
  private animationId: number | null = null;
  private animationCallbacks: Map<string, (t: number, dt: number) => void> = new Map();

  // Active scene module
  private activeScene: SceneModule | null = null;
  private sceneRoot: THREE.Group | null = null;
  private sceneAnimationKeys: Set<string> = new Set();

  // Config
  private config: SceneManagerConfig;
  private disposed = false;

  constructor(config: SceneManagerConfig) {
    this.config = config;
    const canvas = config.canvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // ── Renderer ──
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // ── Scene ──
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080c14);
    this.scene.fog = new THREE.FogExp2(0x080c14, 0.0012);

    // ── Camera ──
    this.camera = new THREE.PerspectiveCamera(45, w / h, 1, 3000);
    this.updateCameraFromOrbit();

    // ── Clock ──
    this.clock = new THREE.Clock();

    // ── Events ──
    this.bindEvents(canvas);

    // ── Start ──
    this.startLoop();
  }

  // ════════════════════════════════════════════
  // Public API — called from React
  // ════════════════════════════════════════════

  /** Add an object that responds to click/hover */
  registerClickable(obj: THREE.Object3D) {
    this.clickableObjects.push(obj);
  }

  /** Register a per-frame animation callback */
  addAnimation(key: string, fn: (elapsed: number, delta: number) => void) {
    this.animationCallbacks.set(key, fn);
  }

  removeAnimation(key: string) {
    this.animationCallbacks.delete(key);
  }

  /**
   * Swap the active scene module. Tears down the previous scene's
   * geometry, clickables and scene-scoped animations, builds the new
   * module into a fresh root group, then frames the camera.
   */
  loadScene(module: SceneModule, targetId?: string) {
    // ── Tear down previous scene ──
    if (this.sceneRoot) {
      this.scene.remove(this.sceneRoot);
      this.disposeObject(this.sceneRoot);
      this.sceneRoot = null;
    }
    this.activeScene?.dispose?.();
    this.clickableObjects = [];
    this.sceneAnimationKeys.forEach((k) => this.animationCallbacks.delete(k));
    this.sceneAnimationKeys.clear();

    // ── Build new scene into a scoped root group ──
    const root = new THREE.Group();
    root.name = `scene:${module.level}`;
    this.scene.add(root);
    this.sceneRoot = root;
    this.activeScene = module;

    const ctx: SceneContext = {
      manager: this,
      scene: this.scene,
      root,
      targetId,
      registerClickable: (obj) => this.registerClickable(obj),
      addAnimation: (key, fn) => {
        const scoped = `scene:${key}`;
        this.sceneAnimationKeys.add(scoped);
        this.animationCallbacks.set(scoped, fn);
      },
    };
    module.build(ctx);

    // ── Frame the camera for this scene ──
    const framing = module.getCameraFraming(targetId);
    if (framing) this.flyTo(framing.position, framing.target, framing.duration ?? 1.4);
  }

  /** Currently active scene level, or null before first load. */
  get activeLevel() {
    return this.activeScene?.level ?? null;
  }

  /** Adjust tone-mapping exposure (e.g. brighter for day, dimmer for night). */
  setToneExposure(value: number) {
    this.renderer.toneMappingExposure = value;
  }

  /** Smoothly transition camera to a new position */
  flyTo(position: [number, number, number], target: [number, number, number], duration = 1.5) {
    const startPos = this.camera.position.clone();
    const startTarget = this.orbitTarget.clone();
    const endPos = new THREE.Vector3(...position);
    const endTarget = new THREE.Vector3(...target);
    const startTime = this.clock.getElapsedTime();

    this.addAnimation('__flyTo', (elapsed) => {
      const t = Math.min((elapsed - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic

      this.camera.position.lerpVectors(startPos, endPos, eased);
      this.orbitTarget.lerpVectors(startTarget, endTarget, eased);
      this.camera.lookAt(this.orbitTarget);

      if (t >= 1) {
        this.removeAnimation('__flyTo');
        // Update orbit state to match new position
        this.orbit.radius = this.camera.position.distanceTo(this.orbitTarget);
        this.orbit.phi = Math.acos(
          (this.camera.position.y - this.orbitTarget.y) / this.orbit.radius
        );
        this.orbit.theta = Math.atan2(
          this.camera.position.z - this.orbitTarget.z,
          this.camera.position.x - this.orbitTarget.x
        );
      }
    });
  }

  /** Resize handler */
  resize() {
    const canvas = this.renderer.domElement;
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Clean up everything */
  dispose() {
    this.disposed = true;
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);
    this.unbindEvents();
    this.disposeObject(this.scene);
    this.sceneRoot = null;
    this.activeScene = null;
    this.renderer.dispose();
  }

  /** Recursively dispose geometries & materials under an object. */
  private disposeObject(target: THREE.Object3D) {
    target.traverse((obj) => {
      const mesh = obj as THREE.Mesh & { isInstancedMesh?: boolean };
      if (mesh.isMesh || mesh.isInstancedMesh) {
        mesh.geometry?.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }
    });
  }

  // ════════════════════════════════════════════
  // Camera orbit control
  // ════════════════════════════════════════════

  private updateCameraFromOrbit() {
    const { theta, phi, radius } = this.orbit;
    this.camera.position.set(
      this.orbitTarget.x + radius * Math.sin(phi) * Math.cos(theta),
      this.orbitTarget.y + radius * Math.cos(phi),
      this.orbitTarget.z + radius * Math.sin(phi) * Math.sin(theta)
    );
    this.camera.lookAt(this.orbitTarget);
  }

  // ════════════════════════════════════════════
  // Event handling
  // ════════════════════════════════════════════

  private onMouseDown = (e: MouseEvent) => {
    this.isDragging = true;
    this.prevMouse = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.prevMouse.x;
    const dy = e.clientY - this.prevMouse.y;
    this.orbit.theta -= dx * 0.005;
    this.orbit.phi = Math.max(0.15, Math.min(1.5, this.orbit.phi - dy * 0.005));
    this.prevMouse = { x: e.clientX, y: e.clientY };
    this.updateCameraFromOrbit();
  };

  private onMouseUp = () => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.orbit.radius = Math.max(50, Math.min(800, this.orbit.radius + e.deltaY * 0.4));
    this.updateCameraFromOrbit();
  };

  private onClick = (e: MouseEvent) => {
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.clickableObjects, true);

    if (hits.length > 0 && this.config.onObjectClick) {
      const obj = hits[0].object;
      const id = obj.userData.id || obj.parent?.userData.id || '';
      const type = obj.userData.type || obj.parent?.userData.type || '';
      if (id) this.config.onObjectClick(id, type);
    }
  };

  private onResize = () => this.resize();

  private bindEvents(canvas: HTMLCanvasElement) {
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('click', this.onClick);
    window.addEventListener('resize', this.onResize);
  }

  private unbindEvents() {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    canvas.removeEventListener('mouseup', this.onMouseUp);
    canvas.removeEventListener('mouseleave', this.onMouseUp);
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('click', this.onClick);
    window.removeEventListener('resize', this.onResize);
  }

  // ════════════════════════════════════════════
  // Render loop
  // ════════════════════════════════════════════

  private startLoop() {
    const loop = () => {
      if (this.disposed) return;
      this.animationId = requestAnimationFrame(loop);

      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // Run all animation callbacks
      this.animationCallbacks.forEach((fn) => fn(elapsed, delta));

      // External frame callback
      this.config.onFrameUpdate?.(delta, elapsed);

      // Render
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }
}
