import { useMemo } from 'react'
import { FLYER_COLORS, LAYOUT, PALETTE } from '../config'
import type { Vec3 } from '../config'
import { experience } from '../content'
import { Box, Inked, Sph, Surface, makeCanvasTexture } from './prims'

const BOARD = { width: 1.12, height: 0.84 }

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

/** One pinned flyer per role in content.ts, so the board always matches the Experience section. */
export function Corkboard() {
  const flyers = useMemo(
    () =>
      experience.map((role, i) =>
        makeCanvasTexture(
          224,
          264,
          (ctx, w, h) => {
            ctx.fillStyle = FLYER_COLORS[i % FLYER_COLORS.length]
            ctx.fillRect(0, 0, w, h)
            ctx.fillStyle = '#2a2430'
            ctx.font = '700 25px Sora, system-ui, sans-serif'
            let y = 66
            for (const line of wrap(ctx, role.title, w - 32)) {
              ctx.fillText(line, 16, y)
              y += 30
            }
            ctx.font = '600 17px "Nunito Sans", system-ui, sans-serif'
            y += 6
            for (const line of wrap(ctx, role.role ?? '', w - 32).slice(0, 3)) {
              ctx.fillText(line, 16, y)
              y += 21
            }
            if (role.dates) {
              ctx.font = '700 16px "Nunito Sans", system-ui, sans-serif'
              ctx.fillStyle = '#7a3b2e'
              ctx.fillText(role.dates, 16, h - 18)
            }
          },
          ['700 25px Sora', '600 17px "Nunito Sans"', '700 16px "Nunito Sans"'],
        ),
      ),
    [],
  )

  return (
    <Inked>
    <group position={LAYOUT.corkboard.position}>
      <Box size={[BOARD.width + 0.07, BOARD.height + 0.07, 0.03]} position={[0, 0, 0.015]} color={PALETTE.woodDark} />
      <Box size={[BOARD.width, BOARD.height, 0.01]} position={[0, 0, 0.034]} color={PALETTE.cork} noCast noInk />
      {experience.map((role, i) => {
        const x = -0.36 + (i % 3) * 0.36
        const y = i < 3 ? 0.2 : -0.2
        const position: Vec3 = [x, y, 0.044]
        return (
          <group key={role.title} position={position} rotation={[0, 0, ((i * 37) % 11) * 0.012 - 0.06]}>
            <mesh castShadow={false} receiveShadow position={[0, 0, 0.002]}>
              <planeGeometry args={[0.28, 0.33]} />
              <Surface map={flyers[i]} />
            </mesh>
            <Sph radius={0.014} position={[0, 0.14, 0.008]} color={PALETTE.lantern} segments={8} noCast noInk />
          </group>
        )
      })}
    </group>
    </Inked>
  )
}
