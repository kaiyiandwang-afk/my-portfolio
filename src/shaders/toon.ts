import { DataTexture, DoubleSide, FrontSide, LinearFilter, MeshToonMaterial, RedFormat, UnsignedByteType } from 'three'
import type { Side, Texture } from 'three'
import { TOON } from '../config'

let ramp: DataTexture | null = null

/** The soft 4-step cel ramp from config. Long and linearly filtered, so each step edge has a small soft shoulder. */
export function getToonRamp() {
  if (ramp) return ramp
  const size = 256
  const data = new Uint8Array(size)
  const { levels, softness } = TOON
  for (let i = 0; i < size; i++) {
    const t = i / (size - 1)
    let value = levels[0].value
    for (let s = 1; s < levels.length; s++) {
      const edge = levels[s].from
      const blend = Math.min(1, Math.max(0, (t - edge + softness) / (2 * softness)))
      value += (levels[s].value - value) * blend
    }
    data[i] = Math.round(value * 255)
  }
  ramp = new DataTexture(data, size, 1, RedFormat, UnsignedByteType)
  ramp.minFilter = ramp.magFilter = LinearFilter
  ramp.generateMipmaps = false
  ramp.needsUpdate = true
  return ramp
}

export interface ToonOptions {
  color?: string
  map?: Texture
  emissive?: string
  emissiveIntensity?: number
  transparent?: boolean
  opacity?: number
  doubleSided?: boolean
  /** A crisp cel highlight from the key light, for glossy things like Bakelite, chrome and eyes. */
  gloss?: boolean
}

/** Adds a hard-edged highlight to the toon shader, following the camera like a real reflection. */
function addGloss(material: MeshToonMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      /* glsl */ `#include <lights_fragment_end>
      #if NUM_DIR_LIGHTS > 0
      {
        vec3 keyHalf = normalize(directionalLights[0].direction + geometryViewDir);
        float keySpec = smoothstep(0.985, 0.991, max(dot(geometryNormal, keyHalf), 0.0));
        totalEmissiveRadiance += directionalLights[0].color * keySpec * 0.34;
        vec3 fillHalf = normalize(directionalLights[1].direction + geometryViewDir);
        float fillSpec = smoothstep(0.988, 0.994, max(dot(geometryNormal, fillHalf), 0.0));
        totalEmissiveRadiance += directionalLights[1].color * fillSpec * 0.28;
      }
      #endif`,
    )
  }
  material.customProgramCacheKey = () => 'toon-gloss'
}

const cache = new Map<string, MeshToonMaterial>()

/** Identical surfaces share one material, which keeps state changes low across a few hundred props. */
export function toonMaterial({
  color = '#ffffff',
  map,
  emissive = '#000000',
  emissiveIntensity = 1,
  transparent = false,
  opacity = 1,
  doubleSided = false,
  gloss = false,
}: ToonOptions) {
  const key = [color, map?.uuid ?? '', emissive, emissiveIntensity, transparent, opacity, doubleSided, gloss].join('|')
  let material = cache.get(key)
  if (!material) {
    const side: Side = doubleSided ? DoubleSide : FrontSide
    material = new MeshToonMaterial({
      color,
      ...(map && { map }),
      emissive,
      emissiveIntensity,
      transparent,
      opacity,
      side,
      depthWrite: !transparent,
      gradientMap: getToonRamp(),
    })
    if (gloss) addGloss(material)
    cache.set(key, material)
  }
  return material
}
