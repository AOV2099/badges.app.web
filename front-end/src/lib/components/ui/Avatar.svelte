<script>
  import { cn } from "$lib/utils.js";

  export let src = "";
  export let alt = "";
  export let fallback = "U";
  export let className = "";

  let imageFailed = false;

  $: imageVisible = Boolean(src) && !imageFailed;
</script>

<span class={cn("relative flex h-11 w-11 shrink-0 overflow-hidden rounded-full bg-secondary shadow-lg shadow-black/10", className)}>
  {#if imageVisible}
    <img
      class="aspect-square h-full w-full object-cover"
      {src}
      {alt}
      on:error={() => (imageFailed = true)}
    />
  {:else}
    <span class="flex h-full w-full items-center justify-center bg-white text-sm font-black text-primary">
      {fallback}
    </span>
  {/if}
</span>
