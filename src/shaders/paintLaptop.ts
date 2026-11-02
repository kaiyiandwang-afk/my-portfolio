import { makeCanvasTexture } from '../objects/prims'

/**
 * The MacBook's two painted surfaces. Both are sized in the same meters as objects/Laptop.tsx. The screen matches the
 * Desktop in ui/Desktop.tsx closely enough that the swap to live HTML at the close-up doesn't jump.
 */
export const LAPTOP = {
  width: 0.4,
  depth: 0.283,
  baseHeight: 0.0115,
  lidThickness: 0.0045,
  corner: 0.019,
  screen: { width: 0.376, height: 0.2432, centerY: 0.1519 },
}

const PX = 5120 // pixels per meter on the deck

const KEY_PITCH = 0.024
const KEY_GAP = 0.0028
const KEYBOARD_WIDTH = KEY_PITCH * 15
const KEYBOARD_BACK = -0.1305 // meters from the center of the deck, negative toward the hinge

/** Width in key units, with the legend. Each row adds up to 15. */
type Key = [number, string?]
const letters = (text: string): Key[] => [...text].map((c) => [1, c])
const ROWS: Key[][] = [
  [...letters('`1234567890-='), [2, 'delete']],
  [[1.5, 'tab'], ...letters('QWERTYUIOP[]'), [1.5, '\\']],
  [[1.75, 'caps'], ...letters("ASDFGHJKL;'"), [2.25, 'return']],
  [[2.25, 'shift'], ...letters('ZXCVBNM,./'), [2.75, 'shift']],
  [[1, 'fn'], [1, 'ctrl'], [1, 'opt'], [1.25, 'cmd'], [5.5], [1.25, 'cmd'], [1, 'opt']],
]

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

export function paintKeyboardDeck() {
  const W = Math.round(LAPTOP.width * PX)
  const H = Math.round(LAPTOP.depth * PX)
  const X = (x: number) => W / 2 + x * PX
  const Y = (z: number) => H / 2 + z * PX

  return makeCanvasTexture(W, H, (ctx) => {
    ctx.fillStyle = '#d9dbde'
    ctx.fillRect(0, 0, W, H)

    const key = (x: number, z: number, w: number, d: number, label?: string, small = false) => {
      const gap = KEY_GAP
      const px = X(x + gap / 2)
      const py = Y(z + gap / 2)
      const pw = (w - gap) * PX
      const pd = (d - gap) * PX
      // the dark well each key sits in, then the key, then the lit bevel along its back edge
      ctx.fillStyle = '#74767b'
      roundedRect(ctx, px - 2, py - 2, pw + 4, pd + 4, 9)
      ctx.fill()
      ctx.fillStyle = '#1b1c1f'
      roundedRect(ctx, px, py, pw, pd, 8)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,.09)'
      roundedRect(ctx, px + 2, py + 1, pw - 4, 4, 2)
      ctx.fill()
      if (label) {
        ctx.fillStyle = 'rgba(236,238,242,.86)'
        ctx.font = `500 ${small ? 19 : 34}px system-ui, -apple-system, sans-serif`
        ctx.textAlign = small ? 'left' : 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, small ? px + 14 : px + pw / 2, py + pd / 2 + 1)
      }
    }

    const left = -KEYBOARD_WIDTH / 2

    // the function row, half height, ending in the Touch ID key
    const fnDepth = 0.0135
    const fnWidth = KEYBOARD_WIDTH / 14
    for (let i = 0; i < 14; i++) key(left + i * fnWidth, KEYBOARD_BACK, fnWidth, fnDepth, i === 0 ? 'esc' : undefined, true)

    let z = KEYBOARD_BACK + fnDepth + 0.0005
    ROWS.forEach((row) => {
      let x = left
      row.forEach(([units, label]) => {
        key(x, z, units * KEY_PITCH, KEY_PITCH, label, (label?.length ?? 0) > 1)
        x += units * KEY_PITCH
      })
      z += KEY_PITCH
    })

    // inverted-T arrows finish the bottom row
    const arrowX = left + 12 * KEY_PITCH
    const bottom = z - KEY_PITCH
    key(arrowX, bottom + KEY_PITCH / 2, KEY_PITCH, KEY_PITCH / 2)
    key(arrowX + KEY_PITCH, bottom, KEY_PITCH, KEY_PITCH / 2)
    key(arrowX + KEY_PITCH, bottom + KEY_PITCH / 2, KEY_PITCH, KEY_PITCH / 2)
    key(arrowX + 2 * KEY_PITCH, bottom + KEY_PITCH / 2, KEY_PITCH, KEY_PITCH / 2)

    // the trackpad: just a fine line and a slightly different sheen, as on the real thing
    const padWidth = 0.176 * PX
    const padDepth = 0.108 * PX
    const padX = W / 2 - padWidth / 2
    const padY = Y(0.0125)
    const sheen = ctx.createLinearGradient(0, padY, 0, padY + padDepth)
    sheen.addColorStop(0, '#dfe1e4')
    sheen.addColorStop(1, '#d3d5d8')
    ctx.fillStyle = sheen
    roundedRect(ctx, padX, padY, padWidth, padDepth, 34)
    ctx.fill()
    ctx.strokeStyle = 'rgba(70,72,78,.5)'
    ctx.lineWidth = 3
    ctx.stroke()

    // the thumb scoop at the front edge, for lifting the lid
    const scoop = ctx.createRadialGradient(W / 2, H + 12, 10, W / 2, H + 12, 150)
    scoop.addColorStop(0, 'rgba(60,62,68,.6)')
    scoop.addColorStop(1, 'rgba(60,62,68,0)')
    ctx.fillStyle = scoop
    ctx.fillRect(W / 2 - 170, H - 150, 340, 150)
  })
}

/** Same gradient, bar, icons and first window as ui/Desktop.tsx, in that component's 980 by 634 layout. */
export function paintLaptopScreen() {
  const S = 1.4
  return makeCanvasTexture(Math.round(980 * S), Math.round(634 * S), (ctx) => {
    ctx.scale(S, S)
    const angle = (160 * Math.PI) / 180
    const dx = Math.sin(angle) * 620
    const dy = -Math.cos(angle) * 620
    const wall = ctx.createLinearGradient(490 - dx, 317 - dy, 490 + dx, 317 + dy)
    wall.addColorStop(0, '#f4b283')
    wall.addColorStop(0.45, '#d98a8e')
    wall.addColorStop(1, '#6d6a9c')
    ctx.fillStyle = wall
    ctx.fillRect(0, 0, 980, 634)

    // menu bar
    ctx.fillStyle = 'rgba(255,248,238,.82)'
    ctx.fillRect(0, 0, 980, 30)
    ctx.fillStyle = '#2a2430'
    ctx.font = '700 13px system-ui, sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText("kaiyi's laptop", 14, 15)

    // desktop icons
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `hsl(${(i * 53 + 18) % 360} 62% 62%)`
      roundedRect(ctx, 20, 50 + i * 54, 38, 38, 10)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,.85)'
      ctx.fillRect(67, 63 + i * 54, 74, 9)
    }

    // the first project, open
    ctx.fillStyle = '#fbf5ec'
    roundedRect(ctx, 196, 54, 560, 330, 12)
    ctx.fill()
    ctx.fillStyle = '#ebe2d4'
    roundedRect(ctx, 196, 54, 560, 30, 12)
    ctx.fill()
    ;['#ee6a5f', '#f5bd4f', '#61c454'].forEach((color, i) => {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(214 + i * 18, 69, 5.5, 0, 7)
      ctx.fill()
    })
    ctx.fillStyle = '#2a2430'
    ctx.fillRect(216, 108, 240, 20)
    ctx.fillStyle = '#8d8390'
    for (let i = 0; i < 8; i++) ctx.fillRect(216, 146 + i * 24, i % 3 === 2 ? 340 : 510, 10)

    // dock
    ctx.fillStyle = 'rgba(255,248,238,.34)'
    roundedRect(ctx, 330, 576, 320, 50, 15)
    ctx.fill()
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `hsl(${(i * 53 + 18) % 360} 62% 62%)`
      roundedRect(ctx, 341 + i * 51, 584, 34, 34, 8)
      ctx.fill()
    }

    // notch and rounded top corners: the bezel's black, drawn into the panel
    ctx.fillStyle = '#050506'
    roundedRect(ctx, 435, -12, 110, 34, 9)
    ctx.fill()
    ctx.beginPath()
    ctx.rect(0, 0, 980, 634)
    ctx.roundRect(0, 0, 980, 700, [13, 13, 0, 0])
    ctx.fill('evenodd')
  })
}
