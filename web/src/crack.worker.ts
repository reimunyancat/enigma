import * as engine from "./engine";
import { runCrack, runCrib } from "./crack";
import type { CrackBase, Candidate, CribHit } from "./crack";
import type { EnigmaConfig } from "./engine";

type ResultMsg =
  | { type: "progress"; done: number; total: number }
  | { type: "result"; results: Candidate[] | CribHit[] }
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
  e: MessageEvent<{
    cipher: string;
    crib?: string;
    offset?: number | null;
    base: CrackBase;
    fullScope: boolean;
  }>,
) => {
  try {
    await engine.loadEngine();
    const progress = (done: number, total: number) =>
      post({ type: "progress", done, total });
    const results = e.data.crib
      ? await runCrib(
          crackEngine,
          e.data.cipher,
          e.data.crib,
          e.data.base,
          e.data.fullScope,
          e.data.offset ?? null,
          progress,
        )
      : await runCrack(
          crackEngine,
          e.data.cipher,
          e.data.base,
          e.data.fullScope,
          progress,
        );
    post({ type: "result", results });
  } catch (err) {
    post({ type: "error", error: String(err) });
  }
};
