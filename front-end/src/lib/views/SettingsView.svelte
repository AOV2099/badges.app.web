<script>
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Label from "$lib/components/ui/Label.svelte";

  export let apiBaseUrl = "";
  export let onApiBaseUrlChange = () => {};
  export let onSave = () => {};
  export let onReload = () => {};
</script>

<section class="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
  <Card>
    <h3 class="text-lg font-bold text-slate-950">Issuer & configuración</h3>
    <p class="mt-1 text-sm text-slate-500">Ajustes locales para conectar el portal con el backend.</p>

    <div class="mt-5 space-y-3">
      <div class="space-y-2">
        <Label>Base URL del backend</Label>
        <Input value={apiBaseUrl} on:input={(event) => onApiBaseUrlChange(event.target.value)} />
      </div>
      <div class="flex gap-2">
        <Button on:click={onSave}>Guardar configuración</Button>
        <Button variant="outline" on:click={onReload}>Probar conexión</Button>
      </div>
    </div>
  </Card>

  <Card>
    <h3 class="text-lg font-bold text-slate-950">Guía rápida</h3>
    <div class="mt-5 space-y-4 text-sm text-slate-600">
      <p><strong class="text-slate-950">Backend esperado:</strong> {apiBaseUrl}</p>
      <p>Levanta BADGES con <code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono">npm run dev:badges</code>.</p>
      <p>Este portal usa el patrón visual desktop de Stitch: sidebar fija, workspace claro, métricas, tablas y visor técnico.</p>
    </div>
  </Card>
</section>
