<script>
  import Badge from "$lib/components/ui/Badge.svelte";

  export let result = null;
</script>

{#if result}
  <div class="rounded-2xl bg-white p-4 shadow-lg shadow-primary/5">
    <div class="flex items-center justify-between">
      <p class="font-bold text-foreground">Verificación</p>
      <Badge variant={result.valid ? "default" : "destructive"}>
        {result.valid ? "Válida" : "Inválida"}
      </Badge>
    </div>
    <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
      {#each Object.entries(result.checks || {}) as [name, value]}
        <div class="rounded-xl bg-secondary p-2">
          <span class="text-muted-foreground">{name}</span>
          <span class={value ? "float-right text-emerald-700" : "float-right text-red-700"}>
            {value ? "ok" : "falló"}
          </span>
        </div>
      {/each}
    </div>
  </div>
{/if}
