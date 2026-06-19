<script>
  import { Card as ShadcnCard } from "$lib/components/ui/card/index.js";
  import { cn } from "$lib/utils.js";

  export let className = "";
</script>

<ShadcnCard class={cn("rounded-2xl border-transparent bg-card p-6 shadow-lg shadow-primary/5", className)} {...$$restProps}>
  <slot />
</ShadcnCard>
