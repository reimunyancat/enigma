import { writable, get } from "svelte/store";
import * as engine from "./engine";
import * as sound from "./sound";
import { msg } from "./i18n";
import type { EnigmaConfig, Trace } from "./engine";

export const defaultConfig: EnigmaConfig = {
  rotors: ["I", "II", "III"],
  reflector: "B",
  rings: "TOU",
  positions: "HOU",
  plugs: "ABCDXZ",
};

export const config = writable<EnigmaConfig>({ ...defaultConfig });
export const ready = writable(false);
export const busy = writable(false);
export const rotorPos = writable("HOU");
export const lastTrace = writable<(Trace & { seq: number }) | null>(null);
export const lamp = writable<string | null>(null);
export const lastKey = writable<string | null>(null);
export const input = writable("");
export const output = writable("");
export const error = writable("");
export const xray = writable(false);
export const lid = writable(true);
export const rotorLid = writable(true);
export const rotLock = writable(false);
export const viewPreset = writable<{ name: string } | null>(null);
export const group5 = writable(false);
export const guideOpen = writable(true);
export const crackOpen = writable(false);

export type Quality = "auto" | "high" | "low";

function loadQuality(): Quality {
  try {
    const s = localStorage.getItem("enigma-quality");
    if (s === "auto" || s === "high" || s === "low") return s;
  } catch {}
  return "auto";
}

export const quality = writable<Quality>(loadQuality());
quality.subscribe((v) => {
  try {
    localStorage.setItem("enigma-quality", v);
  } catch {}
});

let seq = 0;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function boot(): Promise<void> {
  await engine.loadEngine();
  apply();
  ready.set(true);
}

export function apply(): boolean {
  const cfg = get(config);
  const plugs = cfg.plugs.toUpperCase().replace(/[^A-Z]/g, "");
  const ok = engine.configure({ ...cfg, plugs });
  if (!ok) {
    error.set(msg("errorConfig"));
    return false;
  }
  error.set("");
  rotorPos.set(engine.positions());
  input.set("");
  output.set("");
  lamp.set(null);
  lastTrace.set(null);
  return true;
}

export function patch(part: Partial<EnigmaConfig>): void {
  config.update((c) => ({ ...c, ...part }));
  apply();
}

export function clearText(): void {
  input.set("");
  output.set("");
}

export async function press(ch: string): Promise<void> {
  const letter = ch.toUpperCase();
  if (get(busy) || letter < "A" || letter > "Z") return;
  busy.set(true);
  sound.key();
  lastKey.set(letter);
  lamp.set(null);
  const t = engine.trace(letter);
  if (t) {
    sound.rotor();
    lastTrace.set({ ...t, seq: ++seq });
    rotorPos.set(engine.positions());
    await wait(110);
    lamp.set(t.output);
    sound.lamp();
    input.update((s) => s + letter);
    output.update((s) => s + t.output);
  }
  await wait(80);
  lastKey.set(null);
  busy.set(false);
}
