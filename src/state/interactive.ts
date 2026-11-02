import type { Mesh, Object3D } from 'three'
import type { InteractiveId } from '../config'

/** The live scene group for each interactive object, so effects can reach an object without React re-renders. */
const groups = new Map<InteractiveId, Object3D>()

export function registerInteractive(id: InteractiveId, group: Object3D) {
  groups.set(id, group)
  return () => {
    groups.delete(id)
  }
}

/**
 * The meshes that define an object's outline when it glows. Skips the ink hulls, which would only double the work, and
 * the fur shells, which all sit on top of each other in this mask. The cat is covered by its invisible base meshes.
 */
export function outlineMeshes(id: InteractiveId) {
  const meshes: Mesh[] = []
  groups.get(id)?.traverse((object) => {
    const mesh = object as Mesh
    if (!mesh.isMesh || mesh.userData.noOutline) return
    const material = mesh.material as { uniforms?: { thickness?: unknown } }
    if (material?.uniforms?.thickness) return
    meshes.push(mesh)
  })
  return meshes
}
