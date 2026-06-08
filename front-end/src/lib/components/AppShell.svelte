<script>
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";

  export let activeTab = "dashboard";
  export let apiBaseUrl = "";
  export let loading = false;
  export let pageTitle = "Dashboard";
  export let navigationItems = [];
  export let onNavigate = () => {};
  export let onApiBaseUrlChange = () => {};
  export let onSaveSettings = () => {};
  export let onReload = () => {};
  export let onIssue = () => {};
  export let toast = "";
</script>

<div class="min-h-screen bg-[var(--background)] text-[var(--foreground)] lg:flex">
  <aside class="border-b border-white/10 bg-[var(--sidebar)] text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-[280px] lg:border-b-0">
    <div class="flex h-full flex-col p-5">
      <div class="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
        <div class="grid h-11 w-11 place-items-center rounded-xl bg-violet-500 font-black shadow-lg shadow-violet-500/20">
          SB
        </div>
        <div>
          <p class="text-sm font-semibold text-white/60">Issuer Console</p>
          <h1 class="text-base font-black tracking-tight">Stitch Badges</h1>
        </div>
      </div>

      <nav class="mt-8 space-y-1">
        {#each navigationItems as item}
          <button
            class={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
              activeTab === item.id
                ? "bg-white/10 text-white"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
            on:click={() => onNavigate(item.id)}
          >
            {#if activeTab === item.id}
              <span class="absolute left-0 h-7 w-1 rounded-r-full bg-violet-400"></span>
            {/if}
            <span class="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-violet-200">{item.icon}</span>
            {item.label}
          </button>
        {/each}
      </nav>

      <div class="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Backend</p>
        <p class="mt-2 break-all font-mono text-xs text-slate-200">{apiBaseUrl}</p>
        <Button className="mt-4 w-full border-white/15 bg-white/10 text-white hover:bg-white/15" variant="outline" size="sm" on:click={onReload}>
          {loading ? "Sincronizando..." : "Sincronizar"}
        </Button>
      </div>
    </div>
  </aside>

  <main class="min-h-screen flex-1 lg:ml-[280px]">
    <header class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/75 px-5 py-4 backdrop-blur-xl lg:px-8">
      <div class="mx-auto flex max-w-[1440px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm font-medium text-slate-500">Open Badges 3.0 · Admin Portal</p>
          <h2 class="text-2xl font-black tracking-tight text-slate-950">{pageTitle}</h2>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input value={apiBaseUrl} className="w-full sm:w-80" on:input={(event) => onApiBaseUrlChange(event.target.value)} />
          <Button variant="secondary" on:click={onSaveSettings}>Guardar API</Button>
          <Button on:click={onIssue}>Emitir badge</Button>
        </div>
      </div>
    </header>

    {#if toast}
      <div class="fixed right-5 top-5 z-50 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-xl">
        {toast}
      </div>
    {/if}

    <div class="mx-auto max-w-[1440px] space-y-6 p-5 lg:p-8">
      <slot />
    </div>
  </main>
</div>
