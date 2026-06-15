<script lang="ts">
  import { fly } from "svelte/transition"
  import { config, rotorPos, patch } from "../machine"

  const L = (code: number) => String.fromCharCode(65 + ((code % 26) + 26) % 26)
  const flyIn = { y: -20, duration: 200 }

  $: shown = $rotorPos.padEnd(3, "A").slice(0, 3).split("")

  let drag: { i: number; startY: number; startCode: number } | null = null
  const STEP_PX = 22

  function down(e: PointerEvent, i: number) {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    drag = { i, startY: e.clientY, startCode: $config.positions.charCodeAt(i) - 65 }
  }
  function move(e: PointerEvent) {
    if (!drag) return
    const steps = Math.round((e.clientY - drag.startY) / STEP_PX)
    const next = ((drag.startCode + steps) % 26 + 26) % 26
    const p = [...$config.positions]
    p[drag.i] = String.fromCharCode(65 + next)
    patch({ positions: p.join("") })
  }
  function up() { drag = null }
</script>

<div class="drums" on:pointermove={move} on:pointerup={up} on:pointerleave={up}>
  {#each shown as ch, i}
    <div class="drum" on:pointerdown={(e) => down(e, i)}>
      <span class="ghost">{L(ch.charCodeAt(0) - 65 - 1)}</span>
      {#key ch}
        <span class="cur" in:fly={flyIn}>{ch}</span>
      {/key}
      <span class="ghost">{L(ch.charCodeAt(0) - 65 + 1)}</span>
    </div>
  {/each}
</div>

<style>
  .drums { display: flex; gap: 14px; justify-content: center; }
  .drum {
    width: 64px; height: 108px; border-radius: 8px;
    background: linear-gradient(90deg, #16130d, #2c2620 18%, #4a4036 50%, #2c2620 82%, #16130d);
    border: 1px solid #000; display: flex; flex-direction: column; align-items: center;
    justify-content: center; cursor: ns-resize; user-select: none;
    box-shadow: inset 0 0 16px rgba(0, 0, 0, 0.7);
  }
  .cur { font-size: 30px; font-weight: 800; color: var(--brass); }
  .ghost { font-size: 16px; color: rgba(243, 233, 210, 0.25); }
</style>