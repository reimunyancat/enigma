import createEnigma from "./enigma.mjs";

export type Rotor = "I" | "II" | "III" | "IV" | "V";
export type Reflector = "A" | "B" | "C";

export interface EnigmaConfig {
  rotors: [Rotor, Rotor, Rotor];
  reflector: Reflector;
  rings: string;
  positions: string;
  plugs: string;
}

export interface Trace {
  path: number[];
  output: string;
}

type WasmModule = {
  cwrap: (n: string, r: string | null, a: string[]) => (...x: any[]) => any;
};

let mod: WasmModule | null = null;
let _init: (r: string, rf: string, ri: string, p: string, pl: string) => number;
let _trace: (c: number) => string;
let _positions: () => string;

export async function loadEngine(): Promise<void> {
  if (mod) return;
  mod = (await createEnigma()) as WasmModule;
  _init = mod!.cwrap("enigma_init", "number", [
    "string",
    "string",
    "string",
    "string",
    "string",
  ]);
  _trace = mod!.cwrap("enigma_trace", "string", ["number"]);
  _positions = mod!.cwrap("enigma_positions", "string", []);
}

export function configure(cfg: EnigmaConfig): boolean {
  return (
    _init(
      cfg.rotors.join(" "),
      cfg.reflector,
      cfg.rings,
      cfg.positions,
      cfg.plugs,
    ) === 1
  );
}

export function trace(letter: string): Trace | null {
  const raw = _trace(letter.charCodeAt(0));
  if (!raw) return null;
  const path = raw.split(",").map(Number);
  return { path, output: String.fromCharCode(65 + path[path.length - 1]) };
}

export function positions(): string {
  return _positions();
}
