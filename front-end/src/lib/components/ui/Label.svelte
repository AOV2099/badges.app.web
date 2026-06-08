<script>
  import { cn } from "$lib/utils";

  export let className = "";
</script>

<label class={cn("text-sm font-medium text-slate-700", className)}>
  <slot />
</label>
