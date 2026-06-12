<script>
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import MetricCard from "$lib/components/MetricCard.svelte";
  import { formatDate } from "$lib/utils";

  export let achievements = [];
  export let badges = [];
  export let activeBadges = 0;
  export let revokedBadges = 0;
  export let loading = false;
  export let latestBadges = [];
  export let onNavigate = () => {};
  export let statusVariant = () => "secondary";
</script>

<section class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
  <MetricCard label="Achievements" value={achievements.length} description="Plantillas de logro disponibles." />
  <MetricCard label="Badges activas" value={activeBadges} tone="emerald" description="Credenciales verificables vigentes." />
  <MetricCard label="Revocadas" value={revokedBadges} tone="red" description="Registros invalidados localmente." />
  <MetricCard label="Estado API" value={loading ? "..." : "OK"} tone="violet" description="Sincronización con issuer local." />
</section>

<section class="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
  <Card>
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-bold text-slate-950">Últimas credenciales</h3>
        <p class="text-sm text-slate-500">Vista operativa de emisión y estado.</p>
      </div>
      <Button variant="outline" size="sm" on:click={() => onNavigate("badges")}>Ver todas</Button>
    </div>

    <div class="mt-5 overflow-hidden rounded-2xl border border-slate-200">
      <table class="w-full border-collapse text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3">Receptor</th>
            <th class="px-4 py-3">Achievement</th>
            <th class="px-4 py-3">Estado</th>
            <th class="px-4 py-3">Emitido</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          {#each latestBadges as badge}
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-4">
                <p class="font-semibold text-slate-950">{badge.credential?.credentialSubject?.name}</p>
                <p class="text-xs text-slate-500">{badge.credential?.credentialSubject?.id}</p>
              </td>
              <td class="px-4 py-4 text-slate-700">
                <div class="flex items-center gap-3">
                  <img
                    src={badge.credential?.credentialSubject?.achievement?.image?.id}
                    alt="Badge"
                    class="h-9 w-9 rounded-lg border border-slate-200 bg-slate-50 object-cover"
                  />
                  <span>{badge.credential?.credentialSubject?.achievement?.name}</span>
                </div>
              </td>
              <td class="px-4 py-4"><Badge variant={statusVariant(badge.status)}>{badge.status}</Badge></td>
              <td class="px-4 py-4 text-slate-500">{formatDate(badge.issuedAt)}</td>
            </tr>
          {:else}
            <tr>
              <td class="px-4 py-8 text-center text-slate-500" colspan="4">Sin badges emitidas todavía.</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Card>

  <Card>
    <h3 class="text-lg font-bold text-slate-950">Acciones rápidas</h3>
    <div class="mt-5 space-y-3">
      <Button className="w-full justify-start" on:click={() => onNavigate("issue")}>✦ Emitir nueva badge</Button>
      <Button className="w-full justify-start" variant="outline" on:click={() => onNavigate("achievements")}>▣ Crear achievement</Button>
      <Button className="w-full justify-start" variant="outline" on:click={() => onNavigate("badges")}>▤ Ver diplomas emitidos</Button>
      <Button className="w-full justify-start" variant="outline" on:click={() => onNavigate("activity")}>◌ Actividad reciente</Button>
    </div>
    <div class="mt-6 rounded-2xl bg-slate-900 p-4 font-mono text-xs text-slate-200">
      <p class="text-slate-400">issuer.records</p>
      <p class="mt-1">{badges.length} credenciales emitidas</p>
    </div>
  </Card>
</section>
