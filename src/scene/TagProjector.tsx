import { useFrame } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import { INTERACTIVES, LAYOUT } from '../config'
import type { Vec3 } from '../config'
import { cat } from '../objects/catBrain'
import { bubbleElement, pillElements, tagElements } from '../ui/Tags'

const projected = new Vector3()
const BUBBLE_ANCHOR = INTERACTIVES.find((item) => item.id === 'kaiyi')!.anchor
const BUBBLE_MARGIN = 12
const CAT_TAG_LIFT = 0.56
const catAnchor: Vec3 = [0, 0, 0]
const POT = LAYOUT.hotpot.position
const TABLE_AND_POT = 0.795
const PILL_ANCHORS: Vec3[] = LAYOUT.hotpotPills.map(([x, y, z]) => [POT[0] + x, POT[1] + TABLE_AND_POT + y + 0.04, POT[2] + z])

function place(element: HTMLElement, anchor: readonly [number, number, number], width: number, height: number, camera: Parameters<Vector3['project']>[0]) {
  projected.set(anchor[0], anchor[1], anchor[2]).project(camera)
  const x = ((projected.x + 1) / 2) * width
  const y = ((1 - projected.y) / 2) * height
  element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
}

/** Like place, but held inside the screen edges, with the tail sliding along to keep pointing at her. */
function placeBubble(element: HTMLElement, width: number, height: number, camera: Parameters<Vector3['project']>[0]) {
  projected.set(BUBBLE_ANCHOR[0], BUBBLE_ANCHOR[1], BUBBLE_ANCHOR[2]).project(camera)
  const x = ((projected.x + 1) / 2) * width
  const y = ((1 - projected.y) / 2) * height
  const half = element.offsetWidth / 2
  const clamped = MathUtils.clamp(x, half + BUBBLE_MARGIN, Math.max(half + BUBBLE_MARGIN, width - half - BUBBLE_MARGIN))
  element.style.transform = `translate(${clamped}px, ${y}px) translate(-50%, -100%)`
  element.style.setProperty('--tail', `${MathUtils.clamp(x - clamped, -half + 18, half - 18)}px`)
}

/** Keeps the DOM tags and speech bubble glued to their objects. Cheaper than one drei Html per object. */
export function TagProjector() {
  useFrame(({ camera, size }) => {
    for (const { id, anchor } of INTERACTIVES) {
      const element = tagElements.get(id)
      if (!element) continue
      if (id === 'cat') {
        catAnchor[0] = cat.position.x
        catAnchor[1] = cat.position.y + CAT_TAG_LIFT
        catAnchor[2] = cat.position.z
      }
      place(element, id === 'cat' ? catAnchor : anchor, size.width, size.height, camera)
    }
    if (bubbleElement.current) placeBubble(bubbleElement.current, size.width, size.height, camera)
    pillElements.forEach((element, i) => place(element, PILL_ANCHORS[i], size.width, size.height, camera))
  })
  return null
}
