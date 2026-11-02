import { CanvasTexture, SRGBColorSpace } from 'three'
import { seeded } from '../objects/prims'

function sheet(w: number, h: number, seed: number, draw: (ctx: CanvasRenderingContext2D, rand: () => number) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  draw(canvas.getContext('2d')!, seeded(seed))
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

interface MountainPaint {
  seed: number
  peaks: number
  /** Color at the ridgeline. */
  ridge: string
  /** Color where the range fades into haze at its base. */
  haze: string
  /** The sunlit faces. */
  lit: string
  /** Lowest and highest peak, as fractions of the sheet's height. */
  heights: [number, number]
  snow?: string
}

/** One mountain range in flat cel facets: dark ridge, sunlit faces, and a fade into haze at the base. */
export function paintMountains({ seed, peaks, ridge, haze, lit, heights, snow }: MountainPaint) {
  const W = 2048
  const H = 512
  return sheet(W, H, seed, (ctx, rand) => {
    // apexes across the sheet
    const apexes = Array.from({ length: peaks }, (_, i) => ({
      x: ((i + 0.2 + rand() * 0.6) / peaks) * W,
      y: H * (1 - (heights[0] + rand() * (heights[1] - heights[0]))),
    }))

    // a jagged ridgeline that climbs to each apex
    const ridgeline: [number, number][] = [[0, H]]
    apexes.forEach((apex, i) => {
      const prev = i === 0 ? { x: 0, y: H * 0.8 } : apexes[i - 1]
      const steps = 7
      const valley = Math.max(prev.y, apex.y) + (H - Math.max(prev.y, apex.y)) * (0.32 + rand() * 0.34)
      for (let s = 1; s <= steps; s++) {
        const t = s / steps
        const x = prev.x + (apex.x - prev.x) * t
        const dip = Math.sin(t * Math.PI) * (valley - (prev.y + apex.y) / 2)
        const y = prev.y + (apex.y - prev.y) * t + dip + (s === steps ? 0 : (rand() - 0.5) * H * 0.028)
        ridgeline.push([x, y])
      }
    })
    ridgeline.push([W, H * 0.8], [W, H])

    const body = ctx.createLinearGradient(0, H * (1 - heights[1]), 0, H)
    body.addColorStop(0, ridge)
    body.addColorStop(0.72, haze)
    body.addColorStop(1, haze)
    ctx.fillStyle = body
    ctx.beginPath()
    ridgeline.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    ctx.fill()

    // Keep the facets on the mountain, fading into haze with everything else.
    ctx.save()
    ctx.clip()
    apexes.forEach((apex) => {
      const reach = (W / peaks) * (0.55 + rand() * 0.35)
      const drop = H - apex.y
      const litFade = ctx.createLinearGradient(0, apex.y, 0, apex.y + drop * 0.85)
      litFade.addColorStop(0, lit)
      litFade.addColorStop(1, haze)
      ctx.fillStyle = litFade

      // sunlit face on the right of each peak, with a jagged shadow line down its center
      ctx.beginPath()
      ctx.moveTo(apex.x, apex.y)
      ctx.lineTo(apex.x + reach, apex.y + drop)
      const zig = 6
      for (let z = 1; z <= zig; z++) {
        const t = 1 - z / zig
        ctx.lineTo(apex.x + (rand() - 0.25) * reach * 0.28 * (1 - t * 0.3) + reach * t * 0.14, apex.y + drop * t)
      }
      ctx.closePath()
      ctx.fill()

      // a second, smaller lit facet for rhythm
      ctx.beginPath()
      const fx = apex.x - reach * (0.28 + rand() * 0.22)
      const fy = apex.y + drop * (0.28 + rand() * 0.16)
      ctx.moveTo(fx, fy)
      ctx.lineTo(fx + reach * 0.46, H)
      ctx.lineTo(fx + reach * 0.08, H)
      ctx.closePath()
      ctx.fill()

      if (snow) {
        ctx.fillStyle = snow
        ctx.beginPath()
        ctx.moveTo(apex.x, apex.y)
        ctx.lineTo(apex.x + reach * 0.16, apex.y + drop * 0.17)
        ctx.lineTo(apex.x + reach * 0.05, apex.y + drop * 0.13)
        ctx.lineTo(apex.x - reach * 0.02, apex.y + drop * 0.2)
        ctx.lineTo(apex.x - reach * 0.08, apex.y + drop * 0.12)
        ctx.closePath()
        ctx.fill()
      }
    })
    ctx.restore()
  })
}

interface CityPaint {
  seed: number
  base: string
  lit: string
  window: string
  windowLit: string
  /** Lowest and tallest building, as fractions of the sheet's height. */
  heights: [number, number]
  /** Building width range in pixels. */
  widths: [number, number]
  haze: string
}

/** A skyline: sun catching the right edge of each block, rows of windows, haze along the bottom. */
export function paintCity({ seed, base, lit, window: windowColor, windowLit, heights, widths, haze }: CityPaint) {
  const W = 2048
  const H = 512
  return sheet(W, H, seed, (ctx, rand) => {
    let x = -10
    while (x < W) {
      const w = widths[0] + rand() * (widths[1] - widths[0])
      const h = H * (heights[0] + rand() * (heights[1] - heights[0]))
      const top = H - h
      ctx.fillStyle = base
      ctx.fillRect(x, top, w, h)
      ctx.fillStyle = lit
      ctx.fillRect(x + w * 0.8, top, w * 0.2, h)

      // rooftop bits
      if (rand() > 0.55) {
        ctx.fillStyle = base
        ctx.fillRect(x + w * (0.2 + rand() * 0.4), top - h * 0.07, w * 0.2, h * 0.08)
      }

      const cols = Math.max(2, Math.floor(w / 15))
      const rows = Math.max(3, Math.floor(h / 19))
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rand() < 0.2) continue
          ctx.fillStyle = rand() < 0.16 ? windowLit : windowColor
          ctx.fillRect(x + 4 + (c * (w * 0.76)) / cols, top + 8 + (r * (h - 12)) / rows, 5, 8)
        }
      }
      x += w + (rand() < 0.18 ? 6 + rand() * 18 : 0)
    }

    const fade = ctx.createLinearGradient(0, H * 0.45, 0, H)
    fade.addColorStop(0, 'rgba(0,0,0,0)')
    fade.addColorStop(1, haze)
    ctx.globalCompositeOperation = 'source-atop'
    ctx.fillStyle = fade
    ctx.fillRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'source-over'
  })
}

const LIGHT_COLORS = ['#ffd98f', '#ffc36e', '#ffe8b4', '#ffb35c', '#cfe0ff']

/**
 * The same skyline's lit windows, on a transparent sheet. It walks paintCity's random sequence call for call, so each
 * light lands on a painted window; a second generator then decides which ones are lit.
 */
export function paintCityLights({ seed, heights, widths }: CityPaint) {
  const W = 2048
  const H = 512
  return sheet(W, H, seed, (ctx, rand) => {
    const lights = seeded(seed + 500)
    let x = -10
    while (x < W) {
      const w = widths[0] + rand() * (widths[1] - widths[0])
      const h = H * (heights[0] + rand() * (heights[1] - heights[0]))
      const top = H - h
      if (rand() > 0.55) rand()
      const cols = Math.max(2, Math.floor(w / 15))
      const rows = Math.max(3, Math.floor(h / 19))
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rand() < 0.2) continue
          rand()
          if (lights() > 0.38) continue
          ctx.fillStyle = LIGHT_COLORS[Math.floor(lights() * LIGHT_COLORS.length)]
          ctx.fillRect(x + 4 + (c * (w * 0.76)) / cols, top + 8 + (r * (h - 12)) / rows, 5, 8)
        }
      }
      x += w + (rand() < 0.18 ? 6 + rand() * 18 : 0)
    }
  })
}

const SHOP_COLORS = ['#e9c49a', '#d98f6a', '#c9a886', '#b57a62', '#e6b98c', '#a98a78', '#d8a07c']
const AWNINGS = ['#b6483c', '#3f7a6c', '#d99a3e', '#54607f', '#a4495e']

/** The row of shops across the street. */
export function paintShops(seed: number) {
  const W = 2048
  const H = 384
  return sheet(W, H, seed, (ctx, rand) => {
    let x = 0
    while (x < W) {
      const w = 130 + rand() * 120
      const h = H * (0.62 + rand() * 0.34)
      const top = H - h
      const color = SHOP_COLORS[Math.floor(rand() * SHOP_COLORS.length)]
      ctx.fillStyle = color
      ctx.fillRect(x, top, w, h)
      ctx.fillStyle = 'rgba(255,214,150,.3)'
      ctx.fillRect(x + w * 0.82, top, w * 0.18, h)

      // roof line
      ctx.fillStyle = '#4e3a3e'
      ctx.fillRect(x - 3, top - 8, w + 6, 10)

      // upper windows
      const uppers = Math.floor(w / 58)
      const floors = Math.max(1, Math.floor((h - 138) / 64))
      for (let f = 0; f < floors; f++) {
        for (let i = 0; i < uppers; i++) {
          ctx.fillStyle = '#54606e'
          ctx.fillRect(x + 16 + (i * (w - 24)) / uppers, top + 18 + f * 64, 26, 38)
          ctx.fillStyle = 'rgba(255,226,170,.55)'
          ctx.fillRect(x + 16 + (i * (w - 24)) / uppers, top + 18 + f * 64, 26, 9)
        }
      }

      // shopfront
      const front = H - 84
      ctx.fillStyle = '#3a3238'
      ctx.fillRect(x + 8, front, w - 16, 84)
      ctx.fillStyle = '#8fa8b0'
      ctx.fillRect(x + 14, front + 18, w * 0.56, 56)
      ctx.fillStyle = 'rgba(255,214,150,.45)'
      ctx.fillRect(x + 14, front + 18, w * 0.56, 16)

      // striped awning
      const awning = AWNINGS[Math.floor(rand() * AWNINGS.length)]
      const stripes = Math.floor((w - 8) / 18)
      for (let s = 0; s < stripes; s++) {
        ctx.fillStyle = s % 2 ? awning : '#f2e6d0'
        ctx.fillRect(x + 4 + (s * (w - 8)) / stripes, front - 14, (w - 8) / stripes + 1, 28)
      }
      x += w + 1
    }
  })
}

/** The shops' lit fronts and upper windows, walking paintShops' random sequence the same way. */
export function paintShopLights(seed: number) {
  const W = 2048
  const H = 384
  return sheet(W, H, seed, (ctx, rand) => {
    const lights = seeded(seed + 500)
    let x = 0
    while (x < W) {
      const w = 130 + rand() * 120
      const h = H * (0.62 + rand() * 0.34)
      const top = H - h
      rand() // the wall color
      const uppers = Math.floor(w / 58)
      const floors = Math.max(1, Math.floor((h - 138) / 64))
      for (let f = 0; f < floors; f++) {
        for (let i = 0; i < uppers; i++) {
          if (lights() > 0.5) continue
          ctx.fillStyle = LIGHT_COLORS[Math.floor(lights() * LIGHT_COLORS.length)]
          ctx.fillRect(x + 16 + (i * (w - 24)) / uppers, top + 18 + f * 64, 26, 38)
        }
      }
      const front = H - 84
      const glow = ctx.createLinearGradient(0, front + 18, 0, front + 74)
      glow.addColorStop(0, '#ffe3a8')
      glow.addColorStop(1, '#ffae5e')
      ctx.fillStyle = glow
      ctx.fillRect(x + 14, front + 18, w * 0.56, 56)
      rand() // the awning
      x += w + 1
    }
  })
}

/** A painted tree card: dark mass, mid clumps, sun-gold highlights on the upper right, as a background painter stacks them. */
export function paintTree(seed: number) {
  const W = 640
  const H = 800
  return sheet(W, H, seed, (ctx, rand) => {
    ctx.fillStyle = '#4a3226'
    ctx.beginPath()
    ctx.moveTo(W * 0.46, H)
    ctx.lineTo(W * 0.48, H * 0.5)
    ctx.lineTo(W * 0.53, H * 0.5)
    ctx.lineTo(W * 0.55, H)
    ctx.closePath()
    ctx.fill()

    const clumps = Array.from({ length: 12 }, () => ({
      x: W * (0.18 + rand() * 0.64),
      y: H * (0.1 + rand() * 0.42),
      r: W * (0.14 + rand() * 0.1),
    }))

    const dab = (x: number, y: number, r: number, color: string, count: number) => {
      ctx.fillStyle = color
      for (let i = 0; i < count; i++) {
        const a = rand() * Math.PI * 2
        const d = r * Math.sqrt(rand())
        ctx.beginPath()
        ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, r * 0.17, r * 0.13, rand() * 3, 0, 7)
        ctx.fill()
      }
    }

    clumps.forEach(({ x, y, r }) => dab(x, y, r, '#2f5a3e', 64))
    clumps.forEach(({ x, y, r }) => dab(x + r * 0.1, y - r * 0.1, r * 0.82, '#4c7f45', 46))
    clumps.forEach(({ x, y, r }) => dab(x + r * 0.28, y - r * 0.3, r * 0.5, '#94b24c', 26))
    clumps.forEach(({ x, y, r }) => dab(x + r * 0.38, y - r * 0.4, r * 0.26, '#f0cc62', 10))
  })
}
