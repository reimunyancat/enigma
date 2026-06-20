<script lang="ts">
  import { onMount } from "svelte";
  import { boot, press, ready, input, output, error, xray } from "./machine";
  import Config from "./lib/Config.svelte";
  import Machine3D from "./lib/Machine3D.svelte";

  onMount(boot);

  function onKey(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[a-zA-Z]$/.test(e.key)) press(e.key);
  }
</script>

<svelte:window on:keydown={onKey} />

{#if !$ready}
  <p class="loading">엔진 불러오는 중…</p>
{:else}
  <div class="bar"><Config /></div>
  {#if $error}<p class="err">{$error}</p>{/if}
  <div class="stage">
    <Machine3D />
    <button
      class="xray"
      class:on={$xray}
      on:click={() => xray.update((v) => !v)}
    >
      {$xray ? "■ X-ray" : "◉ X-ray"}
    </button>
  </div>
  <div class="io">
    <div><span class="lbl">입력</span><span class="val">{$input}</span></div>
    <div>
      <span class="lbl">출력</span><span class="val cipher">{$output}</span>
    </div>
  </div>
{/if}

<style>
  .bar {
    width: 100%;
    display: flex;
    justify-content: center;
  }
  .io {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 360px;
    margin: 14px auto 0;
    font-family: ui-monospace, monospace;
  }
  .io > div {
    display: flex;
    align-items: baseline;
  }
  .lbl {
    width: 36px;
    flex: none;
    font-size: 11px;
    opacity: 0.6;
    letter-spacing: 1px;
  }
  .val {
    letter-spacing: 3px;
    word-break: break-all;
    font-size: 15px;
    text-align: left;
  }
  .cipher {
    color: var(--brass);
  }
  .loading {
    text-align: center;
    opacity: 0.7;
  }
  .err {
    color: #ff8a7a;
    font-size: 13px;
    text-align: center;
  }
  .stage {
    position: relative;
    width: 100%;
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .xray {
    position: absolute;
    top: 12px;
    right: 12px;
    padding: 7px 12px;
    font:
      600 12px/1 ui-monospace,
      monospace;
    letter-spacing: 0.5px;
    color: #d8c49a;
    background: rgba(20, 17, 13, 0.72);
    border: 1px solid #6b5a2a;
    border-radius: 7px;
    cursor: pointer;
    backdrop-filter: blur(4px);
    transition: all 0.15s;
  }
  .xray:hover {
    border-color: #c9a24b;
    color: #ffe169;
  }
  .xray.on {
    color: #14110d;
    background: #ffcf4d;
    border-color: #ffcf4d;
  }
</style>
