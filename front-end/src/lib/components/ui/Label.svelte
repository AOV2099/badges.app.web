<script>
  import { Label as ShadcnLabel } from "$lib/components/ui/label/index.js";
  import { cn } from "$lib/utils.js";

  export let className = "";
</script>

<ShadcnLabel class={cn("text-foreground/80", className)} {...$$restProps}>
  <slot />
</ShadcnLabel>
