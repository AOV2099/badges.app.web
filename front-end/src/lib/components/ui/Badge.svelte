<script>
  import { Badge as ShadcnBadge } from "$lib/components/ui/badge/index.js";

  export let variant = "default";
  export let className = "";
</script>

<ShadcnBadge {variant} class={className} {...$$restProps}>
  <slot />
</ShadcnBadge>
