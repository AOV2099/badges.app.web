<script>
  import { Textarea as ShadcnTextarea } from "$lib/components/ui/textarea/index.js";
  import { cn } from "$lib/utils.js";

  export let value = "";
  export let placeholder = "";
  export let rows = 4;
  export let className = "";
</script>

<ShadcnTextarea
  bind:value
  {placeholder}
  {rows}
  class={cn("rounded-xl border-transparent bg-secondary/70 text-foreground placeholder:text-muted-foreground shadow-inner shadow-primary/5 focus-visible:ring-ring", className)}
  on:input
  {...$$restProps}
/>
