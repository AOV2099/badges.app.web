<script>
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Label from "$lib/components/ui/Label.svelte";
  import Textarea from "$lib/components/ui/Textarea.svelte";
  import { getSlugFromUrl } from "$lib/utils";

  export let achievements = [];
  export let achievementForm = {};
  export let editingAchievementId = "";
  export let saving = false;
  export let apiBaseUrl = "";
  export let onFormChange = () => {};
  export let onSubmit = () => {};
  export let onReset = () => {};
  export let onEdit = () => {};
  export let onDelete = () => {};
</script>

<section class="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
  <Card>
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3 class="text-lg font-bold text-slate-950">{editingAchievementId ? "Editar achievement" : "Crear achievement"}</h3>
        <p class="text-sm text-slate-500">Plantilla de logro para emitir credenciales.</p>
      </div>
      {#if editingAchievementId}
        <Button variant="ghost" size="sm" on:click={onReset}>Cancelar</Button>
      {/if}
    </div>

    <form class="mt-5 space-y-4" on:submit|preventDefault={onSubmit}>
      <div class="space-y-2">
        <Label>ID slug</Label>
        <Input
          placeholder="curso-node-basico"
          value={achievementForm.id}
          disabled={Boolean(editingAchievementId)}
          on:input={(event) => onFormChange({ id: event.target.value })}
        />
      </div>
      <div class="space-y-2">
        <Label>Nombre</Label>
        <Input
          placeholder="Curso básico de Node.js"
          value={achievementForm.name}
          on:input={(event) => onFormChange({ name: event.target.value })}
        />
      </div>
      <div class="space-y-2">
        <Label>Descripción</Label>
        <Textarea
          rows={3}
          placeholder="Qué reconoce este badge"
          value={achievementForm.description}
          on:input={(event) => onFormChange({ description: event.target.value })}
        />
      </div>
      <div class="space-y-2">
        <Label>Criterios</Label>
        <Textarea
          rows={4}
          placeholder="Qué debe cumplir el estudiante"
          value={achievementForm.criteriaNarrative}
          on:input={(event) => onFormChange({ criteriaNarrative: event.target.value })}
        />
      </div>
      <div class="space-y-2">
        <Label>Imagen</Label>
        <Input
          placeholder={`${apiBaseUrl}/images/node-badge.svg`}
          value={achievementForm.imageId}
          on:input={(event) => onFormChange({ imageId: event.target.value })}
        />
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label>Fecha de expiración</Label>
          <Input
            type="date"
            value={achievementForm.validUntil}
            on:input={(event) => onFormChange({ validUntil: event.target.value })}
          />
          <p class="text-xs text-slate-500">Si la dejas vacía, se usa la vigencia global del backend.</p>
        </div>
        <label class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            checked={achievementForm.revocable}
            on:change={(event) => onFormChange({ revocable: event.target.checked })}
          />
          Permitir revocación manual
        </label>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview de imagen</p>
        <div class="mt-3 flex items-center gap-4">
          <img
            src={achievementForm.imageId || `${apiBaseUrl}/images/node-badge.svg`}
            alt="Preview del achievement"
            class="h-20 w-20 rounded-2xl border border-slate-200 bg-white object-cover"
          />
          <div>
            <p class="font-semibold text-slate-950">{achievementForm.name || "Nombre del achievement"}</p>
            <p class="text-sm text-slate-500">Esta imagen aparecerá en el diploma y en los listados.</p>
            <p class="mt-1 text-xs text-slate-500">
              {achievementForm.revocable ? "Revocable" : "No revocable"}
              {achievementForm.validUntil ? ` · Expira ${achievementForm.validUntil}` : " · Vigencia global"}
            </p>
          </div>
        </div>
      </div>
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Guardando..." : editingAchievementId ? "Guardar cambios" : "Crear achievement"}
      </Button>
    </form>
  </Card>

  <Card>
    <h3 class="text-lg font-bold text-slate-950">Administrar achievements</h3>
    <div class="mt-5 space-y-3">
      {#each achievements as achievement}
        <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div class="flex items-center gap-3">
                <img
                  src={achievement.image?.id}
                  alt={`Imagen de ${achievement.name}`}
                  class="h-12 w-12 rounded-xl border border-slate-200 bg-slate-50 object-cover"
                />
                <Badge variant="secondary">{getSlugFromUrl(achievement.id)}</Badge>
              </div>
              <h4 class="mt-3 font-bold text-slate-950">{achievement.name}</h4>
              <p class="mt-2 text-sm text-slate-600">{achievement.description}</p>
              <p class="mt-2 text-xs font-semibold text-slate-500">
                {achievement.revocable === false ? "No revocable" : "Revocable"}
                {achievement.validUntil ? ` · Expira ${achievement.validUntil.slice(0, 10)}` : " · Vigencia global"}
              </p>
              <p class="mt-2 text-xs text-slate-500">{achievement.criteria?.narrative}</p>
            </div>
            <div class="flex gap-2">
              <Button size="sm" variant="outline" on:click={() => onEdit(achievement)}>Editar</Button>
              <Button size="sm" variant="destructive" on:click={() => onDelete(achievement)}>Eliminar</Button>
            </div>
          </div>
        </article>
      {:else}
        <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Sin achievements todavía.
        </div>
      {/each}
    </div>
  </Card>
</section>
