<script lang="ts">
  import { onMount } from "svelte";
  import {
    boot,
    press,
    ready,
    input,
    output,
    error,
    xray,
    lid,
    rotorLid,
    rotLock,
    viewPreset,
    quality,
    group5,
    guideOpen,
    crackOpen,
    clearText,
    shareUrl,
    challengesOpen,
    demoRunning,
    runDemo,
    stopDemo,
  } from "./machine";
  import { t, lang } from "./i18n";
  import type { Quality } from "./machine";
  import Config from "./lib/Config.svelte";
  import Machine3D from "./lib/Machine3D.svelte";
  import Guide from "./lib/Guide.svelte";
  import Challenge from "./lib/Challenge.svelte";
  import Crack from "./lib/Crack.svelte";

  onMount(boot);

  function onKey(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const el = e.target as HTMLElement | null;
    if (
      el &&
      (el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" ||
        el.isContentEditable)
    )
      return;
    if (/^[a-zA-Z]$/.test(e.key)) press(e.key);
  }

  const fmt = (s: string, g5: boolean) =>
    g5 ? s.replace(/(.{5})/g, "$1 ").trim() : s;

  let copied = false;
  async function copyOut() {
    try {
      await navigator.clipboard.writeText(fmt($output, $group5));
      copied = true;
      setTimeout(() => (copied = false), 1200);
    } catch {}
  }
  let shared = false;
  async function shareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      shared = true;
      setTimeout(() => (shared = false), 1200);
    } catch {}
  }
</script>

<svelte:window on:keydown={onKey} />

{#if !$ready}
  <p class="loading">{$t.loading}</p>
{:else}
  <header class="top">
    <span class="brand">ENIGMA I</span>
    <div class="actions">
      <button
        class:on={$demoRunning}
        on:click={() => ($demoRunning ? stopDemo() : runDemo())}
        >{$demoRunning ? $t.demoCancel : $t.tryMe}</button
      >
      <button class:on={$guideOpen} on:click={() => guideOpen.update((v) => !v)}
        >{$t.guide}</button
      >
      <button class:on={$crackOpen} on:click={() => crackOpen.update((v) => !v)}
        >{$t.crack}</button
      >
      <button
        class:on={$challengesOpen}
        on:click={() => challengesOpen.update((v) => !v)}
        >{$t.challenges}</button
      >
      <select
        value={$quality}
        on:change={(e) => quality.set(e.currentTarget.value as Quality)}
        title={$t.quality}
      >
        <option value="auto">{$t.quality} · {$t.qAuto}</option>
        <option value="high">{$t.quality} · {$t.qHigh}</option>
        <option value="low">{$t.quality} · {$t.qLow}</option>
      </select>
      <button on:click={() => lang.update((v) => (v === "en" ? "ko" : "en"))}>
        {$lang === "en" ? "한국어" : "EN"}
      </button>
      <button on:click={shareLink}>{shared ? $t.copied : $t.share}</button>
    </div>
  </header>
  <Guide />
  <div class="bar"><Config /></div>
  {#if $error}<p class="err">{$error}</p>{/if}
  <div class="stage">
    <Machine3D />
    <div class="tools">
      <button class:on={$xray} on:click={() => xray.update((v) => !v)}
        >{$t.xray}</button
      >
      <button class:on={$lid} on:click={() => lid.update((v) => !v)}
        >{$t.lid}</button
      >
      <button class:on={$rotorLid} on:click={() => rotorLid.update((v) => !v)}
        >{$t.rotorCover}</button
      >
      <button class:on={$rotLock} on:click={() => rotLock.update((v) => !v)}>
        {$rotLock ? $t.unlockView : $t.lockView}
      </button>
    </div>
    <div class="views">
      <button on:click={() => viewPreset.set({ name: "overview" })}
        >{$t.viewOverview}</button
      >
      <button on:click={() => viewPreset.set({ name: "keys" })}
        >{$t.viewKeys}</button
      >
      <button on:click={() => viewPreset.set({ name: "plugboard" })}
        >{$t.viewPlugboard}</button
      >
      <button on:click={() => viewPreset.set({ name: "rotors" })}
        >{$t.viewRotors}</button
      >
    </div>
  </div>
  <div class="io">
    <div>
      <span class="lbl">{$t.input}</span><span class="val"
        >{fmt($input, $group5)}</span
      >
    </div>
    <div>
      <span class="lbl">{$t.output}</span><span class="val cipher"
        >{fmt($output, $group5)}</span
      >
    </div>
    <div class="iobtns">
      <button on:click={copyOut}>{copied ? $t.copied : $t.copy}</button>
      <button on:click={clearText}>{$t.clear}</button>
      <button class:on={$group5} on:click={() => group5.update((v) => !v)}
        >{$t.group5}</button
      >
    </div>
  </div>
  <Challenge />
  <Crack />
{/if}

<style>
  .top {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .brand {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 5px;
    color: var(--brass);
  }
  .actions {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
  }
  .actions button,
  .actions select {
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
  }
  .actions select {
    appearance: none;
  }
  button:hover,
  .actions select:hover {
    border-color: #c9a24b;
    color: #ffe169;
  }
  button.on {
    color: #14110d;
    background: #ffcf4d;
    border-color: #ffcf4d;
  }
  .bar {
    width: 100%;
    display: flex;
    justify-content: center;
  }
  .stage {
    position: relative;
    width: 100%;
    flex: 1;
    min-height: 460px;
    display: flex;
  }
  .tools {
    position: absolute;
    top: 12px;
    right: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    z-index: 3;
  }
  .tools button,
  .views button {
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
  }
  .views {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
    z-index: 3;
  }
  .io {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 380px;
    max-width: 100%;
    margin: 4px auto 0;
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
  .iobtns {
    display: flex;
    gap: 6px;
    margin-top: 2px;
  }
  .iobtns button {
    padding: 6px 11px;
    font:
      600 11px/1 ui-monospace,
      monospace;
    letter-spacing: 0.5px;
    color: #d8c49a;
    background: rgba(20, 17, 13, 0.72);
    border: 1px solid #6b5a2a;
    border-radius: 7px;
    cursor: pointer;
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
</style>
