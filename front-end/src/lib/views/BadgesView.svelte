<script>
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import CredentialChecks from "$lib/components/CredentialChecks.svelte";
  import { truncate } from "$lib/utils";

  export let badges = [];
  export let selectedBadge = null;
  export let verifyResult = null;
  export let loading = false;
  export let statusVariant = () => "secondary";
  export let onReload = () => {};
  export let onSelect = () => {};
  export let onVerify = () => {};
  export let onCopy = () => {};
  export let onRevoke = () => {};
  export let onDelete = () => {};
  export let onNavigate = () => {};
</script>

<section class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
  <Card>
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 class="text-lg font-bold text-slate-950">Badges emitidas</h3>
        <p class="text-sm text-slate-500">Administración de credenciales emitidas.</p>
      </div>
      <Button variant="outline" on:click={onReload}>{loading ? "Cargando..." : "Recargar"}</Button>
    </div>

    <div class="mt-5 overflow-hidden rounded-2xl border border-slate-200">
      <table class="w-full border-collapse text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3">Receptor</th>
            <th class="px-4 py-3">Badge</th>
            <th class="px-4 py-3">Estado</th>
            <th class="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          {#each badges as badge}
            <tr class="align-top hover:bg-slate-50">
              <td class="px-4 py-4">
                <p class="font-semibold text-slate-950">{badge.credential?.credentialSubject?.name}</p>
                <p class="text-xs text-slate-500">{badge.credential?.credentialSubject?.id}</p>
              </td>
              <td class="px-4 py-4">
                <div class="flex items-center gap-3">
                  <img
                    src={badge.credential?.credentialSubject?.achievement?.image?.id}
                    alt="Badge"
                    class="h-10 w-10 rounded-lg border border-slate-200 bg-slate-50 object-cover"
                  />
                  <div>
                    <p class="font-medium text-slate-900">{badge.credential?.credentialSubject?.achievement?.name}</p>
                    <p class="font-mono text-xs text-slate-400">{truncate(badge.id, 10)}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-4"><Badge variant={statusVariant(badge.status)}>{badge.status}</Badge></td>
              <td class="px-4 py-4">
                <div class="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" on:click={() => onSelect(badge)}>Detalle</Button>
                  <Button size="sm" variant="outline" on:click={() => onVerify(badge)}>Verificar</Button>
                  <Button size="sm" variant="outline" on:click={() => { onSelect(badge); onNavigate("certificate"); }}>Diploma</Button>
                  <Button size="sm" variant="ghost" on:click={() => onCopy(badge)}>JWT</Button>
                  {#if badge.status !== "revoked" && badge.revocable !== false && badge.credential?.credentialStatus?.revocable !== false}
                    <Button size="sm" variant="destructive" on:click={() => onRevoke(badge)}>Revocar</Button>
                  {/if}
                  <Button size="sm" variant="ghost" on:click={() => onDelete(badge)}>Eliminar</Button>
                </div>
              </td>
            </tr>
          {:else}
            <tr>
              <td class="px-4 py-10 text-center text-slate-500" colspan="4">Aún no hay badges emitidas.</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Card>

  <Card>
    <h3 class="text-lg font-bold text-slate-950">Detalle de credencial</h3>
    {#if selectedBadge}
      <div class="mt-5 space-y-4">
        <div class="rounded-2xl bg-slate-50 p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Receptor</p>
          <p class="mt-1 font-bold text-slate-950">{selectedBadge.credential?.credentialSubject?.name}</p>
          <p class="text-sm text-slate-500">{selectedBadge.credential?.credentialSubject?.id}</p>
        </div>
        <CredentialChecks result={verifyResult} />
        <pre class="max-h-80 overflow-auto rounded-2xl bg-slate-900 p-4 font-mono text-xs leading-6 text-slate-200">{selectedBadge.jwt}</pre>
      </div>
    {:else}
      <div class="mt-5 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Selecciona una credencial para inspeccionarla.
      </div>
    {/if}
  </Card>
</section>
