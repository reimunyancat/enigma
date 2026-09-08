export interface CrackEngine {
  configure(cfg: {
    rotors: string[];
    reflector: string;
    rings: string;
    positions: string;
    plugs: string;
  }): boolean;
  pressLetter(letter: string): string;
}

export interface CrackBase {
  rotors: string[];
  reflector: string;
  rings: string;
  plugs: string;
}

export interface Candidate {
  rotors: string[];
  reflector: string;
  positions: string;
  score: number;
  preview: string;
}

const ENGLISH_FREQ = [
  8.17, 1.49, 2.78, 4.25, 12.7, 2.23, 2.02, 6.09, 6.97, 0.15, 0.77, 4.03, 2.41,
  6.75, 7.51, 1.93, 0.1, 5.99, 6.33, 9.06, 2.76, 0.98, 2.36, 0.15, 1.97, 0.07,
];

const GERMAN_FREQ = [
  6.5, 1.9, 3.0, 5.1, 16.4, 1.7, 3.0, 4.8, 7.6, 0.27, 1.4, 3.4, 2.5, 9.8, 2.5,
  0.8, 0.02, 7.0, 7.3, 6.2, 4.2, 0.7, 1.9, 0.03, 0.04, 1.1,
];

export function scoreText(text: string): number {
  const n = text.length;
  if (n < 2) return 0;
  const counts = new Array<number>(26).fill(0);
  for (let i = 0; i < n; i++) counts[text.charCodeAt(i) - 65]++;
  let sum = 0;
  for (const c of counts) sum += c * (c - 1);
  const ioc = sum / (n * (n - 1));
  let chi2 = Infinity;
  for (const freq of [ENGLISH_FREQ, GERMAN_FREQ]) {
    let x = 0;
    for (let i = 0; i < 26; i++) {
      const e = (freq[i] / 100) * n;
      const d = counts[i] - e;
      x += (d * d) / e;
    }
    if (x < chi2) chi2 = x;
  }
  return ioc - 0.012 * Math.min(chi2 / n, 3);
}

const ROTOR_NAMES = ["I", "II", "III", "IV", "V"];
const REFLECTOR_NAMES = ["A", "B", "C"];

function rotorOrders(): string[][] {
  const out: string[][] = [];
  for (const a of ROTOR_NAMES)
    for (const b of ROTOR_NAMES)
      for (const c of ROTOR_NAMES)
        if (a !== b && b !== c && a !== c) out.push([a, b, c]);
  return out;
}

const posLetters = (i: number): string =>
  String.fromCharCode(
    65 + Math.floor(i / 676),
    65 + (Math.floor(i / 26) % 26),
    65 + (i % 26),
  );

export async function runCrack(
  engine: CrackEngine,
  cipherRaw: string,
  base: CrackBase,
  fullScope: boolean,
  onProgress?: (done: number, total: number) => void,
): Promise<Candidate[]> {
  const cipher = cipherRaw.toUpperCase().replace(/[^A-Z]/g, "");
  const sample = cipher.slice(0, fullScope ? 64 : 120);
  const orders = fullScope ? rotorOrders() : [base.rotors];
  const reflectors = fullScope ? REFLECTOR_NAMES : [base.reflector];
  const total = orders.length * reflectors.length * 17576;
  let done = 0;
  const top: Candidate[] = [];
  const consider = (cand: Candidate) => {
    if (top.length >= 8 && cand.score <= top[top.length - 1].score) return;
    top.push(cand);
    top.sort((a, b) => b.score - a.score);
    if (top.length > 8) top.pop();
  };
  let sinceYield = 0;
  for (const rotors of orders) {
    for (const reflector of reflectors) {
      for (let p = 0; p < 17576; p++) {
        const positions = posLetters(p);
        engine.configure({
          rotors,
          reflector,
          rings: base.rings,
          positions,
          plugs: base.plugs,
        });
        let out = "";
        for (const ch of sample) out += engine.pressLetter(ch);
        consider({
          rotors,
          reflector,
          positions,
          score: scoreText(out),
          preview: "",
        });
        done++;
        if (++sinceYield >= 4394) {
          sinceYield = 0;
          onProgress?.(done, total);
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    }
  }
  for (const c of top) {
    engine.configure({
      rotors: c.rotors,
      reflector: c.reflector,
      rings: base.rings,
      positions: c.positions,
      plugs: base.plugs,
    });
    let out = "";
    for (const ch of cipher) out += engine.pressLetter(ch);
    c.score = scoreText(out);
    c.preview = out.slice(0, 140);
  }
  top.sort((a, b) => b.score - a.score);
  onProgress?.(total, total);
  return top.slice(0, 5);
}

export interface CribHit {
  rotors: string[];
  reflector: string;
  positions: string;
  matches: number;
  offset: number;
  preview: string;
}

export async function runCrib(
  engine: CrackEngine,
  cipherRaw: string,
  cribRaw: string,
  base: CrackBase,
  fullScope: boolean,
  fixedOffset: number | null,
  onProgress?: (done: number, total: number) => void,
): Promise<CribHit[]> {
  const cipher = cipherRaw.toUpperCase().replace(/[^A-Z]/g, "");
  const crib = cribRaw.toUpperCase().replace(/[^A-Z]/g, "");
  const L = crib.length;
  if (L < 3 || cipher.length < L) return [];
  const offsets: number[] = [];
  if (
    fixedOffset !== null &&
    fixedOffset >= 0 &&
    fixedOffset + L <= cipher.length
  ) {
    offsets.push(fixedOffset);
  } else {
    for (let o = 0; o + L <= cipher.length; o++) {
      let ok = true;
      for (let i = 0; i < L; i++)
        if (crib[i] === cipher[o + i]) {
          ok = false;
          break;
        }
      if (ok) offsets.push(o);
    }
  }
  if (offsets.length === 0) return [];
  const orders = fullScope ? rotorOrders() : [base.rotors];
  const reflectors = fullScope ? REFLECTOR_NAMES : [base.reflector];
  const total = orders.length * reflectors.length * 17576;
  let done = 0;
  const hits: CribHit[] = [];
  let sinceYield = 0;
  for (const rotors of orders) {
    for (const reflector of reflectors) {
      for (let p = 0; p < 17576; p++) {
        engine.configure({
          rotors,
          reflector,
          rings: base.rings,
          positions: posLetters(p),
          plugs: base.plugs,
        });
        let out = "";
        for (const ch of cipher) out += engine.pressLetter(ch);
        for (const o of offsets) {
          let matches = 0;
          for (let i = 0; i < L; i++) if (out[o + i] === crib[i]) matches++;
          if (matches >= Math.max(3, Math.ceil(L * 0.6))) {
            hits.push({
              rotors,
              reflector,
              positions: posLetters(p),
              matches,
              offset: o,
              preview: out.slice(Math.max(0, o - 8), o + L + 8),
            });
          }
        }
        done++;
        if (++sinceYield >= 2197) {
          sinceYield = 0;
          onProgress?.(done, total);
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    }
  }
  hits.sort((a, b) => b.matches - a.matches);
  onProgress?.(total, total);
  return hits.slice(0, 5);
}
