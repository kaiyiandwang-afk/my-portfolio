import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import { Color, Matrix4, Uniform, Vector3, Vector4 } from 'three'
import type { Camera, WebGLRenderer, WebGLRenderTarget } from 'three'
import { ROOM, SUN } from '../config'

/**
 * True volumetric light beams, computed analytically. For each pixel it walks along the view ray through the room,
 * and at each step asks: "if I look from here toward the sun, do I see an open window pane?" Because that test is
 * just arithmetic on the window's dimensions, the beams line up exactly with the frame shadows on the floor, need no
 * extra render passes, and stop correctly behind anything standing in front of them.
 */
const fragment = /* glsl */ `
  uniform mat4 uInverseProjection;
  uniform mat4 uCameraWorld;
  uniform vec3 uSunDirection;
  uniform vec3 uShaftColor;
  uniform float uWindowX;
  uniform vec4 uWindowY;
  uniform vec4 uWindowZ;
  uniform vec3 uBoundsMin;
  uniform vec3 uBoundsMax;

  #define SHAFT_STEPS 16

  float inBeam(vec3 p) {
    float t = (uWindowX - p.x) / uSunDirection.x;
    vec3 q = p + uSunDirection * t;

    const float soft = 0.05;
    float mask = smoothstep(uWindowY.x, uWindowY.x + soft, q.y) * (1.0 - smoothstep(uWindowY.y - soft, uWindowY.y, q.y));
    mask *= smoothstep(uWindowY.w, uWindowY.w + soft, abs(q.y - uWindowY.z));

    // distance to the nearest mullion, with heavier frames on every second one
    float u = (q.z - uWindowZ.x) / uWindowZ.z;
    float cell = floor(u + 0.5);
    float distanceToMullion = abs(u - cell) * uWindowZ.z;
    float halfWidth = mod(cell, 2.0) < 0.5 ? uWindowZ.w * 1.8 : uWindowZ.w;
    mask *= smoothstep(halfWidth, halfWidth + soft, distanceToMullion);
    mask *= step(uWindowZ.x, q.z) * step(q.z, uWindowZ.y);

    // Noise read from the window plane stays constant along each sun ray, so it stretches into distinct streaks.
    // Drifting it slowly reads as leaves moving outside.
    float streak = sin(q.z * 3.3 + sin(q.y * 2.3 + time * 0.05) * 1.3) * sin(q.y * 5.1 + q.z * 1.4 + 1.7 - time * 0.04);
    streak += 0.5 * sin(q.z * 8.3 + q.y * 3.1 + time * 0.03);
    mask *= mix(0.1, 1.0, smoothstep(-0.12, 0.72, streak));
    return mask;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
    vec4 farPoint = uInverseProjection * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
    vec3 viewDirection = normalize(farPoint.xyz / farPoint.w);
    vec3 rayDirection = normalize((uCameraWorld * vec4(viewDirection, 0.0)).xyz);
    vec3 origin = uCameraWorld[3].xyz;

    // how far this pixel's ray travels before it hits something solid
    float viewZ = getViewZ(depth);
    float sceneDistance = viewZ / viewDirection.z;

    // clip the ray to the room
    vec3 invDirection = 1.0 / rayDirection;
    vec3 t0 = (uBoundsMin - origin) * invDirection;
    vec3 t1 = (uBoundsMax - origin) * invDirection;
    vec3 tNear = min(t0, t1);
    vec3 tFar = max(t0, t1);
    float enter = max(max(tNear.x, max(tNear.y, tNear.z)), 0.0);
    float exit = min(min(tFar.x, min(tFar.y, tFar.z)), sceneDistance);

    float beam = 0.0;
    if (exit > enter) {
      float stepLength = (exit - enter) / float(SHAFT_STEPS);
      // per-pixel jitter trades banding for fine grain, which the film grain then hides
      float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
      for (int i = 0; i < SHAFT_STEPS; i++) {
        vec3 p = origin + rayDirection * (enter + (float(i) + jitter) * stepLength);
        // slow rolling density, so the beams look like air and not glass
        float air = 0.78 + 0.22 * sin(p.x * 2.1 + time * 0.13) * sin(p.y * 2.7 - time * 0.09) * sin(p.z * 1.9 + time * 0.07);
        // beams thin out as they cross the room
        float falloff = mix(0.42, 1.0, smoothstep(-4.0, 3.2, p.x));
        beam += inBeam(p) * air * falloff;
      }
      beam *= stepLength;
    }

    outputColor = vec4(inputColor.rgb + uShaftColor * beam, inputColor.a);
  }
`

export class WindowShaftsEffect extends Effect {
  private camera: Camera

  constructor(camera: Camera) {
    const { windowX, backZ, ceilingY, window: win } = ROOM
    const sun = new Vector3(...SUN.direction).normalize()
    super('WindowShaftsEffect', fragment, {
      attributes: EffectAttribute.DEPTH,
      blendFunction: BlendFunction.SRC,
      uniforms: new Map<string, Uniform>([
        ['uInverseProjection', new Uniform(new Matrix4())],
        ['uCameraWorld', new Uniform(new Matrix4())],
        ['uSunDirection', new Uniform(sun)],
        ['uShaftColor', new Uniform(new Color('#ffc184'))],
        ['uWindowX', new Uniform(windowX + 0.08)],
        ['uWindowY', new Uniform(new Vector4(win.sillY + 0.03, win.headY - 0.02, win.railY, 0.05))],
        ['uWindowZ', new Uniform(new Vector4(win.zMin, win.zMax, win.pane, 0.045))],
        ['uBoundsMin', new Uniform(new Vector3(ROOM.extentX, 0, backZ))],
        ['uBoundsMax', new Uniform(new Vector3(windowX, ceilingY, ROOM.extentZ))],
      ]),
    })
    this.camera = camera
  }

  setColor(color: string, intensity: number) {
    ;(this.uniforms.get('uShaftColor')!.value as Color).set(color).multiplyScalar(intensity)
  }

  override update(_renderer: WebGLRenderer, _inputBuffer: WebGLRenderTarget, _deltaTime?: number) {
    this.uniforms.get('uInverseProjection')!.value.copy(this.camera.projectionMatrixInverse)
    this.uniforms.get('uCameraWorld')!.value.copy(this.camera.matrixWorld)
  }
}
