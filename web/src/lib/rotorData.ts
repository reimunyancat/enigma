export const ROTOR_WIRINGS: Record<string, string> = {
  I: "EKMFLGDQVZNTOWYHXUSPAIBRCJ",
  II: "AJDKSIRUXBLHWTMCQGZNPYFVOE",
  III: "BDFHJLCPRTXVZNYEIWGAKMUSQO",
  IV: "ESOVPZJAYQUIRHXLNFTGKDCMWB",
  V: "VZBRGITYUPSDNHLXAWMJQOFECK",
};

export const REFLECTOR_WIRINGS: Record<string, string> = {
  A: "EJMZALYXVBWFCRQUONTSPIKHGD",
  B: "YRUHQSLDPXNGOKMIEBFZCWVJAT",
  C: "FVPJIAOYEDRZXWGCTKUQSBNMHL",
};

const code = (c: string) => c.charCodeAt(0) - 65;
const mod = (n: number) => ((n % 26) + 26) % 26;

export function rotorForwardPerm(
  wiring: string,
  posChar: string,
  ringChar: string,
): number[] {
  const pos = code(posChar);
  const ring = code(ringChar);
  const fwd = [...wiring].map(code);
  const out: number[] = [];
  for (let c = 0; c < 26; c++) {
    const shifted = mod(c + pos - ring);
    out[c] = mod(fwd[shifted] - pos + ring);
  }
  return out;
}

export function reflectorPerm(wiring: string): number[] {
  return [...wiring].map(code);
}

export function plugPerm(plugs: string): number[] {
  const out = [...Array(26).keys()];
  const s = plugs.toUpperCase().replace(/[^A-Z]/g, "");
  for (let i = 0; i + 1 < s.length; i += 2) {
    const a = code(s[i]);
    const b = code(s[i + 1]);
    out[a] = b;
    out[b] = a;
  }
  return out;
}
