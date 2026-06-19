<script>
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Label from "$lib/components/ui/Label.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import Textarea from "$lib/components/ui/Textarea.svelte";
  import { buildAchievementId, getSlugFromUrl } from "$lib/utils";

  export let achievements = [];
  export let badges = [];
  export let achievementForm = {};
  export let editingAchievementId = "";
  export let saving = false;
  export let apiBaseUrl = "";
  export let onFormChange = () => {};
  export let onSubmit = () => {};
  export let onReset = () => {};
  export let onEdit = () => {};
  export let onDelete = () => {};
  export let onViewIssued = () => {};

  const validityOptions = [
    { value: "6m", label: "6 meses" },
    { value: "1y", label: "1 año" },
    { value: "3y", label: "3 años" },
    { value: "none", label: "Sin auto-revocación" }
  ];

  let searchQuery = "";
  let dialogOpen = false;

  $: generatedAchievementId = editingAchievementId || buildAchievementId(achievementForm.name);
  $: previewImageUrl = String(achievementForm.imageId || "").trim();
  $: slugIsValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(generatedAchievementId);
  $: nameIsValid = String(achievementForm.name || "").trim().length >= 2;
  $: descriptionIsValid = String(achievementForm.description || "").trim().length >= 10;
  $: criteriaIsValid = String(achievementForm.criteriaNarrative || "").trim().length >= 10;
  $: imageIsValid = Boolean(String(achievementForm.imageId || "").trim()) && isValidImageUrl(achievementForm.imageId);
  $: validityIsValid = ["6m", "1y", "3y", "none"].includes(achievementForm.validityPreset);
  $: formIsValid = slugIsValid && nameIsValid && descriptionIsValid && criteriaIsValid && imageIsValid && validityIsValid;
  $: normalizedSearch = searchQuery.trim().toLowerCase();
  $: filteredAchievements = achievements.filter((achievement) => {
    if (!normalizedSearch) return true;

    return [
      getSlugFromUrl(achievement.id),
      achievement.name,
      achievement.description,
      achievement.criteria?.narrative,
      achievement.revocable === false ? "no revocable" : "revocable",
      getValidityLabel(achievement)
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });

  function getValidityLabel(achievement) {
    const preset = achievement.validityPreset || (achievement.validUntil ? "custom" : "1y");
    const labels = {
      "6m": "Auto-revocación a 6 meses",
      "1y": "Auto-revocación a 1 año",
      "3y": "Auto-revocación a 3 años",
      none: "Sin auto-revocación",
      custom: achievement.validUntil ? `Expira ${achievement.validUntil.slice(0, 10)}` : "Vigencia global"
    };

    return labels[preset] || "Vigencia global";
  }

  function isValidImageUrl(value) {
    const imageExtensionPattern = /\.(svg|png|jpe?g|webp|gif)(\?.*)?$/i;

    if (String(value || "").startsWith("/")) {
      return imageExtensionPattern.test(value);
    }

    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) && imageExtensionPattern.test(url.pathname + url.search);
    } catch {
      return false;
    }
  }

  function hasIssuedBadges(achievement) {
    return badges.some((badge) => badge.credential?.credentialSubject?.achievement?.id === achievement.id);
  }

  function openCreateDialog() {
    onReset();
    dialogOpen = true;
  }

  function openEditDialog(achievement) {
    onEdit(achievement);
    dialogOpen = true;
  }

  function closeDialog() {
    dialogOpen = false;
    onReset();
  }

  async function submitForm() {
    if (!formIsValid) return;

    await onSubmit();
    dialogOpen = false;
  }
</script>

<section class="space-y-6">
  <Card>
    <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h3 class="text-lg font-bold text-slate-950">Logros</h3>
        <p class="text-sm text-slate-500">
          Catálogo de logros disponibles. Mostrando {filteredAchievements.length} de {achievements.length}.
        </p>
      </div>
      <div class="flex flex-col gap-2 md:flex-row md:items-center">
        <Input
          className="md:w-80"
          placeholder="Buscar logros..."
          value={searchQuery}
          on:input={(event) => (searchQuery = event.target.value)}
        />
        <Button on:click={openCreateDialog}>Nuevo logro</Button>
      </div>
    </div>
  </Card>

  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {#each filteredAchievements as achievement}
      <article class="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
        <div class="relative bg-slate-50 p-5">
          <img
            src={achievement.image?.id}
            alt={`Imagen de ${achievement.name}`}
            class="mx-auto h-28 w-28 rounded-3xl border border-slate-200 bg-white object-cover shadow-sm"
            on:error={(event) => {
              event.currentTarget.src = `${apiBaseUrl}/images/node-badge.svg`;
            }}
          />
          <div class="absolute left-4 top-4">
            <div class="flex flex-wrap gap-2">
              <Badge variant={achievement.revocable === false ? "warning" : "secondary"}>
                {achievement.revocable === false ? "No revocable" : "Revocable"}
              </Badge>
              {#if hasIssuedBadges(achievement)}
                <Badge variant="warning">Bloqueado</Badge>
              {/if}
            </div>
          </div>
        </div>

        <div class="space-y-3 p-5">
          <div>
            <Badge variant="secondary">{getSlugFromUrl(achievement.id)}</Badge>
            <h4 class="mt-3 line-clamp-2 min-h-12 font-bold text-slate-950">{achievement.name}</h4>
            <p class="mt-2 line-clamp-3 text-sm text-slate-600">{achievement.description}</p>
          </div>

          <div class="rounded-2xl bg-slate-50 p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Vigencia</p>
            <p class="mt-1 text-sm font-semibold text-slate-800">{getValidityLabel(achievement)}</p>
          </div>

          <div class="flex gap-2 pt-1">
            {#if hasIssuedBadges(achievement)}
              <div class="grid flex-1 gap-2">
                <Button size="sm" variant="outline" className="w-full" disabled>Emitido</Button>
                <Button size="sm" className="w-full" on:click={() => onViewIssued(achievement)}>
                  Ver insignias emitidas
                </Button>
              </div>
            {:else}
              <Button size="sm" variant="outline" className="flex-1" on:click={() => openEditDialog(achievement)}>Editar</Button>
              <Button size="sm" variant="destructive" className="flex-1" on:click={() => onDelete(achievement)}>Eliminar</Button>
            {/if}
          </div>
        </div>
      </article>
    {:else}
      <Card className="sm:col-span-2 xl:col-span-4">
        <div class="p-8 text-center text-slate-500">
          No hay logros que coincidan con la búsqueda.
        </div>
      </Card>
    {/each}
  </div>

  {#if dialogOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        aria-label="Cerrar formulario de logro"
        on:click={closeDialog}
      ></button>

      <section class="relative max-h-[92vh] w-full max-w-3xl overflow-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-bold text-slate-950">{editingAchievementId ? "Editar logro" : "Crear logro"}</h3>
            <p class="text-sm text-slate-500">Define el logro, su imagen y sus políticas de emisión.</p>
          </div>
          <Button variant="ghost" on:click={closeDialog}>Cerrar</Button>
        </div>

        <form class="mt-5 grid gap-4 md:grid-cols-2" on:submit|preventDefault={submitForm}>
          <div class="space-y-2 md:col-span-2">
            <Label>Nombre del curso</Label>
            <Input
              placeholder="CURSO BÁSICO DE NODE.JS"
              value={achievementForm.name}
              on:input={(event) => onFormChange({ name: event.target.value })}
            />
            {#if achievementForm.name && !nameIsValid}
              <p class="text-xs font-semibold text-red-600">El nombre debe tener al menos 2 caracteres.</p>
            {/if}
            {#if generatedAchievementId && !slugIsValid}
              <p class="text-xs font-semibold text-red-600">El nombre debe generar un identificador compatible.</p>
            {/if}
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label>Descripción</Label>
            <Textarea
              rows={3}
              placeholder="Ejemplo: Reconoce que el estudiante completó el curso de Node.js y demostró dominio de fundamentos, módulos y APIs." 
              value={achievementForm.description}
              on:input={(event) => onFormChange({ description: event.target.value })}
            />
            <p class="text-xs text-slate-500">
              Ejemplo: “Reconoce que el estudiante completó el curso de Node.js y demostró dominio de fundamentos, módulos y APIs”.
            </p>
            {#if achievementForm.description && !descriptionIsValid}
              <p class="text-xs font-semibold text-red-600">La descripción debe tener al menos 10 caracteres.</p>
            {/if}
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label>Criterios</Label>
            <Textarea
              rows={4}
              placeholder="Ejemplo: Aprobó evaluación final con al menos 80%, entregó proyecto funcional y asistió al 90% de las sesiones." 
              value={achievementForm.criteriaNarrative}
              on:input={(event) => onFormChange({ criteriaNarrative: event.target.value })}
            />
            <p class="text-xs text-slate-500">
              Ejemplo: “Aprobó evaluación final con al menos 80%, entregó proyecto funcional y asistió al 90% de las sesiones”.
            </p>
            {#if achievementForm.criteriaNarrative && !criteriaIsValid}
              <p class="text-xs font-semibold text-red-600">Los criterios deben tener al menos 10 caracteres.</p>
            {/if}
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label>Imagen</Label>
            <Input
              placeholder="https://ejemplo.com/insignia.svg"
              value={achievementForm.imageId}
              on:input={(event) => onFormChange({ imageId: event.target.value })}
            />
            {#if !achievementForm.imageId}
              <p class="text-xs font-semibold text-red-600">La URL de imagen es requerida.</p>
            {:else if !imageIsValid}
              <p class="text-xs font-semibold text-red-600">Usa una URL http/https que termine en svg, png, jpg, jpeg, webp o gif.</p>
            {/if}
          </div>
          <div class="space-y-2">
            <Label>Auto-revocación / vigencia</Label>
            <Select
              value={achievementForm.validityPreset}
              options={validityOptions}
              placeholder="Selecciona vigencia"
              on:change={(event) => onFormChange({ validityPreset: event.detail.value, validUntil: "" })}
            />
          </div>
          <label class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-transparent text-primary focus:ring-ring"
              checked={achievementForm.revocable}
              on:change={(event) => onFormChange({ revocable: event.target.checked })}
            />
            Permitir revocación manual
          </label>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Vista previa de imagen</p>
            <div class="mt-3 flex items-center gap-4">
              {#if previewImageUrl && imageIsValid}
                {#key previewImageUrl}
                  <img
                    src={previewImageUrl}
                    alt="Vista previa del logro"
                    class="h-20 w-20 rounded-2xl border border-slate-200 bg-white object-cover"
                  />
                {/key}
              {:else}
                <div class="grid h-20 w-20 place-items-center rounded-2xl bg-white text-center text-xs font-semibold text-slate-400">
                  Sin vista previa
                </div>
              {/if}
              <div>
                <p class="font-semibold text-slate-950">{achievementForm.name || "NOMBRE DEL LOGRO"}</p>
                <p class="break-all text-sm text-slate-500">
                  {previewImageUrl || "Agrega una URL de imagen para verla aquí."}
                </p>
                <p class="mt-1 text-xs text-slate-500">
                  {achievementForm.revocable ? "Revocable" : "No revocable"}
                  · {validityOptions.find((option) => option.value === achievementForm.validityPreset)?.label || "1 año"}
                </p>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 md:col-span-2">
            {#if !formIsValid}
              <p class="mr-auto self-center text-xs font-semibold text-slate-500">
                Completa todos los campos correctamente para crear el logro.
              </p>
            {/if}
            <Button type="button" variant="outline" on:click={closeDialog}>Cancelar</Button>
            <Button type="submit" disabled={saving || !formIsValid}>
              {saving ? "Guardando..." : editingAchievementId ? "Guardar cambios" : "Crear logro"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  {/if}
</section>
