<script lang="ts">
  import { onMount } from "svelte"
  import { boot, press, ready, input, output, error } from "./machine"
  import Config     from "./lib/Config.svelte"
  import Machine3D  from "./lib/Machine3D.svelte"

  onMount(boot)

  function onKey(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (/^[a-zA-Z]$/.test(e.key)) press(e.key)
  }
</script>

<svelte:window on:keydown={onKey} />

{#if !$ready}
  <p class="loading">엔진 불러오는 중…</p>
{:else}
  <div class="bar"><Config /></div>
  {#if $error}<p class="err">{$error}</p>{/if}
  <Machine3D />
  <div class="io">
    <div><span class="lbl">입력</span><span class="val">{$input}</span></div>
    <div><span class="lbl">출력</span><span class="val cipher">{$output}</span></div>
  </div>
{/if}

<style>
  .bar { width: 100%; display: flex; justify-content: center; }
  .io {
    display: flex; gap: 30px; justify-content: center;
    font-family: ui-monospace, monospace;
  }
  .lbl { font-size: 11px; opacity: .6; letter-spacing: 1px; margin-right: 8px; }
  .val { letter-spacing: 3px; word-break: break-all; font-size: 15px; }
  .cipher { color: var(--brass); }
  .loading { text-align: center; opacity: .7; }
  .err { color: #ff8a7a; font-size: 13px; text-align: center; }
</style>
