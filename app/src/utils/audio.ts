let ctx: AudioContext | null = null

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function playTick(speed: number) {
  try {
    const c = ac()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    // Pitch drops as wheel slows: 900hz fast → 300hz slow
    osc.frequency.value = 300 + speed * 600
    osc.type = 'triangle'
    const vol = 0.04 + speed * 0.09
    gain.gain.setValueAtTime(vol, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.03)
    osc.start(c.currentTime)
    osc.stop(c.currentTime + 0.03)
  } catch { /* AudioContext blocked */ }
}

export function playWin() {
  try {
    const c = ac()
    // Triumphant ascending arpeggio: C5–E5–G5–C6
    const notes = [523.25, 659.25, 783.99, 1046.50]
    notes.forEach((freq, i) => {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.connect(gain)
      gain.connect(c.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = c.currentTime + i * 0.13
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.22, t + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
      osc.start(t)
      osc.stop(t + 0.6)
    })
  } catch {}
}

export function playNoWin() {
  try {
    const c = ac()
    // Sympathetic descending: G4–E4–C4
    const notes = [392, 330.63, 261.63]
    notes.forEach((freq, i) => {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.connect(gain)
      gain.connect(c.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = c.currentTime + i * 0.18
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.14, t + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
      osc.start(t)
      osc.stop(t + 0.5)
    })
  } catch {}
}
