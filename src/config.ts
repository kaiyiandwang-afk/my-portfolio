/**
 * Every tunable in one place: colors, lights, camera, room layout and the interactive object registry.
 * World units are roughly meters. +X points out the window, -Z points at the back wall.
 */
import type { SectionId } from './content'

export type Vec3 = [number, number, number]

const deg = (d: number) => (d * Math.PI) / 180

// ---------------------------------------------------------------- color

export const PALETTE = {
  wall: '#ead9bf',
  wallLow: '#c9a77c',
  ceiling: '#b89a74',
  beam: '#5e3b22',
  floor: '#a9743f',
  woodLight: '#c4935f',
  wood: '#8f5f3a',
  woodDark: '#6b4226',
  frame: '#3f2a1f',
  iron: '#35303a',
  ink: '#2a2430',
  cream: '#f6efe2',
  paper: '#efe3cc',
  brass: '#c9a24e',
  copper: '#b8683a',
  steel: '#9aa3a8',
  lens: '#6d8fd8',
  plant: '#5f9155',
  plantDark: '#3e7048',
  plantLight: '#8cb86c',
  terracotta: '#c9714f',
  ceramic: '#e9e1d2',
  lantern: '#c8362d',
  plum: '#f0a9bb',
  chalkboard: '#2b2f2c',
  cork: '#c79a64',
  bulb: '#ffd9a0',
  // Kaiyi, from her photos
  sweater: '#e9e2d6',
  hair: '#1b1211',
  skin: '#eec7ac',
  jeans: '#2f3444',
  // the mug
  mugGlaze: '#ffb86b',
  catFur: '#e8a860',
  catFurDark: '#c9823f',
  snake: '#6cbc57',
  broth: '#d9542b',
  brothLight: '#f0c070',
  books: ['#d9667a', '#5a74c9', '#f0d38a', '#7fd8b2', '#f6efe2', '#8a6bb0', '#e48a4c', '#3f6b5a'],
  jars: ['#d8b98a', '#a8c0a0', '#c98a6a', '#e3d3b0', '#7f6a55'],
  // outside the window
  skyTop: '#7fa9d6',
  skyMid: '#f6c48f',
  skyLow: '#ffb36b',
  mountainFar: '#b7a4ba',
  mountainMid: '#8d86a8',
  mountainNear: '#66708f',
  city: '#7a6a80',
  cityNear: '#5c5168',
  tree: '#55793f',
  treeDark: '#3d5e38',
  road: '#6b6168',
  sidewalk: '#b5a593',
  neon: '#ff4d6d',
} as const

// ---------------------------------------------------------------- camera

export const CAMERA = {
  fov: 40,
  /** Narrower than this aspect, the vertical FOV opens up so the horizontal framing holds. */
  fovAspect: 16 / 9,
  maxFov: 72,
  near: 0.1,
  far: 300,
  home: {
    position: [-3.1, 2.02, 4.45] as Vec3,
    target: [0.72, 1.28, -0.95] as Vec3,
  },
  orbit: {
    azimuth: deg(25), // either side of home
    polarUp: deg(7),
    polarDown: deg(10),
    zoomIn: 0.8, // fraction of the home distance
    zoomOut: 1.08,
    smoothTime: 0.55,
    dollySpeed: 0.35,
  },
  flight: { duration: 1.2, ease: 'power2.inOut', reducedDuration: 0.45, reducedEase: 'sine.inOut' },
  /** No flight comes closer than this to the center of Kaiyi's head. */
  headClearance: 0.4,
  /** Barely-there sway at home, so the shot never sits perfectly still. */
  drift: { azimuth: deg(0.7), polar: deg(0.25), period: 21 },
}

// ---------------------------------------------------------------- toon shading

export const TOON = {
  /** Soft 4-step ramp. `from` is where each step begins (0 faces away from the light, 1 faces it). */
  levels: [
    { from: 0, value: 0.3 },
    { from: 0.5, value: 0.56 },
    { from: 0.62, value: 0.82 },
    { from: 0.74, value: 1 },
  ],
  softness: 0.018,
}

/** Paper colors for the corkboard's flyers, shared with their drawer versions. */
/** Each drawer takes on a color from its object, which fades across as you walk from one section to the next. */
export const SECTION_TINTS: Record<SectionId, string> = {
  about: '#f4a78c',
  projects: '#8fbcf0',
  research: '#7fcfae',
  experience: '#ecc56a',
  work: '#f0996a',
  creative: '#bda8ec',
  art: '#f294ab',
  cats: '#f7ad4d',
  interests: '#ff8f76',
  contact: '#ff7f73',
}

export const FLYER_COLORS = ['#f6efe2', '#ffd36e', '#7fd8b2', '#f6efe2', '#e7a1ae', '#9cb6ff']

export const INK = { thickness: 1.25, color: '#2a1810' }

// ---------------------------------------------------------------- the sun

export const SUN = {
  /** Points from the room toward the key light. Low enough for golden hour, high enough to reach the floor. */
  direction: [0.84, 0.5, 0.2] as Vec3,
  keyDistance: 16,
  keyTarget: [0.2, 0, -0.2] as Vec3,
  shadowMapSize: 4096,
  shadowArea: 7.5,
  shadowBias: -0.0004,
  shadowNormalBias: 0.02,
  shadowRadius: 1.4,
  /** The disc you see through the window. A cheat: it sits lower than the key light, like a painter would place it. */
  discPosition: [104, 14.5, -58] as Vec3,
  discRadius: 3.1,
}

// ---------------------------------------------------------------- the look (tuned live with leva in dev)

export type ToneMappingName = 'AGX' | 'ACES' | 'NEUTRAL'
export type AoQuality = 'performance' | 'low' | 'medium' | 'high'

export const LOOK = {
  // light
  hemiSky: '#b4d4e0',
  hemiGround: '#5e5560',
  hemiIntensity: 1.08,
  keyColor: '#ffc27e',
  keyIntensity: 5.6,
  fillColor: '#58a9c8',
  fillIntensity: 1.15,
  bounceColor: '#ff9d58',
  bounceIntensity: 4,
  pendantColor: '#ffbe78',
  /** Daylight, so they're off. Night's value is in NIGHT. */
  pendantIntensity: 0,
  lampColor: '#ffc27a',
  lampIntensity: 2.4,
  bulbGlow: 7,

  // air
  fogColor: '#e8a878',
  fogDensity: 0.006,
  shaftColor: '#ffd09a',
  shaftIntensity: 0.3,
  dustColor: '#ffe2b4',
  dustOpacity: 0.8,
  dustSize: 2.4,

  // outside
  exteriorGain: 1.08,
  sunGlow: 1,

  // god rays
  godRaysDensity: 0.92,
  godRaysDecay: 0.93,
  godRaysWeight: 0.42,
  godRaysExposure: 0.6,
  godRaysClamp: 0.9,

  // bloom
  bloomIntensity: 0.62,
  bloomThreshold: 1.05,
  bloomSmoothing: 0.28,
  bloomRadius: 0.72,

  // ambient occlusion
  aoRadius: 0.55,
  aoFalloff: 0.8,
  aoIntensity: 2.2,
  aoColor: '#24121a',

  // depth of field
  // Peak blur during the fly-to's rack focus, and how much depth stays sharp around the subject.
  dofRange: 1.4,
  dofBokeh: 3,

  // lens and grade
  toneMapping: 'ACES' as ToneMappingName,
  saturation: 0.06,
  contrast: 0.14,
  brightness: 0,
  aberration: 0.0005,
  grain: 0.14,
  vignetteOffset: 0.28,
  vignetteDarkness: 0.5,

  // Quality switches, which the performance tiers will drive in Phase 6. Measured on 2.6MP: DOF 8.8ms, AO 6ms at medium,
  // MSAA 4x 5.5ms, god rays 1ms, shafts 0.1ms. So DOF only runs during the fly-to's rack focus; `dof` allows that at all.
  ao: true,
  aoQuality: 'low' as AoQuality,
  godRays: true,
  dof: true,
  shafts: true,
  msaa: 2,
}

export type Look = typeof LOOK

/**
 * The same café after dark: moonlight through the window and warm pools from the pendants, with the shadows going indigo.
 * Day values live in LOOK; everything fades between the two.
 */
export const NIGHT = {
  hemiSky: '#3a4a86',
  hemiGround: '#231c28',
  hemiIntensity: 0.62,
  keyColor: '#8fa6ea',
  keyIntensity: 1.05,
  fillColor: '#4257a8',
  fillIntensity: 0.6,
  bounceColor: '#ffab6a',
  bounceIntensity: 1.1,
  pendantIntensity: 6.2,
  /** The pendant cluster by the window hangs right over Kaiyi, so it gets a fraction of that. */
  windowPendantShare: 0.3,
  laptopColor: '#bcd0ff',
  laptopIntensity: 0.55,
  lanternGlow: 1.5,
  neonGain: 2.9,
  fogColor: '#1b1f3a',
  fogDensity: 0.006,
  shaftColor: '#8ca4ff',
  shaftIntensity: 0.1,
  godRaysOpacity: 0.34,
  bloomIntensity: 0.95,
  bloomThreshold: 1.02,
  skyTop: '#0a1034',
  skyMid: '#1c2358',
  skyLow: '#3c3a70',
  cloudLight: '#39406f',
  cloudShade: '#1c2149',
  moonGlow: '#5f77c9',
  moonDisc: '#f0f3ff',
  moonScale: 0.62,
  /** Multiplies the painted city, so it falls into shadow while its lit windows stay bright. */
  exteriorTint: [0.17, 0.2, 0.42] as Vec3,
}

// ---------------------------------------------------------------- outside the window

/** Painted layers, far to near. Golden-hour colors, hazier and warmer with distance. */
export const EXTERIOR = {
  skyTop: '#5f9fc9',
  skyMid: '#f7d8ae',
  skyLow: '#ffb478',
  cloudLight: '#fff1d8',
  cloudShade: '#dba79f',
  sunColor: '#ffb066',
  sunDisc: '#fff0c4',
  groundHaze: '#d19a84',
  mountainsFar: {
    seed: 3,
    peaks: 13,
    ridge: '#b49db6',
    haze: '#eab896',
    lit: '#f0c4a4',
    heights: [0.45, 0.84] as [number, number],
    snow: '#fbe6d0',
  },
  mountainsMid: {
    seed: 8,
    peaks: 11,
    ridge: '#7f84a8',
    haze: '#d9a488',
    lit: '#d6a48c',
    heights: [0.4, 0.8] as [number, number],
  },
  mountainsNear: {
    seed: 14,
    peaks: 10,
    ridge: '#4f7088',
    haze: '#c49282',
    lit: '#8f9a78',
    heights: [0.34, 0.74] as [number, number],
  },
  cityFar: {
    seed: 21,
    base: '#a68a96',
    lit: '#eab890',
    window: '#8e7686',
    windowLit: '#ffdca0',
    heights: [0.3, 0.72] as [number, number],
    widths: [34, 74] as [number, number],
    haze: '#e0ae90',
  },
  cityNear: {
    seed: 27,
    base: '#7a6678',
    lit: '#e8a878',
    window: '#5c4e60',
    windowLit: '#ffd68c',
    heights: [0.28, 0.66] as [number, number],
    widths: [46, 108] as [number, number],
    haze: '#c99a84',
  },
  /** The café sits a step above the street, so the view looks slightly down onto it. */
  groundY: -1.2,
  /** Painted tree cards. The gap between the near groups keeps the view open behind Kaiyi. */
  trees: [
    { x: 9.6, z: -13.5, height: 4.5 },
    { x: 9.2, z: -9.6, height: 3.9 },
    { x: 9.4, z: 3.4, height: 4.3 },
    { x: 9.3, z: 8.6, height: 4.5 },
    { x: 26, z: -30, height: 2.9 },
    { x: 26.4, z: -19, height: 2.6 },
    { x: 26, z: -8.4, height: 2.7 },
    { x: 26.2, z: 4, height: 2.9 },
    { x: 26.1, z: 15, height: 2.7 },
  ],
}

// ---------------------------------------------------------------- the cat

/** TODO(kaiyi): match these to your real cat. Colors and markings all live here and in shaders/fur.ts. */
export const CAT = {
  base: '#e59a52',
  dark: '#a9581f',
  cream: '#f7ead6',
  earInner: '#e8b0a4',
  nose: '#d98a86',
  iris: { outer: '#c29a3a', inner: '#9fb45a' },
  /** Fewer shells is cheaper. Phase 6's low tiers lower this. */
  shells: 14,
  /** Legs are thin enough that fewer shells look the same. */
  legShells: 8,
  fur: {
    body: { length: 0.0078, density: 560 },
    head: { length: 0.0038, density: 760 },
    tail: { length: 0.0072, density: 560 },
    ear: { length: 0.0018, density: 900 },
  },
}

// ---------------------------------------------------------------- room shell

export const ROOM = {
  windowX: 3.2, // window wall plane
  backZ: -3.2, // back wall plane
  ceilingY: 3.3,
  extentX: -10, // how far the back wall and floor run off-frame to the left
  extentZ: 9, // how far the window wall and floor run off-frame toward the camera
  window: { zMin: -3.08, zMax: 8.2, sillY: 1.14, headY: 2.98, railY: 2.4, pane: 1.28 },
}

export const COUNTER = {
  centerX: 2.72,
  depth: 0.84,
  topY: 1.02,
  thickness: 0.06,
  zMin: -3.18,
  zMax: 8.2,
}

export const BAR = {
  xMin: -10,
  xMax: -0.45,
  centerZ: -1.42,
  depth: 0.72,
  height: 1.12,
}

export const BACK_BAR = { xMin: -10, xMax: -0.85, centerZ: -2.92, depth: 0.54, height: 0.95 }

// ---------------------------------------------------------------- where things sit

const T = COUNTER.topY

export const LAYOUT = {
  kaiyi: { position: [2.0, 0, -0.55] as Vec3, rotationY: Math.PI / 2 },
  laptop: { position: [2.62, T, -0.55] as Vec3, rotationY: -Math.PI / 2 },
  mug: { position: [2.45, T, 0.0] as Vec3 },
  lamp: { position: [3.0, T, 0.04] as Vec3, rotationY: 2.21 },
  books: { position: [2.82, T, -2.14] as Vec3 },
  telephone: { position: [2.72, T, 0.6] as Vec3, rotationY: -1.62 },
  cat: { position: [2.62, T, 1.2] as Vec3, rotationY: -1.2, scale: 1.14 },
  filmCamera: { position: [2.6, T, 1.76] as Vec3, rotationY: -1.5 },
  recordPlayer: { position: [2.75, T, -2.78] as Vec3, rotationY: -1.57 },
  hotpot: { position: [-0.32, 0, 0.62] as Vec3 },
  art: { position: [2.45, 1.92, ROOM.backZ + 0.03] as Vec3 },
  scroll: { position: [1.62, 1.95, ROOM.backZ + 0.03] as Vec3 },
  bookshelf: { position: [0.95, 0, ROOM.backZ + 0.2] as Vec3 },
  terrarium: { position: [0.95, 2.22, ROOM.backZ + 0.2] as Vec3 },
  clock: { position: [0.95, 2.83, ROOM.backZ + 0.03] as Vec3 },
  corkboard: { position: [-0.22, 1.72, ROOM.backZ + 0.03] as Vec3 },
  jarShelves: { position: [-0.22, 2.42, ROOM.backZ + 0.11] as Vec3 },
  chalkboard: { position: [-1.74, 1.98, ROOM.backZ + 0.03] as Vec3 },
  espresso: { position: [-1.62, BAR.height, BAR.centerZ] as Vec3 },
  stools: {
    counter: [-2.25, -1.4, -0.55, 0.3, 1.15, 2.0, 2.85, 3.7, 4.55, 5.4].map(
      (z) => [2.0, 0, z] as Vec3,
    ),
    bar: [-3.1, -2.2, -1.3].map((x) => [x, 0, BAR.centerZ + 0.62] as Vec3),
  },
  pendants: [
    { position: [1.92, 2.3, -1.18] as Vec3, kind: 'edison' },
    { position: [1.92, 2.34, 0.85] as Vec3, kind: 'edison' },
    { position: [-0.95, 2.62, BAR.centerZ] as Vec3, kind: 'edison' },
    { position: [-2.05, 2.62, BAR.centerZ] as Vec3, kind: 'edison' },
    { position: [-0.32, 2.74, 0.62] as Vec3, kind: 'shade' },
  ] as const,
  /** One real light per cluster of bulbs, which keeps the fragment cost down. */
  pendantLights: [[-1.5, 2.3, BAR.centerZ] as Vec3, [-0.32, 2.4, 0.62] as Vec3, [1.92, 2.1, -0.15] as Vec3],
  /** Under the desk lamp's shade. */
  lampLight: [2.81, 1.48, -0.216] as Vec3,
  /** Just in front of the laptop's screen: the glow on Kaiyi's face after dark. */
  laptopLight: [2.56, 1.3, -0.55] as Vec3,
  /** Fakes sunlight bouncing up off the bright patch on the floor. */
  bounceLight: [0.1, 0.4, 0.1] as Vec3,
  hangingPlants: [[0.86, 2.74, 1.02] as Vec3, [-3.05, 2.88, -0.2] as Vec3],
  floorPlants: [
    { position: [-0.15, 0, -2.72] as Vec3, scale: 0.85 },
    { position: [-3.72, 0, 2.05] as Vec3, scale: 1.25 },
  ],
  counterPlants: [
    { position: [2.95, T, 2.46] as Vec3, scale: 1.0 },
    { position: [2.95, T, 3.6] as Vec3, scale: 0.95 },
      ],
  /** Where each interest floats above the pot, relative to the pot's table. One per interest in content.ts. */
  hotpotPills: [
    [-0.46, 0.25, 0.1],
    [-0.31, 0.39, -0.02],
    [-0.12, 0.49, -0.08],
    [0.1, 0.53, -0.1],
    [0.3, 0.46, -0.06],
    [0.42, 0.33, 0.02],
    [0.48, 0.2, 0.12],
  ] as Vec3[],
  lantern: { position: [2.52, 2.62, -2.2] as Vec3 },
  plumVase: { position: [-0.72, BAR.height, BAR.centerZ] as Vec3 },
  neonSign: { position: [3.95, 2.0, 0.15] as Vec3, rotationY: deg(-52) },
}

// ---------------------------------------------------------------- interactive objects

export type ActionId = 'timer' | 'music' | 'lamp' | 'dayNight' | 'explore'

export type InteractiveId =
  | 'kaiyi'
  | 'laptop'
  | 'bookshelf'
  | 'corkboard'
  | 'espresso'
  | 'filmCamera'
  | 'art'
  | 'cat'
  | 'hotpot'
  | 'terrarium'
  | 'telephone'
  | 'clock'
  | 'recordPlayer'
  | 'lamp'
  | 'window'
  | 'chalkboard'

export interface Interactive {
  id: InteractiveId
  /** Text on the hover tag and in Labels mode. */
  tag: string
  section?: SectionId
  action?: ActionId
  /** Where the tag's pointer lands, in world space. */
  anchor: Vec3
  /** The invisible box that catches the pointer. Generous on small props, so they're easy to hit. */
  hit: { center: Vec3; size: Vec3; rotationY?: number }
  /** How far the object rises while hovered. Wall objects come toward the room instead of up. */
  lift?: Vec3
  /** Close-up camera pose for the fly-to. Objects without one act in place. */
  closeUp?: { position: Vec3; target: Vec3 }
  /** Replaces closeUp on phones, where a panel beside the subject has nowhere to go. */
  phoneCloseUp?: { position: Vec3; target: Vec3 }
  /** Set when the section opens in the side drawer, so the shot leaves room for it. */
  drawer?: boolean
}

const p = LAYOUT
const LIFT = 0.018
const OFF_WALL: Vec3 = [0, 0, 0.022]

export const INTERACTIVES: Interactive[] = [
  {
    id: 'kaiyi',
    tag: 'Kaiyi',
    section: 'about',
    anchor: [2.0, 1.76, -0.55],
    hit: { center: [2.0, 1.0, -0.55], size: [0.52, 1.46, 0.62] },
    // From the window side, so she looks back over her shoulder at you, with room for her speech bubble on the right.
    closeUp: { position: [2.34, 1.5, 0.82], target: [2.34, 1.34, -0.55] },
    // Her head sits in the top third, above the conversation.
    phoneCloseUp: { position: [2.1, 1.33, 0.6], target: [2.04, 1.135, -0.55] },
  },
  {
    id: 'laptop',
    tag: 'Projects',
    section: 'projects',
    anchor: [2.78, 1.36, -0.55],
    hit: { center: [2.68, 1.16, -0.55], size: [0.42, 0.34, 0.46] },
    lift: [0, LIFT, 0],
    // Square-on to the tilted screen, just in front of Kaiyi, so Phase 4's tiny desktop fills the frame.
    closeUp: { position: [2.36, 1.304, -0.55], target: [2.8, 1.1775, -0.55] },
  },
  {
    id: 'bookshelf',
    tag: 'Research',
    section: 'research',
    anchor: [p.bookshelf.position[0] - 0.45, 1.5, p.bookshelf.position[2] + 0.2],
    hit: { center: [p.bookshelf.position[0], 1.1, p.bookshelf.position[2]], size: [1.14, 2.2, 0.42] },
    lift: OFF_WALL,
    drawer: true,
    // From the left, because a head-on shot slides Kaiyi into frame once the drawer's room is taken into account.
    closeUp: { position: [-0.35, 1.34, -0.35], target: [0.95, 1.16, -3.0] },
  },
  {
    id: 'corkboard',
    tag: 'Experience',
    section: 'experience',
    anchor: [p.corkboard.position[0], 2.2, p.corkboard.position[2]],
    hit: { center: [p.corkboard.position[0], p.corkboard.position[1], p.corkboard.position[2] + 0.03], size: [1.22, 0.94, 0.1] },
    lift: OFF_WALL,
    drawer: true,
    closeUp: { position: [-0.32, 1.74, -1.42], target: [-0.22, 1.72, -3.17] },
  },
  {
    id: 'espresso',
    tag: 'Work',
    section: 'work',
    anchor: [p.espresso.position[0], 1.82, p.espresso.position[2]],
    hit: { center: [p.espresso.position[0], 1.38, p.espresso.position[2]], size: [0.92, 0.54, 0.52] },
    lift: [0, LIFT, 0],
    drawer: true,
    closeUp: { position: [-2.0, 1.7, -0.1], target: [-1.62, 1.34, -1.42] },
  },
  {
    id: 'filmCamera',
    tag: 'Design & film',
    section: 'creative',
    anchor: [p.filmCamera.position[0], 1.23, p.filmCamera.position[2]],
    hit: { center: [p.filmCamera.position[0], 1.1, p.filmCamera.position[2]], size: [0.34, 0.2, 0.34], rotationY: p.filmCamera.rotationY },
    lift: [0, LIFT, 0],
    drawer: true,
    closeUp: { position: [2.14, 1.34, 2.16], target: [2.6, 1.09, 1.78] },
  },
  {
    id: 'art',
    tag: 'Art',
    section: 'art',
    anchor: [p.art.position[0], 2.72, p.art.position[2]],
    hit: { center: [p.art.position[0] + 0.05, p.art.position[1], p.art.position[2] + 0.03], size: [1.26, 1.08, 0.1] },
    lift: OFF_WALL,
    drawer: true,
    closeUp: { position: [2.02, 1.92, -1.38], target: [2.45, 1.92, -3.17] },
  },
  {
    id: 'cat',
    tag: 'Cat',
    section: 'cats',
    anchor: [p.cat.position[0], 1.53, p.cat.position[2]],
    hit: { center: [p.cat.position[0], 1.24, p.cat.position[2]], size: [0.5, 0.48, 0.66], rotationY: p.cat.rotationY },
    drawer: true,
    closeUp: { position: [1.76, 1.46, 1.68], target: [2.62, 1.24, 1.2] },
  },
  {
    id: 'hotpot',
    tag: "Things I'm into",
    section: 'interests',
    anchor: [p.hotpot.position[0], 1.12, p.hotpot.position[2]],
    hit: { center: [p.hotpot.position[0], 0.5, p.hotpot.position[2]], size: [1.14, 1, 1.14] },
    lift: [0, 0.012, 0],
    // Interests rise out of the pot, so this one stays centered with no drawer.
    closeUp: { position: [-1.26, 1.8, 1.82], target: [-0.32, 1.06, 0.62] },
  },
  {
    id: 'terrarium',
    tag: 'Snake',
    section: 'interests',
    anchor: [p.terrarium.position[0], 2.6, p.terrarium.position[2]],
    hit: { center: [p.terrarium.position[0], 2.4, p.terrarium.position[2]], size: [0.72, 0.38, 0.38] },
    lift: [0, LIFT, 0],
    drawer: true,
    closeUp: { position: [0.66, 2.42, -1.66], target: [0.95, 2.36, -3.0] },
  },
  {
    id: 'telephone',
    tag: 'Say hi',
    section: 'contact',
    anchor: [p.telephone.position[0], 1.27, p.telephone.position[2]],
    hit: { center: [p.telephone.position[0], 1.12, p.telephone.position[2] + 0.02], size: [0.42, 0.26, 0.44], rotationY: p.telephone.rotationY },
    lift: [0, LIFT, 0],
    drawer: true,
    closeUp: { position: [2.1, 1.42, 1.0], target: [2.72, 1.11, 0.6] },
  },
  {
    id: 'clock',
    tag: 'Focus timer',
    action: 'timer',
    anchor: [p.clock.position[0], 3.12, p.clock.position[2]],
    hit: { center: [p.clock.position[0], p.clock.position[1], p.clock.position[2] + 0.03], size: [0.58, 0.58, 0.1] },
    lift: OFF_WALL,
  },
  {
    id: 'recordPlayer',
    tag: 'Lo-fi',
    action: 'music',
    anchor: [p.recordPlayer.position[0], 1.3, p.recordPlayer.position[2]],
    hit: { center: [p.recordPlayer.position[0], 1.1, p.recordPlayer.position[2]], size: [0.46, 0.2, 0.56] },
    lift: [0, LIFT, 0],
  },
  {
    id: 'lamp',
    tag: 'Lamp',
    action: 'lamp',
    anchor: [p.lamp.position[0] - 0.18, 1.8, p.lamp.position[2] - 0.2],
    hit: { center: [p.lamp.position[0] - 0.08, 1.36, p.lamp.position[2] - 0.1], size: [0.34, 0.72, 0.42] },
    lift: [0, LIFT, 0],
  },
  {
    id: 'window',
    tag: 'Day / night',
    action: 'dayNight',
    anchor: [ROOM.windowX, 2.72, 1.02],
    hit: { center: [ROOM.windowX + 0.05, 2.06, 2.5], size: [0.05, 1.84, 11.2] },
  },
  {
    id: 'chalkboard',
    tag: 'Menu',
    action: 'explore',
    anchor: [p.chalkboard.position[0], 2.68, p.chalkboard.position[2]],
    hit: { center: [p.chalkboard.position[0], p.chalkboard.position[1], p.chalkboard.position[2] + 0.03], size: [1.84, 1.34, 0.1] },
    lift: OFF_WALL,
    closeUp: { position: [-1.82, 1.92, -1.04], target: [-1.74, 1.96, -3.17] },
  },
]
