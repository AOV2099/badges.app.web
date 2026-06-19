<script>
  import { onMount } from "svelte";
  import { Download, Plus, Upload } from "lucide-svelte";
  import toast, { Toaster } from "svelte-french-toast";
  import { apiRequest, defaultApiBaseUrl } from "$lib/api";
  import { buildAchievementId, getSlugFromUrl, toDisplayUppercase } from "$lib/utils";
  import AppShell from "$lib/components/AppShell.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import AchievementsView from "$lib/views/AchievementsView.svelte";
  import ActivityView from "$lib/views/ActivityView.svelte";
  import BadgesView from "$lib/views/BadgesView.svelte";
  import DashboardView from "$lib/views/DashboardView.svelte";
  import IssueView from "$lib/views/IssueView.svelte";
  import LoginView from "$lib/views/LoginView.svelte";
  import PublicBadgeView from "$lib/views/PublicBadgeView.svelte";
  import SettingsView from "$lib/views/SettingsView.svelte";
  import DivisionsView from "$lib/views/DivisionsView.svelte";
  import PendingBadgesView from "$lib/views/PendingBadgesView.svelte";
  import SuperUsersView from "$lib/views/SuperUsersView.svelte";

  const emptyAchievementForm = () => ({
    id: "",
    name: "",
    description: "",
    criteriaNarrative: "",
    imageId: "",
    validUntil: "",
    validityPreset: "1y",
    revocable: true
  });

  const achievementValidityPresets = ["6m", "1y", "3y", "none"];
  const authStorageKey = "badges-auth-profile";
  const legacyGoogleStorageKey = "badges-google-profile";
  const toastOptions = {
    duration: 3200,
    position: "bottom-right",
    style:
      "border-radius: 18px; background: #ffffff; color: #082f62; box-shadow: 0 18px 45px rgba(8, 47, 98, 0.16); font-weight: 700;",
    iconTheme: {
      primary: "#0b4f9f",
      secondary: "#eff6ff"
    }
  };

  function getPublicBadgeIdFromPath() {
    const publicBadgeMatch = globalThis.window?.location?.pathname.match(/^\/badge\/([^/?#]+)/);
    return publicBadgeMatch ? decodeURIComponent(publicBadgeMatch[1]) : "";
  }

  function getIsLoginPath() {
    return globalThis.window?.location?.pathname.replace(/\/+$/, "") === "/login";
  }

  function getIsDashboardPath() {
    const normalizedPath = globalThis.window?.location?.pathname.replace(/\/+$/, "") || "";
    return normalizedPath === "/dashboard" || normalizedPath.startsWith("/dashboard/");
  }

  function isAuthenticatedUser(user) {
    return ["google", "password"].includes(user?.provider) && Boolean(user.email);
  }

  const baseNavigationItems = [
    { id: "dashboard", label: "Panel" },
    { id: "badges", label: "Insignias" },
    { id: "issue", label: "Emitir" },
    { id: "activity", label: "Actividad" },
    { id: "achievements", label: "Logros" },
    { id: "settings", label: "Configuración" }
  ];

  const pageTitles = {
    dashboard: "Panel",
    badges: "Insignias emitidas",
    issue: "Emitir insignia",
    activity: "Actividad",
    achievements: "Logros",
    settings: "Configuración",
    pending: "Pendientes",
    "super-users": "Super usuarios",
    divisions: "Divisiones"
  };

  let apiBaseUrl = defaultApiBaseUrl;
  let achievements = [];
  let badges = [];
  let loading = false;
  let saving = false;
  let verifying = false;
  let activeTab = "dashboard";
  let selectedBadge = null;
  let verifyResult = null;
  let settingsVerifyResult = null;
  let publicBadgeId = getPublicBadgeIdFromPath();
  let isLoginPath = getIsLoginPath();
  let isDashboardPath = getIsDashboardPath();
  let currentUser = {
    name: "Nombre de usuario",
    email: "",
    picture: "",
    provider: "",
    type: "general"
  };
  let achievementForm = emptyAchievementForm();
  let editingAchievementId = "";
  let issueView;
  let badgesSearchQuery = "";
  let reviewEvents = [];

  $: achievementOptions = achievements.map((achievement) => ({
    value: getSlugFromUrl(achievement.id),
    label: achievement.name
  }));

  $: activeBadges = badges.filter((badge) => badge.status !== "revoked").length;
  $: revokedBadges = badges.filter((badge) => badge.status === "revoked").length;
  $: latestBadges = badges.slice(0, 15);
  $: pageTitle = pageTitles[activeTab] || "Panel";
  $: displayUserName = currentUser.name || currentUser.email || "Nombre de usuario";
  $: displayUserRole = formatUserRole(currentUser.type);
  $: achievementDivisionAbbreviation = String(currentUser.divisionId || "ICO").trim() || "ICO";
  $: isSuperUser = ["super_usuario", "super_usuerio"].includes(String(currentUser.type || "").toLowerCase());
  $: isAdminOrSuperUser = isSuperUser || String(currentUser.type || "").toLowerCase() === "administrador";
  $: navigationItems = isSuperUser
    ? [
        ...baseNavigationItems,
        { id: "pending", label: "Pendientes" },
        { id: "super-users", label: "Super usuarios" },
        { id: "divisions", label: "Divisiones" }
      ]
    : isAdminOrSuperUser
      ? [...baseNavigationItems, { id: "pending", label: "Pendientes" }]
      : baseNavigationItems;
  $: if (activeTab === "pending" && !isAdminOrSuperUser) activeTab = "dashboard";
  $: if (activeTab === "super-users" && !isSuperUser) activeTab = "dashboard";
  $: if (activeTab === "divisions" && !isSuperUser) activeTab = "dashboard";
  $: badgeActivity = badges.flatMap((badge) => {
    const subject = badge.credential?.credentialSubject;
    const achievementName = subject?.achievement?.name || "Logro sin nombre";
    const approvalLabel = badge.status === "pending_review" ? "Pendiente" : "Aprobada";
    const issuedType = badge.status === "pending_review" ? "pending" : "issued";
    const issued = {
      type: issuedType,
      title:
        badge.status === "pending_review"
          ? `Insignia en revisión para ${subject?.name || "receptor"}`
          : `Insignia emitida a ${subject?.name || "receptor"}`,
      description: `${achievementName} · Estado: ${approvalLabel}`,
      date: badge.issuedAt,
      badgeId: badge.id
    };

    if (badge.status !== "revoked") return [issued];

    return [
      issued,
      {
        type: "revoked",
        title: `Insignia revocada: ${subject?.name || "receptor"}`,
        description: badge.revokedReason || "Sin razón registrada",
        date: badge.revokedAt,
        badgeId: badge.id
      }
    ];
  });
  $: rejectedBatchActivity = reviewEvents
    .filter((item) => item.action === "deny")
    .map((item) => ({
    type: "rejected_batch",
    title: `Solicitudes rechazadas: ${item.processed_count}`,
    description: `Se rechazaron ${item.processed_count} insignia(s) pendiente(s) y se eliminaron sus registros para evitar basura en la base de datos.`,
    date: item.created_at,
    badgeId: item.id
  }));
  $: activity = [...badgeActivity, ...rejectedBatchActivity].sort(
    (left, right) => new Date(right.date) - new Date(left.date)
  );

  onMount(() => {
    const savedApiBaseUrl = localStorage.getItem("badges-api-base-url");
    const savedUser = localStorage.getItem(authStorageKey) || localStorage.getItem(legacyGoogleStorageKey);
    apiBaseUrl = savedApiBaseUrl === "http://localhost:3000"
      ? defaultApiBaseUrl
      : savedApiBaseUrl || defaultApiBaseUrl;

    if (savedUser) {
      try {
        const parsedUser = { ...currentUser, ...JSON.parse(savedUser) };
        if (isAuthenticatedUser(parsedUser)) {
          currentUser = parsedUser;
          localStorage.setItem(authStorageKey, JSON.stringify(currentUser));
          localStorage.removeItem(legacyGoogleStorageKey);
        } else {
          localStorage.removeItem(authStorageKey);
          localStorage.removeItem(legacyGoogleStorageKey);
        }
      } catch {
        localStorage.removeItem(authStorageKey);
        localStorage.removeItem(legacyGoogleStorageKey);
      }
    }

    if (!publicBadgeId && !isLoginPath && !isDashboardPath) {
      history.replaceState(null, "", "/login");
      isLoginPath = true;
      return;
    }

    if (isDashboardPath && !isAuthenticatedUser(currentUser)) {
      history.replaceState(null, "", "/login");
      isLoginPath = true;
      isDashboardPath = false;
      return;
    }

    if (publicBadgeId || isLoginPath) return;

    loadAll();
  });

  function navigate(tab) {
    activeTab = tab;
  }

  function logout() {
    localStorage.removeItem(authStorageKey);
    localStorage.removeItem(legacyGoogleStorageKey);
    currentUser = {
      name: "Nombre de usuario",
      email: "",
      picture: "",
      provider: "",
      type: "general"
    };
    notify("Sesión cerrada", "success");
    activeTab = "dashboard";
    history.replaceState(null, "", "/login");
    isLoginPath = true;
    isDashboardPath = false;
  }

  function navigateToIssue() {
    activeTab = "issue";
  }

  function viewIssuedBadgesForAchievement(achievement) {
    badgesSearchQuery = getSlugFromUrl(achievement.id) || achievement.name || "";
    activeTab = "badges";
  }

  function formatUserRole(type) {
    const normalizedType = String(type || "").toLowerCase();

    if (["super_usuario", "super_usuerio"].includes(normalizedType)) return "Super usuario";
    if (normalizedType === "administrador") return "Administrador";
    return "General";
  }

  function submitLogin({ accessGranted, provider, email, name, picture, user, error } = {}) {
    const loginUser = user || { email, name, picture, provider };
    const loginProvider = provider || loginUser.provider;

    notify(
      accessGranted ? (loginProvider === "google" ? "Acceso con Google concedido" : "Acceso concedido") : error || "No se pudo iniciar sesión",
      accessGranted ? "success" : "error"
    );

    if (accessGranted && ["google", "password"].includes(loginProvider) && isLoginPath) {
      currentUser = {
        name: loginUser.name || loginUser.email || "Nombre de usuario",
        email: loginUser.email || "",
        picture: loginUser.picture || "",
        provider: loginProvider,
        type: loginUser.type || "general"
      };
      localStorage.setItem(authStorageKey, JSON.stringify(currentUser));
      localStorage.removeItem(legacyGoogleStorageKey);
      history.replaceState(null, "", "/dashboard");
      isLoginPath = false;
      isDashboardPath = true;
      loadAll();
    }
  }

  function notify(message, variant = "default") {
    if (variant === "success") {
      toast.success(message, toastOptions);
      return;
    }

    if (variant === "error") {
      toast.error(message, toastOptions);
      return;
    }

    toast(message, toastOptions);
  }

  async function request(path, options = {}) {
    return apiRequest(apiBaseUrl, path, options);
  }

  async function loadAll() {
    loading = true;
    verifyResult = null;

    try {
      const eventPath = isAdminOrSuperUser && currentUser.email
        ? `/admin/pending-badges/events?requesterEmail=${encodeURIComponent(currentUser.email)}&limit=200`
        : null;
      const [nextAchievements, nextBadges, nextReviewEvents] = await Promise.all([
        request("/achievements"),
        request("/badges"),
        eventPath ? request(eventPath) : Promise.resolve([])
      ]);

      achievements = nextAchievements;
      badges = nextBadges;
      reviewEvents = Array.isArray(nextReviewEvents) ? nextReviewEvents : [];

      if (!selectedBadge && nextBadges[0]) {
        selectedBadge = nextBadges[0];
      }
    } catch (error) {
      notify(`No pude conectar con el backend: ${error.message}`, "error");
    } finally {
      loading = false;
    }
  }

  function patchAchievementForm(patch) {
    const nextPatch = { ...patch };

    if ("name" in nextPatch) {
      nextPatch.name = toDisplayUppercase(nextPatch.name);
    }

    achievementForm = { ...achievementForm, ...nextPatch };
  }

  function isValidAchievementImageUrl(value) {
    const imageExtensionPattern = /\.(svg|png|jpe?g|webp|gif)(\?.*)?$/i;
    const normalizedValue = String(value || "").trim();

    if (normalizedValue.startsWith("/")) {
      return imageExtensionPattern.test(normalizedValue);
    }

    try {
      const url = new URL(normalizedValue);
      return ["http:", "https:"].includes(url.protocol) && imageExtensionPattern.test(url.pathname + url.search);
    } catch {
      return false;
    }
  }

  function isAchievementFormValid() {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(editingAchievementId || buildAchievementId(achievementForm.name, achievementDivisionAbbreviation))
      && String(achievementForm.name || "").trim().length >= 2
      && String(achievementForm.description || "").trim().length >= 10
      && String(achievementForm.criteriaNarrative || "").trim().length >= 10
      && isValidAchievementImageUrl(achievementForm.imageId)
      && achievementValidityPresets.includes(achievementForm.validityPreset);
  }

  async function saveAchievement() {
    if (!isAchievementFormValid()) {
      notify("Completa todos los datos del logro correctamente");
      return;
    }

    saving = true;

    try {
      const achievementId = editingAchievementId || buildAchievementId(achievementForm.name, achievementDivisionAbbreviation);
      const payload = {
        id: achievementId,
        name: toDisplayUppercase(achievementForm.name).trim(),
        description: achievementForm.description.trim(),
        criteriaNarrative: achievementForm.criteriaNarrative.trim(),
        imageId: achievementForm.imageId.trim(),
        validityPreset: achievementForm.validityPreset,
        validUntil: achievementForm.validityPreset === "custom" ? achievementForm.validUntil || null : null,
        revocable: achievementForm.revocable,
        requesterEmail: currentUser.email || ""
      };

      if (editingAchievementId) {
        await request(`/achievements/${editingAchievementId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        notify("Logro actualizado", "success");
      } else {
        await request("/achievements", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        notify("Logro creado", "success");
      }

      resetAchievementForm();
      await loadAll();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      saving = false;
    }
  }

  function editAchievement(achievement) {
    const slug = getSlugFromUrl(achievement.id);
    editingAchievementId = slug;
    activeTab = "achievements";
    achievementForm = {
      id: slug,
      name: toDisplayUppercase(achievement.name),
      description: achievement.description,
      criteriaNarrative: achievement.criteria?.narrative || "",
      imageId: achievement.image?.id || "",
      validUntil: achievement.validUntil ? achievement.validUntil.slice(0, 10) : "",
      validityPreset: achievement.validityPreset || (achievement.validUntil ? "custom" : "1y"),
      revocable: achievement.revocable !== false
    };
  }

  function resetAchievementForm() {
    editingAchievementId = "";
    achievementForm = emptyAchievementForm();
  }

  async function deleteAchievement(achievement) {
    const slug = getSlugFromUrl(achievement.id);

    if (!window.confirm(`¿Eliminar el logro "${achievement.name}"?`)) return;

    try {
      await request(`/achievements/${slug}`, { method: "DELETE" });
      notify("Logro eliminado", "success");
      await loadAll();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function issueBadgesBulk(recipients = []) {
    const validRecipients = recipients.filter(
      (recipient) =>
        String(recipient.recipientEmail || "").trim()
        && String(recipient.recipientName || "").trim()
        && String(recipient.achievementId || "").trim()
    );

    if (!validRecipients.length) {
      notify("Selecciona receptores con correo, nombre y logro");
      return [];
    }

    saving = true;

    try {
      const issuedBadges = [];

      for (const recipient of validRecipients) {
        const issuedBadge = await request("/badges/issue", {
          method: "POST",
          body: JSON.stringify({
            recipientEmail: String(recipient.recipientEmail).trim(),
            recipientName: toDisplayUppercase(recipient.recipientName).trim(),
            achievementId: String(recipient.achievementId).trim(),
            requesterEmail: currentUser.email || ""
          })
        });

        issuedBadges.push(issuedBadge);
      }

      const lastIssuedBadge = issuedBadges.at(-1);
      selectedBadge = lastIssuedBadge || selectedBadge;
      activeTab = "badges";
      const pendingCount = issuedBadges.filter((badge) => badge.status === "pending_review").length;
      const activeCount = issuedBadges.length - pendingCount;
      if (pendingCount > 0 && activeCount > 0) {
        notify(`${activeCount} emitidas y ${pendingCount} en revisión`, "success");
      } else if (pendingCount > 0) {
        notify(`${pendingCount} insignias enviadas a revisión`, "success");
      } else {
        notify(`${activeCount} insignias emitidas correctamente`, "success");
      }
      await loadAll();

      return issuedBadges;
    } catch (error) {
      notify(error.message, "error");
      throw error;
    } finally {
      saving = false;
    }
  }

  async function verifyJwt(jwt, badge = null) {
    if (!jwt || jwt === "preview.jwt.openbadge") {
      notify("Emite una insignia real para verificarla");
      return;
    }

    try {
      verifyResult = await request("/badges/verify", {
        method: "POST",
        body: JSON.stringify({ jwt })
      });
      selectedBadge = badge || selectedBadge;
      notify(verifyResult.valid ? "Insignia válida" : "Insignia inválida", verifyResult.valid ? "success" : "error");
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function verifyBadge(badge) {
    await verifyJwt(badge.jwt, badge);
  }

  async function verifyCertificateJwt(jwt) {
    if (!jwt) {
      notify("Pega un JWT para verificarlo");
      return null;
    }

    verifying = true;

    try {
      settingsVerifyResult = await request("/badges/verify", {
        method: "POST",
        body: JSON.stringify({ jwt })
      });
      notify(
        settingsVerifyResult.valid ? "Certificado válido" : "Certificado inválido",
        settingsVerifyResult.valid ? "success" : "error"
      );
      return settingsVerifyResult;
    } catch (error) {
      settingsVerifyResult = {
        valid: false,
        checks: {
          signature: false
        },
        error: error.message
      };
      notify(error.message, "error");
      return settingsVerifyResult;
    } finally {
      verifying = false;
    }
  }

  async function revokeBadge(badge) {
    if (badge?.status === "pending_review") {
      notify("La insignia está en revisión y no puede revocarse", "error");
      return;
    }

    const reason = window.prompt("Razón de revocación", "Revocada desde el panel administrativo");
    if (reason === null) return;

    try {
      await request(`/badges/${badge.id}/revoke`, {
        method: "POST",
        body: JSON.stringify({ reason })
      });
      notify("Insignia revocada", "success");
      await loadAll();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function deleteBadge(badge) {
    if (badge?.status === "pending_review") {
      notify("La insignia está en revisión y no puede eliminarse", "error");
      return;
    }

    if (!window.confirm("¿Eliminar este registro local? La credencial compartida no se borra fuera de este servidor.")) {
      return;
    }

    try {
      await request(`/badges/${badge.id}`, { method: "DELETE" });
      selectedBadge = selectedBadge?.id === badge.id ? null : selectedBadge;
      notify("Registro eliminado", "success");
      await loadAll();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function approveBadge(badge) {
    if (!badge?.id) return;

    try {
      await request(`/badges/${badge.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ requesterEmail: currentUser.email || "" })
      });
      notify("Insignia aprobada y emitida", "success");
      await loadAll();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function copyJwt(badge) {
    if (!badge?.jwt || badge.jwt === "preview.jwt.openbadge") {
      notify("La previsualización aún no tiene JWT real");
      return;
    }

    await navigator.clipboard.writeText(badge.jwt);
    notify("JWT copiado al portapapeles", "success");
  }

  function statusVariant(status) {
    if (status === "revoked") return "destructive";
    if (status === "active") return "default";
    if (status === "pending_review") return "warning";
    if (status === "preview") return "warning";
    return "secondary";
  }
</script>

<Toaster />

{#if publicBadgeId}
  <PublicBadgeView {apiBaseUrl} badgeId={publicBadgeId} />
{:else if isLoginPath}
  <LoginView onSubmit={submitLogin} {apiBaseUrl} />
{:else if isDashboardPath}
  <AppShell
    {activeTab}
    {pageTitle}
    {navigationItems}
    userName={displayUserName}
    userRole={displayUserRole}
    userImage={currentUser.picture}
    onNavigate={navigate}
    onLogout={logout}
  >
    <svelte:fragment slot="actions">
      {#if activeTab === "badges"}
        <Button on:click={navigateToIssue}>Emitir insignia</Button>
      {:else if activeTab === "issue"}
        <Button variant="secondary" on:click={() => issueView?.downloadCsvTemplate()}>
          <Download size={16} />
          Descargar plantilla CSV
        </Button>
        <Button variant="secondary" on:click={() => issueView?.openCsvPicker()}>
          <Upload size={16} />
          Cargar CSV
        </Button>
        <Button on:click={() => issueView?.openRecipientDialog()}>
          <Plus size={16} />
          Agregar receptor
        </Button>
      {/if}
    </svelte:fragment>

    {#if activeTab === "dashboard"}
      <DashboardView
        {achievements}
        {badges}
        {activeBadges}
        {revokedBadges}
        {latestBadges}
        {statusVariant}
        onNavigate={navigate}
      />
    {/if}

    {#if activeTab === "badges"}
      <BadgesView
        {badges}
        {verifyResult}
        {statusVariant}
        searchQuery={badgesSearchQuery}
        onSelect={(badge) => (selectedBadge = badge)}
        onVerify={verifyBadge}
        onCopy={copyJwt}
        onRevoke={revokeBadge}
        onApprove={approveBadge}
        onDelete={deleteBadge}
        canApprove={isAdminOrSuperUser}
      />
    {/if}

    {#if activeTab === "issue"}
      <IssueView
        bind:this={issueView}
        {achievementOptions}
        {saving}
        currentUser={currentUser}
        onBulkSubmit={issueBadgesBulk}
      />
    {/if}

    {#if activeTab === "activity"}
      <ActivityView {activity} />
    {/if}

    {#if activeTab === "achievements"}
      <AchievementsView
        {achievements}
        {badges}
        {achievementForm}
        {editingAchievementId}
        {saving}
        {apiBaseUrl}
        onFormChange={patchAchievementForm}
        onSubmit={saveAchievement}
        onReset={resetAchievementForm}
        onEdit={editAchievement}
        onDelete={deleteAchievement}
        onViewIssued={viewIssuedBadgesForAchievement}
      />
    {/if}

    {#if activeTab === "settings"}
      <SettingsView
        {badges}
        verifying={verifying}
        verificationResult={settingsVerifyResult}
        onVerifyJwt={verifyCertificateJwt}
      />
    {/if}

    {#if activeTab === "pending" && isAdminOrSuperUser}
      <PendingBadgesView
        {apiBaseUrl}
        currentUser={currentUser}
        onNotify={notify}
        onRefresh={loadAll}
      />
    {/if}

    {#if activeTab === "super-users" && isSuperUser}
      <SuperUsersView
        {apiBaseUrl}
        currentUser={currentUser}
        onNotify={notify}
      />
    {/if}

    {#if activeTab === "divisions" && isSuperUser}
      <DivisionsView
        {apiBaseUrl}
        currentUser={currentUser}
        onNotify={notify}
      />
    {/if}
  </AppShell>
{/if}
