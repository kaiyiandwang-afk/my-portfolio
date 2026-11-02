import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, MeshToonMaterial, RepeatWrapping, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Vec3 } from '../config'
import { ellipsoid, sculptGeometry, smin } from '../shaders/sculpt'
import { getToonRamp } from '../shaders/toon'
import { makeCanvasTexture, seeded } from './prims'

/**
 * Long, straight, center-parted hair, built the way anime hair is drawn: overlapping tapered locks over a dark base.
 * Her right side (local -X, facing the close-up) tucks behind the ear to show the hoop. The other falls forward.
 * Authored around the head's center. The material bends only the upper part with the head, so the length stays on her back.
 */

interface Lock {
  points: Vec3[]
  width: number
}

const ROWS = 18

function addLock({ points, width }: Lock, positions: number[], normals: number[], uvs: number[], indices: number[]) {
  const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)))
  const base = positions.length / 3
  const tangent = new Vector3()
  const outward = new Vector3()
  const side = new Vector3()
  const point = new Vector3()

  for (let j = 0; j <= ROWS; j++) {
    const t = j / ROWS
    curve.getPoint(t, point)
    curve.getTangent(t, tangent)
    // outward from the head near the top, and away from the body's axis below it
    outward.set(point.x, point.y > 0.02 ? point.y - 0.02 : 0, point.z).normalize()
    side.crossVectors(tangent, outward).normalize()
    outward.crossVectors(side, tangent).normalize()

    const taper = Math.min(1, t * 10 + 0.45) * (1 - Math.pow(t, 3.2) * 0.96)
    const w = (width * taper) / 2

    for (const across of [-1, -0.4, 0.4, 1]) {
      const puff = (1 - across * across) * w * 0.3 // locks are slightly rounded, not flat paper
      positions.push(
        point.x + side.x * across * w + outward.x * puff,
        point.y + side.y * across * w + outward.y * puff,
        point.z + side.z * across * w + outward.z * puff,
      )
      const n = new Vector3().copy(outward).addScaledVector(side, across * 0.7).normalize()
      normals.push(n.x, n.y, n.z)
      uvs.push((across + 1) / 2, t)
    }
  }

  for (let j = 0; j < ROWS; j++) {
    for (let k = 0; k < 3; k++) {
      const a = base + j * 4 + k
      const b = a + 4
      indices.push(a, a + 1, b, a + 1, b + 1, b)
    }
  }
}

function buildLocks() {
  const rand = seeded(2028)
  const r = (spread: number) => (rand() - 0.5) * spread
  const locks: Lock[] = []

  // The back: falls straight from the part, over the crown, down past her shoulder blades.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 18; i++) {
      const f = i / 17 // 0 near the side of the head, 1 at the very back
      const z0 = 0.03 - f * 0.135 + r(0.012)
      const k = Math.sqrt(Math.max(0.1, 1 - ((z0 + 0.012) / 0.142) ** 2))
      const end = -0.44 - rand() * 0.15
      const dropX = s * (0.14 - f * 0.11 + r(0.02))
      locks.push({
        width: 0.044 + rand() * 0.018,
        points: [
          [s * 0.003, 0.036 + 0.134 * k, z0],
          [s * 0.137 * k * 0.42, 0.036 + 0.134 * k * 0.9, z0],
          [s * 0.137 * k * 0.8, 0.036 + 0.134 * k * 0.58, z0 - 0.004],
          [s * 0.14 * k, 0.012, z0 - 0.018 - f * 0.012],
          [s * Math.max(0.13 * k, 0.05 + (1 - f) * 0.08), -0.09, Math.min(z0 - 0.05, -0.08) - f * 0.03],
          [dropX * 0.96, -0.24, -0.142 - f * 0.012 + r(0.008)],
          [dropX, (-0.24 + end) / 2, -0.146 - f * 0.014 + r(0.012)],
          [dropX * 1.03 + r(0.016), end, -0.135 - f * 0.012 + r(0.018)],
        ],
      })
    }
  }

  // Her right: swept behind the ear, then down the back of the shoulder.
  for (let i = 0; i < 11; i++) {
    const f = i / 10
    const z = 0.08 - f * 0.056
    locks.push({
      width: 0.036 + rand() * 0.012,
      points: [
        [-0.004, 0.155 - f * 0.012, z],
        [-0.06 - f * 0.012, 0.142 - f * 0.018, z + 0.004],
        [-0.108, 0.094 - f * 0.012, z - 0.004],
        [-0.13, 0.034, 0.03 - f * 0.05],
        [-0.135 + f * 0.006, -0.042, -0.05 - f * 0.012],
        [-0.125, -0.15, -0.122 + r(0.008)],
        [-0.135 + r(0.012), -0.3, -0.14 + r(0.008)],
        [-0.14 + r(0.02), -0.42 - rand() * 0.07, -0.128 + r(0.012)],
      ],
    })
  }

  // Her left: falls forward past the cheek and over the sweater, as in most of the photos.
  for (let i = 0; i < 12; i++) {
    const f = i / 11
    const z = 0.086 - f * 0.052
    const out = f * 0.024
    locks.push({
      width: 0.03 + rand() * 0.014,
      points: [
        [0.004, 0.156 - f * 0.012, z],
        [0.056 + out * 0.4, 0.143, z + 0.024 * (1 - f)],
        [0.1 + out * 0.5, 0.082, z + 0.022 * (1 - f) - 0.002],
        [0.122 + out * 0.5, 0.012, z + 0.012 - f * 0.008],
        [0.128 + out * 0.6, -0.078, z + 0.002 - f * 0.012],
        [0.128 + out, -0.17, 0.066 - f * 0.04 + r(0.008)],
        [0.136 + out, -0.31, 0.104 - f * 0.05 + r(0.01)],
        [0.14 + out + r(0.012), -0.44 - rand() * 0.11, 0.114 - f * 0.06 + r(0.012)],
      ],
    })
  }

  // Curtain strands: fine pieces off the part that frame the face without covering the eyes.
  for (const s of [-1, 1]) {
    const count = s === 1 ? 6 : 5
    for (let i = 0; i < count; i++) {
      const f = i / (count - 1)
      const reach = -0.05 - f * 0.1 - rand() * 0.02
      locks.push({
        width: 0.016 + rand() * 0.01,
        points: [
          [s * 0.003, 0.125 - f * 0.012, 0.102 - f * 0.012],
          [s * 0.036, 0.096, 0.116],
          [s * (0.086 + f * 0.01), 0.05, 0.106 - f * 0.004],
          [s * (0.112 + f * 0.008), 0.002, 0.092 - f * 0.002],
          [s * (0.112 + f * 0.012), reach, 0.078 - f * 0.012],
        ],
      })
    }
  }

  // A few flyaways, because real hair is never perfectly tidy.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const z = 0.02 - i * 0.07
      locks.push({
        width: 0.004,
        points: [
          [s * 0.01, 0.168, z],
          [s * 0.05, 0.178 + r(0.008), z + r(0.012)],
          [s * (0.1 + r(0.02)), 0.142 + r(0.012), z + r(0.02)],
          [s * (0.148 + r(0.02)), 0.06 + r(0.02), z + r(0.02)],
        ],
      })
    }
  }

  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  locks.forEach((lock) => addLock(lock, positions, normals, uvs, indices))

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  return geometry
}

/** The dark volume under the locks: skull cap plus a sheet down her back, so nothing shows through the gaps. */
function capField(x: number, y: number, z: number) {
  // Sits further back than the face, so it dips into the skull there. That meeting line is the hairline, and because it's
  // two smooth surfaces intersecting rather than a cut, it stays perfectly clean.
  const cap = ellipsoid(x, y, z, 0, 0.075, -0.021, 0.13, 0.105, 0.118)
  return smin(cap, ellipsoid(x, y, z, 0, -0.27, -0.136, 0.135, 0.29, 0.022), 0.06)
}

export function hairGeometry() {
  const cap = sculptGeometry(capField, { center: [0, 0.01, -0.03], reach: 0.72, axis: 'y', around: 64, along: 60 })
  // the base takes its color from the dark part of the strand gradient
  const uv = cap.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5, 0.42)
  return mergeGeometries([cap, buildLocks()])
}

/** Near-black with the band of light that crosses anime hair near the crown, and browner, sun-touched ends. */
function hairGradient() {
  const texture = makeCanvasTexture(4, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, 0, 0) // v = 0 at the root is the bottom of the canvas
    g.addColorStop(0, '#201513')
    g.addColorStop(0.11, '#211614')
    g.addColorStop(0.17, '#4e382f')
    g.addColorStop(0.205, '#7f6252')
    g.addColorStop(0.245, '#463229')
    g.addColorStop(0.33, '#201513')
    g.addColorStop(0.74, '#231613')
    g.addColorStop(1, '#3f2619')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })
  texture.wrapS = RepeatWrapping
  return texture
}

export interface HairMaterial {
  material: MeshToonMaterial
  uniforms: { uYaw: { value: number }; uPitch: { value: number }; uSway: { value: number } }
}

/** Rotates the hair with the head above the neck, fading to no rotation at the shoulders, so turning doesn't swing it through her body. */
export function hairMaterial(): HairMaterial {
  const uniforms = { uYaw: { value: 0 }, uPitch: { value: 0 }, uSway: { value: 0 } }
  const material = new MeshToonMaterial({ map: hairGradient(), gradientMap: getToonRamp(), side: 2 })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uYaw = uniforms.uYaw
    shader.uniforms.uPitch = uniforms.uPitch
    shader.uniforms.uSway = uniforms.uSway
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform float uYaw;
        uniform float uPitch;
        uniform float uSway;
        vec3 headTurn(vec3 v, float weight) {
          float cp = cos(uPitch * weight), sp = sin(uPitch * weight);
          v = vec3(v.x, v.y * cp - v.z * sp, v.y * sp + v.z * cp);
          float cy = cos(uYaw * weight), sy = sin(uYaw * weight);
          return vec3(v.x * cy + v.z * sy, v.y, -v.x * sy + v.z * cy);
        }`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `vec3 objectNormal = headTurn(vec3(normal), smoothstep(-0.26, -0.07, position.y));`,
      )
      .replace(
        '#include <begin_vertex>',
        // The length moves a little: more toward the ends, in a slow wave running down it.
        /* glsl */ `vec3 transformed = headTurn(vec3(position), smoothstep(-0.26, -0.07, position.y));
        float loose = smoothstep(-0.1, -0.5, position.y);
        transformed.x += sin(uSway + position.y * 3.5 + position.z * 9.0) * 0.008 * loose;
        transformed.z += sin(uSway * 0.7 + position.y * 2.8 + position.x * 7.0) * 0.006 * loose;`,
      )
  }
  material.customProgramCacheKey = () => 'kaiyi-hair'
  return { material, uniforms }
}
