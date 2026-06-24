# Enigma

A 3D interactive Enigma cipher machine simulator that runs in the browser. A single C++ cipher engine is shared by both the CLI and the web (WebAssembly) front end.

## Structure

- `enigma.hpp` — the cipher engine (rotors, reflector, plugboard). Single source of truth shared by the CLI and WASM.
- `main.cpp` — CLI entry point.
- `wasm.cpp` — exposes the engine to the browser via Emscripten (`enigma_init` / `enigma_press` / `enigma_positions` / `enigma_trace`).
- `web/` — Vite + Svelte + TypeScript + Three.js front end: 3D machine, X-ray wiring view, drag-and-drop plugboard, synthesized sound.

## Running

### CLI

```sh
g++ -std=c++17 -O2 main.cpp -o enigma
./enigma
```

### Web (3D demo)

```sh
cd web
npm install
npm run dev      # dev server
npm run build    # static build
```

The WASM module (`web/src/enigma.mjs`) is prebuilt and committed, so Emscripten is not required just to run the web app. You only need Emscripten to recompile `wasm.cpp` after changing the engine.

## Verification

You can check the engine against a standard test vector:

- Rotors I·II·III / Reflector B / Rings `TOU` / Positions `HOU` / Plugs `ABCDXZ`
- Input `TOUHOU` → output `MQGGFI`, final rotor positions `HPA`
