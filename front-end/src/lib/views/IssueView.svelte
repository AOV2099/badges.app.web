<script>
  import { onMount } from "svelte";
  import { ArrowDown, ArrowUp, ArrowUpDown, Trash2, Send, Users } from "lucide-svelte";
  import toast from "svelte-french-toast";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Label from "$lib/components/ui/Label.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import { getSlugFromUrl, toDisplayUppercase } from "$lib/utils";

  const STORAGE_KEY = "insignias-emision-temporal";
  const CSV_TEMPLATE = "correo,nombre,logroId\npersona@aragon.unam.mx,NOMBRE COMPLETO,\n";
  const toastOptions = {
    position: "bottom-right"
  };

  export let achievementOptions = [];
  export let saving = false;
  export let onBulkSubmit = async () => [];
  export let currentUser = {};

  $: isGeneralUser = String(currentUser?.type || "").toLowerCase() === "general";

  let mounted = false;
  let recipients = [];
  let recipientDialogOpen = false;
  let confirmDialogOpen = false;
  let deleteConfirmationOpen = false;
  let achievementSelectionDialogOpen = false;
  let pendingIssueRecipients = [];
  let pendingDeleteAction = {
    type: "",
    recipientId: ""
  };
  let csvInput;
  let searchQuery = "";
  let sortKey = "recipientName";
  let sortDirection = "asc";
  let selectedAchievementId = "";
  let contextMenu = {
    open: false,
    x: 0,
    y: 0,
    recipientId: ""
  };
  let recipientForm = emptyRecipientForm();

  $: filteredRecipients = recipients.filter((recipient) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return `${recipient.recipientName} ${recipient.recipientEmail} ${recipient.achievementId} ${
      isRecipientReady(recipient) ? "listo" : "incompleto"
    }`
      .toLowerCase()
      .includes(query);
  });
  $: sortedRecipients = getSortedRecipients(filteredRecipients, sortKey, sortDirection);
  $: selectedRecipients = recipients.filter((recipient) => recipient.selected);
  $: selectedCount = selectedRecipients.length;
  $: allVisibleSelected =
    sortedRecipients.length > 0 && sortedRecipients.every((recipient) => recipient.selected);
  $: invalidSelectedCount = selectedRecipients.filter((recipient) => !isRecipientReady(recipient)).length;
  $: canIssueSelected = selectedCount > 0 && invalidSelectedCount === 0 && !saving;
  $: contextRecipient = recipients.find((recipient) => recipient.id === contextMenu.recipientId);
  $: contextRecipientReady = contextRecipient ? isRecipientReady(contextRecipient) : false;
  $: pendingIssueCount = pendingIssueRecipients.length;
  $: if (mounted) persistRecipients(recipients);

  onMount(() => {
    const storedRecipients = globalThis.localStorage?.getItem(STORAGE_KEY);

    if (storedRecipients) {
      try {
        const parsedRecipients = JSON.parse(storedRecipients);
        recipients = Array.isArray(parsedRecipients)
          ? parsedRecipients.map(normalizeStoredRecipient)
          : [];
      } catch {
        recipients = [];
      }
    }

    mounted = true;
  });

  function emptyRecipientForm() {
    return {
      recipientEmail: "",
      recipientName: "",
      achievementId: ""
    };
  }

  function createRecipient(data = {}) {
    return {
      id: data.id || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      recipientEmail: String(data.recipientEmail || "").trim(),
      recipientName: toDisplayUppercase(data.recipientName || "").trim(),
      achievementId: normalizeAchievementId(data.achievementId),
      selected: Boolean(data.selected)
    };
  }

  function normalizeStoredRecipient(recipient) {
    return createRecipient({
      ...recipient,
      id: recipient.id,
      selected: Boolean(recipient.selected)
    });
  }

  function normalizeAchievementId(value) {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) return "";

    return getSlugFromUrl(normalizedValue);
  }

  function normalizeHeader(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function persistRecipients(nextRecipients) {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(nextRecipients));
  }

  function isRecipientReady(recipient) {
    return Boolean(
      String(recipient.recipientEmail || "").trim()
        && String(recipient.recipientName || "").trim()
        && String(recipient.achievementId || "").trim()
    );
  }

  function getAchievementLabel(achievementId) {
    return achievementOptions.find((option) => option.value === achievementId)?.label || "";
  }

  function getSortValue(recipient, key) {
    const values = {
      selected: recipient.selected ? "1" : "0",
      recipientName: recipient.recipientName,
      recipientEmail: recipient.recipientEmail,
      achievementId: getAchievementLabel(recipient.achievementId) || recipient.achievementId,
      status: isRecipientReady(recipient) ? "listo" : "incompleto"
    };

    return String(values[key] || "").toLowerCase();
  }

  function compareRecipients(leftRecipient, rightRecipient, nextSortKey, nextSortDirection) {
    const leftValue = getSortValue(leftRecipient, nextSortKey);
    const rightValue = getSortValue(rightRecipient, nextSortKey);
    const result = leftValue.localeCompare(rightValue, "es-MX", {
      numeric: true,
      sensitivity: "base"
    });

    return nextSortDirection === "asc" ? result : -result;
  }

  function getSortedRecipients(nextRecipients, nextSortKey, nextSortDirection) {
    return [...nextRecipients].sort((leftRecipient, rightRecipient) =>
      compareRecipients(leftRecipient, rightRecipient, nextSortKey, nextSortDirection)
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

  export function openRecipientDialog() {
    recipientForm = emptyRecipientForm();
    recipientDialogOpen = true;
  }

  export function openCsvPicker() {
    csvInput?.click();
  }

  function addRecipient() {
    if (!recipientForm.recipientEmail.trim() || !recipientForm.recipientName.trim()) return;

    recipients = [
      createRecipient({
        ...recipientForm,
        selected: true
      }),
      ...recipients
    ];
    recipientForm = emptyRecipientForm();
    recipientDialogOpen = false;
  }

  function updateRecipient(id, patch) {
    recipients = recipients.map((recipient) =>
      recipient.id === id
        ? createRecipient({
            ...recipient,
            ...patch,
            id,
            selected: recipient.selected
          })
        : recipient
    );
  }

  function toggleRecipient(id, selected) {
    recipients = recipients.map((recipient) =>
      recipient.id === id ? { ...recipient, selected } : recipient
    );
  }

  function toggleVisibleRecipients(selected) {
    const visibleIds = new Set(filteredRecipients.map((recipient) => recipient.id));
    recipients = recipients.map((recipient) =>
      visibleIds.has(recipient.id) ? { ...recipient, selected } : recipient
    );
  }

  function removeRecipient(id) {
    recipients = recipients.filter((recipient) => recipient.id !== id);
  }

  function removeSelectedRecipients() {
    recipients = recipients.filter((recipient) => !recipient.selected);
  }

  function openDeleteConfirmation(type, recipientId = "") {
    if (type === "selection" && !selectedCount) return;
    if (type === "recipient" && !recipientId) return;

    pendingDeleteAction = { type, recipientId };
    deleteConfirmationOpen = true;
    closeContextMenu();
  }

  function closeDeleteConfirmation() {
    pendingDeleteAction = {
      type: "",
      recipientId: ""
    };
    deleteConfirmationOpen = false;
  }

  function confirmDeleteAction() {
    if (pendingDeleteAction.type === "selection") {
      removeSelectedRecipients();
      closeDeleteConfirmation();
      return;
    }

    if (pendingDeleteAction.type === "recipient") {
      removeRecipient(pendingDeleteAction.recipientId);
      closeDeleteConfirmation();
    }
  }

  function applyAchievementToSelection() {
    if (!selectedAchievementId || !selectedCount) return;

    recipients = recipients.map((recipient) =>
      recipient.selected ? { ...recipient, achievementId: selectedAchievementId } : recipient
    );
    selectedAchievementId = "";
    achievementSelectionDialogOpen = false;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      const nextCharacter = text[index + 1];

      if (character === '"' && inQuotes && nextCharacter === '"') {
        cell += '"';
        index += 1;
        continue;
      }

      if (character === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (character === "," && !inQuotes) {
        row.push(cell.trim());
        cell = "";
        continue;
      }

      if ((character === "\n" || character === "\r") && !inQuotes) {
        if (character === "\r" && nextCharacter === "\n") index += 1;
        row.push(cell.trim());
        if (row.some(Boolean)) rows.push(row);
        row = [];
        cell = "";
        continue;
      }

      cell += character;
    }

    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);

    return rows;
  }

  function getRecordValue(record, aliases) {
    for (const alias of aliases) {
      const value = record[normalizeHeader(alias)];
      if (value) return value;
    }

    return "";
  }

  async function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const rows = parseCsv(await file.text());
    const [headers = [], ...dataRows] = rows;
    const normalizedHeaders = headers.map(normalizeHeader);
    let omittedRows = 0;

    const importedRecipients = dataRows
      .map((row) => {
        const record = normalizedHeaders.reduce((nextRecord, header, index) => {
          nextRecord[header] = row[index] || "";
          return nextRecord;
        }, {});
        const recipient = createRecipient({
          recipientEmail: getRecordValue(record, ["correo", "email", "recipientEmail", "correoInstitucional"]),
          recipientName: getRecordValue(record, ["nombre", "name", "recipientName", "receptor"]),
          achievementId: getRecordValue(record, ["logroId", "achievementId", "cursoId", "courseId", "idCurso"]),
          selected: true
        });

        if (!recipient.recipientEmail || !recipient.recipientName) {
          omittedRows += 1;
          return null;
        }

        return recipient;
      })
      .filter(Boolean);

    recipients = [...importedRecipients, ...recipients];
    toast.success(
      `${importedRecipients.length} receptores importados${omittedRows ? ` · ${omittedRows} filas omitidas` : ""}.`,
      toastOptions
    );
    event.target.value = "";
  }

  export function downloadCsvTemplate() {
    const blob = new Blob([`\ufeff${CSV_TEMPLATE}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla-emision-insignias.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function openContextMenu(event, recipient) {
    event.preventDefault();
    contextMenu = {
      open: true,
      x: event.clientX,
      y: event.clientY,
      recipientId: recipient.id
    };
  }

  function closeContextMenu() {
    contextMenu = {
      ...contextMenu,
      open: false
    };
  }

  function openIssueConfirmation(nextRecipients) {
    const recipientsToIssue = nextRecipients.filter(isRecipientReady);
    if (!recipientsToIssue.length || saving) return;

    pendingIssueRecipients = recipientsToIssue;
    confirmDialogOpen = true;
    closeContextMenu();
  }

  function openSelectionAchievementDialog() {
    if (!selectedCount) return;

    selectedAchievementId = selectedRecipients.find((recipient) => recipient.achievementId)?.achievementId || "";
    achievementSelectionDialogOpen = true;
    closeContextMenu();
  }

  async function issuePendingRecipients() {
    const issuedIds = new Set(pendingIssueRecipients.map((recipient) => recipient.id));

    await onBulkSubmit(
      pendingIssueRecipients.map((recipient) => ({
        recipientEmail: recipient.recipientEmail,
        recipientName: recipient.recipientName,
        achievementId: recipient.achievementId
      }))
    );

    recipients = recipients.filter((recipient) => !issuedIds.has(recipient.id));
    pendingIssueRecipients = [];
    confirmDialogOpen = false;
  }
</script>

<section class="space-y-6">
  <input bind:this={csvInput} class="hidden" type="file" accept=".csv,text/csv" on:change={importCsv} />

  <Card className="p-0">
    <div class="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <h4 class="font-bold text-slate-950">Mesa temporal de receptores</h4>
        <p class="text-sm text-slate-500">
          {recipients.length} en local · {selectedCount} seleccionados
          {invalidSelectedCount ? ` · ${invalidSelectedCount} incompletos` : ""}
        </p>
      </div>
      <div class="flex w-full flex-wrap justify-end gap-2 md:w-auto">
        <Input
          className="w-full sm:w-72"
          placeholder="Buscar receptores..."
          value={searchQuery}
          on:input={(event) => (searchQuery = event.target.value)}
        />
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[980px] text-left text-sm">
        <thead class="bg-secondary/70 text-xs uppercase tracking-[0.18em] text-slate-500">
          <tr>
            <th class="w-20 px-5 py-4">
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={allVisibleSelected}
                  on:change={(event) => toggleVisibleRecipients(event.target.checked)}
                  aria-label="Seleccionar receptores visibles"
                />
                <button
                  type="button"
                  class="inline-flex items-center text-slate-500 transition hover:text-primary"
                  aria-label={`${getSortLabel("selected")} por selección`}
                  on:click={() => toggleSort("selected")}
                >
                  {#if sortKey === "selected" && sortDirection === "asc"}
                    <ArrowUp size={14} />
                  {:else if sortKey === "selected" && sortDirection === "desc"}
                    <ArrowDown size={14} />
                  {:else}
                    <ArrowUpDown size={14} />
                  {/if}
                </button>
              </div>
            </th>
            <th class="px-5 py-4">
              <button
                type="button"
                class="inline-flex items-center gap-2 transition hover:text-primary"
                aria-label={`${getSortLabel("recipientName")} por receptor`}
                on:click={() => toggleSort("recipientName")}
              >
                Receptor
                {#if sortKey === "recipientName" && sortDirection === "asc"}
                  <ArrowUp size={14} />
                {:else if sortKey === "recipientName" && sortDirection === "desc"}
                  <ArrowDown size={14} />
                {:else}
                  <ArrowUpDown size={14} />
                {/if}
              </button>
            </th>
            <th class="px-5 py-4">
              <button
                type="button"
                class="inline-flex items-center gap-2 transition hover:text-primary"
                aria-label={`${getSortLabel("recipientEmail")} por correo`}
                on:click={() => toggleSort("recipientEmail")}
              >
                Correo
                {#if sortKey === "recipientEmail" && sortDirection === "asc"}
                  <ArrowUp size={14} />
                {:else if sortKey === "recipientEmail" && sortDirection === "desc"}
                  <ArrowDown size={14} />
                {:else}
                  <ArrowUpDown size={14} />
                {/if}
              </button>
            </th>
            <th class="px-5 py-4">
              <button
                type="button"
                class="inline-flex items-center gap-2 transition hover:text-primary"
                aria-label={`${getSortLabel("achievementId")} por logro`}
                on:click={() => toggleSort("achievementId")}
              >
                Logro
                {#if sortKey === "achievementId" && sortDirection === "asc"}
                  <ArrowUp size={14} />
                {:else if sortKey === "achievementId" && sortDirection === "desc"}
                  <ArrowDown size={14} />
                {:else}
                  <ArrowUpDown size={14} />
                {/if}
              </button>
            </th>
            <th class="px-5 py-4">
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
            <th class="px-5 py-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#each sortedRecipients as recipient (recipient.id)}
            <tr
              class="bg-white align-middle transition hover:bg-secondary/40"
              on:contextmenu={(event) => openContextMenu(event, recipient)}
            >
              <td class="px-5 py-4">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={recipient.selected}
                  on:change={(event) => toggleRecipient(recipient.id, event.target.checked)}
                  aria-label={`Seleccionar ${recipient.recipientName || recipient.recipientEmail}`}
                />
              </td>
              <td class="px-5 py-4">
                <Input
                  placeholder="NOMBRE COMPLETO"
                  value={recipient.recipientName}
                  on:input={(event) =>
                    updateRecipient(recipient.id, { recipientName: toDisplayUppercase(event.target.value) })}
                />
              </td>
              <td class="px-5 py-4">
                <Input
                  type="email"
                  placeholder="persona@aragon.unam.mx"
                  value={recipient.recipientEmail}
                  on:input={(event) => updateRecipient(recipient.id, { recipientEmail: event.target.value })}
                />
              </td>
              <td class="px-5 py-4">
                <Select
                  value={recipient.achievementId}
                  options={achievementOptions}
                  placeholder="Selecciona logro"
                  on:change={(event) => updateRecipient(recipient.id, { achievementId: event.detail.value })}
                />
              </td>
              <td class="px-5 py-4 align-middle">
                {#if isRecipientReady(recipient)}
                  <Badge className="bg-primary/10 text-primary shadow-none">Listo</Badge>
                {:else}
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 shadow-none">
                    Incompleto
                  </Badge>
                {/if}
              </td>
              <td class="px-5 py-4 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!isRecipientReady(recipient) || saving}
                  on:click={() => openIssueConfirmation([recipient])}
                  aria-label="Enviar receptor"
                >
                  <Send size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  on:click={() => openDeleteConfirmation("recipient", recipient.id)}
                  aria-label="Quitar receptor"
                >
                  <Trash2 size={16} />
                </Button>
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="6" class="px-5 py-12 text-center">
                <div class="mx-auto max-w-md">
                  <div class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Users size={24} />
                  </div>
                  <h4 class="mt-4 font-bold text-slate-950">Aún no hay receptores</h4>
                  <p class="mt-1 text-sm text-slate-500">
                    Agrega uno manualmente o carga un CSV con columnas correo, nombre y logroId opcional.
                  </p>
                </div>
              </td>
            </tr>
          {/each}
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
    style={`left: min(${contextMenu.x}px, calc(100vw - 18rem)); top: min(${contextMenu.y}px, calc(100vh - 17rem));`}
    role="menu"
  >
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!contextRecipientReady || saving}
      on:click={() => contextRecipient && openIssueConfirmation([contextRecipient])}
      role="menuitem"
    >
      <Send size={15} />
      Enviar registro
    </button>
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 transition hover:bg-red-50"
      on:click={() => contextRecipient && openDeleteConfirmation("recipient", contextRecipient.id)}
      role="menuitem"
    >
      <Trash2 size={15} />
      Borrar registro
    </button>

    <div class="my-1 h-px bg-slate-100"></div>

    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!canIssueSelected}
      on:click={() => openIssueConfirmation(selectedRecipients)}
      role="menuitem"
    >
      <Send size={15} />
      Enviar selección
    </button>
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!selectedCount}
      on:click={openSelectionAchievementDialog}
      role="menuitem"
    >
      Cambiar logro de la selección
    </button>
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!selectedCount}
      on:click={() => openDeleteConfirmation("selection")}
      role="menuitem"
    >
      <Trash2 size={15} />
      Borrar selección
    </button>
  </div>
{/if}

{#if recipientDialogOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
    <div class="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl shadow-primary/20">
      <div>
        <h3 class="text-lg font-bold text-slate-950">Agregar receptor</h3>
        <p class="mt-1 text-sm text-slate-500">El logro puede asignarse ahora o después desde la tabla.</p>
      </div>

      <form class="mt-5 space-y-4" on:submit|preventDefault={addRecipient}>
        <div class="space-y-2">
          <Label>Nombre del receptor</Label>
          <Input
            placeholder="NOMBRE COMPLETO"
            value={recipientForm.recipientName}
            on:input={(event) =>
              (recipientForm = { ...recipientForm, recipientName: toDisplayUppercase(event.target.value) })}
          />
        </div>
        <div class="space-y-2">
          <Label>Correo del receptor</Label>
          <Input
            type="email"
            placeholder="persona@aragon.unam.mx"
            value={recipientForm.recipientEmail}
            on:input={(event) => (recipientForm = { ...recipientForm, recipientEmail: event.target.value })}
          />
        </div>
        <div class="space-y-2">
          <Label>Logro opcional</Label>
          <Select
            value={recipientForm.achievementId}
            options={achievementOptions}
            placeholder="Asignar después"
            on:change={(event) => (recipientForm = { ...recipientForm, achievementId: event.detail.value })}
          />
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button variant="secondary" on:click={() => (recipientDialogOpen = false)}>Cancelar</Button>
          <Button
            type="submit"
            disabled={!recipientForm.recipientEmail.trim() || !recipientForm.recipientName.trim()}
          >
            Agregar a mesa
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if deleteConfirmationOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
    <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-primary/20">
      <div class="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600">
        <Trash2 size={22} />
      </div>
      <h3 class="mt-4 text-lg font-bold text-slate-950">
        {pendingDeleteAction.type === "selection" ? "Borrar selección" : "Borrar registro"}
      </h3>
      <p class="mt-2 text-sm text-slate-500">
        {#if pendingDeleteAction.type === "selection"}
          Vas a quitar {selectedCount} registros de la mesa temporal. Esta acción no emite ni revoca insignias.
        {:else}
          Vas a quitar este receptor de la mesa temporal. Esta acción no emite ni revoca insignias.
        {/if}
      </p>

      <div class="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
        Esta acción solo afecta los datos guardados localmente antes de emitir.
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <Button variant="secondary" on:click={closeDeleteConfirmation}>Cancelar</Button>
        <Button variant="destructive" on:click={confirmDeleteAction}>
          Sí, borrar
        </Button>
      </div>
    </div>
  </div>
{/if}

{#if achievementSelectionDialogOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
    <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-primary/20">
      <h3 class="text-lg font-bold text-slate-950">Cambiar logro de la selección</h3>
      <p class="mt-1 text-sm text-slate-500">
        Se actualizarán {selectedCount} registros seleccionados en la mesa temporal.
      </p>

      <div class="mt-5 space-y-2">
        <Label>Logro</Label>
        <Select
          value={selectedAchievementId}
          options={achievementOptions}
          placeholder="Selecciona un logro"
          on:change={(event) => (selectedAchievementId = event.detail.value)}
        />
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <Button
          variant="secondary"
          on:click={() => {
            selectedAchievementId = "";
            achievementSelectionDialogOpen = false;
          }}
        >
          Cancelar
        </Button>
        <Button disabled={!selectedAchievementId || !selectedCount} on:click={applyAchievementToSelection}>
          Aplicar logro
        </Button>
      </div>
    </div>
  </div>
{/if}

{#if confirmDialogOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
    <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-primary/20">
      <div class="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Send size={22} />
      </div>
      <h3 class="mt-4 text-lg font-bold text-slate-950">Confirmar emisión</h3>
      <p class="mt-2 text-sm text-slate-500">
        {#if isGeneralUser}
          Vas a emitir {pendingIssueCount} insignias verificables. La o las insignias quedarán pendientes de aprobación
          por su administrador de división.
        {:else}
          Vas a emitir {pendingIssueCount} insignias verificables. Esta acción creará credenciales para los receptores
          seleccionados.
        {/if}
      </p>

      <div class="mt-5 rounded-2xl bg-secondary p-4 text-sm font-semibold text-slate-600">
        Los registros emitidos se quitarán de la mesa temporal para evitar duplicados.
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <Button
          variant="secondary"
          disabled={saving}
          on:click={() => {
            pendingIssueRecipients = [];
            confirmDialogOpen = false;
          }}
        >
          Cancelar
        </Button>
        <Button disabled={saving} on:click={issuePendingRecipients}>
          {saving ? "Emitiendo..." : "Sí, emitir ahora"}
        </Button>
      </div>
    </div>
  </div>
{/if}
