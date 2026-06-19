<script>
  import Card from "$lib/components/ui/Card.svelte";

  export let label = "";
  export let value = "";
  export let description = "";
  export let tone = "slate";

  const tones = {
    slate: "text-foreground",
    emerald: "text-emerald-700",
    red: "text-red-700",
    violet: "text-primary"
  };
</script>

<Card className="bg-white shadow-lg shadow-primary/5">
  <p class="text-sm font-semibold text-muted-foreground">{label}</p>
  <p class={`mt-3 text-3xl font-black tracking-tight ${tones[tone]}`}>{value}</p>
  <p class="mt-2 text-sm text-muted-foreground">{description}</p>
</Card>
