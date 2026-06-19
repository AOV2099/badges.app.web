<script>
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import MetricCard from "$lib/components/MetricCard.svelte";
  import { formatDate, formatStatus } from "$lib/utils";
  import { scaleUtc } from "d3-scale";
  import { curveBasisClosed, curveBasisOpen, curveBumpX, curveBumpY, curveLinear, curveMonotoneX } from "d3-shape";
  import { Axis, Chart, ChartClipPath, Spline, Svg, Tooltip } from "layerchart";

  export let achievements = [];
  export let badges = [];
  export let activeBadges = 0;
  export let revokedBadges = 0;
  export let latestBadges = [];
  export let onNavigate = () => {};
  export let statusVariant = () => "secondary";

  const periodOptions = [
    { value: "7", label: "Últimos 7 días" },
    { value: "30", label: "Últimos 30 días" },
    { value: "90", label: "Últimos 90 días" }
  ];
  const chartHeight = 288;
  const chartPadding = { top: 16, right: 16, bottom: 30, left: 20 };
  const chartStroke = "#0b4f9f";

  let selectedPeriod = "30";

  $: recentBadges = latestBadges.slice(0, 15);
  $: selectedPeriodDays = Number(selectedPeriod);
  $: activitySeries = buildActivitySeries(badges, selectedPeriodDays);
  $: recentActivityTotal = activitySeries.reduce((total, item) => total + item.count, 0);
  $: chartMaxValue = Math.max(...activitySeries.map((item) => item.count), 1);
  $: chartDomainMax = chartMaxValue;

  function buildActivitySeries(sourceBadges, periodDays) {
    const today = new Date();
    const days = Array.from({ length: periodDays }, (_, index) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (periodDays - 1 - index));

      return {
        key: date.toISOString().slice(0, 10),
        date,
        label: new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" }).format(date),
        count: 0,
        courses: new Map()
      };
    });
    const dayMap = new Map(days.map((day) => [day.key, day]));

    sourceBadges.forEach((badge) => {
      if (!badge.issuedAt) return;

      const issuedDate = new Date(badge.issuedAt);
      if (Number.isNaN(issuedDate.getTime())) return;

      const key = issuedDate.toISOString().slice(0, 10);
      const day = dayMap.get(key);
      if (day) {
        const achievement = badge.credential?.credentialSubject?.achievement;
        const courseName = achievement?.name || "Logro sin nombre";
        const courseImage = achievement?.image?.id || "";
        const existingCourse = day.courses.get(courseName) || { count: 0, image: courseImage };

        day.count += 1;
        day.courses.set(courseName, {
          count: existingCourse.count + 1,
          image: existingCourse.image || courseImage
        });
      }
    });

    return days.map((day) => ({
      ...day,
      courses: [...day.courses.entries()]
        .map(([name, course]) => ({ name, count: course.count, image: course.image }))
        .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "es-MX"))
    }));
  }

  function formatChartDate(value) {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short"
    }).format(value);
  }
</script>

<section class="flex flex-wrap gap-2">
  <Button size="sm" variant="secondary" on:click={() => onNavigate("issue")}>Emitir</Button>
  <Button size="sm" variant="secondary" on:click={() => onNavigate("achievements")}>Crear logro</Button>
  <Button size="sm" variant="secondary" on:click={() => onNavigate("settings")}>Validar certificado</Button>
</section>

<section class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
  <MetricCard label="Logros" value={achievements.length} description="Plantillas de logro disponibles." />
  <MetricCard label="Insignias activas" value={activeBadges} tone="emerald" description="Credenciales verificables vigentes." />
  <MetricCard label="Revocadas" value={revokedBadges} tone="red" description="Registros invalidados localmente." />
  <MetricCard label="Insignias emitidas" value={badges.length} tone="violet" description="Historial total disponible." />
</section>

<section class="grid gap-6 xl:grid-cols-2">
  <Card className="relative">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h3 class="text-lg font-bold text-foreground">Actividad de emisión</h3>
        <p class="text-sm text-muted-foreground">Insignias emitidas durante el periodo seleccionado.</p>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <Badge variant="secondary">{recentActivityTotal} emitidas</Badge>
        <Select
          value={selectedPeriod}
          options={periodOptions}
          placeholder="Periodo"
          className="w-44"
          on:change={(event) => (selectedPeriod = event.detail.value)}
        />
      </div>
    </div>

    <div class="relative mt-6 overflow-hidden rounded-3xl border border-border bg-white p-4 shadow-inner shadow-primary/5">
      <div class="pointer-events-none absolute inset-x-4 top-4 h-20 rounded-full bg-primary/5 blur-2xl"></div>
      <div class="relative w-full" style:height={`${chartHeight}px`}>
        <Chart
          data={activitySeries}
          padding={chartPadding}
          x="date"
          xScale={scaleUtc()}
          y="count"
          yDomain={[0, chartDomainMax]}
          yNice={false}
          tooltip={{ mode: "bisect-x", radius: 48 }}
        >
          <Svg>
            <Axis
              placement="left"
              grid={{ class: "stroke-[#c7d9ee] stroke-[1.2] opacity-80" }}
              ticks={Math.min(chartDomainMax + 1, 5)}
              format={(value) => `${value}`}
              classes={{ tick: "stroke-border", tickLabel: "fill-muted-foreground text-[11px] font-semibold" }}
            />
            <Axis
              placement="bottom"
              rule={{ class: "stroke-border" }}
              ticks={selectedPeriodDays === 7 ? 7 : 6}
              format={formatChartDate}
              classes={{ tick: "stroke-border", tickLabel: "fill-muted-foreground text-[11px] font-semibold" }}
            />

            <ChartClipPath>
              <Spline y="count" curve={curveMonotoneX}  stroke={chartStroke} strokeWidth={3} />
            </ChartClipPath>
          </Svg>

          <Tooltip.Root variant="none" x="data" anchor="top" yOffset={14} let:data>
      {#if data}
        <div class="max-w-72 rounded-2xl bg-white p-3 text-sm shadow-2xl shadow-primary/20 ring-1 ring-border">
          <div class="flex items-center justify-between gap-4">
            <p class="font-black text-slate-950">{data.label}</p>
            <Badge variant="secondary">{data.count} emitidas</Badge>
          </div>

          <div class="mt-3 space-y-2">
            {#each data.courses as course}
              <div class="flex items-center justify-between gap-4">
                <div class="flex min-w-0 items-center gap-2">
                  {#if course.image}
                    <img
                      src={course.image}
                      alt={`Insignia ${course.name}`}
                      class="h-8 w-8 shrink-0 rounded-lg bg-secondary object-cover shadow-sm shadow-primary/10"
                    />
                  {:else}
                    <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-black text-primary">
                      ✓
                    </span>
                  {/if}

                  <span class="truncate text-slate-600">{course.name}</span>
                </div>

                <span class="font-black text-primary">{course.count}</span>
              </div>
            {:else}
              <p class="font-semibold text-slate-500">Sin emisiones este día.</p>
            {/each}
          </div>
        </div>
      {/if}
          </Tooltip.Root>
        </Chart>
      </div>
    </div>
  </Card>

  <Card>
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-bold text-foreground">Últimas credenciales</h3>
        <p class="text-sm text-muted-foreground">Vista operativa de emisión y estado.</p>
      </div>
      <Button variant="outline" size="sm" on:click={() => onNavigate("badges")}>Ver todas</Button>
    </div>

    <div class="mt-5 max-h-[620px] overflow-auto rounded-2xl bg-white shadow-lg shadow-primary/5">
      <table class="w-full border-collapse text-left text-sm">
        <thead class="sticky top-0 z-10 bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th class="px-4 py-3">Receptor</th>
            <th class="px-4 py-3">Logro</th>
            <th class="px-4 py-3">Estado</th>
            <th class="px-4 py-3">Emitido</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/60 bg-white">
          {#each recentBadges as badge}
            <tr class="hover:bg-secondary/60">
              <td class="px-4 py-4">
                <p class="font-semibold text-foreground">{badge.credential?.credentialSubject?.name}</p>
                <p class="text-xs text-muted-foreground">{badge.credential?.credentialSubject?.id}</p>
              </td>
              <td class="px-4 py-4 text-foreground/80">
                <div class="flex items-center gap-3">
                  <img
                    src={badge.credential?.credentialSubject?.achievement?.image?.id}
                    alt="Insignia"
                    class="h-9 w-9 rounded-lg bg-secondary object-cover shadow-sm shadow-primary/5"
                  />
                  <span>{badge.credential?.credentialSubject?.achievement?.name}</span>
                </div>
              </td>
              <td class="px-4 py-4"><Badge variant={statusVariant(badge.status)}>{formatStatus(badge.status)}</Badge></td>
              <td class="px-4 py-4 text-muted-foreground">{formatDate(badge.issuedAt)}</td>
            </tr>
          {:else}
            <tr>
              <td class="px-4 py-8 text-center text-muted-foreground" colspan="4">Sin insignias emitidas todavía.</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Card>
</section>
