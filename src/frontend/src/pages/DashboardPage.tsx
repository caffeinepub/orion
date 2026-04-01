import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useAllImprovementNotes,
  useCategories,
  useSessionsByTimeRange,
  useSubTopics,
  useUpsertImprovementNote,
} from "../hooks/useQueries";
import type { ImprovementNote, Session } from "../hooks/useQueries";

type Period = "day" | "week" | "month" | "year";

function getTimeRange(period: Period): [bigint, bigint] {
  const now = Date.now();
  const nowNs = BigInt(now) * 1_000_000n;
  let startMs: number;
  switch (period) {
    case "day": {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      startMs = d.getTime();
      break;
    }
    case "week":
      startMs = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case "month":
      startMs = now - 30 * 24 * 60 * 60 * 1000;
      break;
    default:
      startMs = now - 365 * 24 * 60 * 60 * 1000;
      break;
  }
  return [BigInt(startMs) * 1_000_000n, nowNs];
}

function formatDate(ns: bigint): string {
  return new Date(Number(ns / 1_000_000n)).toLocaleString();
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDaysInPeriod(period: Period): string[] {
  const days: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let count = 1;
  if (period === "week") count = 7;
  else if (period === "month") count = 30;
  else if (period === "year") count = 365;
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(formatDateKey(d));
  }
  return days;
}

const DUMBO_MESSAGE = "You haven't done this yet, Dumbo! 🥜";

function HourlyDistribution({ sessions }: { sessions: Session[] }) {
  // Build minutes-per-hour map
  const hourMins = new Array<number>(24).fill(0);

  for (const s of sessions) {
    const startMs = Number(s.startTime / 1_000_000n);
    const durationMs = Number(s.durationSeconds) * 1000;
    const endMs = startMs + durationMs;

    // Spread session duration across covered hour slots
    let cursor = startMs;
    while (cursor < endMs) {
      const hour = new Date(cursor).getHours();
      const nextHourMs = new Date(cursor).setMinutes(0, 0, 0) + 3_600_000;
      const sliceEnd = Math.min(endMs, nextHourMs);
      hourMins[hour] += (sliceEnd - cursor) / 60_000;
      cursor = sliceEnd;
    }
  }

  const chartData = hourMins.map((mins, h) => ({
    hour: h,
    label:
      h === 0 ? "12AM" : h < 12 ? `${h}AM` : h === 12 ? "12PM" : `${h - 12}PM`,
    minutes: Math.round(mins * 10) / 10,
  }));

  const hasData = chartData.some((d) => d.minutes > 0);

  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Hourly Distribution
      </h3>
      {!hasData ? (
        <div
          data-ocid="dashboard.hourly.empty_state"
          className="flex items-center justify-center h-32 text-muted-foreground text-sm text-center"
        >
          {DUMBO_MESSAGE}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 30 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(var(--border))"
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "oklch(var(--muted-foreground))", fontSize: 10 }}
              angle={-40}
              textAnchor="end"
              interval={2}
            />
            <YAxis
              tick={{ fill: "oklch(var(--muted-foreground))", fontSize: 10 }}
              label={{
                value: "Mins",
                angle: -90,
                position: "insideLeft",
                fill: "oklch(var(--muted-foreground))",
                fontSize: 10,
              }}
            />
            <Tooltip
              contentStyle={{
                background: "oklch(var(--card))",
                border: "1px solid oklch(var(--border))",
                borderRadius: "8px",
                color: "oklch(var(--foreground))",
                fontSize: 12,
              }}
              formatter={(val: number) => [`${val} min`, "Active"]}
            />
            <Bar
              dataKey="minutes"
              fill="oklch(var(--primary))"
              radius={[3, 3, 0, 0]}
              name="Minutes"
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function EnergyMap({ sessions }: { sessions: Session[] }) {
  const hourMap = new Map<number, number[]>();
  for (const s of sessions) {
    const hour = new Date(Number(s.startTime / 1_000_000n)).getHours();
    const val =
      s.energyRating === "High" ? 3 : s.energyRating === "Medium" ? 2 : 1;
    const arr = hourMap.get(hour) ?? [];
    arr.push(val);
    hourMap.set(hour, arr);
  }

  const cells = Array.from({ length: 24 }, (_, h) => {
    const vals = hourMap.get(h);
    if (!vals || vals.length === 0)
      return { hour: h, avg: null as number | null };
    return { hour: h, avg: vals.reduce((a, b) => a + b, 0) / vals.length };
  });

  function cellBg(avg: number | null) {
    if (avg === null) return "bg-muted/30";
    if (avg >= 2.5) return "bg-green-500/60";
    if (avg >= 1.5) return "bg-amber-500/60";
    return "bg-red-500/60";
  }

  function hourLabel(h: number) {
    if (h === 0) return "12AM";
    if (h === 6) return "6AM";
    if (h === 12) return "12PM";
    if (h === 18) return "6PM";
    return "";
  }

  return (
    <div className="space-y-2">
      <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Energy Map — by Hour of Day
      </h3>
      <div className="flex gap-1">
        {cells.map(({ hour, avg }) => (
          <div
            key={hour}
            className="flex flex-col items-center gap-1"
            style={{ flex: 1 }}
          >
            <div
              data-ocid="dashboard.energy_chart.chart_point"
              className={`h-8 w-full rounded-sm ${cellBg(avg)} transition-colors`}
              title={`${hour}:00 — ${
                avg === null
                  ? "No data"
                  : avg >= 2.5
                    ? "High"
                    : avg >= 1.5
                      ? "Medium"
                      : "Low"
              }`}
            />
          </div>
        ))}
      </div>
      <div className="flex">
        {cells.map(({ hour }) => (
          <div key={hour} style={{ flex: 1 }} className="text-center">
            {hourLabel(hour) && (
              <span className="text-[9px] text-muted-foreground">
                {hourLabel(hour)}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-green-500/60 inline-block" />{" "}
          High
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-amber-500/60 inline-block" />{" "}
          Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-red-500/60 inline-block" /> Low
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-muted/30 inline-block" /> No
          data
        </span>
      </div>
    </div>
  );
}

function ImprovementNotes({ period }: { period: Period }) {
  const days = getDaysInPeriod(period);
  const { data: allNotes = [] } = useAllImprovementNotes();
  const upsert = useUpsertImprovementNote();
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const n of allNotes as ImprovementNote[]) {
      map[n.dateKey] = n.note;
    }
    setLocalNotes(map);
  }, [allNotes]);

  function handleChange(dateKey: string, value: string) {
    setLocalNotes((prev) => ({ ...prev, [dateKey]: value }));
    if (debounceRef.current[dateKey])
      clearTimeout(debounceRef.current[dateKey]);
    debounceRef.current[dateKey] = setTimeout(() => {
      upsert.mutate({ dateKey, note: value });
    }, 1000);
  }

  const visibleDays = period === "day" ? days.slice(-1) : days;

  return (
    <div className="space-y-4">
      <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Daily Improvement Notes
      </h3>

      {period === "day" && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">{visibleDays[0]}</p>
          <Textarea
            data-ocid="improvement.textarea"
            placeholder="What will you improve tomorrow?"
            value={localNotes[visibleDays[0]] ?? ""}
            onChange={(e) => handleChange(visibleDays[0], e.target.value)}
            className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground resize-none min-h-[100px]"
          />
        </div>
      )}

      {period !== "day" && (
        <ScrollArea className="h-[300px]">
          <div className="space-y-4 pr-2">
            {visibleDays
              .slice()
              .reverse()
              .map((dateKey) => (
                <div key={dateKey} className="space-y-1">
                  <p className="text-xs text-muted-foreground font-mono">
                    {dateKey}
                  </p>
                  <Textarea
                    placeholder="Improvement note..."
                    value={localNotes[dateKey] ?? ""}
                    onChange={(e) => handleChange(dateKey, e.target.value)}
                    className="bg-muted/20 border-border text-foreground placeholder:text-muted-foreground resize-none min-h-[60px] text-sm"
                  />
                </div>
              ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function BarChartSection({
  sessions,
  categories,
  subTopics,
}: {
  sessions: Session[];
  categories: { id: bigint; name: string }[];
  subTopics: { id: bigint; name: string; categoryId: bigint }[];
}) {
  const catMap = new Map<string, number>();
  const stMap = new Map<string, number>();

  for (const s of sessions) {
    const catKey = s.categoryId.toString();
    const stKey = s.subTopicId.toString();
    catMap.set(catKey, (catMap.get(catKey) ?? 0) + Number(s.durationSeconds));
    stMap.set(stKey, (stMap.get(stKey) ?? 0) + Number(s.durationSeconds));
  }

  const chartData = [
    ...categories
      .filter((c) => catMap.has(c.id.toString()))
      .map((c) => ({
        name: c.name,
        hours:
          Math.round(((catMap.get(c.id.toString()) ?? 0) / 3600) * 100) / 100,
        type: "category",
      })),
    ...subTopics
      .filter((st) => stMap.has(st.id.toString()))
      .map((st) => ({
        name: st.name,
        hours:
          Math.round(((stMap.get(st.id.toString()) ?? 0) / 3600) * 100) / 100,
        type: "subtopic",
      })),
  ];

  if (chartData.length === 0) {
    return (
      <div
        data-ocid="dashboard.chart.empty_state"
        className="flex items-center justify-center h-48 text-muted-foreground text-sm text-center"
      >
        {DUMBO_MESSAGE}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
        <XAxis
          dataKey="name"
          tick={{ fill: "oklch(var(--muted-foreground))", fontSize: 11 }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={{ fill: "oklch(var(--muted-foreground))", fontSize: 11 }}
          label={{
            value: "Hours",
            angle: -90,
            position: "insideLeft",
            fill: "oklch(var(--muted-foreground))",
            fontSize: 11,
          }}
        />
        <Tooltip
          contentStyle={{
            background: "oklch(var(--card))",
            border: "1px solid oklch(var(--border))",
            borderRadius: "8px",
            color: "oklch(var(--foreground))",
          }}
        />
        <Bar
          dataKey="hours"
          fill="oklch(var(--primary))"
          radius={[4, 4, 0, 0]}
          name="Hours"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SessionNotes({
  sessions,
  subTopics,
}: {
  sessions: Session[];
  subTopics: { id: bigint; name: string }[];
}) {
  const withNotes = sessions.filter((s) => s.note.trim());

  const grouped = new Map<string, Session[]>();
  for (const s of withNotes) {
    const key = s.subTopicId.toString();
    const arr = grouped.get(key) ?? [];
    arr.push(s);
    grouped.set(key, arr);
  }

  if (grouped.size === 0) {
    return (
      <p
        data-ocid="dashboard.notes.empty_state"
        className="text-muted-foreground text-sm text-center py-4"
      >
        No session notes in this period.
      </p>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-6 pr-2">
        {Array.from(grouped.entries()).map(([stId, sessList]) => {
          const st = subTopics.find((s) => s.id.toString() === stId);
          return (
            <div key={stId}>
              <h4 className="text-sm font-semibold text-primary mb-2">
                {st?.name ?? "Unknown Sub-topic"}
              </h4>
              <div className="space-y-2">
                {sessList.map((s, idx) => {
                  const durMins = Math.round(Number(s.durationSeconds) / 60);
                  return (
                    <div
                      key={s.id.toString()}
                      data-ocid={`dashboard.notes.item.${idx + 1}`}
                      className="bg-muted/20 rounded-lg p-3 space-y-1 border border-border/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-foreground flex-1">
                          {s.note}
                        </p>
                        <span className="text-[11px] font-mono bg-muted/40 px-2 py-0.5 rounded-full text-muted-foreground shrink-0">
                          {durMins}m
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] border ${
                            s.energyRating === "High"
                              ? "border-green-400/40 text-green-400"
                              : s.energyRating === "Medium"
                                ? "border-amber-400/40 text-amber-400"
                                : "border-red-400/40 text-red-400"
                          }`}
                        >
                          {s.energyRating}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(s.startTime)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function RecentSessions({
  sessions,
  subTopics,
}: { sessions: Session[]; subTopics: { id: bigint; name: string }[] }) {
  const recent = [...sessions]
    .sort((a, b) => Number(b.startTime - a.startTime))
    .slice(0, 10);

  if (recent.length === 0) {
    return (
      <p
        data-ocid="dashboard.sessions.empty_state"
        className="text-muted-foreground text-sm text-center py-4"
      >
        You haven't done this yet, Dumbo! 🥜
      </p>
    );
  }

  function fmtDuration(secs: bigint) {
    const s = Number(secs);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    if (m === 0) return `${rem}s`;
    return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  }

  function energyColor(rating: string) {
    if (rating === "High")
      return "bg-green-500/20 text-green-400 border-green-500/30";
    if (rating === "Low") return "bg-red-500/20 text-red-400 border-red-500/30";
    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  }

  return (
    <div className="space-y-2">
      {recent.map((s, idx) => {
        const st = subTopics.find((t) => t.id === s.subTopicId);
        const planned = (s as any).plannedDurationSeconds
          ? BigInt((s as any).plannedDurationSeconds)
          : undefined;
        const pct =
          planned && planned > 0n
            ? Math.round((Number(s.durationSeconds) * 100) / Number(planned))
            : null;
        const plannedMins = planned ? Math.round(Number(planned) / 60) : null;
        const date = new Date(Number(s.startTime / 1_000_000n));
        const dateStr = `${date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })} ${date.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
        return (
          <div
            key={s.id.toString()}
            data-ocid={`dashboard.sessions.item.${idx + 1}`}
            className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground truncate">
                  {st?.name ?? "Unknown"}
                </span>
                <span className="text-xs text-muted-foreground">{dateStr}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-primary font-mono">
                  {fmtDuration(s.durationSeconds)}
                </span>
                {pct !== null && plannedMins !== null && (
                  <span className="text-xs text-muted-foreground">
                    {pct}% of {plannedMins}min goal
                  </span>
                )}
              </div>
            </div>
            <Badge className={`text-xs border ${energyColor(s.energyRating)}`}>
              {s.energyRating}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>("day");
  const [range, setRange] = useState<[bigint, bigint]>(getTimeRange("day"));
  const { data: categories = [] } = useCategories();
  const { data: subTopics = [] } = useSubTopics();
  const { data: sessions = [], isLoading } = useSessionsByTimeRange(
    range[0],
    range[1],
    true,
  );

  function handlePeriodChange(p: Period) {
    setPeriod(p);
    setRange(getTimeRange(p));
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Progress Dashboard
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your study analytics at a glance
        </p>
      </div>

      <Tabs
        value={period}
        onValueChange={(v) => handlePeriodChange(v as Period)}
      >
        <TabsList
          data-ocid="dashboard.period.tab"
          className="bg-card border border-border mb-6"
        >
          <TabsTrigger
            value="day"
            data-ocid="dashboard.day_tab"
            className="cursor-pointer"
          >
            Day
          </TabsTrigger>
          <TabsTrigger
            value="week"
            data-ocid="dashboard.week_tab"
            className="cursor-pointer"
          >
            Week
          </TabsTrigger>
          <TabsTrigger
            value="month"
            data-ocid="dashboard.month_tab"
            className="cursor-pointer"
          >
            Month
          </TabsTrigger>
          <TabsTrigger
            value="year"
            data-ocid="dashboard.year_tab"
            className="cursor-pointer"
          >
            Year
          </TabsTrigger>
        </TabsList>

        {(["day", "week", "month", "year"] as Period[]).map((p) => (
          <TabsContent key={p} value={p} className="space-y-6">
            {isLoading ? (
              <div
                data-ocid="dashboard.loading_state"
                className="flex justify-center py-12"
              >
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Hours by Category &amp; Sub-topic
                  </h3>
                  <BarChartSection
                    sessions={sessions}
                    categories={categories}
                    subTopics={subTopics}
                  />
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                  <HourlyDistribution sessions={sessions} />
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Recent Sessions
                  </h3>
                  <RecentSessions sessions={sessions} subTopics={subTopics} />
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Session Notes
                  </h3>
                  <SessionNotes sessions={sessions} subTopics={subTopics} />
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                  <EnergyMap sessions={sessions} />
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                  <ImprovementNotes period={p} />
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
