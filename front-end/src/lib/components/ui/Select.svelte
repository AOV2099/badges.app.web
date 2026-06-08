<script>
  import { cn } from "$lib/utils";

  export let value = "";
  export let options = [];
  export let placeholder = "Selecciona una opción";
  export let className = "";
</script>

<select
  bind:value
  on:change
  class={cn(
    "h-10 w-full rounded-lg border border-[var(--input)] bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-[var(--ring)]",
    className
  )}
>
  <option value="">{placeholder}</option>
  {#each options as option}
    <option value={option.value}>{option.label}</option>
  {/each}
</select>
