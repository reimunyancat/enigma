let ctx: AudioContext | null = null

function ac(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  if (ctx.state === "suspended") void ctx.resume()
  return ctx
}

// 짧은 톤 하나를 감쇠 엔벨로프로 울린다.
function blip(freq: number, dur: number, type: OscillatorType, gain: number): void {
  const c = ac()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(gain, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
  o.connect(g).connect(c.destination)
  o.start()
  o.stop(c.currentTime + dur)
}

export function key(): void {
  blip(190, 0.07, "square", 0.07)
  blip(90, 0.10, "sawtooth", 0.05)
}

export function rotor(): void {
  blip(1300, 0.025, "square", 0.04)
}

export function lamp(): void {
  blip(680, 0.45, "sine", 0.045)
}
