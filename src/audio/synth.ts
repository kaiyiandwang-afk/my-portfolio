/**
 * Every sound in the café is synthesized here, so there are no audio files to license, host or wait for. The three beds
 * (lo-fi, murmur, rain) are rendered once ahead of time into loopable buffers, so playing them costs almost nothing.
 */

const SAMPLE_RATE = 32000

function noiseBuffer(context: BaseAudioContext, seconds: number, brown = false) {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    if (brown) {
      last = (last + white * 0.02) / 1.02
      data[i] = last * 3.5
    } else {
      data[i] = white
    }
  }
  return buffer
}

/** A seeded generator, so the music comes out the same on every visit. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

interface Voice {
  context: OfflineAudioContext
  bus: AudioNode
}

/** An electric-piano tone: a round body, an octave's warmth, and a little bell in the attack. */
function keyNote({ context, bus }: Voice, midi: number, at: number, length: number, level: number) {
  const out = context.createGain()
  out.gain.setValueAtTime(0.0001, at)
  out.gain.exponentialRampToValueAtTime(level, at + 0.012)
  out.gain.exponentialRampToValueAtTime(0.0001, at + length)
  out.connect(bus)
  ;[
    { type: 'sine' as const, ratio: 1, gain: 1, detune: -4 },
    { type: 'triangle' as const, ratio: 1, gain: 0.34, detune: 5 },
    { type: 'sine' as const, ratio: 2, gain: 0.16, detune: 2 },
  ].forEach(({ type, ratio, gain, detune }) => {
    const osc = context.createOscillator()
    osc.type = type
    osc.frequency.value = hz(midi) * ratio
    osc.detune.value = detune
    const g = context.createGain()
    g.gain.value = gain
    osc.connect(g).connect(out)
    osc.start(at)
    osc.stop(at + length + 0.05)
  })
  const bell = context.createOscillator()
  bell.frequency.value = hz(midi) * 4
  const bellGain = context.createGain()
  bellGain.gain.setValueAtTime(level * 0.1, at)
  bellGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22)
  bell.connect(bellGain).connect(bus)
  bell.start(at)
  bell.stop(at + 0.25)
}

function kick({ context, bus }: Voice, at: number, level: number) {
  const osc = context.createOscillator()
  osc.frequency.setValueAtTime(118, at)
  osc.frequency.exponentialRampToValueAtTime(46, at + 0.11)
  const g = context.createGain()
  g.gain.setValueAtTime(level, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.24)
  osc.connect(g).connect(bus)
  osc.start(at)
  osc.stop(at + 0.26)
}

function noiseHit({ context, bus }: Voice, noise: AudioBuffer, at: number, length: number, level: number, type: BiquadFilterType, frequency: number, q = 0.8) {
  const source = context.createBufferSource()
  source.buffer = noise
  const filter = context.createBiquadFilter()
  filter.type = type
  filter.frequency.value = frequency
  filter.Q.value = q
  const g = context.createGain()
  g.gain.setValueAtTime(level, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + length)
  source.connect(filter).connect(g).connect(bus)
  source.start(at, Math.random() * 0.5)
  source.stop(at + length + 0.02)
}

/** Eight bars of slow, swung lo-fi at 72 bpm: warm seventh chords, a soft kit, a few stray notes, and vinyl dust. */
export function renderLofi() {
  const bpm = 72
  const beat = 60 / bpm
  const bars = 8
  const length = bars * beat * 4
  const context = new OfflineAudioContext(2, Math.ceil(SAMPLE_RATE * length), SAMPLE_RATE)

  const warmth = context.createBiquadFilter()
  warmth.type = 'lowpass'
  warmth.frequency.value = 2500
  warmth.Q.value = 0.4
  const glue = context.createDynamicsCompressor()
  glue.threshold.value = -20
  glue.ratio.value = 3
  warmth.connect(glue).connect(context.destination)
  const voice: Voice = { context, bus: warmth }
  const noise = noiseBuffer(context, 2)

  const CHORDS = [
    [41, 57, 60, 64, 67], // Fmaj9
    [40, 55, 59, 62, 66], // Em7
    [38, 57, 60, 65, 64], // Dm9
    [43, 53, 59, 62, 69], // G13
  ]
  const SCALE = [72, 74, 76, 79, 81, 84]
  const rand = seeded(2028)

  for (let bar = 0; bar < bars; bar++) {
    const start = bar * beat * 4
    const [root, ...chord] = CHORDS[bar % CHORDS.length]

    // the chord, rolled slightly, and a softer stab on the "and" of three
    chord.forEach((midi, i) => {
      keyNote(voice, midi, start + i * 0.018, beat * 3.4, 0.075)
      keyNote(voice, midi, start + beat * 2.58 + i * 0.012, beat * 1.3, 0.04)
    })
    keyNote(voice, root, start, beat * 1.6, 0.2)
    keyNote(voice, root, start + beat * 2.58, beat, 0.13)

    for (let i = 0; i < 4; i++) {
      const at = start + i * beat
      if (i === 0 || i === 2) kick(voice, at, 0.42)
      if (i === 1 || i === 3) noiseHit(voice, noise, at + 0.012, 0.15, 0.13, 'bandpass', 1750, 0.9)
      // swung hats, each a little different
      noiseHit(voice, noise, at, 0.04, 0.035 + rand() * 0.015, 'highpass', 6800)
      noiseHit(voice, noise, at + beat * 0.6, 0.035, 0.02 + rand() * 0.012, 'highpass', 7400)
    }
    if (bar % 2 === 1) kick(voice, start + beat * 3.6, 0.2)

    // a few notes drifting over the top
    for (let i = 0; i < 8; i++) {
      if (rand() > (bar % 4 === 3 ? 0.46 : 0.26)) continue
      keyNote(voice, SCALE[Math.floor(rand() * SCALE.length)], start + i * beat * 0.5 + (i % 2 ? beat * 0.08 : 0), beat * 1.1, 0.04)
    }
  }

  // Vinyl: quiet surface hiss, then scattered crackle, straight to the output so the lowpass doesn't soften it.
  const hiss = context.createBufferSource()
  hiss.buffer = noise
  hiss.loop = true
  const hissFilter = context.createBiquadFilter()
  hissFilter.type = 'bandpass'
  hissFilter.frequency.value = 3200
  const hissGain = context.createGain()
  hissGain.gain.value = 0.006
  hiss.connect(hissFilter).connect(hissGain).connect(context.destination)
  hiss.start()
  const dust: Voice = { context, bus: context.destination }
  for (let i = 0; i < length * 7; i++) noiseHit(dust, noise, rand() * (length - 0.05), 0.006, 0.02 + rand() * 0.05, 'highpass', 3000)

  return context.startRendering()
}

/** A room full of people you can't quite make out: mid-range rumble that swells and thins, and now and then a cup. */
export function renderMurmur() {
  const length = 24
  const context = new OfflineAudioContext(1, SAMPLE_RATE * length, SAMPLE_RATE)
  const rand = seeded(31)
  const room = noiseBuffer(context, length, true)
  ;[
    { frequency: 340, q: 0.9, gain: 1.5 },
    { frequency: 720, q: 1.4, gain: 0.8 },
    { frequency: 1250, q: 1.8, gain: 0.32 },
  ].forEach(({ frequency, q, gain }) => {
    const source = context.createBufferSource()
    source.buffer = room
    const filter = context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = frequency
    filter.Q.value = q
    const g = context.createGain()
    // voices rise and fall irregularly, returning to the same level so the loop is seamless
    g.gain.setValueAtTime(gain * 0.7, 0)
    for (let t = 1.2; t < length - 1; t += 0.8 + rand() * 1.4) g.gain.linearRampToValueAtTime(gain * (0.42 + rand() * 0.72), t)
    g.gain.linearRampToValueAtTime(gain * 0.7, length)
    source.connect(filter).connect(g).connect(context.destination)
    source.start()
  })
  for (let i = 0; i < 6; i++) {
    const at = 1 + rand() * (length - 2)
    const osc = context.createOscillator()
    osc.frequency.value = 2200 + rand() * 1900
    const g = context.createGain()
    g.gain.setValueAtTime(0.018, at)
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.13)
    osc.connect(g).connect(context.destination)
    osc.start(at)
    osc.stop(at + 0.15)
  }
  return context.startRendering()
}

/** Rain on a window: a soft wash, plus individual drops ticking on the glass. */
export function renderRain() {
  const length = 12
  const context = new OfflineAudioContext(1, SAMPLE_RATE * length, SAMPLE_RATE)
  const rand = seeded(77)
  const noise = noiseBuffer(context, length)
  const wash = context.createBufferSource()
  wash.buffer = noise
  const high = context.createBiquadFilter()
  high.type = 'highpass'
  high.frequency.value = 900
  const low = context.createBiquadFilter()
  low.type = 'lowpass'
  low.frequency.value = 6500
  const g = context.createGain()
  g.gain.value = 0.34
  wash.connect(high).connect(low).connect(g).connect(context.destination)
  wash.start()
  const voice: Voice = { context, bus: context.destination }
  for (let i = 0; i < length * 11; i++) noiseHit(voice, noise, rand() * (length - 0.04), 0.022, 0.05 + rand() * 0.16, 'bandpass', 1800 + rand() * 3400, 3)
  return context.startRendering()
}

// ---------------------------------------------------------------- one-shots

type Bus = { context: AudioContext; bus: AudioNode }

function tone({ context, bus }: Bus, frequency: number, at: number, length: number, level: number, type: OscillatorType = 'sine') {
  const osc = context.createOscillator()
  osc.type = type
  osc.frequency.value = frequency
  const g = context.createGain()
  g.gain.setValueAtTime(level, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + length)
  osc.connect(g).connect(bus)
  osc.start(at)
  osc.stop(at + length + 0.02)
}

function burst({ context, bus }: Bus, at: number, length: number, level: number, type: BiquadFilterType, frequency: number, q = 0.8, brown = false) {
  const source = context.createBufferSource()
  source.buffer = noiseBuffer(context, length + 0.05, brown)
  const filter = context.createBiquadFilter()
  filter.type = type
  filter.frequency.value = frequency
  filter.Q.value = q
  const g = context.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(level, at + Math.min(0.08, length * 0.2))
  g.gain.exponentialRampToValueAtTime(0.0001, at + length)
  source.connect(filter).connect(g).connect(bus)
  source.start(at)
}

export const SOUNDS = {
  /** Porcelain on porcelain, twice. */
  clink(out: Bus) {
    const t = out.context.currentTime
    for (const [at, level] of [[0, 0.12], [0.11, 0.07]] as const) {
      tone(out, 2860, t + at, 0.22, level)
      tone(out, 4270, t + at, 0.14, level * 0.6)
      tone(out, 6120, t + at, 0.07, level * 0.3)
    }
  },
  /** A real bell ringer: two close tones, hammered about twenty times a second. */
  ring({ context, bus }: Bus) {
    const t = context.currentTime
    const hammer = context.createOscillator()
    hammer.type = 'square'
    hammer.frequency.value = 20
    const depth = context.createGain()
    depth.gain.value = 0.05
    const level = context.createGain()
    level.gain.setValueAtTime(0.0001, t)
    level.gain.linearRampToValueAtTime(0.07, t + 0.02)
    level.gain.setValueAtTime(0.07, t + 0.95)
    level.gain.exponentialRampToValueAtTime(0.0001, t + 1.15)
    hammer.connect(depth).connect(level.gain)
    for (const frequency of [1040, 1215]) {
      const bell = context.createOscillator()
      bell.frequency.value = frequency
      bell.connect(level)
      bell.start(t)
      bell.stop(t + 1.2)
    }
    level.connect(bus)
    hammer.start(t)
    hammer.stop(t + 1.2)
  },
  /** A rising and falling cry through two vocal formants. */
  meow({ context, bus }: Bus) {
    const t = context.currentTime
    const voice = context.createOscillator()
    voice.type = 'sawtooth'
    voice.frequency.setValueAtTime(520, t)
    voice.frequency.linearRampToValueAtTime(880, t + 0.2)
    voice.frequency.linearRampToValueAtTime(610, t + 0.58)
    const first = context.createBiquadFilter()
    first.type = 'bandpass'
    first.Q.value = 5
    first.frequency.setValueAtTime(700, t)
    first.frequency.linearRampToValueAtTime(1500, t + 0.22)
    first.frequency.linearRampToValueAtTime(900, t + 0.58)
    const second = context.createBiquadFilter()
    second.type = 'bandpass'
    second.frequency.value = 2800
    second.Q.value = 6
    const level = context.createGain()
    level.gain.setValueAtTime(0.0001, t)
    level.gain.linearRampToValueAtTime(0.42, t + 0.07)
    level.gain.setValueAtTime(0.38, t + 0.42)
    level.gain.exponentialRampToValueAtTime(0.0001, t + 0.62)
    voice.connect(first).connect(level)
    voice.connect(second).connect(level)
    level.connect(bus)
    voice.start(t)
    voice.stop(t + 0.65)
  },
  /** The mirror going up, then the curtain. */
  shutter(out: Bus) {
    const t = out.context.currentTime
    burst(out, t, 0.035, 0.3, 'highpass', 2600)
    burst(out, t + 0.075, 0.05, 0.22, 'bandpass', 1500, 1.4)
  },
  /** The steam wand opening. */
  hiss(out: Bus) {
    burst(out, out.context.currentTime, 1.25, 0.06, 'highpass', 4200)
  },
  /** Espresso running into a cup. */
  pour(out: Bus) {
    burst(out, out.context.currentTime, 0.95, 0.12, 'bandpass', 620, 1.1, true)
  },
  /** The dial's ratchet ticking back round as it springs home. */
  dial(out: Bus) {
    const t = out.context.currentTime + 0.34
    for (let i = 0; i < 7; i++) burst(out, t + i * 0.052, 0.014, 0.1, 'bandpass', 2200, 2)
  },
}

export type SoundName = keyof typeof SOUNDS
