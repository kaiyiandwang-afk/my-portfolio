import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { CanvasTexture, Quaternion, SRGBColorSpace, Vector3 } from 'three'
import type { BufferGeometry } from 'three'
import type { ThreeElements } from '@react-three/fiber'
import { Outlines, RoundedBox } from '@react-three/drei'
import { INK } from '../config'
import type { Vec3 } from '../config'
import { toonMaterial } from '../shaders/toon'
import type { ToonOptions } from '../shaders/toon'

type MeshProps = Omit<ThreeElements['mesh'], 'args'>

interface SurfaceProps extends ToonOptions {
  /** Skip casting a shadow (still receives). */
  noCast?: boolean
  /** Skip the ink line on this part of an Inked prop, for tiny details where a line would swallow the shape. */
  noInk?: boolean
}

/** Every prop's surface goes through here, so the whole café shares one toon look. */
export function Surface(props: ToonOptions) {
  const material = toonMaterial(props)
  return <primitive attach="material" object={material} />
}

const InkContext = createContext(false)

/** Everything inside gets the thin dark outline. Use it on characters and key props. */
export function Inked({ children }: { children: ReactNode }) {
  return <InkContext.Provider value={true}>{children}</InkContext.Provider>
}

function Ink({ skip }: { skip?: boolean }) {
  const inked = useContext(InkContext)
  if (!inked || skip) return null
  return <Outlines thickness={INK.thickness} color={INK.color} />
}

function splitSurface<T extends SurfaceProps>({
  color,
  map,
  emissive,
  emissiveIntensity,
  transparent,
  opacity,
  doubleSided,
  gloss,
  noCast,
  noInk,
  ...rest
}: T) {
  return { surface: { color, map, emissive, emissiveIntensity, transparent, opacity, doubleSided, gloss }, noCast, noInk, rest }
}

export function Box({ size = [1, 1, 1], ...props }: MeshProps & SurfaceProps & { size?: Vec3 }) {
  const { surface, noCast, noInk, rest } = splitSurface(props)
  return (
    <mesh castShadow={!noCast} receiveShadow {...rest}>
      <boxGeometry args={size} />
      <Surface {...surface} />
      <Ink skip={noInk} />
    </mesh>
  )
}

export function Cyl({
  top,
  bottom,
  radius = 0.5,
  height = 1,
  segments = 20,
  ...props
}: MeshProps & SurfaceProps & { top?: number; bottom?: number; radius?: number; height?: number; segments?: number }) {
  const { surface, noCast, noInk, rest } = splitSurface(props)
  return (
    <mesh castShadow={!noCast} receiveShadow {...rest}>
      <cylinderGeometry args={[top ?? radius, bottom ?? radius, height, segments]} />
      <Surface {...surface} />
      <Ink skip={noInk} />
    </mesh>
  )
}

export function Sph({ radius = 0.5, segments = 18, ...props }: MeshProps & SurfaceProps & { radius?: number; segments?: number }) {
  const { surface, noCast, noInk, rest } = splitSurface(props)
  return (
    <mesh castShadow={!noCast} receiveShadow {...rest}>
      <sphereGeometry args={[radius, segments, Math.ceil(segments * 0.75)]} />
      <Surface {...surface} />
      <Ink skip={noInk} />
    </mesh>
  )
}

export function Torus({
  radius = 0.5,
  tube = 0.1,
  arc = Math.PI * 2,
  ...props
}: MeshProps & SurfaceProps & { radius?: number; tube?: number; arc?: number }) {
  const { surface, noCast, noInk, rest } = splitSurface(props)
  return (
    <mesh castShadow={!noCast} receiveShadow {...rest}>
      <torusGeometry args={[radius, tube, 10, 28, arc]} />
      <Surface {...surface} />
      <Ink skip={noInk} />
    </mesh>
  )
}

export function Cone({
  radius = 0.5,
  height = 1,
  segments = 4,
  ...props
}: MeshProps & SurfaceProps & { radius?: number; height?: number; segments?: number }) {
  const { surface, noCast, noInk, rest } = splitSurface(props)
  return (
    <mesh castShadow={!noCast} receiveShadow {...rest}>
      <coneGeometry args={[radius, height, segments]} />
      <Surface {...surface} />
      <Ink skip={noInk} />
    </mesh>
  )
}

/** A mesh from any custom geometry: sculpted forms, lathes, extrusions, tubes. */
export function Part({ geometry, ...props }: MeshProps & SurfaceProps & { geometry: BufferGeometry }) {
  const { surface, noCast, noInk, rest } = splitSurface(props)
  return (
    <mesh geometry={geometry} castShadow={!noCast} receiveShadow {...rest}>
      <Surface {...surface} />
      <Ink skip={noInk} />
    </mesh>
  )
}

export function RoundBox({ size, radius = 0.01, ...props }: MeshProps & SurfaceProps & { size: Vec3; radius?: number }) {
  const { surface, noCast, noInk, rest } = splitSurface(props)
  return (
    <RoundedBox args={size} radius={radius} smoothness={3} castShadow={!noCast} receiveShadow {...(rest as object)}>
      <Surface {...surface} />
      <Ink skip={noInk} />
    </RoundedBox>
  )
}

const UP = new Vector3(0, 1, 0)

/** A rounded limb between two points. Kaiyi's arms and legs, lamp arms, the phone cord. */
export function Limb({ from, to, radius, color }: { from: Vec3; to: Vec3; radius: number; color: string }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new Vector3(...from)
    const b = new Vector3(...to)
    const direction = b.clone().sub(a)
    return {
      length: direction.length(),
      position: a.clone().addScaledVector(direction, 0.5),
      quaternion: new Quaternion().setFromUnitVectors(UP, direction.clone().normalize()),
    }
  }, [from, to])

  return (
    <mesh castShadow receiveShadow position={position} quaternion={quaternion}>
      <capsuleGeometry args={[radius, length, 4, 10]} />
      <Surface color={color} />
      <Ink />
    </mesh>
  )
}

export function makeCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  /** Web fonts this drawing uses, as CSS font strings. It redraws once they've loaded. */
  fonts?: string[],
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  draw(ctx, width, height)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  if (fonts) {
    Promise.all(fonts.map((font) => document.fonts.load(font)))
      .then(() => {
        ctx.clearRect(0, 0, width, height)
        draw(ctx, width, height)
        texture.needsUpdate = true
      })
      .catch(() => {}) // the fallback font's drawing is already in place
  }
  return texture
}

/** Small deterministic random, so props land in the same place on every load. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
