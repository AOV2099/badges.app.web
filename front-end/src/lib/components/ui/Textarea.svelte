<script>
  import { cn } from "$lib/utils";

  export let value = "";
  export let placeholder = "";
  export let rows = 4;
  export let className = "";
</script>

<textarea
  bind:value
  {placeholder}
  {rows}
  on:input
  class={cn(
    "w-full rounded-lg border border-[var(--input)] bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-[var(--ring)]",
    className
  )}
></textarea>
