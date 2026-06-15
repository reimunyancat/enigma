<script lang="ts">
  import { lamp } from "../machine"
  const ROWS = ["QWERTZUIO", "ASDFGHJK", "PYXCVBNML"]
</script>

<div class="lamps">
  {#each ROWS as row}
    <div class="row">
      {#each row.split("") as ch}
        <div class="lamp" class:on={$lamp === ch}>{ch}</div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .lamps { display: flex; flex-direction: column; gap: 6px; align-items: center; }
  .row { display: flex; gap: 6px; }
  .lamp {
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: #20180c; color: var(--lamp-off); border: 1px solid #000;
    font-weight: 700; transition: all 0.12s;
  }
  .lamp.on { background: var(--lamp-on); color: #3a2c00; box-shadow: 0 0 14px var(--lamp-on); }
</style>