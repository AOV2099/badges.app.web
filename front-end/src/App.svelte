<script>
  import { onMount } from "svelte";
  import { apiRequest, defaultApiBaseUrl } from "$lib/api";
  import { getSlugFromUrl } from "$lib/utils";
  import AppShell from "$lib/components/AppShell.svelte";
  import AchievementsView from "$lib/views/AchievementsView.svelte";
  import ActivityView from "$lib/views/ActivityView.svelte";
  import BadgesView from "$lib/views/BadgesView.svelte";
  import DashboardView from "$lib/views/DashboardView.svelte";
  import IssueView from "$lib/views/IssueView.svelte";
  import PublicBadgeView from "$lib/views/PublicBadgeView.svelte";
  import SettingsView from "$lib/views/SettingsView.svelte";
  import VerifierView from "$lib/views/VerifierView.svelte";

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

  function getPublicBadgeIdFromPath() {
    const publicBadgeMatch = globalThis.window?.location?.pathname.match(/^\/badge\/([^/?#]+)/);
    return publicBadgeMatch ? decodeURIComponent(publicBadgeMatch[1]) : "";
  }

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: "◆" },
    { id: "badges", label: "Badges", icon: "◈" },
    { id: "issue", label: "Emitir", icon: "✦" },
    { id: "activity", label: "Actividad", icon: "◌" },
    { id: "achievements", label: "Achievements", icon: "▣" },
    { id: "verifier", label: "Verificador", icon: "✓" },
    { id: "settings", label: "Configuración", icon: "⚙" }
  ];

  const pageTitles = {
    dashboard: "Dashboard",
    badges: "Badges emitidas",
    issue: "Emitir badge",
    activity: "Actividad",
    achievements: "Achievements",
    verifier: "Verificador",
    settings: "Issuer & configuración"
  };

  let apiBaseUrl = defaultApiBaseUrl;
  let achievements = [];
  let badges = [];
  let loading = false;
  let saving = false;
  let activeTab = "dashboard";
  let selectedBadge = null;
  let previewBadge = null;
  let verifyResult = null;
  let toast = "";
  let manualJwt = "";
  let publicBadgeId = getPublicBadgeIdFromPath();
  let achievementForm = emptyAchievementForm();
  let editingAchievementId = "";
  let issueForm = {
    recipientEmail: "",
    recipientName: "",
    achievementId: ""
  };

  $: achievementOptions = achievements.map((achievement) => ({
    value: getSlugFromUrl(achievement.id),
    label: achievement.name
  }));

  $: activeBadges = badges.filter((badge) => badge.status !== "revoked").length;
  $: revokedBadges = badges.filter((badge) => badge.status === "revoked").length;
  $: latestBadges = badges.slice(0, 5);
  $: pageTitle = pageTitles[activeTab] || "Dashboard";
  $: activity = badges
    .flatMap((badge) => {
      const subject = badge.credential?.credentialSubject;
      const issued = {
        type: "issued",
        title: `Badge emitida a ${subject?.name || "receptor"}`,
        description: subject?.achievement?.name || "Achievement sin nombre",
        date: badge.issuedAt,
        badgeId: badge.id
      };

      if (badge.status !== "revoked") return [issued];

      return [
        issued,
        {
          type: "revoked",
          title: `Badge revocada: ${subject?.name || "receptor"}`,
          description: badge.revokedReason || "Sin razón registrada",
          date: badge.revokedAt,
          badgeId: badge.id
        }
      ];
    })
    .sort((left, right) => new Date(right.date) - new Date(left.date));

  onMount(() => {
    const savedApiBaseUrl = localStorage.getItem("badges-api-base-url");
    apiBaseUrl = savedApiBaseUrl === "http://localhost:3000"
      ? defaultApiBaseUrl
      : savedApiBaseUrl || defaultApiBaseUrl;

    if (publicBadgeId) return;

    loadAll();
  });

  function navigate(tab) {
    activeTab = tab;
  }

  function notify(message) {
    toast = message;
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => {
      toast = "";
    }, 3200);
  }

  async function request(path, options = {}) {
    return apiRequest(apiBaseUrl, path, options);
  }

  async function loadAll() {
    loading = true;
    verifyResult = null;

    try {
      const [nextAchievements, nextBadges] = await Promise.all([
        request("/achievements"),
        request("/badges")
      ]);

      achievements = nextAchievements;
      badges = nextBadges;

      if (!issueForm.achievementId && achievements[0]) {
        issueForm.achievementId = getSlugFromUrl(achievements[0].id);
      }

      if (!selectedBadge && nextBadges[0]) {
        selectedBadge = nextBadges[0];
      }
    } catch (error) {
      notify(`No pude conectar con el backend: ${error.message}`);
    } finally {
      loading = false;
    }
  }

  function saveSettings() {
    apiBaseUrl = apiBaseUrl.replace(/\/$/, "");
    localStorage.setItem("badges-api-base-url", apiBaseUrl);
    notify("URL del backend guardada");
    loadAll();
  }

  function patchAchievementForm(patch) {
    achievementForm = { ...achievementForm, ...patch };
  }

  function patchIssueForm(patch) {
    issueForm = { ...issueForm, ...patch };
    previewBadge = null;
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
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(achievementForm.id || "")
      && String(achievementForm.name || "").trim().length >= 2
      && String(achievementForm.description || "").trim().length >= 10
      && String(achievementForm.criteriaNarrative || "").trim().length >= 10
      && isValidAchievementImageUrl(achievementForm.imageId)
      && achievementValidityPresets.includes(achievementForm.validityPreset);
  }

  async function saveAchievement() {
    if (!isAchievementFormValid()) {
      notify("Completa todos los datos del achievement correctamente");
      return;
    }

    saving = true;

    try {
      const payload = {
        id: achievementForm.id.trim(),
        name: achievementForm.name.trim(),
        description: achievementForm.description.trim(),
        criteriaNarrative: achievementForm.criteriaNarrative.trim(),
        imageId: achievementForm.imageId.trim(),
        validityPreset: achievementForm.validityPreset,
        validUntil: achievementForm.validityPreset === "custom" ? achievementForm.validUntil || null : null,
        revocable: achievementForm.revocable
      };

      if (editingAchievementId) {
        await request(`/achievements/${editingAchievementId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        notify("Achievement actualizado");
      } else {
        await request("/achievements", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        notify("Achievement creado");
      }

      resetAchievementForm();
      await loadAll();
    } catch (error) {
      notify(error.message);
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
      name: achievement.name,
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

    if (!window.confirm(`¿Eliminar el achievement "${achievement.name}"?`)) return;

    try {
      await request(`/achievements/${slug}`, { method: "DELETE" });
      notify("Achievement eliminado");
      await loadAll();
    } catch (error) {
      notify(error.message);
    }
  }

  async function issueBadge() {
    saving = true;

    try {
      const issuedBadge = await request("/badges/issue", {
        method: "POST",
        body: JSON.stringify(issueForm)
      });

      selectedBadge = issuedBadge;
      previewBadge = issuedBadge;
      activeTab = "badges";
      issueForm = {
        recipientEmail: "",
        recipientName: "",
        achievementId: issueForm.achievementId
      };
      notify("Badge emitido correctamente");
      await loadAll();
    } catch (error) {
      notify(error.message);
    } finally {
      saving = false;
    }
  }

  async function verifyJwt(jwt, badge = null) {
    if (!jwt || jwt === "preview.jwt.openbadge") {
      notify("Emite una badge real para verificarla");
      return;
    }

    try {
      verifyResult = await request("/badges/verify", {
        method: "POST",
        body: JSON.stringify({ jwt })
      });
      selectedBadge = badge || selectedBadge;
      notify(verifyResult.valid ? "Badge válido" : "Badge inválido");
    } catch (error) {
      notify(error.message);
    }
  }

  async function verifyBadge(badge) {
    await verifyJwt(badge.jwt, badge);
  }

  async function verifyManualJwt() {
    await verifyJwt(manualJwt);
  }

  async function revokeBadge(badge) {
    const reason = window.prompt("Razón de revocación", "Revocado desde el panel admin");
    if (reason === null) return;

    try {
      await request(`/badges/${badge.id}/revoke`, {
        method: "POST",
        body: JSON.stringify({ reason })
      });
      notify("Badge revocado");
      await loadAll();
    } catch (error) {
      notify(error.message);
    }
  }

  async function deleteBadge(badge) {
    if (!window.confirm("¿Eliminar este registro local? La credencial compartida no se borra fuera de este servidor.")) {
      return;
    }

    try {
      await request(`/badges/${badge.id}`, { method: "DELETE" });
      selectedBadge = selectedBadge?.id === badge.id ? null : selectedBadge;
      notify("Registro eliminado");
      await loadAll();
    } catch (error) {
      notify(error.message);
    }
  }

  async function copyJwt(badge) {
    if (!badge?.jwt || badge.jwt === "preview.jwt.openbadge") {
      notify("La previsualización aún no tiene JWT real");
      return;
    }

    await navigator.clipboard.writeText(badge.jwt);
    notify("JWT copiado al portapapeles");
  }

  function statusVariant(status) {
    if (status === "revoked") return "destructive";
    if (status === "active") return "default";
    if (status === "preview") return "warning";
    return "secondary";
  }
</script>

{#if publicBadgeId}
  <PublicBadgeView {apiBaseUrl} badgeId={publicBadgeId} />
{:else}
  <AppShell
    {activeTab}
    {apiBaseUrl}
    {loading}
    {pageTitle}
    {navigationItems}
    {toast}
    onNavigate={navigate}
    onApiBaseUrlChange={(value) => (apiBaseUrl = value)}
    onSaveSettings={saveSettings}
    onReload={loadAll}
    onIssue={() => navigate("issue")}
  >
    {#if activeTab === "dashboard"}
      <DashboardView
        {achievements}
        {badges}
        {activeBadges}
        {revokedBadges}
        {loading}
        {latestBadges}
        {statusVariant}
        onNavigate={navigate}
      />
    {/if}

    {#if activeTab === "badges"}
      <BadgesView
        {badges}
        {verifyResult}
        {loading}
        {statusVariant}
        onReload={loadAll}
        onSelect={(badge) => (selectedBadge = badge)}
        onVerify={verifyBadge}
        onCopy={copyJwt}
        onRevoke={revokeBadge}
        onDelete={deleteBadge}
      />
    {/if}

    {#if activeTab === "issue"}
      <IssueView
        {achievements}
        {achievementOptions}
        {issueForm}
        {saving}
        {previewBadge}
        {apiBaseUrl}
        onIssueFormChange={patchIssueForm}
        onSubmit={issueBadge}
        onVerify={verifyBadge}
        onCopy={copyJwt}
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
      />
    {/if}

    {#if activeTab === "verifier"}
      <VerifierView
        {manualJwt}
        {verifyResult}
        onJwtChange={(value) => (manualJwt = value)}
        onSubmit={verifyManualJwt}
      />
    {/if}

    {#if activeTab === "settings"}
      <SettingsView
        {apiBaseUrl}
        onApiBaseUrlChange={(value) => (apiBaseUrl = value)}
        onSave={saveSettings}
        onReload={loadAll}
      />
    {/if}
  </AppShell>
{/if}
