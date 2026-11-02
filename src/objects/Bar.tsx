import { useMemo } from 'react'
import { BACK_BAR, BAR, PALETTE } from '../config'
import { plankTexture } from '../shaders/paint'
import { Box } from './prims'

/** The bar parallel to the back wall, with the barista's back counter behind it. */
export function Bar() {
  const { xMin, xMax, centerZ, depth, height } = BAR
  const length = xMax - xMin
  const centerX = (xMax + xMin) / 2

  const slats = useMemo(() => {
    const result: number[] = []
    for (let x = xMax - 0.1; x > xMin + 4; x -= 0.2) result.push(x)
    return result
  }, [xMax, xMin])

  return (
    <group>
      {/* top */}
      <Box size={[length, 0.06, depth + 0.1]} position={[centerX, height - 0.03, centerZ]} map={plankTexture('barTop')} />
      {/* body */}
      <Box size={[length, height - 0.06, depth - 0.06]} position={[centerX, (height - 0.06) / 2, centerZ]} color={PALETTE.wood} />
      {/* end grain facing the camera side, plus front slats as in reference 1 */}
      {slats.map((x) => (
        <Box
          key={x}
          size={[0.05, height - 0.16, 0.02]}
          position={[x, (height - 0.16) / 2 + 0.04, centerZ + (depth - 0.06) / 2 + 0.01]}
          color={PALETTE.woodLight}
          noCast
        />
      ))}

      {/* back counter */}
      <Box
        size={[BACK_BAR.xMax - BACK_BAR.xMin, BACK_BAR.height, BACK_BAR.depth]}
        position={[(BACK_BAR.xMax + BACK_BAR.xMin) / 2, BACK_BAR.height / 2, BACK_BAR.centerZ]}
        color={PALETTE.woodDark}
      />
    </group>
  )
}
