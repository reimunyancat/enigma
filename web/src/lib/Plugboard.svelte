<script lang="ts">
  import { onMount } from "svelte"
  import { config, patch } from "../machine"

  const ROW1 = "ABCDEFGHIJKLM".split("")
  const ROW2 = "NOPQRSTUVWXYZ".split("")
  const jackEl: Record<string, HTMLElement> = {}
  let board: HTMLElement
  let mounted = false
  onMount(() => { mounted = true })

  $: pairs = $config.plugs.trim().split(/\s+/).filter((p) => p.length === 2)
  $: linked = new Set(pairs.flatMap((p) => [p[0], p[1]]))

  let dragFrom: string | null = null
  let ptr = { x: 0, y: 0 }

  function center(ch: string) {
    const r = jackEl[ch].getBoundingClientRect()
    const b = board.getBoundingClientRect()
    return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top }
  }
  function partnerOf(ch: string) {
    const p = pairs.find((q) => q.includes(ch))
    return p ? p.replace(ch, "") : null
  }
  function setPairs(ps: string[]) { patch({ plugs: ps.join(" ") }) }

  function down(e: PointerEvent, ch: string) {
    const partner = partnerOf(ch)
    if (partner) { setPairs(pairs.filter((q) => !q.includes(ch))); return }
    if (linked.has(ch)) return
    board.setPointerCapture(e.pointerId)
    dragFrom = ch
    move(e)
  }
  function move(e: PointerEvent) {
    if (!dragFrom) return
    const b = board.getBoundingClientRect()
    ptr = { x: e.clientX - b.left, y: e.clientY - b.top }
  }
  function upOn(ch: string) {
    if (dragFrom && dragFrom !== ch && !linked.has(ch)) {
      setPairs([...pairs, dragFrom + ch].slice(0, 13))
    }
    dragFrom = null
  }
  function cable(a: string, b: string) {
    const p = center(a), q = center(b)
    const my = Math.max(p.y, q.y) + 26
    return `M ${p.x} ${p.y} Q ${(p.x + q.x) / 2} ${my} ${q.x} ${q.y}`
  }
</script>

<div class="plug" bind:this={board} on:pointermove={move} on:pointerup={() => (dragFrom = null)}>
  <svg class="cables">
    {#if mounted}
      {#each pairs as p}
        <path class="cable" d={cable(p[0], p[1])} />
      {/each}
      {#if dragFrom}
        <path class="cable live" d={`M ${center(dragFrom).x} ${center(dragFrom).y} L ${ptr.x} ${ptr.y}`} />
      {/if}
    {/if}
  </svg>

  {#each [ROW1, ROW2] as row}
    <div class="row">
      {#each row as ch}
        <button class="jack" class:on={linked.has(ch)}
          bind:this={jackEl[ch]}
          on:pointerdown={(e) => down(e, ch)}
          on:pointerup={() => upOn(ch)}>
          <span>{ch}</span>
        </button>
      {/each}
    </div>
  {/each}
</div>

<style>
  .plug { position: relative; background: rgba(0,0,0,0.3); border: 1px solid #000; border-radius: 10px; padding: 14px; }
  .cables { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
  .cable { fill: none; stroke: var(--brass); stroke-width: 3.5; stroke-linecap: round; opacity: 0.85; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.6)); }
  .cable.live { stroke: var(--lamp-on); opacity: 0.7; }
  .row { display: flex; gap: 6px; justify-content: center; margin: 6px 0; }
  .jack {
    width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
    background: radial-gradient(circle at 38% 32%, #4a4036, #1c1814);
    border: 1px solid #000; color: var(--txt); font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .jack.on { box-shadow: 0 0 0 2px var(--brass), 0 0 8px var(--brass); color: var(--brass); }
</style>