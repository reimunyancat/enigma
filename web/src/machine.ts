import { writable, get } from "svelte/store";
import {
  loadEngine,
  configure,
  positions as enginePositions,
  trace as engineTrace,
  type EnigmaConfig,
  type Trace,
} from "./engine";

const defaultConfig: EnigmaConfig = {
  rotors: ["I", "II", "III"],
  reflector: "B",
  rings: "AAA",
  positions: "TOU",
  plugs: "AB CD XZ",
};

export const config = writable<EnigmaConfig>({ ...defaultConfig });
export const ready = writable(false);
export const busy = writable(false);
export const rotorPos = writable("TOU");
export const lastTrace = writable<Trace | null>(null);
export const seq = writable(0);
export const lamp = writable<string | null>(null);
export const input = writable("");
export const output = writable("");
export const error = writable<string | null>(null);

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function apply() {
  try {
    configure(get(config));
    rotorPos.set(enginePositions());
    lastTrace.set(null);
    lamp.set(null);
    input.set("");
    output.set("");
    error.set(null);
  } catch (e) {
    error.set(String(e));
  }
}

export async function boot() {
  try {
    await loadEngine();
    apply();
    ready.set(true);
  } catch (e) {
    error.set("엔진 로드 실패: " + String(e));
  }
}

export function patch(partial: Partial<EnigmaConfig>) {
  config.update((c) => ({ ...c, ...partial }));
  apply();
}

export async function press(ch: string) {
  if (!get(ready) || get(busy)) return;
  const letter = ch.toUpperCase();
  if (!/^[A-Z]$/.test(letter)) return;
  busy.set(true);
  try {
    const t = engineTrace(letter);
    lastTrace.set(t);
    seq.update((n) => n + 1);
    rotorPos.set(enginePositions());
    lamp.set(null);
    await wait(720);
    lamp.set(t.output);
    input.update((s) => s + letter);
    output.update((s) => s + t.output);
  } finally {
    busy.set(false);
  }
}
