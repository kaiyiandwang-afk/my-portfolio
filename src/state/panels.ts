import { INTERACTIVES } from '../config'
import type { InteractiveId } from '../config'

export const PHONE_WIDTH = 640

export const isPhone = () => window.innerWidth < PHONE_WIDTH

/**
 * Whether a close-up's section opens in the drawer. In-world views like the tiny desktop and the chalkboard are too small
 * to use on a phone, so there everything goes to the bottom sheet except Kaiyi's conversation, which restyles itself.
 */
export function usesDrawer(id: InteractiveId) {
  const item = INTERACTIVES.find((candidate) => candidate.id === id)
  if (!item?.section || id === 'kaiyi') return false
  return item.drawer === true || isPhone()
}
