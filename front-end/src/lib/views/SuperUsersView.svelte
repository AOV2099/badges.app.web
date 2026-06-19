<script>
  import { onMount } from "svelte";
  import { ArrowDown, ArrowUp, ArrowUpDown, Eye, EyeOff } from "lucide-svelte";
  import Pencil from "lucide-svelte/icons/pencil";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Label from "$lib/components/ui/Label.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import { apiRequest } from "$lib/api";

  export let apiBaseUrl = "";
  export let currentUser = {};
  export let onNotify = () => {};

  const userTypeOptions = [
    { value: "administrador", label: "Administrador" },
    { value: "general", label: "General" }
  ];

  const providerOptions = [
    { value: "local", label: "Local (correo/contraseña)" },
    { value: "google", label: "Google" }
  ];

  let loading = false;
  let saving = false;
  let users = [];
  let divisions = [];
  let search = "";
  let sortKey = "name";
  let sortDirection = "asc";
  let isDialogOpen = false;
  let editUserId = "";
  let showPassword = false;
  let form = emptyForm();

  $: normalizedCurrentUserType = String(currentUser?.type || "").toLowerCase();
  $: isSuperUser = ["super_usuario", "super_usuerio"].includes(normalizedCurrentUserType);
  $: canManageUsers = isSuperUser;
  $: currentDivisionId = String(currentUser?.divisionId || "").trim().toLowerCase();

  $: divisionOptions = divisions.map((division) => ({
    value: String(division.id || "").toUpperCase(),
    label: `${division.name} (${String(division.id || "").toUpperCase()})`
  }));
  $: normalizedSearch = search.trim().toLowerCase();
  $: filteredUsers = users.filter((user) => {
    if (!canManageUsers && currentDivisionId) {
      const userDivisionId = String(user?.division_id || "").trim().toLowerCase();
      if (userDivisionId !== currentDivisionId) {
        return false;
      }
    }

    const searchable = [
      user.name,
      user.email,
      user.division_name,
      user.division_id,
      user.type,
      user.provider
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
    return matchesSearch;
  });
  $: sortedUsers = getSortedUsers(filteredUsers, sortKey, sortDirection);
  $: isEditing = Boolean(editUserId);
  $: requiresPassword = !isEditing && form.provider === "local";
  $: canSave =
    String(form.name || "").trim().length >= 2
    && String(form.email || "").trim().length > 0
    && String(form.divisionId || "").trim().length > 0
    && ["administrador", "general"].includes(form.type)
    && ["local", "google"].includes(form.provider)
    && (!requiresPassword || String(form.password || "").trim().length >= 8);

  function emptyForm() {
    return {
      name: "",
      email: "",
      type: "general",
      divisionId: "",
      enabled: true,
      provider: "local",
      password: ""
    };
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  async function loadData() {
    if (!currentUser?.email) return;

    loading = true;
    try {
      const requesterEmail = encodeURIComponent(currentUser.email);
      const nextUsers = await apiRequest(apiBaseUrl, `/admin/users?requesterEmail=${requesterEmail}`);
      divisions = [];
      users = nextUsers;
    } catch (error) {
      onNotify(error.message || "No se pudo cargar usuarios", "error");
    } finally {
      loading = false;
    }
  }

  async function ensureDivisionsLoaded() {
    if (!canManageUsers || divisions.length || !currentUser?.email) return;

    const requesterEmail = encodeURIComponent(currentUser.email);
    divisions = await apiRequest(apiBaseUrl, `/admin/divisions?requesterEmail=${requesterEmail}`);
  }

  function getSortValue(user, key) {
    const values = {
      name: user.name || "",
      email: user.email || "",
      division: user.division_name || user.division_id || "",
      enabled: user.enabled ? "1" : "0",
      type: user.type || "",
      provider: user.provider || ""
    };

    return String(values[key] || "").toLowerCase();
  }

  function getSortedUsers(nextUsers, nextSortKey, nextSortDirection) {
    return [...nextUsers].sort((leftUser, rightUser) => {
      const leftValue = getSortValue(leftUser, nextSortKey);
      const rightValue = getSortValue(rightUser, nextSortKey);
      const result = leftValue.localeCompare(rightValue, "es-MX", {
        numeric: true,
        sensitivity: "base"
      });

      return nextSortDirection === "asc" ? result : -result;
    });
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

  async function openCreate() {
    if (!canManageUsers) return;

    try {
      await ensureDivisionsLoaded();
    } catch (error) {
      onNotify(error.message || "No se pudieron cargar divisiones", "error");
      return;
    }

    form = {
      ...emptyForm(),
      divisionId: String(divisions[0]?.id || "").toUpperCase()
    };
    editUserId = "";
    showPassword = false;
    isDialogOpen = true;
  }

  async function openEdit(user) {
    if (!canManageUsers) return;

    try {
      await ensureDivisionsLoaded();
    } catch (error) {
      onNotify(error.message || "No se pudieron cargar divisiones", "error");
      return;
    }

    form = {
      name: user.name || "",
      email: user.email || "",
      type: user.type || "general",
      divisionId: String(user.division_id || "").toUpperCase(),
      enabled: user.enabled !== false,
      provider: user.provider || "local",
      password: ""
    };
    editUserId = user.id;
    showPassword = false;
    isDialogOpen = true;
  }

  function closeDialog() {
    isDialogOpen = false;
    editUserId = "";
    showPassword = false;
    form = emptyForm();
  }

  async function saveUser() {
    if (!canManageUsers || !canSave || !currentUser?.email) return;

    saving = true;

    try {
      const payload = {
        requesterEmail: currentUser.email,
        name: String(form.name || "").trim(),
        email: normalizeEmail(form.email),
        type: form.type,
        divisionId: String(form.divisionId || "").toLowerCase(),
        enabled: Boolean(form.enabled),
        provider: form.provider
      };

      if (!isEditing && form.provider === "local") {
        payload.password = String(form.password || "").trim();
      }

      if (isEditing) {
        await apiRequest(apiBaseUrl, `/admin/users/${editUserId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        onNotify("Usuario actualizado", "success");
      } else {
        await apiRequest(apiBaseUrl, "/admin/users", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        onNotify("Usuario creado", "success");
      }

      closeDialog();
      await loadData();
    } catch (error) {
      onNotify(error.message || "No se pudo guardar el usuario", "error");
    } finally {
      saving = false;
    }
  }

  onMount(() => {
    loadData();
  });
</script>

<section class="space-y-6">
  <Card>
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 class="text-lg font-bold text-slate-950">Usuarios</h3>
        <p class="text-sm text-slate-500">
          {canManageUsers
            ? `Gestión de usuarios (sin super usuario): nombre, correo, división y habilitación. Mostrando ${filteredUsers.length} de ${users.length}.`
            : `Visualización de usuarios de tu misma división. Mostrando ${filteredUsers.length} de ${users.length}.`}
        </p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          className="sm:w-72"
          placeholder="Buscar por nombre, correo o división"
          value={search}
          on:input={(event) => (search = event.target.value)}
        />
        <Button variant="secondary" on:click={loadData} disabled={loading}>
          {loading ? "Actualizando..." : "Actualizar"}
        </Button>
        {#if canManageUsers}
          <Button on:click={openCreate}>Crear usuario</Button>
        {/if}
      </div>
    </div>
  </Card>

  <Card className="p-0 overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[980px] text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-5 py-4">
              <button
                type="button"
                class="inline-flex items-center gap-2 transition hover:text-primary"
                aria-label={`${getSortLabel("name")} por usuario`}
                on:click={() => toggleSort("name")}
              >
                Usuario
                {#if sortKey === "name" && sortDirection === "asc"}
                  <ArrowUp size={14} />
                {:else if sortKey === "name" && sortDirection === "desc"}
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
                aria-label={`${getSortLabel("email")} por correo`}
                on:click={() => toggleSort("email")}
              >
                Correo
                {#if sortKey === "email" && sortDirection === "asc"}
                  <ArrowUp size={14} />
                {:else if sortKey === "email" && sortDirection === "desc"}
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
                aria-label={`${getSortLabel("division")} por división`}
                on:click={() => toggleSort("division")}
              >
                División
                {#if sortKey === "division" && sortDirection === "asc"}
                  <ArrowUp size={14} />
                {:else if sortKey === "division" && sortDirection === "desc"}
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
                aria-label={`${getSortLabel("enabled")} por habilitación`}
                on:click={() => toggleSort("enabled")}
              >
                Habilitado
                {#if sortKey === "enabled" && sortDirection === "asc"}
                  <ArrowUp size={14} />
                {:else if sortKey === "enabled" && sortDirection === "desc"}
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
                aria-label={`${getSortLabel("type")} por tipo`}
                on:click={() => toggleSort("type")}
              >
                Tipo
                {#if sortKey === "type" && sortDirection === "asc"}
                  <ArrowUp size={14} />
                {:else if sortKey === "type" && sortDirection === "desc"}
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
                aria-label={`${getSortLabel("provider")} por proveedor`}
                on:click={() => toggleSort("provider")}
              >
                Proveedor
                {#if sortKey === "provider" && sortDirection === "asc"}
                  <ArrowUp size={14} />
                {:else if sortKey === "provider" && sortDirection === "desc"}
                  <ArrowDown size={14} />
                {:else}
                  <ArrowUpDown size={14} />
                {/if}
              </button>
            </th>
            {#if canManageUsers}
              <th class="px-5 py-4 text-right">Acciones</th>
            {/if}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          {#if loading}
            <tr>
              <td class="px-5 py-8 text-center text-slate-500" colspan="7">Cargando...</td>
            </tr>
          {:else}
            {#each sortedUsers as user}
              <tr>
                <td class="px-5 py-4 font-semibold text-slate-900">{user.name}</td>
                <td class="px-5 py-4 text-slate-600">{user.email}</td>
                <td class="px-5 py-4 text-slate-600">{user.division_name}</td>
                <td class="px-5 py-4">
                  <span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {user.enabled ? "Sí" : "No"}
                  </span>
                </td>
                <td class="px-5 py-4 text-slate-600">{user.type}</td>
                <td class="px-5 py-4 text-slate-600">{user.provider}</td>
                {#if canManageUsers}
                  <td class="px-5 py-4 text-right">
                    <span class="inline-flex" title="Editar usuario">
                      <Button size="sm" variant="outline" aria-label="Editar usuario" on:click={() => openEdit(user)}>
                        <Pencil size={16} />
                      </Button>
                    </span>
                  </td>
                {/if}
              </tr>
            {:else}
              <tr>
                <td class="px-5 py-8 text-center text-slate-500" colspan={canManageUsers ? 7 : 6}>No hay usuarios para mostrar.</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </Card>
</section>

{#if isDialogOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
    <div class="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl shadow-primary/20">
      <h3 class="text-lg font-bold text-slate-950">{isEditing ? "Editar usuario" : "Crear usuario"}</h3>

      <form class="mt-5 grid gap-4 md:grid-cols-2" on:submit|preventDefault={saveUser}>
        <div class="space-y-2 md:col-span-2">
          <Label>Nombre</Label>
          <Input value={form.name} on:input={(event) => (form = { ...form, name: event.target.value })} />
        </div>

        <div class="space-y-2 md:col-span-2">
          <Label>Correo</Label>
          <Input
            type="email"
            value={form.email}
            on:input={(event) => (form = { ...form, email: normalizeEmail(event.target.value) })}
          />
        </div>

        <div class="space-y-2">
          <Label>Tipo</Label>
          <Select
            value={form.type}
            options={userTypeOptions}
            on:change={(event) => (form = { ...form, type: event.detail.value })}
          />
        </div>

        <div class="space-y-2">
          <Label>División</Label>
          <Select
            contentSide="top"
            value={form.divisionId}
            options={divisionOptions}
            on:change={(event) => (form = { ...form, divisionId: event.detail.value })}
          />
        </div>

        <div class="space-y-2">
          <Label>Proveedor</Label>
          {#if isEditing}
            <Input value={form.provider} disabled />
          {:else}
            <Select
              value={form.provider}
              options={providerOptions}
              on:change={(event) => (form = { ...form, provider: event.detail.value })}
            />
          {/if}
        </div>

        <label class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.enabled}
            on:change={(event) => (form = { ...form, enabled: event.target.checked })}
          />
          Usuario habilitado
        </label>

        {#if requiresPassword}
          <div class="space-y-2 md:col-span-2">
            <Label>Contraseña (mínimo 8 caracteres)</Label>
            <div class="relative">
              <Input
                className="pr-12"
                type={showPassword ? "text" : "password"}
                value={form.password}
                on:input={(event) => (form = { ...form, password: event.target.value })}
              />
              <button
                type="button"
                class="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                on:click={() => (showPassword = !showPassword)}
              >
                {#if showPassword}
                  <EyeOff size={16} />
                {:else}
                  <Eye size={16} />
                {/if}
              </button>
            </div>
          </div>
        {/if}

        <div class="md:col-span-2 flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" on:click={closeDialog}>Cancelar</Button>
          <Button type="submit" disabled={!canSave || saving}>
            {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear"}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}
