<script>
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Textarea from "$lib/components/ui/Textarea.svelte";
  import CredentialChecks from "$lib/components/CredentialChecks.svelte";
  import { formatDate, formatStatus, truncate } from "$lib/utils";

  export let badges = [];
  export let verificationResult = null;
  export let verifying = false;
  export let onVerifyJwt = async () => {};

  let jwt = "";
  let fileMessage = "";
  let fileInput;

  $: credentialId = verificationResult?.payload?.vc?.id || "";
  $: issuedBadge = badges.find((badge) => badge.credential?.id === credentialId);
  $: verificationChecks = verificationResult?.checks || {};
  $: wasIssuedHere = Boolean(verificationChecks.issuer && verificationChecks.issuedRecordExists);

  async function submitVerification() {
    if (!jwt.trim()) return;
    await onVerifyJwt(jwt.trim());
  }

  async function loadCertificateFile(file) {
    if (!file) return;

    jwt = (await file.text()).trim();
    fileMessage = `Archivo cargado: ${file.name}`;
  }

  async function handleFileInput(event) {
    await loadCertificateFile(event.target.files?.[0]);
    event.target.value = "";
  }

</script>

<section class="space-y-6">
  <div class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
    <Card>
      <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 class="text-lg font-bold text-slate-950">Verificador de certificado</h3>
          <p class="mt-1 text-sm text-slate-500">
            Pega un JWT para validar firma, emisor, vigencia, revocación y registro local.
          </p>
        </div>
        <div class="flex flex-wrap justify-end gap-2">
          <input
            bind:this={fileInput}
            class="hidden"
            type="file"
            accept=".jwt,.txt,text/plain,application/jwt,application/json"
            on:change={handleFileInput}
          />
          <Button variant="secondary" on:click={() => fileInput?.click()}>Seleccionar archivo</Button>
          {#if verificationResult}
            <Badge variant={verificationResult.valid ? "default" : "destructive"}>
              {verificationResult.valid ? "Válido" : "Inválido"}
            </Badge>
          {/if}
        </div>
      </div>

      <form class="mt-5 space-y-4" on:submit|preventDefault={submitVerification}>
        {#if fileMessage}
          <div class="rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
            {fileMessage}
          </div>
        {/if}
        <Textarea
          rows={8}
          placeholder="Pega aquí el JWT de la insignia..."
          value={jwt}
          on:input={(event) => (jwt = event.target.value)}
        />
        <div class="flex justify-end">
          <Button type="submit" disabled={!jwt.trim() || verifying}>
            {verifying ? "Verificando..." : "Verificar certificado"}
          </Button>
        </div>
      </form>

      <div class="mt-5">
        <CredentialChecks result={verificationResult} />
      </div>
    </Card>

    <Card>
      <h3 class="text-lg font-bold text-slate-950">Resultado local</h3>
      <p class="mt-1 text-sm text-slate-500">
        Confirmamos si el certificado fue expedido por este portal y si existe en nuestros registros.
      </p>

      {#if verificationResult}
        <div class="mt-5 space-y-3">
          <div class="rounded-2xl bg-secondary p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Expedido por nosotros</p>
            <p class={wasIssuedHere ? "mt-1 font-bold text-emerald-700" : "mt-1 font-bold text-red-700"}>
              {wasIssuedHere ? "Sí, emisor y registro coinciden" : "No se pudo confirmar completamente"}
            </p>
          </div>

          {#if issuedBadge}
            <div class="rounded-2xl bg-white p-4 shadow-lg shadow-primary/5">
              <div class="flex items-start gap-3">
                <img
                  src={issuedBadge.credential?.credentialSubject?.achievement?.image?.id}
                  alt="Insignia"
                  class="h-12 w-12 rounded-xl border border-slate-200 bg-slate-50 object-cover"
                />
                <div class="min-w-0">
                  <p class="font-bold text-slate-950">{issuedBadge.credential?.credentialSubject?.achievement?.name}</p>
                  <p class="mt-1 text-sm text-slate-500">{issuedBadge.credential?.credentialSubject?.name}</p>
                  <p class="mt-1 font-mono text-xs text-slate-400">{truncate(issuedBadge.id, 18)}</p>
                </div>
              </div>

              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div class="rounded-xl bg-secondary p-3">
                  <p class="text-xs font-semibold text-slate-500">Estado</p>
                  <p class="mt-1 font-bold text-slate-950">{formatStatus(issuedBadge.status)}</p>
                </div>
                <div class="rounded-xl bg-secondary p-3">
                  <p class="text-xs font-semibold text-slate-500">Emitido</p>
                  <p class="mt-1 font-bold text-slate-950">{formatDate(issuedBadge.issuedAt)}</p>
                </div>
              </div>
            </div>
          {:else}
            <div class="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
              No encontramos un registro local asociado a este certificado.
            </div>
          {/if}
        </div>
      {:else}
        <div class="mt-5 rounded-2xl bg-secondary p-5 text-sm font-semibold text-slate-500">
          Aún no hay verificación. Pega un JWT para comenzar.
        </div>
      {/if}
    </Card>
  </div>
</section>
