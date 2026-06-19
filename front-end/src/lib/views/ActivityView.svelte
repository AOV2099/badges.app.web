<script>
  import Badge from "$lib/components/ui/Badge.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import { formatDate, formatStatus, truncate } from "$lib/utils";

  export let activity = [];

  function activityVariant(type) {
    if (type === "revoked" || type === "rejected_batch") return "destructive";
    if (type === "pending") return "warning";
    return "default";
  }

  function activityIcon(type) {
    if (type === "revoked" || type === "rejected_batch") return "!";
    if (type === "pending") return "⧗";
    return "✓";
  }

  function activityTone(type) {
    if (type === "revoked" || type === "rejected_batch") return "bg-red-50 text-red-700";
    if (type === "pending") return "bg-amber-50 text-amber-700";
    return "bg-emerald-50 text-emerald-700";
  }
</script>

<Card>
  <h3 class="text-lg font-bold text-slate-950">Actividad reciente</h3>
  <p class="mt-1 text-sm text-slate-500">Línea de tiempo local con emisiones, pendientes, revocaciones y rechazos masivos.</p>

  <div class="mt-6 space-y-4">
    {#each activity as item}
      <article class="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div class={`grid h-11 w-11 place-items-center rounded-xl ${activityTone(item.type)}`}>
          {activityIcon(item.type)}
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="font-bold text-slate-950">{item.title}</h4>
            <Badge variant={activityVariant(item.type)}>{formatStatus(item.type)}</Badge>
          </div>
          <p class="mt-1 text-sm text-slate-500">{item.description}</p>
          {#if item.badgeId}
            <p class="mt-1 font-mono text-xs text-slate-400">{truncate(item.badgeId, 16)}</p>
          {/if}
        </div>
        <p class="text-sm text-slate-500">{formatDate(item.date)}</p>
      </article>
    {:else}
      <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Aún no hay actividad.
      </div>
    {/each}
  </div>
</Card>
