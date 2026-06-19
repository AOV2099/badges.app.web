<script>
  import { Button as ShadcnButton } from "$lib/components/ui/button/index.js";

  export let type = "button";
  export let variant = "default";
  export let size = "default";
  export let disabled = false;
  export let className = "";
</script>

<ShadcnButton {type} {variant} {size} {disabled} class={className} on:click {...$$restProps}>
  <slot />
</ShadcnButton>
