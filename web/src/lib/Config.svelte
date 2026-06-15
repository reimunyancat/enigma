<script lang="ts">
  import { config, patch } from "../machine"
  import type { Rotor, Reflector } from "../engine"

  const ROTORS: Rotor[] = ["I", "II", "III", "IV", "V"]
  const REFLECTORS: Reflector[] = ["A", "B", "C"]

  function setRotor(i: number, v: string) {
    const r = [...$config.rotors] as [Rotor, Rotor, Rotor]
    r[i] = v as Rotor
    patch({ rotors: r })
  }
  const up = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "")
</script>

<div class="cfg">
  {#each [0, 1, 2] as i}
    <label>로터 {i + 1}
      <select value={$config.rotors[i]} on:change={(e) => setRotor(i, e.currentTarget.value)}>
        {#each ROTORS as opt}<option value={opt}>{opt}</option>{/each}
      </select>
    </label>
  {/each}

  <label>반사판
    <select value={$config.reflector} on:change={(e) => patch({ reflector: e.currentTarget.value as Reflector })}>
      {#each REFLECTORS as opt}<option value={opt}>{opt}</option>{/each}
    </select>
  </label>

  <label>링 설정
    <input maxlength="3" value={$config.rings}
      on:change={(e) => patch({ rings: up(e.currentTarget.value).padEnd(3, "A").slice(0, 3) })} />
  </label>

  <label>시작 위치
    <input maxlength="3" value={$config.positions}
      on:change={(e) => patch({ positions: up(e.currentTarget.value).padEnd(3, "A").slice(0, 3) })} />
  </label>
</div>

<style>
  .cfg { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
  label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--brass); }
  select, input {
    background: var(--metal2); color: var(--txt); border: 1px solid #000;
    border-radius: 6px; padding: 6px 8px; font-size: 14px; width: 84px; text-transform: uppercase;
  }
</style>