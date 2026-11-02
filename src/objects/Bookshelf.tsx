import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instance, Instances } from '@react-three/drei'
import { easing } from 'maath'
import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, MathUtils, RepeatWrapping, TubeGeometry, Vector3 } from 'three'
import type { Group } from 'three'
import { useCafe } from '../state/store'
import { LAYOUT, PALETTE } from '../config'
import { Box, Inked, Limb, Part, RoundBox, Sph, Surface, makeCanvasTexture, seeded } from './prims'

const scratch = new Vector3()
const along = new Vector3()
const across = new Vector3()
const up = new Vector3()
const point = new Vector3()

const SHELF = { width: 1.06, height: 2.2, depth: 0.36 }
const LEVELS = [0.06, 0.58, 1.1, 1.62, 2.17]

export function Bookshelf() {
  const { position } = LAYOUT.bookshelf

  const books = useMemo(() => {
    const rand = seeded(29)
    const result: { position: [number, number, number]; scale: [number, number, number]; color: string }[] = []
    LEVELS.slice(0, -1).forEach((y) => {
      let x = -SHELF.width / 2 + 0.05
      while (x < SHELF.width / 2 - 0.1) {
        const thick = 0.04 + rand() * 0.045
        const tall = 0.3 + rand() * 0.15
        // leave a gap now and then so the shelf doesn't read as a solid wall of spines
        if (rand() < 0.1) {
          x += 0.11
          continue
        }
        result.push({
          position: [x + thick / 2, y + 0.025 + tall / 2, 0.02],
          scale: [thick, tall, 0.26],
          color: PALETTE.books[Math.floor(rand() * PALETTE.books.length)],
        })
        x += thick + 0.004
      }
    })
    // A few books on the middle shelf stay separate, so they can slide out when Research opens.
    const middle = result.filter(({ position: [, y] }) => y > LEVELS[2] && y < LEVELS[3])
    const start = Math.floor(middle.length / 2) - 2
    const heroes = middle.slice(start, start + 4)
    return { rest: result.filter((book) => !heroes.includes(book)), heroes }
  }, [])

  const slide = useRef<Group>(null)
  useFrame((_, delta) => {
    if (!slide.current) return
    easing.damp(slide.current.position, 'z', useCafe.getState().openSection === 'research' ? 0.13 : 0, 0.25, delta)
  })

  return (
    <group position={position}>
      {/* carcass */}
      <Inked>
        <Box size={[0.05, SHELF.height, SHELF.depth]} position={[-SHELF.width / 2, SHELF.height / 2, 0]} color={PALETTE.wood} />
        <Box size={[0.05, SHELF.height, SHELF.depth]} position={[SHELF.width / 2, SHELF.height / 2, 0]} color={PALETTE.wood} />
      </Inked>
      <Box size={[SHELF.width, SHELF.height, 0.02]} position={[0, SHELF.height / 2, -SHELF.depth / 2 + 0.01]} color={PALETTE.woodDark} noCast />
      {LEVELS.map((y) => (
        <Box key={y} size={[SHELF.width, 0.05, SHELF.depth]} position={[0, y, 0]} color={PALETTE.wood} />
      ))}

      {/* books, instanced */}
      <group ref={slide}>
        {books.heroes.map((book) => (
          <Box key={book.position.join()} size={book.scale} position={book.position} color={book.color} />
        ))}
      </group>
      <Instances limit={books.rest.length} castShadow receiveShadow>
        <boxGeometry />
        <Surface />
        {books.rest.map((b, i) => (
          <Instance key={i} position={b.position} scale={b.scale} color={b.color} />
        ))}
      </Instances>

    </group>
  )
}

/** Sits on top of the shelf, as in v1. */
const COIL_BASE = 0.1

/** Three loose coils, climbing a little as they go in, ending where the neck rises. */
function coilCurve() {
  const points: Vector3[] = []
  for (let i = 0; i <= 42; i++) {
    const t = i / 42
    const angle = t * Math.PI * 5.4 + 0.6
    const radius = 0.115 - t * 0.075
    points.push(new Vector3(-0.09 + Math.cos(angle) * radius * 1.25, COIL_BASE + t * 0.052, Math.sin(angle) * radius * 0.86))
  }
  return new CatmullRomCurve3(points)
}

/** Corn-snake saddles: rust blotches edged in black on a cream ground. */
function snakeSkin(repeats: number) {
  const texture = makeCanvasTexture(512, 64, (ctx, w, h) => {
    ctx.fillStyle = '#e8c48e'
    ctx.fillRect(0, 0, w, h)
    for (let x = 0; x < w; x += 42) {
      ctx.fillStyle = '#2a1a12'
      ctx.fillRect(x - 2, 0, 28, h)
      ctx.fillStyle = PALETTE.snake
      ctx.fillRect(x, 0, 24, h)
    }
  })
  texture.wrapS = RepeatWrapping
  texture.repeat.set(repeats, 1)
  return texture
}

const NECK_RINGS = 14
const NECK_SIDES = 8
const SNAKE_REST = new Vector3(0.0, COIL_BASE + 0.07, 0.04)
const SNAKE_PEEK = new Vector3(0.17, COIL_BASE + 0.2, 0.09)

/** A tube whose rings are rewritten each frame, because the neck bends as it rises. */
function neckGeometry() {
  const geometry = new BufferGeometry()
  const rows = NECK_RINGS + 1
  const columns = NECK_SIDES + 1
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(rows * columns * 3), 3))
  const uvs: number[] = []
  const indices: number[] = []
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) uvs.push(j / NECK_RINGS, i / NECK_SIDES)
  }
  for (let j = 0; j < NECK_RINGS; j++) {
    for (let i = 0; i < NECK_SIDES; i++) {
      const p = j * columns + i
      indices.push(p, p + columns, p + 1, p + 1, p + columns, p + columns + 1)
    }
  }
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  return geometry
}

/** A quadratic curve from the coils to the head, with the neck tapering a little toward the top. */
function writeNeck(geometry: BufferGeometry, from: Vector3, control: Vector3, to: Vector3) {
  const position = geometry.attributes.position
  const at = (out: Vector3, s: number) => {
    const u = 1 - s
    return out.set(u * u * from.x + 2 * u * s * control.x + s * s * to.x, u * u * from.y + 2 * u * s * control.y + s * s * to.y, u * u * from.z + 2 * u * s * control.z + s * s * to.z)
  }
  for (let j = 0; j <= NECK_RINGS; j++) {
    const s = j / NECK_RINGS
    at(point, s)
    at(along, Math.min(s + 0.03, 1))
    at(up, Math.max(s - 0.03, 0))
    along.sub(up).normalize()
    across.set(along.z, 0, -along.x)
    if (across.lengthSq() < 0.0001) across.set(1, 0, 0)
    across.normalize()
    up.crossVectors(along, across).normalize()
    const radius = 0.019 - s * 0.0035
    for (let i = 0; i <= NECK_SIDES; i++) {
      const a = (i / NECK_SIDES) * Math.PI * 2
      const x = Math.cos(a) * radius
      const y = Math.sin(a) * radius
      position.setXYZ(j * (NECK_SIDES + 1) + i, point.x + across.x * x + up.x * y, point.y + across.y * x + up.y * y, point.z + across.z * x + up.z * y)
    }
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()
}

/** The snake lifts its head and comes up to the glass when you point at the tank, tongue flicking. */
function Snake() {
  const coils = useMemo(() => {
    const curve = coilCurve()
    return { geometry: new TubeGeometry(curve, 150, 0.019, 8), neck: neckGeometry(), root: curve.getPoint(1), skin: snakeSkin(3), neckSkin: snakeSkin(0.5) }
  }, [])
  const head = useRef<Group>(null)
  const tongue = useRef<Group>(null)
  const motion = useRef({ tip: SNAKE_REST.clone(), control: new Vector3(), flick: 0, nextFlick: 2 })

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const m = motion.current
    const { hovered, focus } = useCafe.getState()
    const curious = hovered === 'terrarium' || focus === 'terrarium'
    const t = clock.elapsedTime

    scratch.copy(curious ? SNAKE_PEEK : SNAKE_REST)
    scratch.x += Math.sin(t * 0.9) * (curious ? 0.012 : 0.004)
    scratch.y += Math.sin(t * 1.3) * (curious ? 0.008 : 0.002)
    easing.damp3(m.tip, scratch, curious ? 0.32 : 0.6, delta)

    // The neck arcs from the top of the coils up to the head.
    m.control.set((coils.root.x + m.tip.x) / 2 - 0.02, Math.max(coils.root.y, m.tip.y) + 0.018, (coils.root.z + m.tip.z) / 2)
    writeNeck(coils.neck, coils.root, m.control, m.tip)
    if (head.current) {
      head.current.position.copy(m.tip)
      head.current.rotation.y = 0.95 + Math.sin(t * 0.7) * 0.18
      easing.damp(head.current.rotation, 'x', curious ? -0.22 : 0.05, 0.3, delta)
    }

    m.nextFlick -= delta
    if (m.nextFlick < 0) {
      m.flick = 0.5
      m.nextFlick = curious ? MathUtils.randFloat(0.6, 1.4) : MathUtils.randFloat(2.5, 6)
    }
    m.flick = Math.max(0, m.flick - delta)
    if (tongue.current) {
      const out = Math.sin((m.flick / 0.5) * Math.PI)
      tongue.current.scale.z = Math.max(0.001, out)
      tongue.current.rotation.x = Math.sin(t * 34) * 0.35 * out
    }
  })

  return (
    <group>
      <Part geometry={coils.geometry} map={coils.skin} />
      <mesh geometry={coils.neck} castShadow frustumCulled={false}>
        <Surface color="#ffffff" map={coils.neckSkin} />
      </mesh>
      <group ref={head}>
        <Sph radius={0.026} scale={[0.86, 0.62, 1.28]} color={PALETTE.snake} segments={14} />
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.016, 0.008, 0.012]}>
            <Sph radius={0.0058} color="#17100c" gloss segments={8} noCast noInk />
            <Sph radius={0.0016} position={[side * 0.0014, 0.003, 0.004]} color="#ffffff" segments={5} noCast noInk />
          </group>
        ))}
        <group ref={tongue} position={[0, -0.004, 0.031]} scale={[1, 1, 0.001]}>
          <Limb from={[0, 0, 0]} to={[0, 0, 0.028]} radius={0.0011} color="#b5232c" />
          <Limb from={[0, 0, 0.028]} to={[-0.005, 0.001, 0.04]} radius={0.0008} color="#b5232c" />
          <Limb from={[0, 0, 0.028]} to={[0.005, 0.001, 0.04]} radius={0.0008} color="#b5232c" />
        </group>
      </group>
    </group>
  )
}

export function Terrarium() {
  return (
    <group position={LAYOUT.terrarium.position}>
      <Inked>
        <RoundBox size={[0.68, 0.04, 0.33]} radius={0.008} position={[0, 0.02, 0]} color={PALETTE.woodDark} />
      </Inked>
      {/* sand, a log, a stone and a little greenery */}
      <Box size={[0.62, 0.05, 0.29]} position={[0, 0.065, 0]} color="#c8a36a" noCast />
      <Sph radius={0.06} position={[0.22, 0.09, -0.06]} scale={[1.2, 0.62, 0.9]} color="#8a8178" segments={10} noCast />
      <Limb from={[-0.28, 0.096, 0.08]} to={[0.04, 0.12, -0.11]} radius={0.016} color="#6a452c" />
      {[0, 1, 2, 3].map((i) => (
        <Sph key={i} radius={0.045} position={[0.25 - i * 0.022, 0.13 + (i % 2) * 0.03, 0.06 - i * 0.012]} rotation={[0.3 * i, i, 0.4]} scale={[0.34, 1.05, 0.2]} color={i % 2 ? PALETTE.plant : PALETTE.plantDark} segments={8} noCast noInk />
      ))}
      <Snake />
      {/* glass, with a mesh lid */}
      <Box size={[0.64, 0.3, 0.3]} position={[0, 0.2, 0]} color="#cfe9ff" transparent opacity={0.16} noCast noInk />
      <Inked>
        <RoundBox size={[0.66, 0.018, 0.32]} radius={0.004} position={[0, 0.354, 0]} color={PALETTE.iron} />
      </Inked>
    </group>
  )
}
