<script>
  import { onMount } from "svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Label from "$lib/components/ui/Label.svelte";
  import { apiRequest } from "$lib/api";

  export let apiBaseUrl = "";
  export let currentUser = {};
  export let onNotify = () => {};

  let loading = false;
  let saving = false;
  let divisions = [];
  let search = "";
  let divisionName = "";
  let abbreviation = "";

  $: filteredDivisions = divisions.filter((division) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return `${division.name} ${division.id}`.toLowerCase().includes(query);
  });

  $: canCreate = String(divisionName || "").trim().length >= 2 && String(abbreviation || "").trim().length >= 2;

  function normalizeAbbreviation(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
  }

  async function loadDivisions() {
    if (!currentUser?.email) return;

    loading = true;
    try {
      const requesterEmail = encodeURIComponent(currentUser.email);
      divisions = await apiRequest(apiBaseUrl, `/admin/divisions?requesterEmail=${requesterEmail}`);
    } catch (error) {
      onNotify(error.message || "No se pudieron cargar divisiones", "error");
    } finally {
      loading = false;
    }
  }

  async function createDivision() {
    if (!canCreate || !currentUser?.email) return;

    saving = true;

    try {
      await apiRequest(apiBaseUrl, "/admin/divisions", {
        method: "POST",
        body: JSON.stringify({
          requesterEmail: currentUser.email,
          name: String(divisionName || "").trim(),
          abbreviation: normalizeAbbreviation(abbreviation)
        })
      });

      divisionName = "";
      abbreviation = "";
      onNotify("División creada", "success");
      await loadDivisions();
    } catch (error) {
      onNotify(error.message || "No se pudo crear la división", "error");
    } finally {
      saving = false;
    }
  }

  onMount(() => {
    loadDivisions();
  });
</script>

<section class="space-y-6">
  <Card>
    <div class="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <div class="space-y-2">
        <Label>Nombre de división</Label>
        <Input
          placeholder="Ingeniería en Computación"
          value={divisionName}
          on:input={(event) => (divisionName = event.target.value)}
        />
      </div>
      <div class="space-y-2">
        <Label>Abreviación</Label>
        <Input
          placeholder="ICO"
          value={abbreviation}
          on:input={(event) => (abbreviation = normalizeAbbreviation(event.target.value))}
        />
      </div>
      <Button on:click={createDivision} disabled={!canCreate || saving}>
        {saving ? "Creando..." : "Crear división"}
      </Button>
    </div>
  </Card>

  <Card>
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 class="text-lg font-bold text-slate-950">Divisiones</h3>
        <p class="text-sm text-slate-500">Lista compacta de divisiones registradas.</p>
      </div>
      <Input
        className="md:w-80"
        placeholder="Buscar división"
        value={search}
        on:input={(event) => (search = event.target.value)}
      />
    </div>

    <div class="mt-5 overflow-hidden rounded-2xl border border-slate-200">
      <table class="w-full border-collapse text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3">Nombre</th>
            <th class="px-4 py-3">Abreviación</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          {#if loading}
            <tr>
              <td class="px-4 py-8 text-center text-slate-500" colspan="2">Cargando...</td>
            </tr>
          {:else}
            {#each filteredDivisions as division}
              <tr>
                <td class="px-4 py-3 font-semibold text-slate-900">{division.name}</td>
                <td class="px-4 py-3 font-mono text-slate-600">{String(division.id || "").toUpperCase()}</td>
              </tr>
            {:else}
              <tr>
                <td class="px-4 py-8 text-center text-slate-500" colspan="2">Sin divisiones para mostrar.</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </Card>
</section>
