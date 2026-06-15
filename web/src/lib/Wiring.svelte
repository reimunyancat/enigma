<script lang="ts">
  import { draw } from "svelte/transition"
  import { lastTrace, seq } from "../machine"

  const N = 26, TOP = 24, GAP = 16
  const y = (i: number) => TOP + i * GAP
  const drawOpts = { duration: 700 }
  const COLS = [60, 200, 340, 480, 620]
  const W = 680, H = TOP + (N - 1) * GAP + 24
  const XS = [40, 60, 200, 340, 480, 620, 480, 340, 200, 60]

  function buildPath(p: number[]): string {
    return p.map((idx, k) => `${k === 0 ? "M" : "L"} ${XS[k]} ${y(idx)}`).join(" ")
  }
</script>

<svg viewBox="0 0 {W} {H}" class="wiring">
  {#each COLS as cx}
    <line class="col" x1={cx} y1={TOP - 8} x2={cx} y2={H - 16} />
  {/each}
  {#each Array(N) as _, i}
    {#each XS as sx}
      <circle class="stud" cx={sx} cy={y(i)} r="2.4" />
    {/each}
    <text class="rail" x="12" y={y(i) + 4}>{String.fromCharCode(65 + i)}</text>
  {/each}

  {#if $lastTrace}
    {#key $seq}
      <path class="sig" fill="none" d={buildPath($lastTrace.path)} in:draw={drawOpts} />
      <circle class="src" cx={XS[0]} cy={y($lastTrace.path[0])} r="5" />
      <circle class="dst" cx={XS[9]} cy={y($lastTrace.path[9])} r="5" />
    {/key}
  {/if}
</svg>

<style>
  .wiring { width: 100%; background: rgba(0, 0, 0, 0.28); border-radius: 10px; border: 1px solid #000; }
  .col { stroke: rgba(255, 255, 255, 0.05); stroke-width: 1; }
  .stud { fill: var(--wire); opacity: 0.5; }
  .rail { fill: rgba(243, 233, 210, 0.5); font-size: 10px; font-family: monospace; }
  .sig { stroke: var(--wire-glow); stroke-width: 2.2; filter: drop-shadow(0 0 4px var(--wire-glow)); }
  .src { fill: var(--accent); filter: drop-shadow(0 0 5px var(--accent)); }
  .dst { fill: var(--lamp-on); filter: drop-shadow(0 0 6px var(--lamp-on)); }
</style>