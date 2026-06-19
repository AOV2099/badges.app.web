<script>
  import Activity from "lucide-svelte/icons/activity";
  import Award from "lucide-svelte/icons/award";
  import BadgeCheck from "lucide-svelte/icons/badge-check";
  import Building2 from "lucide-svelte/icons/building-2";
  import LayoutDashboard from "lucide-svelte/icons/layout-dashboard";
  import LogOut from "lucide-svelte/icons/log-out";
  import Menu from "lucide-svelte/icons/menu";
  import SendHorizontal from "lucide-svelte/icons/send-horizontal";
  import Settings from "lucide-svelte/icons/settings";
  import Users from "lucide-svelte/icons/users";
  import X from "lucide-svelte/icons/x";
  import Avatar from "$lib/components/ui/Avatar.svelte";

  export let activeTab = "dashboard";
  export let pageTitle = "Panel";
  export let navigationItems = [];
  export let userName = "Nombre de usuario";
  export let userRole = "General";
  export let userImage = "";
  export let onNavigate = () => {};
  export let onLogout = () => {};

  const navigationIcons = {
    dashboard: LayoutDashboard,
    badges: BadgeCheck,
    pending: Activity,
    issue: SendHorizontal,
    activity: Activity,
    achievements: Award,
    settings: Settings,
    "super-users": Users,
    divisions: Building2
  };

  let sidebarHovered = false;
  let mobileSidebarOpen = false;

  $: sidebarExpanded = sidebarHovered || mobileSidebarOpen;
  $: userInitials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("es-MX") || "U";

  function getNavigationIcon(id) {
    return navigationIcons[id] || BadgeCheck;
  }

  function handleNavigate(tab) {
    onNavigate(tab);
    mobileSidebarOpen = false;
  }

  function handleLogout() {
    onLogout();
    mobileSidebarOpen = false;
  }
</script>

<div class="min-h-screen bg-[var(--background)] text-[var(--foreground)] lg:flex">
  {#if mobileSidebarOpen}
    <button
      type="button"
      class="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
      aria-label="Cerrar menú"
      on:click={() => (mobileSidebarOpen = false)}
    ></button>
  {/if}

  <aside
    class={`fixed inset-y-0 left-0 z-40 w-[280px] bg-[var(--sidebar)] text-white shadow-2xl shadow-primary/20 transition-all duration-300 ${
      mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
    } lg:translate-x-0 ${
      sidebarExpanded ? "lg:w-[280px]" : "lg:w-[88px]"
    }`}
    on:mouseenter={() => (sidebarHovered = true)}
    on:mouseleave={() => (sidebarHovered = false)}
  >
    <div class="flex h-full flex-col p-5">
      <div class={`flex items-center gap-3 rounded-2xl bg-white/10 p-3 shadow-lg shadow-black/10 ${sidebarExpanded ? "" : "lg:justify-center"}`}>
        <Avatar src={userImage} alt={`Foto de ${userName}`} fallback={userInitials} className="h-11 w-11" />
        <div class={sidebarExpanded ? "min-w-0 flex-1" : "lg:hidden"}>
          <h1 class="max-w-[10.5rem] overflow-hidden break-words text-sm font-black leading-tight tracking-tight [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {userName}
          </h1>
          <p class="mt-1 max-w-[10.5rem] truncate font-mono text-[0.68rem] font-medium uppercase tracking-[0.16em] text-white/45">
            {userRole}
          </p>
        </div>
        <button
          type="button"
          class="ml-auto grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white/80 transition hover:bg-white/15 hover:text-white lg:hidden"
          aria-label="Cerrar menú"
          on:click={() => (mobileSidebarOpen = false)}
        >
          <X size={18} />
        </button>
      </div>

      <nav class="mt-8 space-y-1">
        {#each navigationItems as item}
          <button
            class={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
              activeTab === item.id
                ? "bg-white/15 text-white shadow-sm shadow-black/10"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            } ${sidebarExpanded ? "" : "lg:justify-center"}`}
            title={item.label}
            on:click={() => handleNavigate(item.id)}
          >
            {#if activeTab === item.id}
              <span class="absolute left-0 h-7 w-1 rounded-r-full bg-white"></span>
            {/if}
            <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-white">
              <svelte:component this={getNavigationIcon(item.id)} size={18} />
            </span>
            <span class={sidebarExpanded ? "" : "lg:hidden"}>{item.label}</span>
            {#if !sidebarExpanded}
              <span class="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white opacity-0 shadow-xl transition group-hover:opacity-100 lg:block">
                {item.label}
              </span>
            {/if}
          </button>
        {/each}
      </nav>

      <button
        type="button"
        class={`group relative mt-auto flex w-full items-center gap-3 rounded-2xl bg-white/10 p-3 text-sm font-bold text-white/80 shadow-lg shadow-black/10 transition hover:bg-white/15 hover:text-white ${
          sidebarExpanded ? "" : "lg:justify-center"
        }`}
        title="Cerrar sesión"
        on:click={handleLogout}
      >
        <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-white">
          <LogOut size={18} />
        </span>
        <span class={sidebarExpanded ? "" : "lg:hidden"}>Salir</span>
        {#if !sidebarExpanded}
          <span class="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white opacity-0 shadow-xl transition group-hover:opacity-100 lg:block">
            Salir
          </span>
        {/if}
      </button>
    </div>
  </aside>

  <main class={`min-h-screen flex-1 transition-all duration-300 ${sidebarExpanded ? "lg:ml-[280px]" : "lg:ml-[88px]"}`}>
    <header class="sticky top-0 z-30 bg-white/80 px-5 py-4 shadow-sm shadow-primary/5 backdrop-blur-xl lg:px-8">
      <div class="mx-auto flex max-w-[1440px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="grid h-11 w-11 place-items-center rounded-xl bg-white text-primary shadow-lg shadow-primary/10 lg:hidden"
            aria-label="Abrir menú"
            on:click={() => (mobileSidebarOpen = true)}
          >
            <Menu size={22} />
          </button>
          <div>
            <p class="text-sm font-medium text-muted-foreground">Insignias verificables · Panel administrativo</p>
            <h2 class="text-2xl font-black tracking-tight text-foreground">{pageTitle}</h2>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 sm:items-center">
          <slot name="actions" />
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-[1440px] space-y-6 p-5 lg:p-8">
      <slot />
    </div>
  </main>
</div>
