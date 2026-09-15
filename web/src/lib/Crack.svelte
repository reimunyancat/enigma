<script lang="ts">
  import { get } from "svelte/store";
  import { config, patch, crackOpen, crackSeed, output } from "../machine";
  import { t } from "../i18n";
  import type { Candidate, CribHit } from "../crack";
  import type { Reflector, Rotor } from "../engine";

  let cipher = "";
  let fullScope = false;
  let running = false;
  let done = 0;
  let total = 0;
  let results: (Candidate | CribHit)[] | null = null;
  let errorMsg = "";
  let worker: Worker | null = null;
  let cribMode = false;
  let crib = "";
  let cribOffset = "";

  crackSeed.subscribe((v) => {
    if (v) {
      cipher = v.cipher;
      if (v.crib) {
        crib = v.crib;
        cribMode = true;
      }
      crackSeed.set(null);
      if (v.auto) start();
    }
  });

  function start() {
    const clean = cipher.toUpperCase().replace(/[^A-Z]/g, "");
    let cribClean = "";
    let off: number | null = null;
    if (cribMode) {
      cribClean = crib.toUpperCase().replace(/[^A-Z]/g, "");
      if (cribClean.length < 3) {
        errorMsg = $t.crackCribTooShort;
        return;
      }
      if (clean.length < cribClean.length) {
        errorMsg = $t.crackTooShort;
        return;
      }
      if (cribOffset.trim() !== "") {
        const n = parseInt(cribOffset, 10);
        off = Number.isFinite(n) && n >= 0 ? n : null;
        if (off !== null && off + cribClean.length <= clean.length)
          for (let i = 0; i < cribClean.length; i++)
            if (cribClean[i] === clean[off + i]) {
              errorMsg = $t.crackCribImpossible;
              return;
            }
      } else if (clean.length < 30) {
        errorMsg = $t.crackTooShort;
        return;
      }
      errorMsg = "";
      results = null;
    }
    running = true;
    done = 0;
    total = 0;
    worker?.terminate();
    worker = new Worker(new URL("../crack.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === "progress") {
        done = m.done;
        total = m.total;
      } else if (m.type === "result") {
        results = m.results;
        running = false;
        worker?.terminate();
        worker = null;
      } else if (m.type === "error") {
        errorMsg = String(m.error);
        running = false;
        worker?.terminate();
        worker = null;
      }
    };
    worker.onerror = (e) => {
      errorMsg = `${$t.crackWorkerError}: ${e.message ?? "unknown"}`;
      running = false;
      worker?.terminate();
      worker = null;
    };
    worker.onmessageerror = () => {
      errorMsg = $t.crackWorkerError;
      running = false;
      worker?.terminate();
      worker = null;
    };
    const c = get(config);
    worker.postMessage({
      cipher: clean,
      crib: cribMode ? cribClean : undefined,
      offset: off,
      base: {
        rotors: [...c.rotors],
        reflector: c.reflector,
        rings: c.rings,
        plugs: c.plugs,
      },
      fullScope,
    });
  }

  function cancel() {
    worker?.terminate();
    worker = null;
    running = false;
  }

  function applyResult(r: Candidate | CribHit) {
    patch({
      rotors: r.rotors as [Rotor, Rotor, Rotor],
      reflector: r.reflector as Reflector,
      positions: r.positions,
    });
  }
</script>

{#if $crackOpen}
  <section class="crack">
    <h2>{$t.crackTitle}</h2>
    <p class="intro">{$t.crackIntro}</p>
    <textarea
      rows="3"
      bind:value={cipher}
      placeholder={$t.crackPlaceholder}
      spellcheck="false"
      disabled={running}></textarea>
    {#if cribMode}
      <div class="row cribrow">
        <input
          class="crib"
          bind:value={crib}
          placeholder={$t.crackCribPlaceholder}
          spellcheck="false"
          disabled={running}
        />
        <input
          class="off"
          bind:value={cribOffset}
          placeholder={$t.crackCribOffsetPh}
          spellcheck="false"
          disabled={running}
        />
      </div>
    {/if}
    <div class="row">
      <select bind:value={cribMode} disabled={running}>
        <option value={false}>{$t.crackModeStat}</option>
        <option value={true}>{$t.crackModeCrib}</option>
      </select>
      <select bind:value={fullScope} disabled={running}>
        <option value={false}>{$t.crackScopePos}</option>
        <option value={true}>{$t.crackScopeFull}</option>
      </select>
      <button on:click={() => (cipher = get(output))} disabled={running}>
        {$t.crackUseOutput}
      </button>
      {#if running}
        <button on:click={cancel}>{$t.crackCancel}</button>
        <span class="status">
          {#if total > 0}
            {$t.crackRunning}
            {Math.floor((done / total) * 100)}%
          {:else}
            {$t.crackPreparing}
          {/if}</span
        >
      {:else}
        <button class="primary" on:click={start}>{$t.crackStart}</button>
      {/if}
    </div>
    {#if running}
      <div class="bar">
        <div
          class="fill"
          style="width: {total ? (done / total) * 100 : 0}%"
        ></div>
      </div>
    {/if}
    {#if errorMsg}<p class="err">{errorMsg}</p>{/if}
    {#if results}
      {#if results.length === 0}
        <p class="err">{$t.crackResultEmpty}</p>
      {:else}
        <ul class="results">
          {#each results as r}
            <li>
              <div class="meta">
                <span class="pos"
                  >{r.rotors.join("·")} / {r.reflector} / {r.positions}</span
                >
                <span class="score"
                  >{"matches" in r
                    ? `${r.matches} @${r.offset}`
                    : r.score.toFixed(4)}</span
                >
                <button on:click={() => applyResult(r)}>{$t.crackUse}</button>
              </div>
              <div class="preview">{r.preview}</div>
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  </section>
{/if}

<style>
  .crack {
    width: 100%;
    max-width: 980px;
    background: rgba(0, 0, 0, 0.28);
    border: 1px solid var(--wood3);
    border-radius: 10px;
    padding: 14px 18px;
  }
  h2 {
    margin: 0 0 6px;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 17px;
    letter-spacing: 2px;
    color: var(--brass);
  }
  .intro {
    margin: 0 0 10px;
    font-size: 13px;
    line-height: 1.55;
    opacity: 0.9;
  }
  textarea {
    width: 100%;
    resize: vertical;
    background: #100b06;
    color: var(--txt);
    border: 1px solid var(--wood3);
    border-radius: 7px;
    padding: 8px 10px;
    font-family: ui-monospace, monospace;
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
    flex-wrap: wrap;
  }
  select {
    background: #100b06;
    color: var(--txt);
    border: 1px solid var(--wood3);
    border-radius: 7px;
    padding: 7px 9px;
    font-size: 13px;
    font-family: inherit;
  }
  button {
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
  button:hover {
    border-color: #c9a24b;
    color: #ffe169;
  }
  button.primary {
    color: #14110d;
    background: #ffcf4d;
    border-color: #ffcf4d;
  }
  .status {
    font:
      600 12px/1 ui-monospace,
      monospace;
    color: var(--brass);
  }
  .bar {
    height: 6px;
    margin-top: 8px;
    background: #100b06;
    border: 1px solid var(--wood3);
    border-radius: 4px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--brass);
    transition: width 0.15s;
  }
  .err {
    color: #ff8a7a;
    font-size: 13px;
  }
  .results {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .results li {
    border: 1px solid var(--wood3);
    border-radius: 8px;
    padding: 8px 10px;
  }
  .meta {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 4px;
  }
  .pos {
    font:
      700 13px/1 ui-monospace,
      monospace;
    color: var(--lamp-on);
    letter-spacing: 1px;
  }
  .score {
    font:
      600 11px/1 ui-monospace,
      monospace;
    opacity: 0.6;
  }
  .meta button {
    margin-left: auto;
  }
  .preview {
    font-family: ui-monospace, monospace;
    font-size: 12px;
    letter-spacing: 2px;
    opacity: 0.85;
    word-break: break-all;
  }
  .cribrow input {
    background: #100b06;
    color: var(--txt);
    border: 1px solid var(--wood3);
    border-radius: 7px;
    padding: 7px 9px;
    font-family: ui-monospace, monospace;
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .crib {
    flex: 1;
    min-width: 200px;
  }
  .off {
    width: 220px;
  }
</style>
