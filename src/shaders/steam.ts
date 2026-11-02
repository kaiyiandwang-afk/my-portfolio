/**
 * Steam as a shader on a single upright card: wisps of scrolling noise, thin where they leave the surface and spreading
 * and fading as they rise. Much cheaper than particles, and the soft edge reads as painted.
 */
export const steamVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const steamFragment = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uStrength;
  uniform float uSeed;
  uniform vec3 uColor;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  float fbm(vec2 p) {
    return noise(p) * 0.55 + noise(p * 2.1 + 7.0) * 0.3 + noise(p * 4.3 + 13.0) * 0.15;
  }

  void main() {
    float t = uTime * 0.32 + uSeed;
    float y = vUv.y;
    // the whole column wanders, more the higher it gets
    float x = vUv.x - 0.5 + (noise(vec2(y * 2.2 - t * 1.1, uSeed)) - 0.5) * 0.55 * y;
    float spread = mix(0.16, 0.46, sqrt(y));
    float column = smoothstep(spread, spread * 0.25, abs(x));
    float wisps = smoothstep(0.42, 0.68, fbm(vec2(x * 5.0 / (0.4 + y) + uSeed, y * 3.2 - t * 2.2)));
    float ends = smoothstep(0.0, 0.12, y) * smoothstep(1.0, 0.45, y);
    float alpha = wisps * column * ends * uStrength * 0.55;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`
