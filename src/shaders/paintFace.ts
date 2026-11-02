import { makeCanvasTexture } from '../objects/prims'

/**
 * Kaiyi's face, painted flat and projected straight onto the sculpted head, like cel paint on a model sheet.
 * Everything is placed in head-space meters, using the same numbers as the sculpt in objects/Kaiyi.tsx.
 */
export const FACE_BOUNDS = { halfWidth: 0.13, bottom: -0.15, top: 0.17 }

const PX = 3900 // pixels per meter
const W = Math.round(FACE_BOUNDS.halfWidth * 2 * PX)
const H = Math.round((FACE_BOUNDS.top - FACE_BOUNDS.bottom) * PX)

const toX = (x: number) => W / 2 + x * PX
const toY = (y: number) => H - (y - FACE_BOUNDS.bottom) * PX

const COLOR = {
  skin: '#f2c6a8',
  blush: 'rgba(236, 120, 110, 0.24)',
  lash: '#17100e',
  brow: '#241815',
  iris: '#20120d',
  irisLight: '#4a2b1c',
  white: '#f2ece5',
  lipTop: '#c5656a',
  lipBottom: '#e08688',
  mole: '#4a2d24',
}

function softSpot(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string) {
  ctx.save()
  ctx.translate(toX(x), toY(y))
  ctx.scale(rx * PX, ry * PX)
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  gradient.addColorStop(0, color)
  gradient.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'))
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, 7)
  ctx.fill()
  ctx.restore()
}

/**
 * side: -1 is her right (viewer's left). A long, narrow eye about a fifth of the face's width, as in her photos, with a
 * dark upper lash line running out into a short wing and very little white showing.
 */
function eye(ctx: CanvasRenderingContext2D, side: -1 | 1) {
  const cx = side * 0.046
  const cy = 0.008
  const half = 0.0262
  const X = (dx: number) => toX(cx + side * dx) // dx is measured outward from the eye's center
  const Y = (dy: number) => toY(cy + dy)

  const opening = () => {
    ctx.beginPath()
    ctx.moveTo(X(-half), Y(-0.0035)) // inner corner, slightly lower
    ctx.bezierCurveTo(X(-half * 0.5), Y(0.0108), X(half * 0.45), Y(0.0122), X(half), Y(0.0036)) // upper lid
    ctx.bezierCurveTo(X(half * 0.5), Y(-0.0078), X(-half * 0.4), Y(-0.0092), X(-half), Y(-0.0035)) // lower lid
    ctx.closePath()
  }

  opening()
  ctx.fillStyle = COLOR.white
  ctx.fill()

  ctx.save()
  opening()
  ctx.clip()
  const ix = X(0.0008)
  const iy = Y(0.0012)
  const r = 0.0122 * PX
  const iris = ctx.createRadialGradient(ix, iy + r * 0.35, r * 0.1, ix, iy, r)
  iris.addColorStop(0, COLOR.irisLight)
  iris.addColorStop(0.7, COLOR.iris)
  iris.addColorStop(1, '#0e0705')
  ctx.fillStyle = iris
  ctx.beginPath()
  ctx.arc(ix, iy, r, 0, 7)
  ctx.fill()
  ctx.fillStyle = '#080504'
  ctx.beginPath()
  ctx.arc(ix, iy, r * 0.48, 0, 7)
  ctx.fill()
  // shade cast by the upper lid across the top of the eye
  const lidShade = ctx.createLinearGradient(0, Y(0.012), 0, Y(0.004))
  lidShade.addColorStop(0, 'rgba(30, 16, 12, 0.5)')
  lidShade.addColorStop(1, 'rgba(30, 16, 12, 0)')
  ctx.fillStyle = lidShade
  ctx.fillRect(Math.min(X(-half), X(half)), Y(0.014), half * 2 * PX, 0.012 * PX)
  // catchlights: what makes an eye look alive
  ctx.fillStyle = 'rgba(255,255,255,.92)'
  ctx.beginPath()
  ctx.arc(ix - r * 0.32, iy - r * 0.34, r * 0.2, 0, 7)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,.4)'
  ctx.beginPath()
  ctx.arc(ix + r * 0.34, iy + r * 0.36, r * 0.1, 0, 7)
  ctx.fill()
  ctx.restore()

  // upper lash line, running out into a short wing
  ctx.fillStyle = COLOR.lash
  ctx.beginPath()
  ctx.moveTo(X(-half), Y(-0.0035))
  ctx.bezierCurveTo(X(-half * 0.5), Y(0.0108), X(half * 0.45), Y(0.0122), X(half), Y(0.0036))
  ctx.lineTo(X(half * 1.3), Y(0.0078)) // the wing's tip
  ctx.bezierCurveTo(X(half * 1.02), Y(0.0088), X(half * 0.5), Y(0.0152), X(-half * 0.2), Y(0.0132))
  ctx.bezierCurveTo(X(-half * 0.6), Y(0.0112), X(-half * 0.95), Y(0.0015), X(-half), Y(-0.0035))
  ctx.closePath()
  ctx.fill()

  // lower lash line, barely there
  ctx.strokeStyle = 'rgba(70, 40, 32, 0.42)'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(X(half * 0.95), Y(0.0024))
  ctx.bezierCurveTo(X(half * 0.5), Y(-0.0078), X(-half * 0.4), Y(-0.0092), X(-half * 0.85), Y(-0.0048))
  ctx.stroke()

  // the soft fold of the eyelid, close to the lash line
  ctx.strokeStyle = 'rgba(150, 92, 74, 0.42)'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(X(-half * 0.62), Y(0.0138))
  ctx.bezierCurveTo(X(-half * 0.15), Y(0.019), X(half * 0.5), Y(0.0194), X(half * 1.02), Y(0.0126))
  ctx.stroke()
}

/** Thin, dark and nearly straight, tapering outward. */
function brow(ctx: CanvasRenderingContext2D, side: -1 | 1) {
  const X = (x: number) => toX(side * x)
  ctx.fillStyle = COLOR.brow
  ctx.globalAlpha = 0.74
  ctx.beginPath()
  ctx.moveTo(X(0.0185), toY(0.0375))
  ctx.bezierCurveTo(X(0.035), toY(0.0442), X(0.055), toY(0.0462), X(0.0765), toY(0.0375))
  ctx.bezierCurveTo(X(0.056), toY(0.0418), X(0.036), toY(0.0392), X(0.0195), toY(0.0322))
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
}

/** Small and full, with a soft cupid's bow, in a muted rose that blurs slightly at its edges as natural lips do. */
function lips(ctx: CanvasRenderingContext2D) {
  const y = -0.0715
  const half = 0.0222

  ctx.save()
  ctx.shadowColor = 'rgba(190, 100, 92, 0.55)'
  ctx.shadowBlur = 9

  ctx.fillStyle = COLOR.lipBottom
  ctx.beginPath()
  ctx.moveTo(toX(-half), toY(y))
  ctx.bezierCurveTo(toX(-half * 0.6), toY(y - 0.0165), toX(half * 0.6), toY(y - 0.0165), toX(half), toY(y))
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = COLOR.lipTop
  ctx.beginPath()
  ctx.moveTo(toX(-half), toY(y))
  ctx.bezierCurveTo(toX(-half * 0.62), toY(y + 0.006), toX(-half * 0.34), toY(y + 0.0112), toX(-half * 0.13), toY(y + 0.0098))
  ctx.quadraticCurveTo(toX(0), toY(y + 0.0076), toX(half * 0.13), toY(y + 0.0098))
  ctx.bezierCurveTo(toX(half * 0.34), toY(y + 0.0112), toX(half * 0.62), toY(y + 0.006), toX(half), toY(y))
  ctx.quadraticCurveTo(toX(0), toY(y - 0.002), toX(-half), toY(y))
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // the line between them, darkest at the center
  ctx.strokeStyle = 'rgba(92, 38, 38, 0.72)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(toX(-half * 0.92), toY(y))
  ctx.quadraticCurveTo(toX(0), toY(y - 0.002), toX(half * 0.92), toY(y))
  ctx.stroke()
  softSpot(ctx, 0, y - 0.0085, 0.009, 0.0028, 'rgba(255, 228, 220, 0.42)')
}

/** Drawn lightly, as in cel paint: a whisper of shade beside the bridge, and a soft underside with two small nostrils. */
function nose(ctx: CanvasRenderingContext2D) {
  for (const s of [-1, 1]) softSpot(ctx, s * 0.0125, -0.018, 0.0075, 0.024, 'rgba(196, 128, 104, 0.16)')
  softSpot(ctx, 0, -0.0455, 0.0155, 0.0048, 'rgba(186, 114, 92, 0.42)')
  ctx.fillStyle = 'rgba(120, 66, 52, 0.55)'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(toX(s * 0.0072), toY(-0.0452), 4.4, 2, s * 0.32, 0, 7)
    ctx.fill()
  }
}

/** The eye shut in a blink: skin over the eye, with the lash line swung down into a soft curve and the wing still there. */
function closedEye(ctx: CanvasRenderingContext2D, side: -1 | 1) {
  const cx = side * 0.046
  const cy = 0.008
  const half = 0.0262
  const X = (dx: number) => toX(cx + side * dx)
  const Y = (dy: number) => toY(cy + dy)

  ctx.fillStyle = COLOR.lash
  ctx.beginPath()
  ctx.moveTo(X(-half), Y(-0.0035))
  ctx.bezierCurveTo(X(-half * 0.45), Y(-0.0095), X(half * 0.45), Y(-0.0085), X(half), Y(0.0014))
  ctx.lineTo(X(half * 1.3), Y(0.0062))
  ctx.bezierCurveTo(X(half * 1.02), Y(0.0034), X(half * 0.45), Y(-0.0052), X(-half * 0.45), Y(-0.0062))
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = 'rgba(150, 92, 74, 0.34)'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(X(-half * 0.62), Y(0.0108))
  ctx.bezierCurveTo(X(-half * 0.15), Y(0.016), X(half * 0.5), Y(0.016), X(half * 1.02), Y(0.0106))
  ctx.stroke()
}

export function paintKaiyiFace(eyesClosed = false) {
  return makeCanvasTexture(W, H, (ctx) => {
    ctx.fillStyle = COLOR.skin
    ctx.fillRect(0, 0, W, H)

    // only soft color: warmth on the cheeks, and a little depth at the edges of the face and under the chin
    for (const s of [-1, 1]) {
      softSpot(ctx, s * 0.1, -0.05, 0.03, 0.08, 'rgba(214, 150, 122, 0.3)')
      softSpot(ctx, s * 0.058, -0.022, 0.034, 0.024, COLOR.blush)
      softSpot(ctx, s * 0.052, 0.1, 0.06, 0.05, 'rgba(150, 92, 72, 0.3)') // hair's soft shadow on the forehead
    }
    softSpot(ctx, 0, -0.124, 0.07, 0.016, 'rgba(214, 150, 122, 0.4)')
    softSpot(ctx, 0, -0.094, 0.013, 0.004, 'rgba(190, 124, 104, 0.2)') // under the lower lip

    nose(ctx)
    brow(ctx, -1)
    brow(ctx, 1)
    const drawEye = eyesClosed ? closedEye : eye
    drawEye(ctx, -1)
    drawEye(ctx, 1)
    lips(ctx)

    // the small beauty mark low on her cheek
    ctx.fillStyle = COLOR.mole
    ctx.beginPath()
    ctx.arc(toX(0.05), toY(-0.08), 3.4, 0, 7)
    ctx.fill()
  })
}
