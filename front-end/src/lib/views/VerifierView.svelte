<script>
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Label from "$lib/components/ui/Label.svelte";
  import Textarea from "$lib/components/ui/Textarea.svelte";
  import CredentialChecks from "$lib/components/CredentialChecks.svelte";

  export let manualJwt = "";
  export let verifyResult = null;
  export let onJwtChange = () => {};
  export let onSubmit = () => {};
</script>

<section class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
  <Card>
    <h3 class="text-lg font-bold text-slate-950">Verificar JWT manualmente</h3>
    <form class="mt-5 space-y-4" on:submit|preventDefault={onSubmit}>
      <div class="space-y-2">
        <Label>JWT</Label>
        <Textarea
          rows={10}
          placeholder="Pega aquí el JWT de la badge"
          value={manualJwt}
          on:input={(event) => onJwtChange(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={!manualJwt}>Verificar credencial</Button>
    </form>
  </Card>

  <Card>
    <h3 class="text-lg font-bold text-slate-950">Resultado</h3>
    <div class="mt-5">
      {#if verifyResult}
        <CredentialChecks result={verifyResult} />
      {:else}
        <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Pega un JWT o verifica una badge desde la tabla.
        </div>
      {/if}
    </div>
  </Card>
</section>
