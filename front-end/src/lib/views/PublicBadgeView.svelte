<script>
  import { onMount } from "svelte";
  import { apiRequest } from "$lib/api";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import { buildLinkedInCertificationUrl, formatDate, getPublicBadgeUrl, truncate } from "$lib/utils";

  export let apiBaseUrl = "";
  export let badgeId = "";

  let badge = null;
  let loading = true;
  let error = "";
  let copied = false;

  $: credential = badge?.credential;
  $: subject = credential?.credentialSubject;
  $: achievement = subject?.achievement;
  $: issuer = credential?.issuer;
  $: verification = badge?.verification;
  $: publicUrl = badge ? getPublicBadgeUrl(badge) : "";
  $: isValid = verification?.valid && badge?.status !== "revoked";

  onMount(async () => {
    try {
      badge = await apiRequest(apiBaseUrl, `/public/badges/${encodeURIComponent(badgeId)}`);
    } catch (requestError) {
      error = requestError.message;
    } finally {
      loading = false;
    }
  });

  async function copyPublicUrl() {
    if (!publicUrl) return;

    await navigator.clipboard.writeText(publicUrl);
    copied = true;
    window.setTimeout(() => {
      copied = false;
    }, 2200);
  }

  function openLinkedIn() {
    if (!badge) return;
    window.open(buildLinkedInCertificationUrl(badge, publicUrl), "_blank", "noopener,noreferrer");
  }
</script>

<main class="min-h-screen bg-slate-950 px-4 py-8 text-slate-950 md:px-8">
  <div class="mx-auto max-w-5xl">
    <div class="mb-6 text-white">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-violet-200">Badges public portal</p>
        <h1 class="mt-2 text-2xl font-black tracking-tight md:text-3xl">Credencial verificable</h1>
      </div>
    </div>

    {#if loading}
      <Card>
        <div class="p-8 text-center text-slate-500">Consultando badge pública...</div>
      </Card>
    {:else if error}
      <Card>
        <div class="p-8 text-center">
          <p class="text-lg font-black text-slate-950">No pudimos encontrar esta badge</p>
          <p class="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      </Card>
    {:else if badge}
      <Card className="overflow-hidden p-0">
        <div class="bg-white p-6 md:p-8">
          <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div class="flex items-start gap-4">
              <img
                src={achievement?.image?.id}
                alt={`Badge ${achievement?.name || ""}`}
                class="h-20 w-20 rounded-3xl border border-slate-200 bg-slate-50 object-cover shadow-sm"
              />
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <Badge variant={isValid ? "default" : "destructive"}>{isValid ? "Verificada" : "No válida"}</Badge>
                  <Badge variant={badge.status === "revoked" ? "destructive" : "secondary"}>{badge.status}</Badge>
                  {#if badge.autoRevocation === false || credential?.credentialStatus?.autoRevocation === false}
                    <Badge variant="warning">Sin auto-revocación</Badge>
                  {/if}
                </div>
                <h2 class="mt-3 text-2xl font-black tracking-tight text-slate-950">{achievement?.name}</h2>
                <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{achievement?.description}</p>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p class="font-semibold text-slate-500">Credential ID</p>
              <p class="mt-1 font-mono font-bold text-slate-900">{truncate(badge.id, 18)}</p>
            </div>
          </div>

          <div class="my-8 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

          <div class="rounded-[2rem] border-2 border-slate-900/10 bg-gradient-to-br from-white via-slate-50 to-violet-50 p-6 text-center shadow-inner md:p-10">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Certificado de logro</p>
            <p class="mt-4 text-sm text-slate-500">Otorgado a</p>
            <h3 class="mt-2 text-3xl font-black tracking-tight text-slate-950">{subject?.name}</h3>
            <p class="mt-1 font-mono text-sm text-slate-500">{subject?.id}</p>

            <div class="mx-auto mt-8 grid max-w-3xl gap-4 md:grid-cols-3">
              <div class="rounded-2xl bg-white/80 p-4 text-left shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Issuer</p>
                <p class="mt-1 font-bold text-slate-950">{issuer?.name}</p>
              </div>
              <div class="rounded-2xl bg-white/80 p-4 text-left shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Emitido</p>
                <p class="mt-1 font-bold text-slate-950">{formatDate(credential?.validFrom || badge.issuedAt)}</p>
              </div>
              <div class="rounded-2xl bg-white/80 p-4 text-left shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Válido hasta</p>
                <p class="mt-1 font-bold text-slate-950">
                  {credential?.validUntil ? formatDate(credential.validUntil) : "Sin auto-revocación"}
                </p>
              </div>
            </div>
          </div>

          {#if badge.status === "revoked"}
            <div class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p class="font-bold">Esta badge fue revocada.</p>
              <p class="mt-1">Fecha: {formatDate(badge.revokedAt)} · Motivo: {badge.revokedReason || "Sin motivo público"}</p>
            </div>
          {/if}

          <div class="mt-6 grid gap-4 md:grid-cols-4">
            {#each Object.entries(verification?.checks || {}) as [key, value]}
              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{key}</p>
                <p class={`mt-1 font-black ${value ? "text-emerald-700" : "text-red-700"}`}>{value ? "OK" : "Falló"}</p>
              </div>
            {/each}
          </div>

          <div class="mt-6 flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 text-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p class="font-semibold text-slate-950">URL pública de verificación</p>
              <p class="break-all font-mono text-xs text-slate-500">{publicUrl}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button variant="outline" on:click={copyPublicUrl}>{copied ? "Copiado" : "Copiar"}</Button>
              <Button on:click={openLinkedIn}>Add to LinkedIn</Button>
            </div>
          </div>
        </div>
      </Card>
    {/if}
  </div>
</main>
