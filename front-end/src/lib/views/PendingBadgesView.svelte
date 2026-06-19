<script>
  import { onMount } from "svelte";
  import { ArrowDown, ArrowUp, ArrowUpDown, Check, X } from "lucide-svelte";
  import { apiRequest } from "$lib/api";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import { formatDate } from "$lib/utils";

  export let apiBaseUrl = "";
  export let currentUser = {};
  export let onNotify = () => {};
  export let onRefresh = async () => {};

  let loading = false;
  let processing = false;
  let pendingBadges = [];
  let search = "";
  let sortKey = "issuedAt";
  let sortDirection = "desc";
  let contextMenu = {
    open: false,
    x: 0,
    y: 0,
    badgeId: ""
  };
  let denyConfirmationOpen = false;
  let pendingDenyBadgeIds = [];

  $: normalizedSearch = search.trim().toLowerCase();
  $: filteredPending = pendingBadges.filter((badge) => {
    if (!normalizedSearch) return true;

    return [
      badge.id,
      badge.requesterEmail,
      badge.requesterName,
      badge.credential?.credentialSubject?.name,
      badge.credential?.credentialSubject?.id,
      badge.credential?.credentialSubject?.achievement?.name,
      badge.credential?.credentialSubject?.achievement?.id
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });
  $: sortedPending = getSortedBadges(filteredPending, sortKey, sortDirection);
  $: selectedBadges = sortedPending.filter((badge) => badge.selected);
  $: selectedCount = selectedBadges.length;
  $: allVisibleSelected = sortedPending.length > 0 && sortedPending.every((badge) => badge.selected);
  $: contextBadge = pendingBadges.find((badge) => badge.id === contextMenu.badgeId);

  function normalizeBadge(badge) {
    return {
      ...badge,
      selected: Boolean(badge.selected)
    };
  }

  function getSortValue(badge, key) {
    const subject = badge.credential?.credentialSubject || {};
    const achievement = subject.achievement || {};
    const values = {
      requesterEmail: badge.requesterEmail || "",
      recipient: subject.name || subject.id || "",
      achievement: achievement.name || achievement.id || "",
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

  function toggleBadgeSelection(id, selected) {
    pendingBadges = pendingBadges.map((badge) =>
      badge.id === id ? { ...badge, selected } : badge
    );
  }

  function toggleVisibleSelection(selected) {
    const visibleIds = new Set(sortedPending.map((badge) => badge.id));
    pendingBadges = pendingBadges.map((badge) =>
      visibleIds.has(badge.id) ? { ...badge, selected } : badge
    );
  }

  function openContextMenu(event, badge) {
    event.preventDefault();
    contextMenu = {
      open: true,
      x: event.clientX,
      y: event.clientY,
      badgeId: badge.id
    };
  }

  function closeContextMenu() {
    contextMenu = {
      ...contextMenu,
      open: false
    };
  }

  function buildQueryString() {
    const params = new URLSearchParams();
    params.set("requesterEmail", String(currentUser?.email || ""));

    if (search.trim()) {
      params.set("search", search.trim());
    }

    return params.toString();
  }

  async function loadPending() {
    if (!currentUser?.email) return;

    loading = true;
    try {
      const queryString = buildQueryString();
      const response = await apiRequest(apiBaseUrl, `/admin/pending-badges?${queryString}`);
      pendingBadges = (Array.isArray(response) ? response : []).map(normalizeBadge);
    } catch (error) {
      onNotify(error.message || "No se pudieron cargar pendientes", "error");
    } finally {
      loading = false;
    }
  }

  async function processPending(action, badgeIds) {
    const uniqueIds = Array.from(new Set((Array.isArray(badgeIds) ? badgeIds : []).filter(Boolean)));
    if (!uniqueIds.length || processing) return;

    processing = true;
    closeContextMenu();

    try {
      const response = await apiRequest(apiBaseUrl, "/admin/pending-badges/actions", {
        method: "POST",
        body: JSON.stringify({
          requesterEmail: currentUser.email,
          badgeIds: uniqueIds,
          action
        })
      });

      const processedCount = Array.isArray(response?.processed) ? response.processed.length : 0;
      const skippedCount = Array.isArray(response?.skipped) ? response.skipped.length : 0;

      if (processedCount > 0) {
        onNotify(
          action === "approve"
            ? `${processedCount} solicitud(es) aprobada(s)`
            : `${processedCount} solicitud(es) denegada(s)`,
          "success"
        );
      }

      if (skippedCount > 0) {
        onNotify(`${skippedCount} solicitud(es) no se pudieron procesar`, "error");
      }

      await loadPending();
      await onRefresh();
    } catch (error) {
      onNotify(error.message || "No se pudo procesar la acción", "error");
    } finally {
      processing = false;
    }
  }

  async function approveSelection() {
    await processPending("approve", selectedBadges.map((badge) => badge.id));
  }

  async function denySelection() {
    openDenyConfirmation(selectedBadges.map((badge) => badge.id));
  }

  function openDenyConfirmation(badgeIds) {
    const uniqueIds = Array.from(new Set((Array.isArray(badgeIds) ? badgeIds : []).filter(Boolean)));
    if (!uniqueIds.length || processing) return;

    pendingDenyBadgeIds = uniqueIds;
    denyConfirmationOpen = true;
    closeContextMenu();
  }

  function closeDenyConfirmation() {
    denyConfirmationOpen = false;
    pendingDenyBadgeIds = [];
  }

  async function confirmDenyAction() {
    const ids = [...pendingDenyBadgeIds];
    closeDenyConfirmation();
    await processPending("deny", ids);
  }

  onMount(() => {
    loadPending();
  });
</script>

<section class="space-y-6">
  <Card>
    <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h3 class="text-lg font-bold text-slate-950">Pendientes de aprobación</h3>
        <p class="text-sm text-slate-500">
          Busca por solicitante, receptor o insignia. Mostrando {sortedPending.length} de {pendingBadges.length}.
        </p>
      </div>

      <div class="flex flex-col gap-2 md:flex-row md:items-center">
        <Input
          className="md:w-80"
          placeholder="Buscar pendientes..."
          value={search}
          on:input={(event) => (search = event.target.value)}
        />
        <Button variant="outline" on:click={loadPending} disabled={loading || processing}>
          {loading ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <Button size="sm" on:click={approveSelection} disabled={!selectedCount || processing}>
        <Check size={15} />
        Aprobar selección
      </Button>
      <Button size="sm" variant="destructive" on:click={denySelection} disabled={!selectedCount || processing}>
        <X size={15} />
        Denegar selección
      </Button>
      <Badge variant="secondary">Seleccionadas: {selectedCount}</Badge>
    </div>

    <div class="mt-5 overflow-hidden rounded-2xl border border-slate-200">
      <table class="w-full border-collapse text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="w-16 px-4 py-3">
              <input
                type="checkbox"
                class="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                checked={allVisibleSelected}
                on:change={(event) => toggleVisibleSelection(event.target.checked)}
                aria-label="Seleccionar filas visibles"
              />
            </th>
            <th class="px-4 py-3">
              <button
                type="button"
                class="inline-flex items-center gap-2 transition hover:text-primary"
                aria-label={`${getSortLabel("requesterEmail")} por solicitante`}
                on:click={() => toggleSort("requesterEmail")}
              >
                Solicitante
                {#if sortKey === "requesterEmail" && sortDirection === "asc"}
                  <ArrowUp size={14} />
                {:else if sortKey === "requesterEmail" && sortDirection === "desc"}
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
                aria-label={`${getSortLabel("issuedAt")} por fecha`}
                on:click={() => toggleSort("issuedAt")}
              >
                Solicitado
                {#if sortKey === "issuedAt" && sortDirection === "asc"}
                  <ArrowUp size={14} />
                {:else if sortKey === "issuedAt" && sortDirection === "desc"}
                  <ArrowDown size={14} />
                {:else}
                  <ArrowUpDown size={14} />
                {/if}
              </button>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          {#if loading}
            <tr>
              <td class="px-4 py-8 text-center text-slate-500" colspan="5">Cargando pendientes...</td>
            </tr>
          {:else}
            {#each sortedPending as badge}
              <tr class="align-middle transition hover:bg-slate-50" on:contextmenu={(event) => openContextMenu(event, badge)}>
                <td class="px-4 py-4">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={badge.selected}
                    on:change={(event) => toggleBadgeSelection(badge.id, event.target.checked)}
                    aria-label={`Seleccionar ${badge.id}`}
                  />
                </td>
                <td class="px-4 py-4">
                  <p class="font-semibold text-slate-900">{badge.requesterName || "Sin nombre"}</p>
                  <p class="text-xs text-slate-500">{badge.requesterEmail || "Sin correo"}</p>
                </td>
                <td class="px-4 py-4">
                  <p class="font-semibold text-slate-900">{badge.credential?.credentialSubject?.name || "Sin nombre"}</p>
                  <p class="text-xs text-slate-500">{badge.credential?.credentialSubject?.id || "Sin identificador"}</p>
                </td>
                <td class="px-4 py-4">
                  <div class="flex items-center gap-3">
                    {#if badge.credential?.credentialSubject?.achievement?.image?.id}
                      <img
                        src={badge.credential?.credentialSubject?.achievement?.image?.id}
                        alt="Insignia"
                        class="h-10 w-10 rounded-lg border border-slate-200 bg-slate-50 object-cover"
                      />
                    {:else}
                      <div class="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-400">
                        N/A
                      </div>
                    {/if}
                    <div>
                      <p class="font-semibold text-slate-900">{badge.credential?.credentialSubject?.achievement?.name || "Sin insignia"}</p>
                      <p class="font-mono text-xs text-slate-500">{badge.id}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-4 text-slate-600">{formatDate(badge.issuedAt)}</td>
              </tr>
            {:else}
              <tr>
                <td class="px-4 py-10 text-center text-slate-500" colspan="5">
                  No hay solicitudes pendientes para mostrar.
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </Card>
</section>

{#if contextMenu.open}
  <button
    type="button"
    class="fixed inset-0 z-40 cursor-default bg-transparent"
    aria-label="Cerrar menú contextual"
    on:click={closeContextMenu}
    on:contextmenu|preventDefault={closeContextMenu}
  ></button>
  <div
    class="fixed z-50 min-w-64 overflow-hidden rounded-xl bg-white p-1 text-sm font-semibold text-slate-700 shadow-2xl shadow-primary/20 ring-1 ring-slate-200"
    style={`left: min(${contextMenu.x}px, calc(100vw - 18rem)); top: min(${contextMenu.y}px, calc(100vh - 14rem));`}
    role="menu"
  >
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!contextBadge || processing}
      on:click={() => contextBadge && processPending("approve", [contextBadge.id])}
      role="menuitem"
    >
      <Check size={15} />
      Aprobar solicitud
    </button>
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!contextBadge || processing}
      on:click={() => contextBadge && openDenyConfirmation([contextBadge.id])}
      role="menuitem"
    >
      <X size={15} />
      Denegar solicitud
    </button>

    <div class="my-1 h-px bg-slate-100"></div>

    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!selectedCount || processing}
      on:click={approveSelection}
      role="menuitem"
    >
      <Check size={15} />
      Aprobar selección
    </button>
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!selectedCount || processing}
      on:click={denySelection}
      role="menuitem"
    >
      <X size={15} />
      Denegar selección
    </button>
  </div>
{/if}

{#if denyConfirmationOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
    <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-primary/20">
      <h3 class="text-lg font-bold text-slate-950">Confirmar denegación</h3>
      <p class="mt-2 text-sm text-slate-500">
        Se eliminarán {pendingDenyBadgeIds.length} solicitud(es) pendiente(s). Esta acción no se puede deshacer.
      </p>

      <div class="mt-5 flex justify-end gap-2">
        <Button variant="outline" on:click={closeDenyConfirmation} disabled={processing}>Cancelar</Button>
        <Button variant="destructive" on:click={confirmDenyAction} disabled={processing}>Denegar y eliminar</Button>
      </div>
    </div>
  </div>
{/if}
