import * as THREE from 'three';
import type { PortTheme } from '../port/themes';

/* ═══════════════════════════════════════════════
   Ocean — animated sea surface (custom shader)

   A large plane displaced by a sum of travelling waves
   in the vertex shader, shaded with fresnel sky
   reflection, sun specular highlights and foam on the
   crests. Colours come from the active PortTheme, so the
   same ocean reads as a sunny sea by day and a dark
   moonlit sea by night.
   ═══════════════════════════════════════════════ */

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewVec;

  // One travelling sine wave; also accumulates analytic slope for the normal.
  void wave(vec2 p, vec2 dir, float amp, float len, float speed,
            inout float h, inout float dhdx, inout float dhdz) {
    float w = 6.2831853 / len;
    float phase = dot(dir, p) * w + uTime * speed;
    h    += amp * sin(phase);
    float c = amp * w * cos(phase);
    dhdx += c * dir.x;
    dhdz += c * dir.y;
  }

  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec2 p = wp.xz;

    float h = 0.0, dhdx = 0.0, dhdz = 0.0;
    wave(p, normalize(vec2( 1.0,  0.3)), 1.3, 62.0, 1.0, h, dhdx, dhdz);
    wave(p, normalize(vec2( 0.6,  1.0)), 0.8, 31.0, 1.4, h, dhdx, dhdz);
    wave(p, normalize(vec2(-0.4,  0.8)), 0.5, 18.0, 1.7, h, dhdx, dhdz);
    wave(p, normalize(vec2( 1.0, -0.6)), 0.3, 11.0, 2.2, h, dhdx, dhdz);

    wp.y += h;

    vWorldPos = wp.xyz;
    vNormal = normalize(vec3(-dhdx, 1.0, -dhdz));
    vViewVec = cameraPosition - wp.xyz;

    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uWaterDeep;
  uniform vec3 uWaterShallow;
  uniform vec3 uReflection;
  uniform vec3 uFoam;
  uniform vec3 uSunDir;
  uniform vec3 uSpecular;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewVec;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewVec);

    // Fresnel — more sky reflection at grazing angles
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    fres = clamp(0.02 + 0.95 * fres, 0.0, 1.0);

    // Deeper colour where the surface faces straight up
    float facing = clamp(dot(N, vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
    vec3 water = mix(uWaterShallow, uWaterDeep, facing);
    vec3 col = mix(water, uReflection, fres);

    // Sun specular glint
    vec3 L = normalize(uSunDir);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 220.0);
    col += uSpecular * spec * 1.4;

    // Foam on the crests
    float crest = smoothstep(1.0, 1.9, vWorldPos.y);
    col = mix(col, uFoam, crest * 0.4);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export interface Ocean {
  mesh: THREE.Mesh;
  update: (elapsed: number) => void;
}

export function buildOcean(theme: PortTheme): Ocean {
  // Seaward half only — the landside has solid ground, so the ocean
  // must not extend (and let its waves poke up) over the land.
  const geo = new THREE.PlaneGeometry(2800, 1380, 210, 104);
  geo.rotateX(-Math.PI / 2);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uWaterDeep: { value: new THREE.Color(theme.waterDeep) },
      uWaterShallow: { value: new THREE.Color(theme.waterShallow) },
      uReflection: { value: new THREE.Color(theme.waterReflection) },
      uFoam: { value: new THREE.Color(theme.waterFoam) },
      uSpecular: { value: new THREE.Color(theme.waterSpecular) },
      uSunDir: { value: new THREE.Vector3(...theme.sunDirection).normalize() },
    },
    fog: false,
  });

  const mesh = new THREE.Mesh(geo, material);
  // Centre the sea seaward of the quay line (≈ z = -96)
  mesh.position.set(0, -0.5, -785);
  mesh.renderOrder = -1;

  return {
    mesh,
    update: (elapsed: number) => {
      material.uniforms.uTime.value = elapsed;
    },
  };
}
