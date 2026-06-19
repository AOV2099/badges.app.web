<script>
  import { onMount } from "svelte";
  import { apiRequest } from "$lib/api";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import { buildLinkedInCertificationUrl, formatDate, formatStatus, getPublicBadgeUrl, truncate } from "$lib/utils";

  export let apiBaseUrl = "";
  export let badgeId = "";

  let badge = null;
  let loading = true;
  let error = "";
  let copied = false;
  let downloading = false;

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

  async function downloadBadgeFile() {
    if (!badge?.id || downloading) return;

    downloading = true;

    try {
      const jwt = await apiRequest(apiBaseUrl, `/badges/${encodeURIComponent(badge.id)}/jwt`);
      const fileName = `${String(achievement?.name || "insignia-verificable")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "insignia-verificable"}-${badge.id}.jwt`;
      const fileUrl = URL.createObjectURL(
        new Blob([jwt], {
          type: "application/vc+jwt;charset=utf-8"
        })
      );
      const link = document.createElement("a");

      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(fileUrl);
    } finally {
      downloading = false;
    }
  }
</script>

<main class="min-h-screen bg-primary px-4 py-8 text-foreground md:px-8">
  <div class="mx-auto max-w-5xl">
    <div class="mb-6 text-white">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Portal público de insignias</p>
        <h1 class="mt-2 text-2xl font-black tracking-tight md:text-3xl">Credencial verificable</h1>
      </div>
    </div>

    {#if loading}
      <Card>
        <div class="p-8 text-center text-muted-foreground">Consultando insignia pública...</div>
      </Card>
    {:else if error}
      <Card>
        <div class="p-8 text-center">
          <p class="text-lg font-black text-foreground">No pudimos encontrar esta insignia</p>
          <p class="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </Card>
    {:else if badge}
      <Card className="overflow-hidden p-0">
        <div class="bg-white p-6 md:p-8">
          <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div class="flex items-start gap-4">
              <img
                src={achievement?.image?.id}
                alt={`Insignia ${achievement?.name || ""}`}
                class="h-20 w-20 rounded-3xl bg-secondary object-cover shadow-lg shadow-primary/10"
              />
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <Badge variant={isValid ? "default" : "destructive"}>{isValid ? "Verificada" : "No válida"}</Badge>
                  <Badge variant={badge.status === "revoked" ? "destructive" : "secondary"}>{formatStatus(badge.status)}</Badge>
                  {#if badge.autoRevocation === false || credential?.credentialStatus?.autoRevocation === false}
                    <Badge variant="warning">Sin auto-revocación</Badge>
                  {/if}
                </div>
                <h2 class="mt-3 text-2xl font-black tracking-tight text-foreground">{achievement?.name}</h2>
                <p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{achievement?.description}</p>
              </div>
            </div>

            <div class="rounded-2xl bg-secondary p-4 text-sm shadow-inner shadow-primary/5">
              <p class="font-semibold text-primary">ID de credencial</p>
              <p class="mt-1 font-mono font-bold text-foreground">{truncate(badge.id, 18)}</p>
            </div>
          </div>

          <div class="my-8 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>

          <div class="rounded-[2rem] bg-gradient-to-br from-white via-background to-secondary p-6 text-center shadow-2xl shadow-primary/10 md:p-10">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Certificado de logro</p>
            <p class="mt-4 text-sm text-muted-foreground">Otorgado a</p>
            <h3 class="mt-2 text-3xl font-black tracking-tight text-foreground">{subject?.name}</h3>
            <p class="mt-1 font-mono text-sm text-muted-foreground">{subject?.id}</p>

            <div class="mx-auto mt-8 grid max-w-3xl gap-4 md:grid-cols-3">
              <div class="rounded-2xl bg-white/80 p-4 text-left shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-primary">Emisor</p>
                <p class="mt-1 font-bold text-foreground">{issuer?.name}</p>
              </div>
              <div class="rounded-2xl bg-white/80 p-4 text-left shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-primary">Emitido</p>
                <p class="mt-1 font-bold text-foreground">{formatDate(credential?.validFrom || badge.issuedAt)}</p>
              </div>
              <div class="rounded-2xl bg-white/80 p-4 text-left shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-primary">Válido hasta</p>
                <p class="mt-1 font-bold text-foreground">
                  {credential?.validUntil ? formatDate(credential.validUntil) : "Sin auto-revocación"}
                </p>
              </div>
            </div>
          </div>

          {#if badge.status === "revoked"}
            <div class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p class="font-bold">Esta insignia fue revocada.</p>
              <p class="mt-1">Fecha: {formatDate(badge.revokedAt)} · Motivo: {badge.revokedReason || "Sin motivo público"}</p>
            </div>
          {/if}

          <div class="mt-6 grid gap-4 md:grid-cols-4">
            {#each Object.entries(verification?.checks || {}) as [key, value]}
              <div class="rounded-2xl bg-white p-4 shadow-lg shadow-primary/5">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{key}</p>
                <p class={`mt-1 font-black ${value ? "text-emerald-700" : "text-red-700"}`}>{value ? "OK" : "Falló"}</p>
              </div>
            {/each}
          </div>

          <div class="mt-6 flex flex-col gap-2 rounded-2xl bg-secondary p-4 text-sm shadow-inner shadow-primary/5 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="font-semibold text-foreground">URL pública de verificación</p>
              <p class="break-all font-mono text-xs text-muted-foreground">{publicUrl}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button variant="outline" on:click={copyPublicUrl}>{copied ? "Copiado" : "Copiar"}</Button>
              <Button variant="outline" on:click={downloadBadgeFile}>
                {downloading ? "Descargando..." : "Descargar .jwt"}
              </Button>
              <Button on:click={openLinkedIn}>Agregar a LinkedIn</Button>
            </div>
          </div>
          <p class="mt-3 text-xs text-muted-foreground">
            Para validarla externamente, descarga el archivo .jwt y súbelo en
            <a class="font-semibold text-primary hover:text-foreground" href="https://verifybadge.org/" target="_blank" rel="noreferrer">
              verifybadge.org
            </a>.
          </p>
        </div>
      </Card>
    {/if}
  </div>
</main>
