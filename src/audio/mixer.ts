import { useCafe } from '../state/store'
import { renderLofi, renderMurmur, renderRain, SOUNDS } from './synth'
import type { SoundName } from './synth'

/**
 * Sound is off until the visitor asks for it. "Step inside" unlocks the browser's audio; the Lo-fi button then brings in
 * the music and the room, with rain on top after dark. Everything is created lazily, so it costs nothing until then.
 */
const LEVELS = { music: 0.55, murmur: 0.2, rain: 0.17, effects: 0.8, purr: 0.5 }
const FADE_SECONDS = 1.1

let context: AudioContext | null = null
let master: GainNode | null = null
let effects: GainNode | null = null
let beds: Promise<void> | null = null
const gains: { music?: GainNode; murmur?: GainNode; rain?: GainNode; purr?: GainNode } = {}

function ensureContext() {
  if (context) return context
  const created = new AudioContext()
  context = created
  master = created.createGain()
  master.connect(created.destination)
  effects = created.createGain()
  effects.gain.value = LEVELS.effects
  effects.connect(master)
  return created
}

/** Called from a click, which is what browsers require before any sound can start. */
export function unlockAudio() {
  void ensureContext().resume()
}

function startLoop(buffer: AudioBuffer) {
  const source = context!.createBufferSource()
  source.buffer = buffer
  source.loop = true
  const gain = context!.createGain()
  gain.gain.value = 0
  source.connect(gain).connect(master!)
  source.start()
  return gain
}

function buildPurr() {
  const c = context!
  const seconds = 2
  const buffer = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02
    data[i] = last * 3.5
  }
  const noise = c.createBufferSource()
  noise.buffer = buffer
  noise.loop = true
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 260
  // the rattle, about 26 beats a second, swelling with each breath
  const rattle = c.createGain()
  rattle.gain.value = 0.5
  const pulse = c.createOscillator()
  pulse.frequency.value = 26
  const pulseDepth = c.createGain()
  pulseDepth.gain.value = 0.5
  pulse.connect(pulseDepth).connect(rattle.gain)
  const breath = c.createGain()
  breath.gain.value = 0.7
  const lung = c.createOscillator()
  lung.frequency.value = 0.42
  const lungDepth = c.createGain()
  lungDepth.gain.value = 0.3
  lung.connect(lungDepth).connect(breath.gain)
  const out = c.createGain()
  out.gain.value = 0
  noise.connect(filter).connect(rattle).connect(breath).connect(out).connect(master!)
  noise.start()
  pulse.start()
  lung.start()
  gains.purr = out
}

function ensureBeds() {
  beds ??= Promise.all([renderLofi(), renderMurmur(), renderRain()]).then(([lofi, murmur, rain]) => {
    gains.music = startLoop(lofi)
    gains.murmur = startLoop(murmur)
    gains.rain = startLoop(rain)
    applyLevels()
  })
  return beds
}

function fade(gain: GainNode | undefined, level: number, seconds = FADE_SECONDS) {
  if (gain && context) gain.gain.setTargetAtTime(level, context.currentTime, seconds / 3)
}

function applyLevels() {
  const { soundOn, timeOfDay } = useCafe.getState()
  fade(gains.music, soundOn ? LEVELS.music : 0)
  fade(gains.murmur, soundOn ? LEVELS.murmur : 0)
  fade(gains.rain, soundOn && timeOfDay === 'night' ? LEVELS.rain : 0, 2.6)
}

export function playSound(name: SoundName) {
  if (!context || !effects || !useCafe.getState().soundOn) return
  SOUNDS[name]({ context, bus: effects })
}

/** Only while sound is on and the visitor is with the cat. */
export function setPurr(on: boolean) {
  if (!context || !master) return
  if (on && !gains.purr) buildPurr()
  fade(gains.purr, on ? LEVELS.purr : 0, 0.7)
}

const SECTION_SOUNDS: Partial<Record<string, SoundName[]>> = {
  work: ['hiss', 'clink'],
  contact: ['ring'],
  creative: ['shutter'],
}

useCafe.subscribe((state, previous) => {
  if (state.soundOn !== previous.soundOn) {
    if (state.soundOn) {
      ensureContext()
      void context!.resume()
      void ensureBeds()
    }
    applyLevels()
  }
  if (state.timeOfDay !== previous.timeOfDay) applyLevels()
  if (state.openSection !== previous.openSection && state.openSection) {
    SECTION_SOUNDS[state.openSection]?.forEach(playSound)
  }
  if (state.pouring && !previous.pouring) playSound('pour')
  if (state.shots > previous.shots) playSound('clink')
})

