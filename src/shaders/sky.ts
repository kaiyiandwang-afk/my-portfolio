/** Golden-hour sky with cel-stepped clouds, on three-custom-shader-material over a basic material. */

export const skyVertex = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  }
`

export const skyFragment = /* glsl */ `
  varying vec3 vWorldPosition;
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uLow;
  uniform vec3 uCloudLight;
  uniform vec3 uCloudShade;
  uniform vec3 uSunColor;
  uniform vec3 uSunPosition;
  uniform float uSunGlow;
  uniform float uTime;
  uniform float uNight;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float sum = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      sum += amplitude * valueNoise(p);
      p = p * 2.03 + vec2(17.0, 9.0);
      amplitude *= 0.5;
    }
    return sum;
  }

  void main() {
    // What you can see through the window only reaches about 30 units up, so the gradient lives there.
    float h = clamp(vWorldPosition.y / 30.0, 0.0, 1.0);
    vec3 color = mix(uLow, uMid, smoothstep(0.0, 0.34, h));
    color = mix(color, uTop, smoothstep(0.3, 0.86, h));

    // Clouds in two flat tones: bright where the sun catches the top edge, mauve below.
    vec2 q = vec2(vWorldPosition.z * 0.026 + uTime * 0.004, vWorldPosition.y * 0.1);
    float shape = fbm(q) + 0.42 * fbm(q * vec2(0.45, 1.3) + 11.0);
    float band = smoothstep(0.1, 0.34, h) * (1.0 - smoothstep(0.8, 1.0, h));
    float cloud = smoothstep(0.78, 0.8, shape * (0.72 + 0.5 * band)) * band;
    float lit = smoothstep(0.86, 0.9, fbm(q + vec2(0.05, -0.1)) + 0.42 * fbm((q + vec2(0.05, -0.1)) * vec2(0.45, 1.3) + 11.0));
    color = mix(color, mix(uCloudShade, uCloudLight, lit), cloud);

    // Sun glow, wider sideways so it sits along the horizon.
    vec2 toSun = (vWorldPosition.zy - uSunPosition.zy) * vec2(0.55, 1.0);
    float d = length(toSun);
    color += uSunColor * uSunGlow * (exp(-d * 0.05) * 0.5 + exp(-d * 0.2) * 0.75);

    // Stars: one to a cell, jittered, each twinkling at its own pace, and hidden by the clouds.
    vec2 sky = vWorldPosition.zy * 0.85;
    vec2 cell = floor(sky);
    float pick = hash(cell);
    vec2 offset = fract(sky) - 0.5 - (vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5) * 0.7;
    float star = smoothstep(0.075 + pick * 0.05, 0.0, length(offset)) * step(0.955, pick);
    star *= 0.62 + 0.38 * sin(uTime * (0.8 + pick * 2.6) + pick * 40.0);
    color += vec3(0.92, 0.95, 1.0) * star * 1.6 * uNight * smoothstep(0.08, 0.3, h) * (1.0 - cloud);

    csm_FragColor = vec4(color, 1.0);
  }
`

/** Faint diagonal glints on the window, like the painted streaks across the glass in reference 3. */
export const glassVertex = skyVertex

export const glassFragment = /* glsl */ `
  varying vec3 vWorldPosition;
  uniform vec3 uGlint;
  uniform vec3 uNeon;
  uniform vec3 uNeonPosition;
  uniform float uNight;
  uniform float uTime;

  float glassHash(float n) {
    return fract(sin(n * 91.17) * 43758.5453);
  }

  void main() {
    float s = vWorldPosition.z * 0.82 + vWorldPosition.y * 1.05;
    float wide = smoothstep(0.0, 0.03, sin(s * 1.15) - 0.86);
    float thin = smoothstep(0.0, 0.03, sin(s * 1.15 + 0.62) - 0.985);
    float alpha = (0.075 * wide + 0.15 * thin) * (1.0 - uNight * 0.7) + 0.018;
    vec3 color = uGlint;

    // After dark: the neon sign bleeding pink across the wet glass...
    vec2 fromSign = (vWorldPosition.zy - uNeonPosition.zy) * vec2(1.5, 0.72);
    float halo = exp(-dot(fromSign, fromSign) * 0.9) * uNight;
    color = mix(color, uNeon, clamp(halo * 1.6, 0.0, 1.0));
    alpha += halo * 0.34;

    // ...and thin runs of rain sliding down it.
    float column = vWorldPosition.z * 11.0;
    float id = floor(column);
    float run = fract(vWorldPosition.y * 0.42 + uTime * (0.16 + glassHash(id) * 0.3) + glassHash(id + 4.0) * 9.0);
    float streak = smoothstep(0.4, 0.28, abs(fract(column) - 0.5)) * smoothstep(0.0, 0.03, run) * smoothstep(0.34, 0.03, run);
    streak *= step(0.56, glassHash(id + 9.0)) * uNight;
    color = mix(color, vec3(0.74, 0.82, 1.0), streak);
    alpha += streak * 0.3;

    csm_FragColor = vec4(color, alpha);
  }
`
