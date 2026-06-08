<script>
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Label from "$lib/components/ui/Label.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import BadgeDiploma from "$lib/components/BadgeDiploma.svelte";
  import { getSlugFromUrl } from "$lib/utils";

  export let achievements = [];
  export let achievementOptions = [];
  export let issueForm = {};
  export let saving = false;
  export let previewBadge = null;
  export let apiBaseUrl = "";
  export let onIssueFormChange = () => {};
  export let onSubmit = () => {};
  export let onVerify = () => {};
  export let onCopy = () => {};

  $: selectedAchievement = achievements.find((achievement) => getSlugFromUrl(achievement.id) === issueForm.achievementId);
  $: syntheticBadge = previewBadge || {
    id: "preview",
    status: "preview",
    jwt: "preview.jwt.openbadge",
    credential: {
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      issuer: {
        name: "Aragón Academia Local de Pruebas"
      },
      credentialSubject: {
        id: issueForm.recipientEmail ? `mailto:${issueForm.recipientEmail}` : "mailto:recipient@example.com",
        name: issueForm.recipientName || "Nombre del receptor",
        achievement: selectedAchievement || {
          name: "Achievement seleccionado",
          description: "Aquí aparecerá la descripción del logro."
        }
      }
    }
  };
</script>

<section class="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
  <Card>
    <h3 class="text-lg font-bold text-slate-950">Emitir nueva badge</h3>
    <p class="mt-1 text-sm text-slate-500">Completa los datos y revisa la previsualización tipo diploma.</p>
    <form class="mt-5 space-y-4" on:submit|preventDefault={onSubmit}>
      <div class="space-y-2">
        <Label>Email del receptor</Label>
        <Input
          type="email"
          placeholder="persona@example.com"
          value={issueForm.recipientEmail}
          on:input={(event) => onIssueFormChange({ recipientEmail: event.target.value })}
        />
      </div>
      <div class="space-y-2">
        <Label>Nombre del receptor</Label>
        <Input
          placeholder="Nombre completo"
          value={issueForm.recipientName}
          on:input={(event) => onIssueFormChange({ recipientName: event.target.value })}
        />
      </div>
      <div class="space-y-2">
        <Label>Achievement</Label>
        <Select
          value={issueForm.achievementId}
          options={achievementOptions}
          placeholder="Selecciona un logro"
          on:change={(event) => onIssueFormChange({ achievementId: event.target.value })}
        />
      </div>
      {#if selectedAchievement}
        <div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <img
            src={selectedAchievement.image?.id}
            alt={`Imagen de ${selectedAchievement.name}`}
            class="h-16 w-16 rounded-xl border border-slate-200 bg-white object-cover"
          />
          <div>
            <p class="font-semibold text-slate-950">{selectedAchievement.name}</p>
            <p class="text-sm text-slate-500">{selectedAchievement.description}</p>
            <p class="mt-1 text-xs font-semibold text-slate-500">
              {selectedAchievement.revocable === false ? "No revocable" : "Revocable"}
              {selectedAchievement.validUntil ? ` · Expira ${selectedAchievement.validUntil.slice(0, 10)}` : " · Vigencia global"}
            </p>
          </div>
        </div>
      {/if}
      <Button type="submit" disabled={saving || !achievementOptions.length} className="w-full">
        {saving ? "Emitiendo..." : "Emitir credencial"}
      </Button>
    </form>

    <div class="mt-6 rounded-2xl bg-slate-50 p-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Endpoint</p>
      <p class="mt-1 break-all font-mono text-xs text-slate-700">{apiBaseUrl}/badges/issue</p>
    </div>
  </Card>

  <div class="space-y-4">
    <div>
      <h3 class="text-lg font-bold text-slate-950">Preview de diploma</h3>
      <p class="text-sm text-slate-500">Inspirado en la pantalla pública de certificado de Stitch.</p>
    </div>
    <BadgeDiploma badge={syntheticBadge} onVerify={onVerify} onCopy={onCopy} />
  </div>
</section>
