import { useMemo } from 'react'
import { PALETTE, ROOM } from '../config'
import { Box } from '../objects/prims'
import { floorTexture, plankTexture, plasterTexture } from '../shaders/paint'
import { WindowGlass } from './WindowGlass'

const WALL = 0.2

/** Floor, ceiling, back wall and the window wall with its frames. The front and left stay open like a film set. */
export function Room() {
  const { windowX, backZ, ceilingY, extentX, extentZ, window: win } = ROOM

  const width = windowX - extentX
  const depth = extentZ - backZ
  const centerX = (windowX + extentX) / 2
  const centerZ = (extentZ + backZ) / 2

  return (
    <group>
      {/* floor */}
      <Box size={[width + 2, 0.2, depth + 2]} position={[centerX + 1, -0.1, centerZ]} map={floorTexture()} noCast />

      {/* ceiling: thick, and stopping just past the window wall so it can't shade the key light */}
      <Box size={[width + 0.3, 0.3, depth + 4]} position={[centerX + 0.15, ceilingY + 0.15, centerZ]} map={plankTexture('ceiling')} />
      {[-2.4, -1.0, 0.4, 1.8, 3.2, 4.6].map((z) => (
        <Box key={z} size={[width, 0.16, 0.14]} position={[centerX, ceilingY - 0.08, z]} color={PALETTE.beam} />
      ))}

      {/* back wall */}
      <Box size={[width + 1, ceilingY, WALL]} position={[centerX + 0.5, ceilingY / 2, backZ - WALL / 2]} map={plasterTexture()} />
      <Box
        size={[width, 0.12, 0.03]}
        position={[centerX, 0.06, backZ + 0.015]}
        color={PALETTE.woodDark}
        noCast
      />

      {/* window wall: below the sill and above the head */}
      <Box
        size={[WALL, win.sillY, depth + 1]}
        position={[windowX + WALL / 2, win.sillY / 2, centerZ]}
        color={PALETTE.wallLow}
      />
      <Box
        size={[WALL, ceilingY - win.headY, depth + 1]}
        position={[windowX + WALL / 2, (ceilingY + win.headY) / 2, centerZ]}
        color={PALETTE.frame}
      />

    </group>
  )
}

/** The window's frames and glass, separate from the shell so the whole window can glow on hover. */
export function WindowFrames() {
  const { windowX, window: win } = ROOM
  const mullions = useMemo(() => {
    const zs: { z: number; heavy: boolean }[] = []
    const count = Math.round((win.zMax - win.zMin) / win.pane)
    for (let i = 0; i <= count; i++) zs.push({ z: win.zMin + i * win.pane, heavy: i % 2 === 0 })
    return zs
  }, [win])

  const windowLength = win.zMax - win.zMin
  const windowCenterZ = (win.zMax + win.zMin) / 2
  const windowHeight = win.headY - win.sillY

  return (
    <group>
      {/* window frames, heavier every second pane as in reference 3 */}
      {mullions.map(({ z, heavy }) => (
        <Box
          key={z}
          size={[heavy ? 0.16 : 0.07, windowHeight, heavy ? 0.14 : 0.06]}
          position={[windowX + 0.08, (win.sillY + win.headY) / 2, z]}
          color={PALETTE.frame}
        />
      ))}
      {[win.sillY + 0.02, win.railY, win.headY - 0.02].map((y) => (
        <Box
          key={y}
          size={[0.1, 0.07, windowLength]}
          position={[windowX + 0.08, y, windowCenterZ]}
          color={PALETTE.frame}
        />
      ))}

      <WindowGlass />
    </group>
  )
}
