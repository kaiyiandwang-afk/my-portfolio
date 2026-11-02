import { Color, MeshToonMaterial, Vector3 } from 'three'
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import { getToonRamp } from './toon'

/**
 * Shell fur. The same mesh is drawn many times as one instanced call, each copy pushed a little further along its
 * normals; each shell keeps only the pixels that sit inside a strand. Stacked together, those dots become tapered hairs.
 * It's cheap here because the cat is small on screen, and Phase 6's low tiers can simply use fewer shells.
 */

export type FurPattern = 'body' | 'head' | 'tail' | 'ear' | 'leg'

const PATTERN_ID: Record<FurPattern, number> = { body: 0, head: 1, tail: 2, ear: 3, leg: 4 }

const vertexShader = /* glsl */ `
  uniform float uShells;
  uniform float uLength;
  uniform vec3 uComb;
  varying vec3 vFurPosition;
  varying vec3 vFurNormal;
  varying float vShell;

  #ifdef TAIL
    uniform vec3 uTailP0;
    uniform vec3 uTailP1;
    uniform vec3 uTailP2;
    uniform vec3 uTailP3;
    uniform vec3 uTailRef;
    uniform float uTailLength;

    // objects/Cat.tsx poses and swishes the tail by moving these control points.
    vec3 tailSpine(float t) {
      float u = 1.0 - t;
      return u * u * u * uTailP0 + 3.0 * u * u * t * uTailP1 + 3.0 * u * t * t * uTailP2 + t * t * t * uTailP3;
    }
  #endif

  void main() {
    vShell = float(gl_InstanceID) / uShells;
    float rise = uLength * vShell;
    // hairs lean along the coat and droop slightly toward their tips
    vec3 lean = uComb * uLength * vShell * vShell;

    #ifdef TAIL
      float t = position.z;
      vec3 spine = tailSpine(t);
      vec3 tangent = normalize(tailSpine(min(t + 0.01, 1.0)) - tailSpine(max(t - 0.01, 0.0)));
      // uTailRef points away from the plane the tail lies in, so the frame holds whether it's curled flat or held up
      vec3 side = normalize(cross(uTailRef, tangent));
      vec3 up = normalize(cross(tangent, side));
      vec3 surfaceNormal = normalize(side * normal.x + up * normal.y);
      csm_Position = spine + side * position.x + up * position.y + surfaceNormal * rise + lean;
      csm_Normal = surfaceNormal;
      vFurPosition = vec3(position.xy, t * uTailLength);
      vFurNormal = normal;
    #else
      csm_Position = position + normal * rise + lean;
      vFurPosition = position;
      vFurNormal = normal;
    #endif
  }
`

const fragmentShader = /* glsl */ `
  uniform float uDensity;
  uniform vec3 uBase;
  uniform vec3 uDark;
  uniform vec3 uCream;
  uniform float uSock;
  varying vec3 vFurPosition;
  varying vec3 vFurNormal;
  varying float vShell;

  float furHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Tabby markings are computed from the position on the body, so they stay crisp at any distance.
  vec3 coat(vec3 p) {
    #if PATTERN == 0
      // stripes wrap around the barrel of the body, wavering as real ones do
      float waver = sin(p.x * 24.0 + p.z * 11.0) * 0.012 + sin(p.y * 37.0 - p.x * 9.0) * 0.007;
      float bands = sin((p.z + waver) * 88.0 + 1.1);
      float stripe = smoothstep(0.34, 0.74, bands) * smoothstep(0.07, 0.14, p.y);
      // a darker line along the spine
      stripe = max(stripe, smoothstep(0.022, 0.008, abs(p.x)) * smoothstep(0.19, 0.22, p.y) * 0.7);
      vec3 c = mix(uBase, uDark, stripe * 0.86);
      // chest and paws
      float chest = smoothstep(0.12, 0.165, p.z) * smoothstep(0.056, 0.026, abs(p.x) * 0.8 + abs(p.y - 0.1) * 0.55);
      float paws = smoothstep(0.05, 0.026, p.y) * smoothstep(0.13, 0.165, p.z);
      float belly = smoothstep(0.04, 0.012, p.y);
      return mix(c, uCream, clamp(chest + paws + belly * 0.7, 0.0, 1.0));
    #elif PATTERN == 1
      vec3 c = uBase;
      // the tabby "M" on the forehead
      float forehead = smoothstep(0.022, 0.036, p.y) * smoothstep(0.0, 0.03, p.z) * smoothstep(0.052, 0.03, abs(p.x));
      float lines = smoothstep(0.25, 0.7, sin(abs(p.x) * 165.0 + p.y * 40.0));
      c = mix(c, uDark, forehead * lines * 0.9);
      // cheek stripes sweeping back from the eyes
      float cheek = smoothstep(0.046, 0.066, abs(p.x)) * smoothstep(-0.05, -0.02, p.y) * smoothstep(0.018, 0.0, p.y);
      float sweep = smoothstep(0.25, 0.75, sin((p.y + p.z * 0.35) * 150.0));
      c = mix(c, uDark, cheek * sweep * 0.85);
      // pale muzzle and chin
      float muzzle = smoothstep(0.044, 0.064, p.z) * smoothstep(0.006, -0.018, p.y);
      float chin = smoothstep(-0.03, -0.05, p.y) * smoothstep(0.02, 0.05, p.z);
      // pale rims around the eyes
      float rim = smoothstep(0.03, 0.021, length(vec2(abs(p.x) - 0.036, (p.y - 0.004) * 1.25))) * smoothstep(0.03, 0.05, p.z);
      return mix(c, uCream, clamp(muzzle + chin + rim * 0.32, 0.0, 1.0));
    #elif PATTERN == 2
      float rings = smoothstep(0.1, 0.55, sin(p.z * 44.0));
      float tip = smoothstep(0.46, 0.53, p.z);
      return mix(mix(uBase, uDark, rings * 0.85), uDark, tip);
    #elif PATTERN == 3
      return mix(uBase, uDark, smoothstep(0.045, 0.075, p.y));
    #else
      // legs run down local -Y: tabby bars, then a white sock below uSock
      float bars = smoothstep(0.2, 0.7, sin(p.y * 96.0 + 0.6));
      return mix(mix(uBase, uDark, bars * 0.62), uCream, smoothstep(uSock + 0.012, uSock - 0.008, p.y));
    #endif
  }

  void main() {
    // Project onto the normal's dominant plane: even strand density everywhere, with no UV poles to pinch.
    vec3 a = abs(vFurNormal);
    vec2 q = a.x > a.y && a.x > a.z ? vFurPosition.yz : (a.y > a.z ? vFurPosition.zx : vFurPosition.xy);
    // Turned off-axis, with each strand jittered inside its cell, so no regular grid ever shows.
    vec2 g = mat2(0.82, -0.57, 0.57, 0.82) * q * uDensity;
    vec2 id = floor(g);
    vec2 jitter = vec2(furHash(id + 11.3), furHash(id + 29.7)) - 0.5;
    vec2 f = fract(g) - 0.5 - jitter * 0.62;
    float strand = furHash(id);

    if (vShell > 0.001) {
      float height = 0.42 + 0.58 * strand;
      float radius = 0.86 * (1.0 - vShell / height);
      if (radius <= 0.0 || length(f) > radius) discard;
    }

    // Roots sit in shadow and tips catch the light, which gives fur its soft depth.
    float depth = mix(0.7, 1.08, vShell);
    float variation = 0.9 + 0.2 * furHash(id + 3.7);
    csm_DiffuseColor = vec4(coat(vFurPosition) * depth * variation, 1.0);
  }
`

export interface FurOptions {
  pattern: FurPattern
  /** Hair length in world units. */
  length: number
  /** Strands per world unit. */
  density: number
  shells: number
  /** Which way the coat lies. */
  comb?: [number, number, number]
  base: string
  dark: string
  cream: string
  /** On legs, the height in local Y below which the fur turns white. */
  sock?: number
  tail?: { p0: Vector3; p1: Vector3; p2: Vector3; p3: Vector3; ref: Vector3; length: number }
}

export function furMaterial({ pattern, length, density, shells, comb = [0, -0.5, -1], base, dark, cream, sock = -9, tail }: FurOptions) {
  const prefix = `#define PATTERN ${PATTERN_ID[pattern]}\n${tail ? '#define TAIL\n' : ''}`
  const uniforms: Record<string, { value: unknown }> = {
    uShells: { value: shells },
    uLength: { value: length },
    uComb: { value: new Vector3(...comb) },
    uDensity: { value: density },
    uBase: { value: new Color(base) },
    uDark: { value: new Color(dark) },
    uCream: { value: new Color(cream) },
    uSock: { value: sock },
  }
  if (tail) {
    uniforms.uTailP0 = { value: tail.p0 }
    uniforms.uTailP1 = { value: tail.p1 }
    uniforms.uTailP2 = { value: tail.p2 }
    uniforms.uTailP3 = { value: tail.p3 }
    uniforms.uTailRef = { value: tail.ref }
    uniforms.uTailLength = { value: tail.length }
  }

  return new CustomShaderMaterial({
    baseMaterial: MeshToonMaterial,
    vertexShader: prefix + vertexShader,
    fragmentShader: prefix + fragmentShader,
    uniforms,
    gradientMap: getToonRamp(),
  } as never) as unknown as MeshToonMaterial
}
