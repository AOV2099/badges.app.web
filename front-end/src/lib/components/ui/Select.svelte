<script>
  import { createEventDispatcher } from "svelte";
  import * as SelectPrimitive from "$lib/components/ui/select/index.js";
  import { cn } from "$lib/utils.js";

  export let value = "";
  export let options = [];
  export let placeholder = "Selecciona una opción";
  export let className = "";
  export let contentSide = "bottom";

  const dispatch = createEventDispatcher();

  $: selected = options.find((option) => option.value === value);

  function updateSelected(nextSelected) {
    value = nextSelected?.value || "";
    dispatch("change", { value });
  }
</script>

<SelectPrimitive.Root selected={selected} onSelectedChange={updateSelected}>
  <SelectPrimitive.Trigger
    class={cn("rounded-xl border-transparent bg-secondary/70 text-foreground shadow-inner shadow-primary/5 focus-visible:ring-ring", className)}
    aria-label={placeholder}
  >
    <SelectPrimitive.Value {placeholder} />
  </SelectPrimitive.Trigger>
  <SelectPrimitive.Content
    side={contentSide}
    class="border-transparent bg-white text-foreground shadow-xl shadow-primary/10"
  >
    {#each options as option}
      <SelectPrimitive.Item value={option.value} label={option.label}>
        {option.label}
      </SelectPrimitive.Item>
    {/each}
  </SelectPrimitive.Content>
</SelectPrimitive.Root>
