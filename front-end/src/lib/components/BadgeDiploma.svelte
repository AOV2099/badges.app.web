<script>
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import { formatDate, formatStatus, truncate } from "$lib/utils";

  export let badge = null;
  export let onVerify = () => {};
  export let onCopy = () => {};
  export let showActions = true;
  export let showCredentialId = true;
  export let showImagePlaceholder = true;

  $: subject = badge?.credential?.credentialSubject;
  $: achievement = subject?.achievement;
  $: issuer = badge?.credential?.issuer;
  $: credential = badge?.credential;
  $: badgeImage = achievement?.image?.id;
  $: revocable = badge?.revocable !== false && credential?.credentialStatus?.revocable !== false && achievement?.revocable !== false;
  $: autoRevocation = badge?.autoRevocation !== false && credential?.credentialStatus?.autoRevocation !== false && achievement?.validityPreset !== "none";
</script>

<Card className="overflow-hidden p-0">
  {#if badge}
    <div class="bg-primary px-8 py-6 text-primary-foreground">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Credencial verificable</p>
          <h3 class="mt-2 text-xl font-black tracking-tight">Diploma verificable</h3>
        </div>
        <div class="flex flex-wrap gap-2">
          <Badge variant={badge.status === "revoked" ? "destructive" : "default"}>{formatStatus(badge.status)}</Badge>
          <Badge variant={revocable ? "secondary" : "warning"}>{revocable ? "Revocable" : "No revocable"}</Badge>
          <Badge variant={autoRevocation ? "secondary" : "warning"}>{autoRevocation ? "Con expiración" : "Sin auto-revocación"}</Badge>
        </div>
      </div>
    </div>

    <div class="relative overflow-hidden bg-white p-8">
      <div class="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-100"></div>
      <div class="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-secondary"></div>

      <div class="relative rounded-[2rem] bg-gradient-to-br from-white via-background to-secondary p-8 shadow-2xl shadow-primary/10">
        <div class="mx-auto max-w-3xl text-center">
          {#if badgeImage}
            <img
              src={badgeImage}
              alt={`Insignia ${achievement?.name || ""}`}
              class="mx-auto h-24 w-24 rounded-full bg-white object-cover shadow-xl shadow-primary/15 ring-8 ring-secondary"
            />
          {:else if showImagePlaceholder}
            <div class="mx-auto grid h-24 w-24 place-items-center rounded-full bg-primary text-3xl font-black text-primary-foreground shadow-xl shadow-primary/15 ring-8 ring-secondary">
              ✓
            </div>
          {:else}
            <div class="mx-auto grid h-24 w-24 place-items-center rounded-full bg-white text-center text-xs font-semibold text-muted-foreground shadow-xl shadow-primary/10 ring-8 ring-secondary">
              Sin imagen
            </div>
          {/if}
          <p class="mt-7 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Certificado de logro</p>
          <h4 class="mt-3 text-3xl font-black tracking-tight text-foreground">{achievement?.name}</h4>
          <p class="mx-auto mt-4 max-w-2xl text-muted-foreground">{achievement?.description}</p>

          <div class="my-8 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>

          <p class="text-sm text-muted-foreground">Otorgado a</p>
          <p class="mt-2 text-2xl font-black text-foreground">{subject?.name}</p>
          <p class="mt-1 font-mono text-sm text-muted-foreground">{subject?.id}</p>

          <div class="mt-8 grid gap-4 md:grid-cols-3">
            <div class="rounded-2xl bg-white/90 p-4 text-left shadow-lg shadow-primary/5">
              <p class="text-xs font-semibold uppercase tracking-wide text-primary">Emisor</p>
              <p class="mt-1 font-bold text-foreground">{issuer?.name}</p>
            </div>
            <div class="rounded-2xl bg-white/90 p-4 text-left shadow-lg shadow-primary/5">
              <p class="text-xs font-semibold uppercase tracking-wide text-primary">Emitido</p>
              <p class="mt-1 font-bold text-foreground">{formatDate(credential?.validFrom)}</p>
            </div>
            <div class="rounded-2xl bg-white/90 p-4 text-left shadow-lg shadow-primary/5">
              <p class="text-xs font-semibold uppercase tracking-wide text-primary">Válido hasta</p>
              <p class="mt-1 font-bold text-foreground">{credential?.validUntil ? formatDate(credential.validUntil) : "Sin auto-revocación"}</p>
            </div>
          </div>

          <p class="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Política: {revocable ? "revocación manual permitida" : "revocación manual deshabilitada"}
            · {autoRevocation ? "expiración automática activa" : "sin expiración automática"}
          </p>

          <div class={`mt-8 flex flex-col items-center gap-4 ${showCredentialId ? "md:flex-row md:justify-between" : "md:justify-center"}`}>
            <div class="grid grid-cols-5 gap-1 rounded-xl bg-primary p-2">
              {#each Array(25) as _, index}
                <span class={`h-2 w-2 rounded-sm ${index % 3 === 0 || index % 7 === 0 ? "bg-white" : "bg-blue-300"}`}></span>
              {/each}
            </div>
            {#if showCredentialId}
              <div class="text-center md:text-right">
              <p class="font-mono text-xs text-muted-foreground">ID de credencial</p>
                <p class="font-mono text-sm font-semibold text-foreground">{truncate(badge.id, 18)}</p>
              </div>
            {/if}
          </div>
        </div>
      </div>

      {#if showActions}
        <div class="relative mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" on:click={() => onCopy(badge)}>Copiar JWT</Button>
          <Button on:click={() => onVerify(badge)}>Verificar diploma</Button>
        </div>
      {/if}
    </div>
  {:else}
    <div class="p-10 text-center text-slate-500">
      Selecciona o emite una insignia para ver el diploma.
    </div>
  {/if}
</Card>
