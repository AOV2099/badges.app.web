<script>
  import { cn } from "$lib/utils";

  export let variant = "default";
  export let className = "";

  const variants = {
    default: "border-emerald-200 bg-emerald-50 text-emerald-700",
    secondary: "border-slate-200 bg-slate-100 text-slate-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    destructive: "border-red-200 bg-red-50 text-red-700"
  };
</script>

<span class={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", variants[variant], className)}>
  <slot />
</span>
