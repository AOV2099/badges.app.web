<script>
  import { cn } from "$lib/utils";

  export let type = "button";
  export let variant = "default";
  export let size = "default";
  export let disabled = false;
  export let className = "";

  const variants = {
    default: "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm hover:bg-violet-500",
    secondary: "bg-[var(--secondary)] text-[var(--secondary-foreground)] shadow-sm hover:bg-slate-800",
    outline: "border border-[var(--border)] bg-white text-slate-900 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950",
    destructive: "bg-[var(--destructive)] text-[var(--destructive-foreground)] shadow-sm hover:bg-red-700"
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-8 px-3 text-xs",
    lg: "h-12 px-6 text-base",
    icon: "h-10 w-10"
  };
</script>

<button
  {type}
  {disabled}
  class={cn(
    "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className
  )}
  on:click
>
  <slot />
</button>
