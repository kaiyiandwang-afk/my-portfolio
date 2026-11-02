import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Mesh } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { INTERACTIVES } from '../config'
import type { Interactive } from '../config'
import { cat } from '../objects/catBrain'
import { useCafe } from '../state/store'

// Add ?hits to the URL in dev to see these as wireframes.
const SHOW_HITS = import.meta.env.DEV && location.search.includes('hits')
const DRAG_TOLERANCE = 6
const CAT_BOX_LIFT = 0.24

/**
 * Invisible boxes that catch the pointer, instead of testing the visible meshes. Raycasting the real scene on every
 * mouse move would mean hundreds of meshes and a few hundred thousand triangles of fur. This is 16 boxes, and it also
 * gives small props a comfortably large target.
 */
function HitTarget({ item }: { item: Interactive }) {
  const { hit } = item
  const box = useRef<Mesh>(null)

  // The cat wanders, so its box goes with it.
  useFrame(() => {
    if (item.id !== 'cat' || !box.current) return
    box.current.position.set(cat.position.x, cat.position.y + CAT_BOX_LIFT, cat.position.z)
    box.current.rotation.y = cat.yaw
  })

  const onOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    const state = useCafe.getState()
    // Touch has no hover, and a press shouldn't count as hovering while orbiting.
    if (event.pointerType !== 'mouse' || event.buttons !== 0 || state.cameraState !== 'home') return
    state.setHovered(item.id)
  }

  const onOut = () => {
    const state = useCafe.getState()
    if (state.hovered === item.id) state.setHovered(null)
  }

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.delta > DRAG_TOLERANCE) return // that was an orbit, not a click
    const state = useCafe.getState()
    if (state.focus === 'kaiyi' && item.id === 'kaiyi') state.nextKaiyiLine()
    else if (state.focus !== null) state.back()
    else state.activate(item.id)
  }

  return (
    <mesh
      ref={box}
      visible={SHOW_HITS}
      position={hit.center}
      rotation={[0, hit.rotationY ?? 0, 0]}
      onPointerOver={onOver}
      onPointerOut={onOut}
      onClick={onClick}
    >
      <boxGeometry args={hit.size} />
      <meshBasicMaterial wireframe color="#7fd8b2" fog={false} />
    </mesh>
  )
}

export function HitTargets() {
  const canvas = useThree((s) => s.gl.domElement)
  const hovered = useCafe((s) => s.hovered)
  const cameraState = useCafe((s) => s.cameraState)

  useEffect(() => {
    canvas.style.cursor = hovered ? 'pointer' : cameraState === 'home' ? 'grab' : 'default'
  }, [canvas, hovered, cameraState])

  return (
    <>
      {INTERACTIVES.map((item) => (
        <HitTarget key={item.id} item={item} />
      ))}
    </>
  )
}
