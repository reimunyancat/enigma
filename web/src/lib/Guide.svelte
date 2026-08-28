<script lang="ts">
  import { t } from "../i18n";
  import { guideOpen } from "../machine";

  const PATH = [
    "KEY",
    "PLUGBOARD",
    "ETW",
    "R",
    "M",
    "L",
    "REFLECTOR",
    "L",
    "M",
    "R",
    "ETW",
    "PLUGBOARD",
    "LAMP",
  ];
</script>

{#if $guideOpen}
  <section class="guide">
    <h2>{$t.guideTitle}</h2>
    <p class="intro">{$t.guideIntro}</p>
    <div class="path">
      {#each PATH as s, i}
        {#if i > 0}<span class="arrow">→</span>{/if}
        <span class="chip" class:hl={s === "REFLECTOR"}>{s}</span>
      {/each}
    </div>
    <div class="cols">
      <div>
        <h3>{$t.guideUseTitle}</h3>
        <ul>
          {#each $t.guideUse as line}
            <li>{line}</li>
          {/each}
        </ul>
      </div>
      <div>
        <h3>{$t.guideHowTitle}</h3>
        <ul>
          {#each $t.guideHow as line}
            <li>{line}</li>
          {/each}
        </ul>
      </div>
      <div>
        <h3>{$t.guideXrayTitle}</h3>
        <ul>
          {#each $t.guideXray as line}
            <li>{line}</li>
          {/each}
        </ul>
      </div>
    </div>
  </section>
{/if}

<style>
  .guide {
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
  h3 {
    margin: 0 0 6px;
    font-size: 12px;
    letter-spacing: 1px;
    color: var(--brass);
  }
  .intro {
    margin: 0 0 10px;
    font-size: 13px;
    line-height: 1.55;
    opacity: 0.9;
  }
  .path {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin: 0 0 12px;
  }
  .chip {
    font:
      600 10px/1 ui-monospace,
      monospace;
    letter-spacing: 0.5px;
    padding: 4px 7px;
    border: 1px solid #6b5a2a;
    border-radius: 5px;
    color: #d8c49a;
  }
  .chip.hl {
    border-color: var(--brass);
    color: var(--lamp-on);
  }
  .arrow {
    opacity: 0.5;
    font-size: 10px;
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 12px;
  }
  ul {
    margin: 0;
    padding-left: 16px;
  }
  li {
    font-size: 12px;
    line-height: 1.55;
    opacity: 0.85;
    margin-bottom: 4px;
  }
</style>
