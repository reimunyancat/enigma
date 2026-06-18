<script lang="ts">
  import { config, apply } from "../machine"
  import type { Rotor, Reflector } from "../engine"

  const ROTORS:     Rotor[]     = ["I","II","III","IV","V"]
  const REFLECTORS: Reflector[] = ["A","B","C"]

  const clean = (v: string, n: number) =>
    v.toUpperCase().replace(/[^A-Z]/g, "").slice(0, n)

  function setRotor(i: number, v: string) {
    config.update((c) => {
      const r = [...c.rotors] as [Rotor, Rotor, Rotor]
      r[i] = v as Rotor
      return { ...c, rotors: r }
    })
    apply()
  }
</script>

<div class="cfg">
  <div class="field">
    <label>로터 (왼·가운데·오른쪽)</label>
    <div class="row">
      {#each $config.rotors as r, i}
        <select value={r} on:change={(e) => setRotor(i, e.currentTarget.value)}>
          {#each ROTORS as opt}<option value={opt}>{opt}</option>{/each}
        </select>
      {/each}
    </div>
  </div>
  <div class="field">
    <label>리플렉터</label>
    <select bind:value={$config.reflector} on:change={apply}>
      {#each REFLECTORS as opt}<option value={opt}>{opt}</option>{/each}
    </select>
  </div>
  <div class="field">
    <label>링 세팅</label>
    <input class="tri" maxlength="3" value={$config.rings}
      on:input={(e) => { $config.rings = clean(e.currentTarget.value, 3); apply() }} />
  </div>
  <div class="field">
    <label>초기 위치</label>
    <input class="tri" maxlength="3" value={$config.positions}
      on:input={(e) => { $config.positions = clean(e.currentTarget.value, 3); apply() }} />
  </div>
  <div class="field">
    <label>플러그보드</label>
    <input class="pl" value={$config.plugs}
      on:input={(e) => { $config.plugs = clean(e.currentTarget.value, 26); apply() }} />
  </div>
</div>

<style>
  .cfg { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end;
    background: rgba(0,0,0,.22); border: 1px solid var(--wood3); border-radius: 10px; padding: 12px 14px; }
  .field { display: flex; flex-direction: column; gap: 5px; }
  label { font-size: 11px; opacity: .7; letter-spacing: 1px; }
  .row { display: flex; gap: 6px; }
  select, input { background: #100b06; color: var(--txt); border: 1px solid var(--wood3);
    border-radius: 7px; padding: 7px 9px; font-size: 14px; font-family: inherit; }
  .tri { width: 76px; text-align: center; text-transform: uppercase; letter-spacing: 4px; }
  .pl  { width: 160px; text-transform: uppercase; letter-spacing: 2px; }
</style>
