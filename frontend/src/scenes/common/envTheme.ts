import type { ThemeMode } from '../../stores/appStore';

/* ═══════════════════════════════════════════════
   Environment Theme — day/night for the L2/L3 scenes

   The port (L1) has its own rich theme (ocean, sky, sun).
   The yard and container views just need background, fog
   and light levels to follow the same day/night toggle,
   so the switch feels consistent across every level.
   ═══════════════════════════════════════════════ */

export interface EnvTheme {
  exposure: number;
  bg: number;
  fogDensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  ambient: number;
  ambientIntensity: number;
  keyColor: number;
  keyIntensity: number;
  fillColor: number;
  fillIntensity: number;
}

export const YARD_THEMES: Record<ThemeMode, EnvTheme> = {
  day: {
    exposure: 1.05,
    bg: 0x9db8cf,
    fogDensity: 0.0016,
    hemiSky: 0xdfeeff,
    hemiGround: 0x7a8290,
    hemiIntensity: 1.2,
    ambient: 0xb6c8dc,
    ambientIntensity: 0.6,
    keyColor: 0xfff4e0,
    keyIntensity: 2.0,
    fillColor: 0xffe0b0,
    fillIntensity: 0.3,
  },
  night: {
    exposure: 1.05,
    bg: 0x0a1018,
    fogDensity: 0.003,
    hemiSky: 0x4a6798,
    hemiGround: 0x1a2030,
    hemiIntensity: 0.8,
    ambient: 0x3a4d66,
    ambientIntensity: 0.75,
    keyColor: 0x9fc0ee,
    keyIntensity: 1.0,
    fillColor: 0xffaa66,
    fillIntensity: 0.7,
  },
};

export const CONTAINER_THEMES: Record<ThemeMode, EnvTheme> = {
  day: {
    exposure: 1.05,
    bg: 0x8fa9c2,
    fogDensity: 0.0012,
    hemiSky: 0xeaf3ff,
    hemiGround: 0x8a909a,
    hemiIntensity: 1.1,
    ambient: 0xc2d2e6,
    ambientIntensity: 1.1,
    keyColor: 0xffffff,
    keyIntensity: 1.6,
    fillColor: 0x9fc4ff,
    fillIntensity: 0.5,
  },
  night: {
    exposure: 1.05,
    bg: 0x0e141d,
    fogDensity: 0.0018,
    hemiSky: 0x4a5a72,
    hemiGround: 0x1a2030,
    hemiIntensity: 0.8,
    ambient: 0x4a5a72,
    ambientIntensity: 0.95,
    keyColor: 0xcfe0ff,
    keyIntensity: 1.1,
    fillColor: 0x66aaff,
    fillIntensity: 0.6,
  },
};
