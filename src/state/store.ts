import { create } from 'zustand'
import { INTERACTIVES } from '../config'
import type { InteractiveId } from '../config'
import { lines, reactions, sections } from '../content'
import type { GalleryImage, SectionId } from '../content'

export type TimeOfDay = 'day' | 'night'
export type TimerMode = 'focus' | 'break'
export type CameraState = 'home' | 'flying' | 'focused' | 'returning'

const FOCUS_SECONDS = 25 * 60
const BREAK_SECONDS = 5 * 60

/** Same rule as v1: night from 7pm to 6am in the visitor's local time. */
function localTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  return hour >= 19 || hour < 6 ? 'night' : 'day'
}

const VISITED_KEY = 'cafe-visited'

/** Which sections this visitor has been to. A convenience only, so it starts empty if storage is unavailable. */
function loadVisited(): SectionId[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(VISITED_KEY) ?? '[]')
    return Array.isArray(saved) ? saved.filter((id) => sections.some((section) => section.id === id)) : []
  } catch {
    return []
  }
}

function saveVisited(visited: SectionId[]) {
  try {
    localStorage.setItem(VISITED_KEY, JSON.stringify(visited))
  } catch {
    // private window or blocked storage: the card just won't carry over to the next visit
  }
}

const startingVisited = loadVisited()
/** The card only gets its one line of thanks the visit it fills up. */
let thanked = startingVisited.length === sections.length

/** ?clean skips the way in, for screenshots and testing. */
const skipIntro = location.search.includes('clean')

interface CafeState {
  /** The scene has built and drawn its first frames. */
  sceneReady: boolean
  /** The visitor has stepped inside. */
  entered: boolean
  enter: () => void
  /** The one hint, and the single pulse of everything clickable, just after arriving. */
  hinting: boolean
  pulseAt: number

  /** The object the camera is at, or flying to. Null means the main view. */
  focus: InteractiveId | null
  cameraState: CameraState
  /** Set only once the camera has arrived, so a drawer never opens over a moving shot. */
  openSection: SectionId | null
  /** Sections the visitor has opened, stamped on the loyalty card in the Explore menu. */
  visited: SectionId[]
  menuOpen: boolean
  toggleMenu: () => void
  closeMenu: () => void

  /** The enlarged image, shared by the art gallery and the cat photos. */
  lightbox: { images: GalleryImage[]; index: number } | null
  openLightbox: (images: GalleryImage[], index: number) => void
  closeLightbox: () => void
  stepLightbox: (by: number) => void

  /** A v1 line Kaiyi says when clicked again during her conversation. */
  kaiyiLine: { text: string; id: number } | null
  nextKaiyiLine: () => void

  hovered: InteractiveId | null
  setHovered: (id: InteractiveId | null) => void

  /** What clicking an object does: fly to it, or run its action. */
  activate: (id: InteractiveId) => void
  /** Back button, Esc and clicking away all land here. */
  back: () => void
  /** Called by the camera rig when a flight ends. */
  cameraArrived: () => void

  speech: { text: string; id: number } | null
  say: (text: string) => void
  clearSpeech: () => void

  timeOfDay: TimeOfDay
  toggleTimeOfDay: () => void

  soundOn: boolean
  toggleSound: () => void

  labelsOn: boolean
  toggleLabels: () => void

  lampOn: boolean
  toggleLamp: () => void

  timer: { mode: TimerMode; secondsLeft: number; running: boolean }
  toggleTimer: () => void
  resetTimer: () => void
  skipTimer: () => void

  /** Espresso the visitor has pulled from the Work panel, which the machine in the room pours for real. */
  pouring: boolean
  shots: number

  /** An interest the visitor picked at the hotpot, to ask about at the telephone. */
  askAbout: string | null
  /** The interest pill under the pointer, whose ingredient bobs in response. */
  hoveredInterest: number | null
  tickTimer: () => void
}

export const useCafe = create<CafeState>()((set, get) => ({
  focus: null,
  cameraState: 'home',
  openSection: null,
  sceneReady: false,
  entered: skipIntro,
  enter: () => set({ entered: true, hinting: true, pulseAt: performance.now() + 1100 }),
  hinting: false,
  pulseAt: 0,

  visited: startingVisited,
  menuOpen: false,
  toggleMenu: () => set((s) => ({ menuOpen: !s.menuOpen })),
  closeMenu: () => set({ menuOpen: false }),

  lightbox: null,
  openLightbox: (images, index) => set({ lightbox: { images, index } }),
  closeLightbox: () => set({ lightbox: null }),
  stepLightbox: (by) =>
    set((s) =>
      s.lightbox
        ? { lightbox: { ...s.lightbox, index: (s.lightbox.index + by + s.lightbox.images.length) % s.lightbox.images.length } }
        : s,
    ),

  kaiyiLine: null,
  nextKaiyiLine: () =>
    set((s) => {
      const id = (s.kaiyiLine?.id ?? -1) + 1
      return { kaiyiLine: { text: lines[id % lines.length], id } }
    }),

  hovered: null,
  setHovered: (hovered) => set({ hovered }),

  activate: (id) => {
    const item = INTERACTIVES.find((candidate) => candidate.id === id)
    if (!item) return

    switch (item.action) {
      case 'timer':
        get().toggleTimer()
        return
      case 'music':
        get().toggleSound()
        return
      case 'lamp':
        get().toggleLamp()
        return
      case 'dayNight':
        get().toggleTimeOfDay()
        return
    }

    // Anything with a close-up flies there. Going from one object straight to another is fine.
    if (item.closeUp) {
      set({ focus: id, cameraState: 'flying', openSection: null, menuOpen: false, hovered: null, lightbox: null, kaiyiLine: null })
    }
  },

  back: () => {
    if (get().focus === null) {
      set({ menuOpen: false })
      return
    }
    set({ focus: null, cameraState: 'returning', openSection: null, menuOpen: false, hovered: null, lightbox: null, kaiyiLine: null })
  },

  cameraArrived: () => {
    const { focus, visited } = get()
    if (focus === null) {
      set({ cameraState: 'home' })
      if (!thanked && visited.length === sections.length) {
        thanked = true
        get().say(reactions.wholeCafe)
      }
      return
    }
    const item = INTERACTIVES.find((candidate) => candidate.id === focus)
    const section = item?.section ?? null
    const stamped = section && !visited.includes(section) ? [...visited, section] : visited
    if (stamped !== visited) saveVisited(stamped)
    set({ cameraState: 'focused', openSection: section, menuOpen: item?.action === 'explore', visited: stamped })
  },

  speech: null,
  say: (text) => set((s) => ({ speech: { text, id: (s.speech?.id ?? 0) + 1 } })),
  clearSpeech: () => set({ speech: null }),

  timeOfDay: localTimeOfDay(),
  toggleTimeOfDay: () => {
    const next: TimeOfDay = get().timeOfDay === 'day' ? 'night' : 'day'
    // the desk lamp follows the sun, and can still be clicked on or off by hand
    set({ timeOfDay: next, lampOn: next === 'night' })
    get().say(next === 'night' ? reactions.nowNight : reactions.nowDay)
  },

  soundOn: false,
  toggleSound: () => {
    const next = !get().soundOn
    set({ soundOn: next })
    if (next) get().say(reactions.musicOn)
  },

  labelsOn: false,
  toggleLabels: () => set((s) => ({ labelsOn: !s.labelsOn })),

  // Off by day and on after dark, so the first click in daylight is the one that shows.
  lampOn: localTimeOfDay() === 'night',
  toggleLamp: () => set((s) => ({ lampOn: !s.lampOn })),

  timer: { mode: 'focus', secondsLeft: FOCUS_SECONDS, running: false },
  resetTimer: () => set((s) => ({ timer: { ...s.timer, running: false, secondsLeft: s.timer.mode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS } })),
  skipTimer: () =>
    set((s) => {
      const mode = s.timer.mode === 'focus' ? 'break' : 'focus'
      return { timer: { mode, running: false, secondsLeft: mode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS } }
    }),

  pouring: false,
  shots: 0,

  askAbout: null,
  hoveredInterest: null,
  toggleTimer: () => {
    const { timer } = get()
    const running = !timer.running
    set({ timer: { ...timer, running } })
    if (!running) get().say(reactions.timerPaused)
    else get().say(timer.mode === 'focus' ? reactions.timerStartFocus : reactions.timerStartBreak)
  },
  tickTimer: () => {
    const { timer } = get()
    if (!timer.running) return
    if (timer.secondsLeft > 1) {
      set({ timer: { ...timer, secondsLeft: timer.secondsLeft - 1 } })
      return
    }
    const mode: TimerMode = timer.mode === 'focus' ? 'break' : 'focus'
    set({ timer: { mode, running: true, secondsLeft: mode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS } })
    get().say(mode === 'break' ? reactions.timerToBreak : reactions.timerToFocus)
  },
}))
