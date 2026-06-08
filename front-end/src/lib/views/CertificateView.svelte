<script>
  import Select from "$lib/components/ui/Select.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import BadgeDiploma from "$lib/components/BadgeDiploma.svelte";

  export let badges = [];
  export let selectedBadge = null;
  export let onSelectById = () => {};
  export let onVerify = () => {};
  export let onCopy = () => {};

  $: options = badges.map((badge) => ({
    value: badge.id,
    label: `${badge.credential?.credentialSubject?.name || "Sin receptor"} · ${badge.credential?.credentialSubject?.achievement?.name || "Badge"}`
  }));
</script>

<section class="space-y-6">
  <Card>
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 class="text-lg font-bold text-slate-950">Diploma público</h3>
        <p class="text-sm text-slate-500">Vista tipo certificado para compartir o validar una credencial.</p>
      </div>
      <Select
        value={selectedBadge?.id || ""}
        options={options}
        placeholder="Selecciona una badge emitida"
        className="md:max-w-md"
        on:change={(event) => onSelectById(event.target.value)}
      />
    </div>
  </Card>

  <BadgeDiploma badge={selectedBadge} onVerify={onVerify} onCopy={onCopy} />
</section>
