# Enigma

브라우저에서 돌아가는 3D 인터랙티브 에니그마 암호기 시뮬레이터. C++로 짠 암호 엔진 한 벌을 CLI와 웹(WebAssembly)이 함께 공유한다.

## 구성

- `enigma.hpp` — 암호 엔진(로터·리플렉터·플러그보드). CLI와 WASM이 공유하는 단일 소스.
- `main.cpp` — CLI 진입점.
- `wasm.cpp` — Emscripten으로 엔진을 브라우저에 노출(`enigma_init` / `enigma_press` / `enigma_positions` / `enigma_trace`).
- `web/` — Vite + Svelte + TypeScript + Three.js 프론트엔드. 3D 기체, X-ray 배선 뷰, 드래그식 플러그보드, 합성 사운드.

## 실행

### CLI

```sh
g++ -std=c++17 -O2 main.cpp -o enigma
./enigma
```

### 웹 (3D 데모)

```sh
cd web
npm install
npm run dev      # 개발 서버
npm run build    # 정적 빌드
```

WASM 모듈(`web/src/enigma.mjs`)은 이미 빌드돼 포함돼 있으므로, 웹을 실행만 할 때는 Emscripten이 필요 없다. 엔진을 고쳐 다시 빌드할 때만 Emscripten으로 `wasm.cpp`를 컴파일하면 된다.

## 검증

표준 테스트 벡터로 엔진 동작을 확인할 수 있다.

- 로터 I·II·III / 리플렉터 B / 링 `TOU` / 위치 `HOU` / 플러그 `ABCDXZ`
- 입력 `TOUHOU` → 출력 `MQGGFI`, 로터 종료 위치 `HPA`
