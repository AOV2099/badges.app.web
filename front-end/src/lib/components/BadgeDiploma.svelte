<script>
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import { formatDate, truncate } from "$lib/utils";

  export let badge = null;
  export let onVerify = () => {};
  export let onCopy = () => {};

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
    <div class="bg-slate-950 px-8 py-6 text-white">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-violet-200">Open Badges 3.0 Credential</p>
          <h3 class="mt-2 text-xl font-black tracking-tight">Diploma verificable</h3>
        </div>
        <div class="flex flex-wrap gap-2">
          <Badge variant={badge.status === "revoked" ? "destructive" : "default"}>{badge.status}</Badge>
          <Badge variant={revocable ? "secondary" : "warning"}>{revocable ? "Revocable" : "No revocable"}</Badge>
          <Badge variant={autoRevocation ? "secondary" : "warning"}>{autoRevocation ? "Con expiración" : "Sin auto-revocación"}</Badge>
        </div>
      </div>
    </div>

    <div class="relative overflow-hidden bg-white p-8">
      <div class="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-100"></div>
      <div class="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-slate-100"></div>

      <div class="relative rounded-[2rem] border-2 border-slate-900/10 bg-gradient-to-br from-white via-slate-50 to-violet-50 p-8 shadow-inner">
        <div class="mx-auto max-w-3xl text-center">
          {#if badgeImage}
            <img
              src={badgeImage}
              alt={`Insignia ${achievement?.name || ""}`}
              class="mx-auto h-24 w-24 rounded-full border-8 border-violet-100 bg-white object-cover shadow-xl shadow-violet-600/20"
            />
          {:else}
            <div class="mx-auto grid h-24 w-24 place-items-center rounded-full border-8 border-violet-100 bg-violet-600 text-3xl font-black text-white shadow-xl shadow-violet-600/20">
              ✓
            </div>
          {/if}
          <p class="mt-7 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Certificado de logro</p>
          <h4 class="mt-3 text-3xl font-black tracking-tight text-slate-950">{achievement?.name}</h4>
          <p class="mx-auto mt-4 max-w-2xl text-slate-600">{achievement?.description}</p>

          <div class="my-8 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>

          <p class="text-sm text-slate-500">Otorgado a</p>
          <p class="mt-2 text-2xl font-black text-slate-950">{subject?.name}</p>
          <p class="mt-1 font-mono text-sm text-slate-500">{subject?.id}</p>

          <div class="mt-8 grid gap-4 md:grid-cols-3">
            <div class="rounded-2xl bg-white/80 p-4 text-left shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Issuer</p>
              <p class="mt-1 font-bold text-slate-950">{issuer?.name}</p>
            </div>
            <div class="rounded-2xl bg-white/80 p-4 text-left shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Emitido</p>
              <p class="mt-1 font-bold text-slate-950">{formatDate(credential?.validFrom)}</p>
            </div>
            <div class="rounded-2xl bg-white/80 p-4 text-left shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Válido hasta</p>
              <p class="mt-1 font-bold text-slate-950">{credential?.validUntil ? formatDate(credential.validUntil) : "Sin auto-revocación"}</p>
            </div>
          </div>

          <p class="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Política: {revocable ? "revocación manual permitida" : "revocación manual deshabilitada"}
            · {autoRevocation ? "expiración automática activa" : "sin expiración automática"}
          </p>

          <div class="mt-8 flex flex-col items-center gap-4 md:flex-row md:justify-between">
            <div class="grid grid-cols-5 gap-1 rounded-xl bg-slate-950 p-2">
              {#each Array(25) as _, index}
                <span class={`h-2 w-2 rounded-sm ${index % 3 === 0 || index % 7 === 0 ? "bg-white" : "bg-slate-700"}`}></span>
              {/each}
            </div>
            <div class="text-center md:text-right">
              <p class="font-mono text-xs text-slate-500">Credential ID</p>
              <p class="font-mono text-sm font-semibold text-slate-700">{truncate(badge.id, 18)}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="relative mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="outline" on:click={() => onCopy(badge)}>Copiar JWT</Button>
        <Button on:click={() => onVerify(badge)}>Verificar diploma</Button>
      </div>
    </div>
  {:else}
    <div class="p-10 text-center text-slate-500">
      Selecciona o emite una badge para ver el diploma.
    </div>
  {/if}
</Card>
