<script>
  import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import BadgeDiploma from "$lib/components/BadgeDiploma.svelte";
  import CredentialChecks from "$lib/components/CredentialChecks.svelte";
  import { formatDate, formatStatus, getPublicBadgeUrl, truncate } from "$lib/utils";

  export let badges = [];
  export let verifyResult = null;
  export let statusVariant = () => "secondary";
  export let onSelect = () => {};
  export let onVerify = () => {};
  export let onCopy = () => {};
  export let onRevoke = () => {};
  export let onApprove = () => {};
  export let onDelete = () => {};
  export let searchQuery = "";
  export let canApprove = false;

  const rowOptions = [15, 25, 50, 100];

  let rowLimit = 15;
  let rowSelectorOpen = false;
  let sortKey = "issuedAt";
  let sortDirection = "desc";
  let detailBadge = null;
  let diplomaBadge = null;

  $: normalizedSearch = searchQuery.trim().toLowerCase();
  $: filteredBadges = badges.filter((badge) => {
    if (!normalizedSearch) return true;

    const subject = badge.credential?.credentialSubject;
    const achievement = subject?.achievement;
    const searchable = [
      badge.id,
      badge.status,
      formatStatus(badge.status),
      subject?.name,
      subject?.id,
      achievement?.id,
      achievement?.name,
      achievement?.description,
      badge.issuedAt
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedSearch);
  });
  $: sortedBadges = getSortedBadges(filteredBadges, sortKey, sortDirection);
  $: visibleBadges = sortedBadges.slice(0, rowLimit);
  $: activeDetailBadge = detailBadge;

  function getBadgeSubject(badge) {
    return badge.credential?.credentialSubject || {};
  }

  function getBadgeAchievement(badge) {
    return getBadgeSubject(badge)?.achievement || {};
  }

  function getSortValue(badge, key) {
    const subject = getBadgeSubject(badge);
    const achievement = getBadgeAchievement(badge);
    const values = {
      recipient: subject.name || subject.id || "",
      achievement: achievement.name || badge.id || "",
      status: formatStatus(badge.status),
      issuedAt: badge.issuedAt || ""
    };

    return String(values[key] || "").toLowerCase();
  }

  function compareBadges(leftBadge, rightBadge, nextSortKey, nextSortDirection) {
    const leftValue = getSortValue(leftBadge, nextSortKey);
    const rightValue = getSortValue(rightBadge, nextSortKey);
    const result = leftValue.localeCompare(rightValue, "es-MX", {
      numeric: true,
      sensitivity: "base"
    });

    return nextSortDirection === "asc" ? result : -result;
  }

  function getSortedBadges(nextBadges, nextSortKey, nextSortDirection) {
    return [...nextBadges].sort((leftBadge, rightBadge) =>
      compareBadges(leftBadge, rightBadge, nextSortKey, nextSortDirection)
    );
  }

  function toggleSort(key) {
    if (sortKey === key) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
      return;
    }

    sortKey = key;
    sortDirection = "asc";
  }

  function getSortLabel(key) {
    if (sortKey !== key) return "Ordenar";
    return sortDirection === "asc" ? "Orden ascendente" : "Orden descendente";
  }

  function openDetail(badge) {
    detailBadge = badge;
    onSelect(badge);
  }

  function closeDetail() {
    detailBadge = null;
  }

  function openDiploma(badge) {
    diplomaBadge = badge;
    onSelect(badge);
  }

  function closeDiploma() {
    diplomaBadge = null;
  }

  function canRevoke(badge) {
    return badge?.status === "active" && badge?.revocable !== false && badge?.credential?.credentialStatus?.revocable !== false;
  }

  function canDelete(badge) {
    return badge?.status !== "pending_review";
  }

  function canOpenPublic(badge) {
    return badge?.status !== "pending_review";
  }

  function openPublicBadge(badge) {
    if (!canOpenPublic(badge)) return;
    const publicUrl = getPublicBadgeUrl(badge);
    if (!publicUrl) return;
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  }

</script>

<section class="space-y-6">
  <Card>
    <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h3 class="text-lg font-bold text-slate-950">Insignias emitidas</h3>
        <p class="text-sm text-slate-500">
          Busca por receptor, correo, logro, estado o ID. Mostrando {visibleBadges.length} de {filteredBadges.length}.
        </p>
      </div>

      <div class="flex flex-col gap-2 md:flex-row md:items-center">
        <Input
          className="md:w-80"
          placeholder="Buscar insignias emitidas..."
          value={searchQuery}
          on:input={(event) => (searchQuery = event.target.value)}
        />

        <div class="relative">
          <Button variant="outline" on:click={() => (rowSelectorOpen = !rowSelectorOpen)}>
            Filas: {rowLimit}
          </Button>
          {#if rowSelectorOpen}
            <div class="absolute right-0 z-20 mt-2 w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              {#each rowOptions as option}
                <button
                  class={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold ${
                    rowLimit === option ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"
                  }`}
                  on:click={() => {
                    rowLimit = option;
                    rowSelectorOpen = false;
                  }}
                >
                  {option} filas
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="mt-5 overflow-hidden rounded-2xl border border-slate-200">
      <table class="w-full border-collapse text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3">
              <button
                type="button"
                class="inline-flex items-center gap-2 transition hover:text-primary"
                aria-label={`${getSortLabel("recipient")} por receptor`}
                on:click={() => toggleSort("recipient")}
              >
                Receptor
                {#if sortKey === "recipient" && sortDirection === "asc"}
                  <ArrowUp size={14} />
                {:else if sortKey === "recipient" && sortDirection === "desc"}
                  <ArrowDown size={14} />
                {:else}
                  <ArrowUpDown size={14} />
                {/if}
              </button>
            </th>
            <th class="px-4 py-3">
              <button
                type="button"
                class="inline-flex items-center gap-2 transition hover:text-primary"
                aria-label={`${getSortLabel("achievement")} por insignia`}
                on:click={() => toggleSort("achievement")}
              >
                Insignia
                {#if sortKey === "achievement" && sortDirection === "asc"}
                  <ArrowUp size={14} />
                {:else if sortKey === "achievement" && sortDirection === "desc"}
                  <ArrowDown size={14} />
                {:else}
                  <ArrowUpDown size={14} />
                {/if}
              </button>
            </th>
            <th class="px-4 py-3">
              <button
                type="button"
                class="inline-flex items-center gap-2 transition hover:text-primary"
                aria-label={`${getSortLabel("status")} por estado`}
                on:click={() => toggleSort("status")}
              >
                Estado
                {#if sortKey === "status" && sortDirection === "asc"}
                  <ArrowUp size={14} />
                {:else if sortKey === "status" && sortDirection === "desc"}
                  <ArrowDown size={14} />
                {:else}
                  <ArrowUpDown size={14} />
                {/if}
              </button>
            </th>
            <th class="px-4 py-3">
              <button
                type="button"
                class="inline-flex items-center gap-2 transition hover:text-primary"
                aria-label={`${getSortLabel("issuedAt")} por fecha de emisión`}
                on:click={() => toggleSort("issuedAt")}
              >
                Emitido
                {#if sortKey === "issuedAt" && sortDirection === "asc"}
                  <ArrowUp size={14} />
                {:else if sortKey === "issuedAt" && sortDirection === "desc"}
                  <ArrowDown size={14} />
                {:else}
                  <ArrowUpDown size={14} />
                {/if}
              </button>
            </th>
            <th class="px-4 py-3 text-right">Detalle</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          {#each visibleBadges as badge}
            <tr class="align-middle hover:bg-slate-50">
              <td class="px-4 py-4">
                <p class="font-semibold text-slate-950">{badge.credential?.credentialSubject?.name}</p>
                <p class="text-xs text-slate-500">{badge.credential?.credentialSubject?.id}</p>
              </td>
              <td class="px-4 py-4">
                <div class="flex items-center gap-3">
                  <img
                    src={badge.credential?.credentialSubject?.achievement?.image?.id}
                    alt="Insignia"
                    class="h-10 w-10 rounded-lg border border-slate-200 bg-slate-50 object-cover"
                  />
                  <div>
                    <p class="font-medium text-slate-900">{badge.credential?.credentialSubject?.achievement?.name}</p>
                    <p class="font-mono text-xs text-slate-400">{truncate(badge.id, 10)}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-4">
                <div class="flex flex-wrap gap-2">
                  <Badge variant={statusVariant(badge.status)}>{formatStatus(badge.status)}</Badge>
                  {#if badge.autoRevocation === false || badge.credential?.credentialStatus?.autoRevocation === false}
                    <Badge variant="warning">Sin auto-revocación</Badge>
                  {/if}
                </div>
              </td>
              <td class="px-4 py-4 text-slate-500">{formatDate(badge.issuedAt)}</td>
              <td class="px-4 py-4 text-right">
                <div class="flex justify-end gap-2">
                  <span class="inline-flex" title="Ver diploma de la insignia">
                    <Button size="sm" variant="outline" on:click={() => openDiploma(badge)}>Diploma</Button>
                  </span>
                  <span class="inline-flex" title="Abrir portal público de la insignia">
                    <Button size="sm" variant="outline" on:click={() => openPublicBadge(badge)}>Portal</Button>
                  </span>
                  <span class="inline-flex" title="Ver detalles de la insignia">
                    <Button size="sm" on:click={() => openDetail(badge)}>Detalle</Button>
                  </span>
                </div>
              </td>
            </tr>
          {:else}
            <tr>
              <td class="px-4 py-10 text-center text-slate-500" colspan="5">
                No hay insignias que coincidan con la búsqueda.
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Card>

  {#if activeDetailBadge}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        aria-label="Cerrar detalle de insignia"
        on:click={closeDetail}
      ></button>
      <section class="relative max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div class="flex items-start gap-4">
            <img
              src={activeDetailBadge.credential?.credentialSubject?.achievement?.image?.id}
              alt="Insignia"
              class="h-16 w-16 rounded-2xl border border-slate-200 bg-slate-50 object-cover"
            />
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-xl font-black text-slate-950">
                  {activeDetailBadge.credential?.credentialSubject?.achievement?.name}
                </h3>
                <Badge variant={statusVariant(activeDetailBadge.status)}>{formatStatus(activeDetailBadge.status)}</Badge>
              </div>
              <p class="mt-1 text-sm text-slate-500">
                {activeDetailBadge.credential?.credentialSubject?.name} · {activeDetailBadge.credential?.credentialSubject?.id}
              </p>
              <p class="mt-1 font-mono text-xs text-slate-400">{activeDetailBadge.id}</p>
            </div>
          </div>

          <Button variant="ghost" on:click={closeDetail}>Cerrar</Button>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-3">
          <div class="rounded-2xl bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Emitido</p>
            <p class="mt-1 font-bold text-slate-950">{formatDate(activeDetailBadge.issuedAt)}</p>
          </div>
          <div class="rounded-2xl bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Válido hasta</p>
            <p class="mt-1 font-bold text-slate-950">
              {activeDetailBadge.credential?.validUntil ? formatDate(activeDetailBadge.credential.validUntil) : "Sin auto-revocación"}
            </p>
          </div>
          <div class="rounded-2xl bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Política</p>
            <p class="mt-1 font-bold text-slate-950">
              {canRevoke(activeDetailBadge) ? "Revocable manualmente" : "No revocable"}
            </p>
          </div>
        </div>

        <div class="mt-5">
          <CredentialChecks result={verifyResult} />
        </div>

        <div class="mt-6 rounded-2xl bg-slate-900 p-4">
          <div class="mb-3 flex items-center justify-between">
            <p class="text-sm font-semibold text-slate-200">JWT</p>
            <Button size="sm" variant="outline" on:click={() => onCopy(activeDetailBadge)}>Copiar JWT</Button>
          </div>
          <pre class="max-h-56 overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-6 text-slate-200">{activeDetailBadge.jwt}</pre>
        </div>

        <div class="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" on:click={() => onVerify(activeDetailBadge)}>Verificar</Button>
          <Button variant="outline" on:click={() => openDiploma(activeDetailBadge)}>Ver diploma</Button>
          <Button variant="outline" on:click={() => openPublicBadge(activeDetailBadge)} disabled={!canOpenPublic(activeDetailBadge)}>
            Portal público
          </Button>
          {#if canApprove && activeDetailBadge.status === "pending_review"}
            <Button on:click={() => onApprove(activeDetailBadge)}>Aprobar insignia</Button>
          {/if}
          {#if canRevoke(activeDetailBadge)}
            <Button variant="destructive" on:click={() => onRevoke(activeDetailBadge)}>Revocar insignia</Button>
          {/if}
          <Button variant="ghost" on:click={() => onDelete(activeDetailBadge)} disabled={!canDelete(activeDetailBadge)}>
            Eliminar registro
          </Button>
        </div>
      </section>
    </div>
  {/if}

  {#if diplomaBadge}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        aria-label="Cerrar diploma"
        on:click={closeDiploma}
      ></button>
      <section class="relative max-h-[92vh] w-full max-w-5xl overflow-auto rounded-3xl">
        <div class="mb-3 flex justify-end">
          <Button variant="secondary" on:click={closeDiploma}>Cerrar diploma</Button>
        </div>
        <BadgeDiploma badge={diplomaBadge} onVerify={onVerify} onCopy={onCopy} />
      </section>
    </div>
  {/if}
</section>
