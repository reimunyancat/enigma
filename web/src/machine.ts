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
export const crackSeed = writable<{
  cipher: string;
  crib?: string;
  auto?: boolean;
} | null>(null);
export const challengesOpen = writable(false);
export const demoRunning = writable(false);

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
  if (!bootFromHash()) apply();
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

export function feedText(text: string): void {
  const clean = text.toUpperCase().replace(/[^A-Z]/g, "");
  if (!clean) return;
  let out = "";
  for (const ch of clean) out += engine.pressLetter(ch);
  rotorPos.set(engine.positions());
  input.set(clean);
  output.set(out);
}

export function bootFromHash(): boolean {
  try {
    const raw = decodeURIComponent(location.hash.slice(1));
    if (!raw) return false;
    const parts = raw.split(":");
    if (parts.length < 4) return false;
    const rf = parts[0].toUpperCase().split(".");
    if (rf.length !== 4) return false;
    const rotors = rf.slice(0, 3);
    const ROTOR_NAMES = ["I", "II", "III", "IV", "V"];
    if (!rotors.every((r) => ROTOR_NAMES.includes(r))) return false;
    if (new Set(rotors).size !== 3) return false;
    const reflector = rf[3];
    if (!["A", "B", "C"].includes(reflector)) return false;
    const rings = parts[1].toUpperCase().replace(/[^A-Z]/g, "");
    const positions = parts[2].toUpperCase().replace(/[^A-Z]/g, "");
    if (rings.length !== 3 || positions.length !== 3) return false;
    const plugs = parts[3].toUpperCase().replace(/[^A-Z]/g, "");
    const cfg = {
      rotors: rotors as EnigmaConfig["rotors"],
      reflector: reflector as EnigmaConfig["reflector"],
      rings,
      positions,
      plugs,
    };
    if (!engine.configure(cfg)) return false;
    config.set(cfg);
    rotorPos.set(engine.positions());
    const text = (parts[4] || "").toUpperCase().replace(/[^A-Z]/g, "");
    if (text) feedText(text);
    else {
      input.set("");
      output.set("");
    }
    guideOpen.set(false);
    return true;
  } catch {
    return false;
  }
}

export function shareUrl(): string {
  const c = get(config);
  const cipher = get(output);
  const head = `${c.rotors.join(".")}.${c.reflector}:${c.rings}:${c.positions}:${c.plugs}`;
  const hash = cipher ? `${head}:${cipher}` : head;
  return `${location.origin}${location.pathname}#${hash}`;
}

export function stopDemo(): void {
  demoRunning.set(false);
}

export async function runDemo(): Promise<void> {
  if (get(demoRunning)) return;
  demoRunning.set(true);
  guideOpen.set(false);
  patch({ ...defaultConfig });
  const text = "WETTERVORHERSAGE";
  for (let i = 0; i < text.length; i++) {
    if (!get(demoRunning)) break;
    if (i === 3) xray.set(true);
    if (i === 9) xray.set(false);
    await press(text[i]);
    await wait(160);
  }
  xray.set(false);
  if (get(demoRunning)) {
    crackSeed.set({ cipher: get(output), crib: "WETTER", auto: true });
    crackOpen.set(true);
  }
  demoRunning.set(false);
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
