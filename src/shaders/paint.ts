import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { seeded } from '../objects/prims'
import { PALETTE } from '../config'

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) => void

const cache = new Map<string, CanvasTexture>()

/** Procedural painted surfaces. Everything is drawn once at load, so there are no image files to download. */
function paint(name: string, w: number, h: number, repeatU: number, repeatV: number, draw: Draw) {
  const existing = cache.get(name)
  if (existing) return existing
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  draw(canvas.getContext('2d')!, w, h, seeded(w * 31 + h))
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(repeatU, repeatV)
  texture.anisotropy = 8
  cache.set(name, texture)
  return texture
}

/** Loose brush marks in a color, to break up flat fills the way a background painter would. */
function brushMarks(
  ctx: CanvasRenderingContext2D,
  rand: () => number,
  w: number,
  h: number,
  count: number,
  color: string,
  length: number,
  thickness: number,
  vertical = false,
) {
  ctx.fillStyle = color
  for (let i = 0; i < count; i++) {
    const a = length * (0.5 + rand())
    const b = thickness * (0.5 + rand())
    const x = rand() * w
    const y = rand() * h
    if (vertical) ctx.fillRect(x, y, b, a)
    else ctx.fillRect(x, y, a, b)
  }
}

export function floorTexture() {
  return paint('floor', 1024, 1024, 3.3, 9, (ctx, w, h, rand) => {
    const rows = 8
    const plank = h / rows
    for (let r = 0; r < rows; r++) {
      const shade = 0.9 + rand() * 0.2
      ctx.fillStyle = `rgb(${158 * shade},${108 * shade},${70 * shade})`
      ctx.fillRect(0, r * plank, w, plank)
      // staggered plank ends, each with its own tone
      const offset = rand() * w
      for (let c = 0; c < 3; c++) {
        const x = (offset + (c * w) / 3) % w
        const tone = rand() * 0.14 - 0.07
        ctx.fillStyle = tone > 0 ? `rgba(255,214,160,${tone})` : `rgba(70,36,16,${-tone})`
        ctx.fillRect(x, r * plank, w / 3, plank)
        ctx.fillStyle = 'rgba(58,30,14,.55)'
        ctx.fillRect(x, r * plank, 2.5, plank)
      }
      ctx.fillStyle = 'rgba(58,30,14,.6)'
      ctx.fillRect(0, r * plank + plank - 2.5, w, 2.5)
    }
    brushMarks(ctx, rand, w, h, 420, 'rgba(84,44,20,.1)', 120, 2)
    brushMarks(ctx, rand, w, h, 240, 'rgba(255,214,160,.07)', 90, 2)
  })
}

/** Grain runs along V, so long boards can repeat along their length. */
export function plankTexture(name: 'counter' | 'barTop' | 'ceiling') {
  const tones = {
    counter: [214, 164, 106],
    barTop: [116, 70, 40],
    ceiling: [150, 112, 76],
  }[name]
  const texture = paint(name, 512, 1024, 1, name === 'counter' ? 6 : 4, (ctx, w, h, rand) => {
    ctx.fillStyle = `rgb(${tones[0]},${tones[1]},${tones[2]})`
    ctx.fillRect(0, 0, w, h)
    const boards = 4
    for (let b = 0; b < boards; b++) {
      const tone = rand() * 0.12 - 0.06
      ctx.fillStyle = tone > 0 ? `rgba(255,226,180,${tone})` : `rgba(60,30,12,${-tone})`
      ctx.fillRect((b * w) / boards, 0, w / boards, h)
      ctx.fillStyle = 'rgba(52,28,12,.5)'
      ctx.fillRect((b * w) / boards, 0, 2, h)
    }
    brushMarks(ctx, rand, w, h, 360, 'rgba(70,38,16,.13)', 170, 2, true)
    brushMarks(ctx, rand, w, h, 200, 'rgba(255,226,180,.1)', 120, 2, true)
  })
  if (name !== 'counter') texture.rotation = Math.PI / 2
  return texture
}

/**
 * The back wall in one painted sheet, including soft baked shading into the ceiling and floor,
 * so it reads as a background painting rather than a flat cream fill.
 */
export function plasterTexture() {
  return paint('plaster', 2048, 512, 1, 1, (ctx, w, h, rand) => {
    ctx.fillStyle = PALETTE.wall
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 520; i++) {
      const warm = rand() > 0.5
      ctx.fillStyle = warm ? 'rgba(214,166,112,.06)' : 'rgba(255,248,232,.09)'
      ctx.beginPath()
      ctx.ellipse(rand() * w, rand() * h, 30 + rand() * 90, 14 + rand() * 42, rand() * 3, 0, 7)
      ctx.fill()
    }
    const top = ctx.createLinearGradient(0, 0, 0, h * 0.32)
    top.addColorStop(0, 'rgba(112,70,40,.42)')
    top.addColorStop(1, 'rgba(112,70,40,0)')
    ctx.fillStyle = top
    ctx.fillRect(0, 0, w, h * 0.32)
    const bottom = ctx.createLinearGradient(0, h * 0.72, 0, h)
    bottom.addColorStop(0, 'rgba(112,70,40,0)')
    bottom.addColorStop(1, 'rgba(112,70,40,.36)')
    ctx.fillStyle = bottom
    ctx.fillRect(0, h * 0.72, w, h * 0.28)
  })
}
