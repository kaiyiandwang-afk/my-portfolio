/**
 * A two-flavor hotpot, as served: red mala on one side of an S-shaped divider, milky bone broth on the other. Beads of
 * chili oil drift on the red, and bubbles swell and burst across both, in flat cel tones.
 */
export const brothVertex = /* glsl */ `
  varying vec2 vPot;
  void main() {
    vPot = position.xy;
  }
`

export const brothFragment = /* glsl */ `
  varying vec2 vPot;
  uniform float uRadius;
  uniform float uTime;
  uniform float uNight;
  uniform vec3 uRed;
  uniform vec3 uRedDeep;
  uniform vec3 uOil;
  uniform vec3 uMilk;
  uniform vec3 uMilkDeep;

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }

  float wobble(vec2 p) {
    return sin(p.x * 3.1 + uTime * 0.31) * 0.5 + sin(p.y * 2.7 - uTime * 0.23 + p.x * 1.4) * 0.5;
  }

  // Bubbles live one to a cell. Each grows on its own clock, then bursts into a thin fading ring.
  // Returns: x is the bubble's body, y is its bright rim.
  vec2 bubbles(vec2 p, float scale, float speed) {
    vec2 g = p * scale;
    vec2 id = floor(g);
    vec2 jitter = hash2(id);
    vec2 f = fract(g) - 0.5 - (jitter - 0.5) * 0.6;
    float life = fract(uTime * speed * (0.6 + jitter.x * 0.8) + jitter.y * 7.0);
    float grow = smoothstep(0.0, 0.8, life);
    float size = 0.3 * (0.45 + jitter.y * 0.55) * grow;
    float burst = smoothstep(0.8, 1.0, life);
    float d = length(f);
    float body = smoothstep(size, size - 0.03, d) * (1.0 - burst);
    float rim = smoothstep(0.035, 0.0, abs(d - size * (1.0 + burst * 0.6))) * (1.0 - burst) * grow;
    return vec2(body, rim);
  }

  void main() {
    vec2 p = vPot / uRadius;
    bool red = p.x + sin(p.y * 3.14159) * 0.28 < 0.0;

    vec3 color;
    if (red) {
      color = mix(uRedDeep, uRed, smoothstep(-0.3, 0.3, wobble(p * 2.4)));
      // beads of chili oil, pooled in slow-drifting flat ovals
      vec2 oil = bubbles(p + vec2(uTime * 0.012, -uTime * 0.008), 7.0, 0.018);
      color = mix(color, uOil, oil.x * 0.9);
      vec2 bub = bubbles(p, 5.5, 0.34);
      color = mix(color, uOil * 1.15, bub.x * 0.42);
      color += uOil * bub.y * 0.7;
    } else {
      color = mix(uMilkDeep, uMilk, smoothstep(-0.35, 0.25, wobble(p * 2.0 + 4.0)));
      vec2 bub = bubbles(p + 3.1, 5.0, 0.26);
      color = mix(color, uMilk * 1.08, bub.x * 0.5);
      color += vec3(1.0, 0.96, 0.86) * bub.y * 0.28;
    }

    // darker where it meets the wall of the pot
    color *= mix(1.0, 0.72, smoothstep(0.82, 1.0, length(p)));
    // the burner's warmth holds up after dark
    color *= mix(1.0, 0.86, uNight);
    csm_FragColor = vec4(color, 1.0);
  }
`
