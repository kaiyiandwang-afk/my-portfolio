import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
import type { Curve } from 'three'

/**
 * Digital clay. Organic forms are described as a signed distance function: ellipsoids and capsules blended with a
 * smooth minimum, so a haunch melts into a flank the way real anatomy does. `sculptGeometry` then shrink-wraps a sphere
 * onto that surface once at load. Normals come from the field's gradient, which is what keeps the cel shading clean.
 */
export type Sdf = (x: number, y: number, z: number) => number

export const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

export const smax = (a: number, b: number, k: number) => -smin(-a, -b, k)

export function ellipsoid(x: number, y: number, z: number, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number) {
  const px = x - cx
  const py = y - cy
  const pz = z - cz
  const k0 = Math.hypot(px / rx, py / ry, pz / rz)
  const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz))
  return k1 > 0 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz)
}

export function capsule(x: number, y: number, z: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number) {
  const pax = x - ax
  const pay = y - ay
  const paz = z - az
  const bax = bx - ax
  const bay = by - ay
  const baz = bz - az
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)))
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r
}

export function roundBox(x: number, y: number, z: number, hx: number, hy: number, hz: number, r: number) {
  const qx = Math.abs(x) - hx + r
  const qy = Math.abs(y) - hy + r
  const qz = Math.abs(z) - hz + r
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r
}

interface SculptOptions {
  /** A point inside the form. Everything must be visible from here (star-shaped), which suits animal bodies. */
  center: [number, number, number]
  /** Radius of a sphere that fully contains the form. */
  reach: number
  /** Which axis the wrapping sphere's poles sit on. Put them where they'll be hidden. */
  axis?: 'x' | 'y' | 'z'
  around?: number
  along?: number
}

export function sculptGeometry(sdf: Sdf, { center, reach, axis = 'y', around = 64, along = 44 }: SculptOptions) {
  const [cx, cy, cz] = center
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const e = 0.0006

  for (let j = 0; j <= along; j++) {
    const theta = (j / along) * Math.PI
    for (let i = 0; i <= around; i++) {
      const phi = (i / around) * Math.PI * 2
      const a = Math.sin(theta) * Math.cos(phi)
      const b = Math.cos(theta)
      const c = Math.sin(theta) * Math.sin(phi)
      // cyclic permutations only, which are rotations: the winding below stays outward for every axis
      const dx = axis === 'y' ? a : axis === 'x' ? b : c
      const dy = axis === 'y' ? b : axis === 'x' ? c : a
      const dz = axis === 'y' ? c : axis === 'x' ? a : b

      // march in from outside until we touch the surface, then tighten with a few bisection steps
      let t = reach
      for (let s = 0; s < 64; s++) {
        const d = sdf(cx + dx * t, cy + dy * t, cz + dz * t)
        if (d < 0.0004) break
        t -= d * 0.7
        if (t < 0.001) {
          t = 0.001
          break
        }
      }
      let low = Math.max(t - 0.004, 0.0005)
      let high = t + 0.004
      for (let s = 0; s < 6; s++) {
        const mid = (low + high) / 2
        if (sdf(cx + dx * mid, cy + dy * mid, cz + dz * mid) < 0) low = mid
        else high = mid
      }
      t = (low + high) / 2

      const x = cx + dx * t
      const y = cy + dy * t
      const z = cz + dz * t
      positions.push(x, y, z)

      const gx = sdf(x + e, y, z) - sdf(x - e, y, z)
      const gy = sdf(x, y + e, z) - sdf(x, y - e, z)
      const gz = sdf(x, y, z + e) - sdf(x, y, z - e)
      const length = Math.hypot(gx, gy, gz) || 1
      normals.push(gx / length, gy / length, gz / length)
      uvs.push(i / around, j / along)
    }
  }

  const row = around + 1
  for (let j = 0; j < along; j++) {
    for (let i = 0; i < around; i++) {
      const p = j * row + i
      const q = p + row
      indices.push(p, p + 1, q, p + 1, q + 1, q)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  return geometry
}

/** A flat ribbon along a curve, for straps. */
export function ribbonGeometry(curve: Curve<Vector3>, width: number, segments = 48) {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const up = new Vector3(0, 1, 0)
  const tangent = new Vector3()
  const side = new Vector3()
  const point = new Vector3()
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    curve.getPoint(t, point)
    curve.getTangent(t, tangent)
    side.crossVectors(up, tangent).normalize()
    positions.push(point.x + side.x * width * 0.5, point.y + side.y * width * 0.5, point.z + side.z * width * 0.5)
    positions.push(point.x - side.x * width * 0.5, point.y - side.y * width * 0.5, point.z - side.z * width * 0.5)
    uvs.push(0, t * 6, 1, t * 6)
    if (i < segments) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
