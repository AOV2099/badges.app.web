<script>
  import { onMount } from "svelte";
  import ArrowRight from "lucide-svelte/icons/arrow-right";
  import CircleCheck from "lucide-svelte/icons/circle-check";
  import CircleX from "lucide-svelte/icons/circle-x";
  import Eye from "lucide-svelte/icons/eye";
  import EyeOff from "lucide-svelte/icons/eye-off";
  import LoaderCircle from "lucide-svelte/icons/loader-circle";
  import LockKeyhole from "lucide-svelte/icons/lock-keyhole";
  import Mail from "lucide-svelte/icons/mail";
  import ShieldCheck from "lucide-svelte/icons/shield-check";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Label from "$lib/components/ui/Label.svelte";
  import { apiRequest } from "$lib/api";

  export let onSubmit = () => {};
  export let apiBaseUrl = "";

  let email = "";
  let password = "";
  let loginState = "idle";
  let showPassword = false;

  $: formIsValid = Boolean(email.trim() && password.trim());
  $: isLoading = loginState === "loading";
  $: buttonLabel = loginState === "loading"
    ? "Validando acceso..."
    : loginState === "success"
      ? "Acceso correcto"
      : loginState === "error"
        ? "No se pudo iniciar sesión"
        : "Entrar al portal";
  $: buttonClass = `w-full transition-all duration-300 ${
    loginState === "success"
      ? "bg-emerald-600 text-white hover:bg-emerald-700"
      : loginState === "error"
        ? "bg-red-600 text-white hover:bg-red-700"
        : ""
  }`;

  async function submitPasswordLogin() {
    if (!formIsValid || isLoading) return;

    loginState = "loading";

    try {
      const result = await apiRequest(apiBaseUrl, "/auth/password/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      loginState = "success";
      onSubmit(result);
      window.setTimeout(() => {
        loginState = "idle";
      }, 1800);
    } catch (error) {
      loginState = "error";
      onSubmit({ accessGranted: false, error: error.message || "No se pudo iniciar sesión." });
    }
  }

  function beginGoogleLogin() {
    if (isLoading) return;

    loginState = "loading";

    const nonce = createOAuthNonce();
    const state = btoa(JSON.stringify({ nonce, returnTo: window.location.origin }));
    localStorage.setItem("badges-google-oauth-state", nonce);
    window.location.href = `${apiBaseUrl}/auth/google/start?state=${encodeURIComponent(state)}`;
  }

  function createOAuthNonce() {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }

    if (globalThis.crypto?.getRandomValues) {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }

  onMount(() => {
    const url = new URL(window.location.href);
    const googleAuth = url.searchParams.get("googleAuth");

    if (!googleAuth) return;

    const returnedState = url.searchParams.get("state") || "";
    const savedState = localStorage.getItem("badges-google-oauth-state") || "";
    localStorage.removeItem("badges-google-oauth-state");
    const parsedState = parseGoogleOAuthState(returnedState);

    if (!savedState || parsedState.nonce !== savedState) {
      loginState = "error";
      onSubmit({ accessGranted: false, error: "No se pudo validar la respuesta de Google. Intenta de nuevo." });
      return;
    }

    if (googleAuth === "success") {
      const googleEmail = url.searchParams.get("email") || "";
      const googleName = url.searchParams.get("name") || googleEmail;
      const googlePicture = url.searchParams.get("picture") || "";
      email = googleEmail;
      loginState = "success";
      onSubmit({ accessGranted: true, email: googleEmail, name: googleName, picture: googlePicture, provider: "google" });
      return;
    }

    loginState = "error";
    onSubmit({ accessGranted: false, error: url.searchParams.get("reason") || "Google no permitió iniciar sesión." });
  });

  function parseGoogleOAuthState(state) {
    try {
      return JSON.parse(atob(state));
    } catch {
      return {};
    }
  }
</script>

<main class="min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
  <div class="relative grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
    <section class="relative hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
      <div class="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10"></div>
      <div class="absolute -bottom-32 left-12 h-96 w-96 rounded-full bg-blue-300/10"></div>
      <div class="pointer-events-none absolute inset-0 hidden place-items-center lg:grid">
        <img
          src="https://amei.mx/wp-content/uploads/2016/08/UNAM-FES-Aragon.png"
          alt=""
          class="w-[48rem] opacity-10 invert brightness-0"
        />
      </div>

      <div class="relative flex items-center gap-3">
        <div class="grid h-14 w-14 place-items-center rounded-2xl bg-white p-2 shadow-xl shadow-black/10">
          <img
            src="https://www.zaragoza.unam.mx/wp-content/Portal2015/Descargas/logo_unam_azul.png"
            alt="Logo UNAM"
            class="h-full w-full object-contain"
          />
        </div>
        <div>
          <p class="text-sm font-semibold text-white/60">UNIVERSIDAD NACIONAL AUTÓNOMA DE MÉXICO</p>
          <h1 class="text-lg font-black tracking-tight">Consola de emisión</h1>
        </div>
      </div>

      <div class="relative max-w-xl">
        
        <h2 class="text-5xl font-black tracking-tight">Administración de insignias académicas</h2>
        <p class="mt-5 text-lg leading-8 text-white/70">
          Emite, consulta y revoca insignias.
        </p>
      </div>

      <p class="relative text-sm font-semibold text-white/50">UNAM · F.E.S. Aragón</p>
    </section>

    <section class="relative flex items-center justify-center p-5 lg:p-10">
      <div class="absolute right-8 top-8 hidden rounded-full bg-secondary px-4 py-2 text-sm font-bold text-primary shadow-lg shadow-primary/5 sm:block">
        Acceso administrativo
      </div>

      <Card className="w-full max-w-md p-8 shadow-2xl shadow-primary/10">
        <div class="mb-8 text-center">
          <div class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
            <LockKeyhole size={26} />
          </div>
          <h2 class="mt-5 text-2xl font-black tracking-tight text-foreground">Iniciar sesión</h2>
          <p class="mt-2 text-sm text-muted-foreground">Entra al panel de administración de insignias.</p>
        </div>

        <form class="space-y-4" on:submit|preventDefault={submitPasswordLogin}>
          <div class="space-y-2">
            <Label>Correo institucional</Label>
            <div class="relative">
              <Mail class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                type="email"
                placeholder="usuario@aragon.unam.mx"
                disabled={isLoading}
                value={email}
                on:input={(event) => (email = event.target.value)}
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label>Contraseña</Label>
            <div class="relative">
              <LockKeyhole class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10 pr-12"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                disabled={isLoading}
                value={password}
                on:input={(event) => (password = event.target.value)}
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-primary disabled:pointer-events-none disabled:opacity-50"
                disabled={isLoading}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                on:click={() => (showPassword = !showPassword)}
              >
                {#if showPassword}
                  <EyeOff size={18} />
                {:else}
                  <Eye size={18} />
                {/if}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={!formIsValid || isLoading} className={buttonClass}>
            {buttonLabel}
            {#if loginState === "loading"}
              <LoaderCircle class="animate-spin ms-2" size={18} />
            {:else if loginState === "success"}
              <CircleCheck size={18} class="ms-2" />
            {:else if loginState === "error"}
              <CircleX size={18} class="ms-2" />
            {:else}
              <ArrowRight size={18} class="ms-2" />
            {/if}
          </Button>
        </form>

        <button
          type="button"
          on:click={beginGoogleLogin}
          disabled={isLoading}
          class="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-secondary p-4 text-sm font-bold text-foreground shadow-inner shadow-primary/5 transition hover:bg-secondary/80"
        >
          <span class="grid h-7 w-7 place-items-center rounded-full bg-white font-black text-primary shadow-sm">G</span>
          Inicia sesión con Google
        </button>
      </Card>
    </section>
  </div>
</main>
