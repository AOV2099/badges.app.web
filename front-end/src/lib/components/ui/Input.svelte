<script>
  import { Input as ShadcnInput } from "$lib/components/ui/input/index.js";
  import { cn } from "$lib/utils.js";

  export let value = "";
  export let type = "text";
  export let placeholder = "";
  export let disabled = false;
  export let className = "";
</script>

<ShadcnInput
  bind:value
  {type}
  {placeholder}
  {disabled}
  class={cn("rounded-xl border-transparent bg-secondary/70 text-foreground placeholder:text-muted-foreground shadow-inner shadow-primary/5 focus-visible:ring-ring", className)}
  on:input
  {...$$restProps}
/>
