<script>
  import { cn } from "$lib/utils";

  export let value = "";
  export let type = "text";
  export let placeholder = "";
  export let disabled = false;
  export let className = "";
</script>

<input
  bind:value
  {type}
  {placeholder}
  {disabled}
  on:input
  class={cn(
    "h-10 w-full rounded-lg border border-[var(--input)] bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70",
    className
  )}
/>
