<script lang="ts">
  import {
    patch,
    feedText,
    crackSeed,
    crackOpen,
    challengesOpen,
  } from "../machine";
  import { t, lang } from "../i18n";
  import { challenges } from "../challenges";
  import type { Challenge } from "../challenges";
  import type { EnigmaConfig } from "../engine";

  let revealedId: string | null = null;

  function keyOf(ch: Challenge): EnigmaConfig {
    return {
      rotors: ch.rotors as EnigmaConfig["rotors"],
      reflector: ch.reflector as EnigmaConfig["reflector"],
      rings: ch.rings,
      positions: ch.positions,
      plugs: ch.plugs,
    };
  }

  function decrypt(ch: Challenge) {
    patch(keyOf(ch));
    feedText(ch.cipher);
    revealedId = ch.id;
  }

  function crackIt(ch: Challenge) {
    const k = keyOf(ch);
    patch({
      rotors: k.rotors,
      reflector: k.reflector,
      rings: k.rings,
      plugs: k.plugs,
    });
    crackSeed.set({ cipher: ch.cipher });
    crackOpen.set(true);
  }

  function cribIt(ch: Challenge) {
    const k = keyOf(ch);
    patch({
      rotors: k.rotors,
      reflector: k.reflector,
      rings: k.rings,
      plugs: k.plugs,
    });
    crackSeed.set({ cipher: ch.cipher, crib: ch.crib });
    crackOpen.set(true);
  }
</script>

{#if $challengesOpen}
  <section class="challenges">
    <h2>{$t.challengesTitle}</h2>
    <p class="intro">{$t.challengesIntro}</p>
    <ul>
      {#each challenges as ch}
        <li>
          <div class="head">
            <span class="date">{ch.date}</span>
            <span class="name">{$lang === "en" ? ch.titleEn : ch.titleKo}</span>
          </div>
          <p class="story">{$lang === "en" ? ch.storyEn : ch.storyKo}</p>
          <div class="cipher">{ch.cipher}</div>
          <div class="acts">
            <button class="primary" on:click={() => decrypt(ch)}
              >{$t.challengeDecrypt}</button
            >
            {#if ch.crackable}
              <button on:click={() => crackIt(ch)}>{$t.challengeCrack}</button>
            {/if}
            <button on:click={() => cribIt(ch)}>{$t.challengeCrackCrib}</button>
          </div>
          {#if revealedId === ch.id}
            <p class="meaning">
              <span class="mlabel">{$t.challengeMeaning}:</span>
              {$lang === "en" ? ch.meaningEn : ch.meaningKo}
            </p>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .challenges {
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
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  li {
    border: 1px solid var(--wood3);
    border-radius: 8px;
    padding: 10px 12px;
  }
  .head {
    display: flex;
    gap: 10px;
    align-items: baseline;
    margin-bottom: 4px;
  }
  .date {
    font:
      600 11px/1 ui-monospace,
      monospace;
    color: var(--brass);
    letter-spacing: 1px;
    flex: none;
  }
  .name {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .story {
    margin: 0 0 6px;
    font-size: 12px;
    line-height: 1.5;
    opacity: 0.85;
  }
  .cipher {
    font-family: ui-monospace, monospace;
    font-size: 11px;
    letter-spacing: 2px;
    word-break: break-all;
    opacity: 0.55;
    margin-bottom: 8px;
  }
  .acts {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  button {
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
  button:hover {
    border-color: #c9a24b;
    color: #ffe169;
  }
  button.primary {
    color: #14110d;
    background: #ffcf4d;
    border-color: #ffcf4d;
  }
  .meaning {
    margin: 8px 0 0;
    padding-left: 8px;
    border-left: 2px solid var(--brass);
    font-size: 12px;
    line-height: 1.5;
  }
  .mlabel {
    color: var(--brass);
    font-weight: 600;
  }
</style>
