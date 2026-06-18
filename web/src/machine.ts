import { writable, get } from "svelte/store"
import * as engine from "./engine"
import * as sound from "./sound"
import type { EnigmaConfig, Trace } from "./engine"

export const defaultConfig: EnigmaConfig = {
  rotors:    ["I", "II", "III"],
  reflector: "B",
  rings:     "TOU",
  positions: "HOU",
  plugs:     "ABCDXZ",
}

export const config     = writable<EnigmaConfig>({ ...defaultConfig })
export const ready      = writable(false)
export const busy       = writable(false)
export const rotorPos   = writable("HOU")
export const lastTrace  = writable<(Trace & { seq: number }) | null>(null)
export const lamp       = writable<string | null>(null)
export const lastKey    = writable<string | null>(null)
export const input      = writable("")
export const output     = writable("")
export const error      = writable("")
export const xray       = writable(false)

let seq = 0
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export async function boot(): Promise<void> {
  await engine.loadEngine()
  apply()
  ready.set(true)
}

// 설정을 엔진에 반영하고 입·출력·램프를 초기화한다.
export function apply(): boolean {
  const cfg = get(config)
  const plugs = cfg.plugs.toUpperCase().replace(/[^A-Z]/g, "")
  const ok = engine.configure({ ...cfg, plugs })
  if (!ok) { error.set("설정 오류 — 로터·플러그 값을 확인해 주세요"); return false }
  error.set("")
  rotorPos.set(engine.positions())
  input.set(""); output.set(""); lamp.set(null); lastTrace.set(null)
  return true
}

export function patch(part: Partial<EnigmaConfig>): void {
  config.update((c) => ({ ...c, ...part }))
  apply()
}

export async function press(ch: string): Promise<void> {
  const letter = ch.toUpperCase()
  if (get(busy) || letter < "A" || letter > "Z") return
  busy.set(true)
  sound.key()
  lastKey.set(letter)
  lamp.set(null)
  const t = engine.trace(letter)
  if (t) {
    sound.rotor()
    lastTrace.set({ ...t, seq: ++seq })
    rotorPos.set(engine.positions())
    await wait(110)
    lamp.set(t.output)
    sound.lamp()
    input.update((s) => s + letter)
    output.update((s) => s + t.output)
  }
  await wait(80)
  lastKey.set(null)
  busy.set(false)
}
