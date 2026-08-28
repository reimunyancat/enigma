import * as engine from "./engine";
import { runCrack } from "./crack";
import type { CrackBase, Candidate } from "./crack";
import type { EnigmaConfig } from "./engine";

type ResultMsg =
  | { type: "progress"; done: number; total: number }
  | { type: "result"; results: Candidate[] }
  | { type: "error"; error: string };

const post = (m: ResultMsg) => (globalThis as any).postMessage(m);

const crackEngine = {
  configure: (cfg: {
    rotors: string[];
    reflector: string;
    rings: string;
    positions: string;
    plugs: string;
  }) => engine.configure(cfg as unknown as EnigmaConfig),
  pressLetter: (letter: string) => engine.pressLetter(letter),
};

(globalThis as any).onmessage = async (
  e: MessageEvent<{ cipher: string; base: CrackBase; fullScope: boolean }>,
) => {
  try {
    await engine.loadEngine();
    const results = await runCrack(
      crackEngine,
      e.data.cipher,
      e.data.base,
      e.data.fullScope,
      (done, total) => post({ type: "progress", done, total }),
    );
    post({ type: "result", results });
  } catch (err) {
    post({ type: "error", error: String(err) });
  }
};
