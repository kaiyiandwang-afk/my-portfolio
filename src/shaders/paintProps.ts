import { RepeatWrapping } from 'three'
import type { CanvasTexture } from 'three'
import { makeCanvasTexture, seeded } from '../objects/prims'

const cache = new Map<string, CanvasTexture>()

function once(name: string, make: () => CanvasTexture) {
  let texture = cache.get(name)
  if (!texture) {
    texture = make()
    cache.set(name, texture)
  }
  return texture
}

/** Chrome painted the way an anime background does it: hard bands of reflected light and dark. */
export function chromeBands() {
  return once('chrome', () => {
    const t = makeCanvasTexture(256, 64, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0)
      g.addColorStop(0, '#6d747a')
      g.addColorStop(0.16, '#e6ebee')
      g.addColorStop(0.24, '#ffffff')
      g.addColorStop(0.32, '#aab2b8')
      g.addColorStop(0.52, '#50565c')
      g.addColorStop(0.66, '#c4cbd0')
      g.addColorStop(0.78, '#f4f7f9')
      g.addColorStop(1, '#6d747a')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    })
    t.wrapS = RepeatWrapping
    return t
  })
}

/** The fine ridges on a focus ring or a dial's edge. */
export function knurl(base: string, ridge: string, repeats: number) {
  return once(`knurl-${base}-${ridge}-${repeats}`, () => {
    const t = makeCanvasTexture(64, 16, (ctx, w, h) => {
      ctx.fillStyle = base
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = ridge
      ctx.fillRect(0, 0, w * 0.42, h)
    })
    t.wrapS = RepeatWrapping
    t.repeat.x = repeats
    return t
  })
}

/** Pebbled black leatherette. */
export function leatherette() {
  return once('leatherette', () => {
    const t = makeCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#1e1b1c'
      ctx.fillRect(0, 0, w, h)
      const rand = seeded(44)
      for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = rand() > 0.5 ? 'rgba(70,64,62,.55)' : 'rgba(0,0,0,.5)'
        ctx.beginPath()
        ctx.arc(rand() * w, rand() * h, 0.8 + rand() * 1.5, 0, 7)
        ctx.fill()
      }
    })
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(1.6, 0.8)
    return t
  })
}

/** Coated front glass: the purple and green multicoat bloom, with the aperture deep inside. */
export function lensGlass() {
  return once('lensGlass', () =>
    makeCanvasTexture(512, 512, (ctx, w) => {
      const c = w / 2
      ctx.fillStyle = '#05050a'
      ctx.fillRect(0, 0, w, w)
      const coat = ctx.createRadialGradient(c - 40, c - 50, 10, c, c, c)
      coat.addColorStop(0, '#34206a')
      coat.addColorStop(0.32, '#1d2f6e')
      coat.addColorStop(0.58, '#123d3a')
      coat.addColorStop(0.8, '#2a1440')
      coat.addColorStop(1, '#060608')
      ctx.fillStyle = coat
      ctx.beginPath()
      ctx.arc(c, c, c, 0, 7)
      ctx.fill()
      // the aperture blades, far down the barrel
      ctx.fillStyle = '#020204'
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3
        const x = c + Math.cos(a) * 92
        const y = c + Math.sin(a) * 92
        if (i) ctx.lineTo(x, y)
        else ctx.moveTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
      // nested reflections of the window
      ctx.strokeStyle = 'rgba(190,170,255,.32)'
      ctx.lineWidth = 3
      for (const r of [142, 186, 226]) {
        ctx.beginPath()
        ctx.arc(c, c, r, -2.5, -0.7)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(255,240,220,.92)'
      ctx.beginPath()
      ctx.ellipse(c - 92, c - 112, 34, 20, -0.7, 0, 7)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,214,170,.5)'
      ctx.beginPath()
      ctx.ellipse(c + 84, c + 104, 15, 9, -0.7, 0, 7)
      ctx.fill()
    }),
  )
}

/** Engraved markings around a ring, reading along the barrel. Text only, no brand names. */
export function engravedRing(name: string, marks: string[], base: string, color: string) {
  return once(`ring-${name}`, () => {
    const t = makeCanvasTexture(1024, 64, (ctx, w, h) => {
      ctx.fillStyle = base
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = '700 30px system-ui, sans-serif'
      marks.forEach((mark, i) => {
        ctx.fillText(mark, ((i + 0.5) / marks.length) * w, h / 2)
      })
    })
    t.wrapS = RepeatWrapping
    return t
  })
}

/** The top of a shutter speed dial. */
export function dialTop() {
  return once('dialTop', () =>
    makeCanvasTexture(256, 256, (ctx, w) => {
      const c = w / 2
      ctx.fillStyle = '#23211f'
      ctx.beginPath()
      ctx.arc(c, c, c, 0, 7)
      ctx.fill()
      ctx.fillStyle = '#f2ece0'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = '700 25px system-ui, sans-serif'
      const speeds = ['1000', '500', '250', '125', '60', '30', '15', '8', '4', '2', '1', 'B']
      speeds.forEach((s, i) => {
        const a = (i / speeds.length) * Math.PI * 2
        ctx.save()
        ctx.translate(c + Math.sin(a) * 94, c - Math.cos(a) * 94)
        ctx.rotate(a)
        ctx.fillText(s, 0, 0)
        ctx.restore()
      })
      ctx.fillStyle = '#7f858a'
      ctx.beginPath()
      ctx.arc(c, c, 44, 0, 7)
      ctx.fill()
    }),
  )
}

/** The plate under a rotary dial: digits sit exactly where the finger holes will be, with a paper label in the middle. */
export function dialPlate(holeAngles: number[], holeRadius: number, plateRadius: number) {
  return once('dialPlate', () =>
    makeCanvasTexture(512, 512, (ctx, w) => {
      const c = w / 2
      const toPixels = c / plateRadius
      ctx.fillStyle = '#f4efe4'
      ctx.fillRect(0, 0, w, w)
      ctx.fillStyle = '#1e1a18'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = '700 36px Georgia, serif'
      const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
      digits.forEach((digit, i) => {
        const a = holeAngles[i]
        ctx.fillText(digit, c + Math.cos(a) * holeRadius * toPixels, c - Math.sin(a) * holeRadius * toPixels + 2)
      })
      // the center card
      ctx.fillStyle = '#fbf7ee'
      ctx.beginPath()
      ctx.arc(c, c, 74, 0, 7)
      ctx.fill()
      ctx.strokeStyle = '#a8241f'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(c, c, 68, 0, 7)
      ctx.stroke()
      ctx.fillStyle = '#a8241f'
      ctx.font = '700 28px Georgia, serif'
      ctx.fillText('say hi', c, c + 1)
    }),
  )
}
