<script>
  import Card from "$lib/components/ui/Card.svelte";

  export let label = "";
  export let value = "";
  export let description = "";
  export let tone = "slate";

  const tones = {
    slate: "text-slate-950",
    emerald: "text-emerald-700",
    red: "text-red-700",
    violet: "text-violet-700",
    amber: "text-amber-700"
  };
</script>

<Card>
  <p class="text-sm font-semibold text-slate-500">{label}</p>
  <p class={`mt-3 text-3xl font-black tracking-tight ${tones[tone]}`}>{value}</p>
  <p class="mt-2 text-sm text-slate-500">{description}</p>
</Card>
