<script lang="ts">
  import { onMount } from "svelte"
  import { boot, press, ready, error, input, output } from "./machine"
  import Config from "./lib/Config.svelte"
  import Rotors from "./lib/Rotors.svelte"
  import Wiring from "./lib/Wiring.svelte"
  import Plugboard from "./lib/Plugboard.svelte"
  import Lampboard from "./lib/Lampboard.svelte"
  import Keyboard from "./lib/Keyboard.svelte"

  onMount(boot)

  function onKey(e: KeyboardEvent) {
    if (/^[a-zA-Z]$/.test(e.key)) press(e.key)
  }
</script>

<svelte:window on:keydown={onKey} />

{#if $error}
  <div class="err">{$error}</div>
{/if}

<div class="machine" class:loading={!$ready}>
  <div class="titlebar">
    <span class="rivet" /><span class="plate">ENIGMA</span><span class="rivet" />
  </div>

  <Config />
  <Rotors />
  <Wiring />
  <Plugboard />
  <Lampboard />
  <Keyboard />
</div>

<div class="io">
  <div><span class="lbl">IN</span><code>{$input || "—"}</code></div>
  <div><span class="lbl">OUT</span><code>{$output || "—"}</code></div>
</div>

<p class="hint">키보드를 직접 눌러도 됩니다. 로터 드럼은 위아래로 드래그, 플러그는 잭끼리 드래그해서 연결하세요.</p>

<style>
  .machine {
    background: linear-gradient(160deg, var(--wood3), var(--wood1));
    border: 2px solid #1a0f08;
    border-radius: 14px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }
  .machine.loading { opacity: 0.5; pointer-events: none; }
  .titlebar { display: flex; align-items: center; justify-content: center; gap: 14px; }
  .plate {
    letter-spacing: 0.5em;
    font-weight: 800;
    color: var(--brass);
    padding: 4px 18px;
    border: 1px solid var(--brass);
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.25);
  }
  .rivet { width: 10px; height: 10px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #e7d28a, #7c5e1f); }
  .io { display: flex; gap: 24px; justify-content: center; font-size: 18px; }
  .io .lbl { color: var(--brass); margin-right: 8px; font-weight: 700; }
  .io code { letter-spacing: 0.25em; }
  .err { background: #5c1d1d; color: #ffd7d7; padding: 10px 14px; border-radius: 8px; }
  .hint { text-align: center; opacity: 0.6; font-size: 13px; }
</style>