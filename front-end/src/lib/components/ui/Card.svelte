<script>
  import { cn } from "$lib/utils";

  export let className = "";
</script>

<section
  class={cn(
    "rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-[var(--card-foreground)] shadow-sm shadow-slate-950/[0.02]",
    className
  )}
>
  <slot />
</section>
