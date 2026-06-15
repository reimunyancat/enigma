<script lang="ts">
  import { press, busy } from "../machine"
  const ROWS = ["QWERTZUIO", "ASDFGHJK", "PYXCVBNML"]
</script>

<div class="keys">
  {#each ROWS as row}
    <div class="row">
      {#each row.split("") as ch}
        <button class="key" disabled={$busy} on:click={() => press(ch)}>{ch}</button>
      {/each}
    </div>
  {/each}
</div>

<style>
  .keys { display: flex; flex-direction: column; gap: 6px; align-items: center; }
  .row { display: flex; gap: 6px; }
  .key {
    width: 38px; height: 38px; border-radius: 50%; cursor: pointer;
    background: radial-gradient(circle at 38% 30%, #3a3a40, #15151a);
    border: 1px solid #000; color: var(--txt); font-weight: 700;
  }
  .key:active { transform: translateY(1px); }
  .key:disabled { opacity: 0.5; cursor: default; }
</style>