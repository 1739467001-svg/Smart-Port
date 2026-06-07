import type { ThemeMode } from '../../stores/appStore';

/* ═══════════════════════════════════════════════
   Port Theme Palettes

   Day / night are pure data. Lighting, sky, ocean and
   tone-mapping all read from a PortTheme, so adding a
   new mood (dawn, storm, dusk…) = add one more entry.
   ═══════════════════════════════════════════════ */

export interface PortTheme {
  exposure: number;
  fogDensity: number;

  // Sky gradient (dome)
  skyTop: number;
  skyHorizon: number;

  // Celestial body (sun / moon) — direction the light comes from
  sunDirection: [number, number, number];
  sunColor: number;
  sunSize: number;
  sunGlow: number;

  // Lighting
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  ambient: number;
  ambientIntensity: number;
  sunLightColor: number;
  sunLightIntensity: number;
  warmAccent: number; // crane / apron warm lights
  warmIntensity: number;

  // Ocean
  waterDeep: number;
  waterShallow: number;
  waterFoam: number;
  waterReflection: number; // colour the sea reflects (≈ sky)
  waterSpecular: number;

  // Artificial lighting (street lamps, high-mast floods, windows)
  lampColor: number;
  lampIntensity: number; // real PointLight strength (0 = off, day)
  lampGlow: number; // emissive bulb intensity
  windowGlow: number; // building window emissive intensity
}

export const PORT_THEMES: Record<ThemeMode, PortTheme> = {
  day: {
    exposure: 1.05,
    fogDensity: 0.0003,
    skyTop: 0x5aa0ea,
    skyHorizon: 0xc7e0f5,
    sunDirection: [120, 160, 90],
    sunColor: 0xfff3d6,
    sunSize: 14,
    sunGlow: 1.6,
    hemiSky: 0xcfe8ff,
    hemiGround: 0x7a828f,
    hemiIntensity: 1.25,
    ambient: 0xb3c6dc,
    ambientIntensity: 0.6,
    sunLightColor: 0xfff4e0,
    sunLightIntensity: 2.3,
    warmAccent: 0xffd9a0,
    warmIntensity: 0.15,
    waterDeep: 0x123b5e,
    waterShallow: 0x3f86b8,
    waterFoam: 0xeaf6ff,
    waterReflection: 0xbcd8f2,
    waterSpecular: 0xffffff,
    lampColor: 0xfff0d0,
    lampIntensity: 0.0,
    lampGlow: 0.0,
    windowGlow: 0.0,
  },
  night: {
    exposure: 1.1,
    fogDensity: 0.0006,
    skyTop: 0x070c1a,
    skyHorizon: 0x18243f,
    sunDirection: [-90, 130, -60],
    sunColor: 0xcdd8f0,
    sunSize: 9,
    sunGlow: 1.1,
    hemiSky: 0x4a6798,
    hemiGround: 0x1a2030,
    hemiIntensity: 0.95,
    ambient: 0x52648a,
    ambientIntensity: 0.72,
    sunLightColor: 0xaecbff,
    sunLightIntensity: 1.0,
    warmAccent: 0xff8844,
    warmIntensity: 0.6,
    waterDeep: 0x06121f,
    waterShallow: 0x123247,
    waterFoam: 0x9fc7e8,
    waterReflection: 0x18243f,
    waterSpecular: 0xcdd8f0,
    lampColor: 0xffce8a,
    lampIntensity: 1.6,
    lampGlow: 3.4,
    windowGlow: 2.2,
  },
};
