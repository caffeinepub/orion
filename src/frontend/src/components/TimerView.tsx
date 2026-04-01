import { Input } from "@/components/ui/input";
import {
  Bell,
  BellOff,
  BookOpen,
  Clock,
  Loader2,
  Moon,
  Pause,
  Play,
  Plus,
  Square,
  Sun,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppSettings } from "../hooks/useAppSettings";
import {
  useAddSession,
  useAddTodoItem,
  useDeleteTodoItem,
  useTodoItemsBySubTopic,
  useToggleTodoItem,
} from "../hooks/useQueries";
import type { Category, SubTopic } from "../hooks/useQueries";
import {
  initAudioContext,
  playBeep,
  playCompleteSound,
  playMilestoneSound,
  playPauseSound,
  playResumeSound,
  playStartSound,
  playTickSound,
} from "../utils/playBeep";
import { SessionEndModal } from "./SessionEndModal";
import { StarCanvas } from "./StarCanvas";

interface Props {
  subTopic: SubTopic;
  category: Category;
}

type TimerState = "idle" | "running" | "paused";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const DEFAULT_PRESETS = [25, 50, 65, 90];

function getStoredPresets(): number[] {
  try {
    const raw = localStorage.getItem("orion-duration-presets");
    return raw ? JSON.parse(raw) : DEFAULT_PRESETS;
  } catch {
    return DEFAULT_PRESETS;
  }
}

function savePresets(presets: number[]) {
  localStorage.setItem("orion-duration-presets", JSON.stringify(presets));
}

// ── Task Extras (deadlines + alarms) stored in localStorage ──
interface TaskExtras {
  deadline: number | null;
  alarmEnabled: boolean;
}
type TaskExtrasMap = Record<string, TaskExtras>;

function loadTaskExtras(): TaskExtrasMap {
  try {
    const raw = localStorage.getItem("orion-task-extras");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTaskExtras(map: TaskExtrasMap) {
  localStorage.setItem("orion-task-extras", JSON.stringify(map));
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "EXPIRED";
  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

// ── Persist active timer across navigation ──
const LS_ACTIVE_TIMER = "naksha-active-timer";

interface PersistedTimer {
  subTopicId: string;
  state: TimerState;
  startTs: number; // Date.now() when last started/resumed
  startRemaining: number; // seconds remaining when started/resumed
  accumulated: number; // seconds accumulated before this segment
  durationMinutes: number;
  sessionStartNs: string; // bigint as string
  lastBeepMinute: number;
}

function saveTimerState(p: PersistedTimer) {
  localStorage.setItem(LS_ACTIVE_TIMER, JSON.stringify(p));
}

function clearTimerState() {
  localStorage.removeItem(LS_ACTIVE_TIMER);
}

function loadTimerState(): PersistedTimer | null {
  try {
    const raw = localStorage.getItem(LS_ACTIVE_TIMER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Service Worker helpers ──
function swPost(msg: object) {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(msg);
  }
}

export function TimerView({ subTopic, category }: Props) {
  const [presets, setPresets] = useState<number[]>(() => getStoredPresets());
  const [selectedPreset, setSelectedPreset] = useState<number | "custom">(
    presets[0],
  );
  const [customMinutes, setCustomMinutes] = useState("30");
  const [editingPresetIdx, setEditingPresetIdx] = useState<number | null>(null);
  const [editingPresetVal, setEditingPresetVal] = useState("");

  const durationMinutes =
    selectedPreset === "custom"
      ? Math.max(1, Number.parseInt(customMinutes) || 1)
      : selectedPreset;

  // ── Timer state — restored from localStorage if was running ──
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [remainingSecs, setRemainingSecs] = useState(() => {
    const saved = loadTimerState();
    if (
      saved &&
      saved.subTopicId === subTopic.id.toString() &&
      saved.state !== "idle"
    ) {
      if (saved.state === "running") {
        const elapsed = Math.floor((Date.now() - saved.startTs) / 1000);
        return Math.max(0, saved.startRemaining - elapsed);
      }
      return saved.startRemaining;
    }
    return durationMinutes * 60;
  });

  const [showModal, setShowModal] = useState(false);
  const [stayAwake, setStayAwake] = useState(true);

  const [newTaskText, setNewTaskText] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);

  const [taskExtras, setTaskExtras] = useState<TaskExtrasMap>(() =>
    loadTaskExtras(),
  );
  const [showDeadlinePicker, setShowDeadlinePicker] = useState<string | null>(
    null,
  );
  const [deadlineInput, setDeadlineInput] = useState("");
  const [alarmFired, setAlarmFired] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartNsRef = useRef<bigint>(0n);
  const totalElapsedRef = useRef<number>(0);
  const plannedSecondsRef = useRef<number>(0);
  const lastBeepMinuteRef = useRef<number>(0);
  const durationMinutesRef = useRef(durationMinutes);
  const subTopicIdRef = useRef(subTopic.id.toString());
  const startTsRef = useRef<number>(0);
  const startRemainingRef = useRef<number>(0);
  const accumulatedSecsRef = useRef<number>(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const remainingSecsRef = useRef(remainingSecs);
  const timerStateRef = useRef<TimerState>("idle");
  const pendingAutoResumeRef = useRef(false);

  const addSession = useAddSession();
  const { data: todos = [], isLoading: todosLoading } = useTodoItemsBySubTopic(
    subTopic.id,
  );
  const addTodo = useAddTodoItem();
  const toggleTodo = useToggleTodoItem(subTopic.id);
  const deleteTodo = useDeleteTodoItem(subTopic.id);

  // ── Restore running timer on mount ──
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only restore
  useEffect(() => {
    const saved = loadTimerState();
    if (
      saved &&
      saved.subTopicId === subTopic.id.toString() &&
      saved.state !== "idle"
    ) {
      const preset = saved.durationMinutes;
      setSelectedPreset(presets.includes(preset) ? preset : "custom");
      if (!presets.includes(preset)) setCustomMinutes(String(preset));
      durationMinutesRef.current = saved.durationMinutes;

      if (saved.state === "running") {
        // Recalculate elapsed
        const elapsed = Math.floor((Date.now() - saved.startTs) / 1000);
        const remaining = Math.max(0, saved.startRemaining - elapsed);
        if (remaining > 0) {
          // Restore as paused, let user resume — prevents double-running
          accumulatedSecsRef.current = saved.accumulated + elapsed;
          totalElapsedRef.current = accumulatedSecsRef.current;
          lastBeepMinuteRef.current = saved.lastBeepMinute;
          sessionStartNsRef.current = BigInt(saved.sessionStartNs);
          pendingAutoResumeRef.current = true;
          setTimerState("paused");
          timerStateRef.current = "paused";
          setRemainingSecs(remaining);
          remainingSecsRef.current = remaining;
          startRemainingRef.current = remaining;
          toast.info("Timer resumed — session continuing");
        } else {
          clearTimerState();
        }
      } else if (saved.state === "paused") {
        accumulatedSecsRef.current = saved.accumulated;
        totalElapsedRef.current = saved.accumulated;
        lastBeepMinuteRef.current = saved.lastBeepMinute;
        sessionStartNsRef.current = BigInt(saved.sessionStartNs);
        setTimerState("paused");
        timerStateRef.current = "paused";
        startRemainingRef.current = saved.startRemaining;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pendingAutoResumeRef.current && timerState === "paused") {
      pendingAutoResumeRef.current = false;
      startTimer();
    }
  }, [timerState]); // intentionally omit startTimer from deps

  useEffect(() => {
    durationMinutesRef.current = durationMinutes;
  }, [durationMinutes]);

  useEffect(() => {
    remainingSecsRef.current = remainingSecs;
  }, [remainingSecs]);

  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  const clearInterval_ = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  const acquireWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await (
          navigator as Navigator & {
            wakeLock: { request: (type: string) => Promise<WakeLockSentinel> };
          }
        ).wakeLock.request("screen");
        wakeLockRef.current.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
      }
    } catch {
      // Wake Lock not available
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearInterval_();
    releaseWakeLock();
    swPost({ type: "TIMER_STOPPED" });
    swPost({ type: "CANCEL_BEEPS" });
    setTimerState("idle");
    timerStateRef.current = "idle";
    totalElapsedRef.current = 0;
    accumulatedSecsRef.current = 0;
    lastBeepMinuteRef.current = 0;
    clearTimerState();
    setRemainingSecs(durationMinutesRef.current * 60);
  }, [clearInterval_, releaseWakeLock]);

  useEffect(() => {
    if (subTopicIdRef.current !== subTopic.id.toString()) {
      subTopicIdRef.current = subTopic.id.toString();
      resetTimer();
    }
  }, [subTopic.id, resetTimer]);

  // Update remaining secs when duration changes (only when idle)
  useEffect(() => {
    if (timerState === "idle") {
      setRemainingSecs(durationMinutes * 60);
    }
  }, [durationMinutes, timerState]);

  // ── Alarm checker: 1-second interval ──
  useEffect(() => {
    alarmIntervalRef.current = setInterval(() => {
      setTick((t) => t + 1);
      const now = Date.now();
      for (const [taskId, extras] of Object.entries(taskExtras)) {
        if (
          extras.deadline !== null &&
          extras.alarmEnabled &&
          now >= extras.deadline &&
          !alarmFired.has(taskId)
        ) {
          setAlarmFired((prev) => new Set(prev).add(taskId));
          initAudioContext();
          playBeep(880, 0.3, 0.15);
          setTimeout(() => playBeep(880, 0.3, 0.15), 500);
          setTimeout(() => playBeep(880, 0.3, 0.15), 1000);
          toast.warning("⏰ Task deadline reached!", {
            description: "One of your tasks has hit its deadline.",
          });
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("⏰ Task Deadline Reached!", {
              body: "One of your tasks has hit its deadline.",
              icon: "/favicon.ico",
            });
          }
        }
      }
    }, 1000);
    return () => {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    };
  }, [taskExtras, alarmFired]);

  // ── visibilitychange: resume AudioContext & notify SW ──
  useEffect(() => {
    const handleVisChange = () => {
      if (document.hidden) {
        if (timerStateRef.current === "running") {
          swPost({
            type: "TIMER_BACKGROUNDED",
            remainingSecs: remainingSecsRef.current,
            startTs: Date.now(),
          });
        }
      } else {
        // App came to foreground — resume audio
        initAudioContext();
        if (timerStateRef.current !== "running") {
          swPost({ type: "TIMER_FOREGROUNDED" });
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisChange);
  }, []);

  const handleTimerEnd = useCallback(() => {
    clearInterval_();
    releaseWakeLock();
    swPost({ type: "TIMER_STOPPED" });
    swPost({ type: "CANCEL_BEEPS" });
    setTimerState("idle");
    timerStateRef.current = "idle";
    clearTimerState();
    setShowModal(true);
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Naksha Study Timer", {
        body: "✅ Session complete! Great work.",
        silent: false,
        tag: "naksha-timer",
        icon: "/favicon.ico",
      });
    }
    // Celebratory beeps
    if (soundEnabled) {
      initAudioContext();
      playCompleteSound();
    }
  }, [clearInterval_, releaseWakeLock]);

  function scheduleBeepsInSW(
    totalDurationMs: number,
    alreadyElapsedMs: number,
  ) {
    swPost({ type: "CANCEL_BEEPS" });
    let milestone = 10 * 60 * 1000; // 10 min in ms
    while (milestone <= totalDurationMs) {
      const delay = milestone - alreadyElapsedMs;
      if (delay > 0) {
        const mins = milestone / 60000;
        swPost({
          type: "SCHEDULE_BEEP",
          delay,
          label: `${mins} minute${mins > 1 ? "s" : ""} of study done! Keep going 🔥`,
        });
      }
      milestone += 10 * 60 * 1000;
    }
  }

  function startTimer() {
    initAudioContext();
    if (soundEnabled) {
      if (timerState === "idle") playStartSound();
      else playResumeSound();
    }
    // Request notification permission & show timer notification immediately
    if ("Notification" in window) {
      const sendTimerStarted = () => {
        swPost({
          type: "TIMER_STARTED",
          remainingSecs: remainingSecsRef.current,
          startTs: Date.now(),
        });
      };
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") sendTimerStarted();
        });
      } else if (Notification.permission === "granted") {
        sendTimerStarted();
      }
    }

    if (timerState === "idle") {
      sessionStartNsRef.current = BigInt(Date.now()) * 1_000_000n;
      totalElapsedRef.current = 0;
      accumulatedSecsRef.current = 0;
      lastBeepMinuteRef.current = 0;
    }

    startTsRef.current = Date.now();
    startRemainingRef.current = remainingSecsRef.current;
    setTimerState("running");
    timerStateRef.current = "running";

    if (stayAwake) acquireWakeLock();

    // Pre-schedule 10-min beeps via SW
    const totalDurationMs = durationMinutesRef.current * 60 * 1000;
    const alreadyElapsedMs = accumulatedSecsRef.current * 1000;
    scheduleBeepsInSW(totalDurationMs, alreadyElapsedMs);

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTsRef.current) / 1000);
      const next = Math.max(0, startRemainingRef.current - elapsed);
      const totalElapsed = accumulatedSecsRef.current + elapsed;
      totalElapsedRef.current = totalElapsed;

      // Clock tick
      if (soundEnabled && tickEnabled) {
        initAudioContext();
        playTickSound();
      }

      // In-foreground 10-min milestone
      const elapsedMinutes = Math.floor(totalElapsed / 60);
      if (
        elapsedMinutes > 0 &&
        elapsedMinutes % 10 === 0 &&
        elapsedMinutes !== lastBeepMinuteRef.current
      ) {
        lastBeepMinuteRef.current = elapsedMinutes;
        if (soundEnabled) {
          initAudioContext();
          playMilestoneSound();
        }
      }

      // Persist timer state to survive navigation
      saveTimerState({
        subTopicId: subTopicIdRef.current,
        state: "running",
        startTs: startTsRef.current,
        startRemaining: startRemainingRef.current,
        accumulated: accumulatedSecsRef.current,
        durationMinutes: durationMinutesRef.current,
        sessionStartNs: sessionStartNsRef.current.toString(),
        lastBeepMinute: lastBeepMinuteRef.current,
      });

      if (next <= 0) {
        handleTimerEnd();
        setRemainingSecs(0);
        return;
      }
      setRemainingSecs(next);
      remainingSecsRef.current = next;
    }, 500);
  }

  function pauseTimer() {
    if (soundEnabled) playPauseSound();
    const elapsed = Math.floor((Date.now() - startTsRef.current) / 1000);
    accumulatedSecsRef.current += elapsed;
    clearInterval_();
    releaseWakeLock();
    swPost({ type: "TIMER_FOREGROUNDED" });
    swPost({ type: "CANCEL_BEEPS" });
    setTimerState("paused");
    timerStateRef.current = "paused";
    saveTimerState({
      subTopicId: subTopicIdRef.current,
      state: "paused",
      startTs: startTsRef.current,
      startRemaining: remainingSecsRef.current,
      accumulated: accumulatedSecsRef.current,
      durationMinutes: durationMinutesRef.current,
      sessionStartNs: sessionStartNsRef.current.toString(),
      lastBeepMinute: lastBeepMinuteRef.current,
    });
  }

  function handleStop() {
    if (timerState === "idle" && totalElapsedRef.current === 0) return;
    plannedSecondsRef.current = durationMinutesRef.current * 60;
    if (timerState === "running") {
      const elapsed = Math.floor((Date.now() - startTsRef.current) / 1000);
      accumulatedSecsRef.current += elapsed;
      totalElapsedRef.current = accumulatedSecsRef.current;
    }
    clearInterval_();
    releaseWakeLock();
    swPost({ type: "TIMER_STOPPED" });
    swPost({ type: "CANCEL_BEEPS" });
    setTimerState("idle");
    timerStateRef.current = "idle";
    clearTimerState();
    setShowModal(true);
  }

  async function handleSaveSession(note: string, energyRating: string) {
    const duration = BigInt(Math.max(totalElapsedRef.current, 1));
    await addSession.mutateAsync({
      subTopicId: subTopic.id,
      categoryId: category.id,
      startTime: sessionStartNsRef.current,
      durationSeconds: duration,
      plannedDurationSeconds:
        plannedSecondsRef.current > 0
          ? BigInt(plannedSecondsRef.current)
          : undefined,
      note,
      energyRating,
    });
    toast.success("Session saved!");
    setShowModal(false);
    totalElapsedRef.current = 0;
    accumulatedSecsRef.current = 0;
    clearTimerState();
    setRemainingSecs(durationMinutesRef.current * 60);
  }

  function handleAddTask() {
    const text = newTaskText.trim();
    if (!text) return;
    addTodo.mutate(
      { subTopicId: subTopic.id, text },
      {
        onSuccess: () => {
          setNewTaskText("");
          setShowAddTask(false);
          toast.success("Task added!");
        },
        onError: () => toast.error("Failed to add task, please try again."),
      },
    );
  }

  function updatePreset(idx: number, val: string) {
    const num = Math.max(
      1,
      Math.min(300, Number.parseInt(val) || DEFAULT_PRESETS[idx]),
    );
    const updated = [...presets];
    updated[idx] = num;
    setPresets(updated);
    savePresets(updated);
    if (selectedPreset === presets[idx]) setSelectedPreset(num);
    setEditingPresetIdx(null);
  }

  function updateTaskExtras(id: string, patch: Partial<TaskExtras>) {
    setTaskExtras((prev) => {
      const updated = {
        ...prev,
        [id]: Object.assign(
          { deadline: null, alarmEnabled: false },
          prev[id],
          patch,
        ),
      };
      saveTaskExtras(updated);
      return updated;
    });
  }

  function saveDeadline(taskId: string) {
    if (!deadlineInput) return;
    const ts = new Date(deadlineInput).getTime();
    if (Number.isNaN(ts)) return;
    updateTaskExtras(taskId, { deadline: ts });
    setAlarmFired((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
    setShowDeadlinePicker(null);
    setDeadlineInput("");
  }

  function clearDeadline(taskId: string) {
    updateTaskExtras(taskId, { deadline: null, alarmEnabled: false });
    setAlarmFired((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  }

  const minutes = Math.floor(remainingSecs / 60);
  const seconds = remainingSecs % 60;
  const progress =
    durationMinutes > 0 ? (remainingSecs / (durationMinutes * 60)) * 100 : 100;

  const mobileSize = 280;
  const desktopSize = 220;
  const mobileR = 120;
  const desktopR = 94;
  const circumferenceMobile = 2 * Math.PI * mobileR;
  const circumferenceDesktop = 2 * Math.PI * desktopR;

  const neoBtnBase: React.CSSProperties = {
    boxShadow:
      "3px 3px 8px rgba(0,0,0,0.2), -2px -2px 6px rgba(255,255,255,0.06)",
    border: "none",
    borderRadius: "10px",
  };
  const neoBtnPressed: React.CSSProperties = {
    boxShadow:
      "inset 2px 2px 6px rgba(0,0,0,0.25), inset -1px -1px 4px rgba(255,255,255,0.05)",
    border: "none",
    borderRadius: "10px",
  };

  const {
    theme,
    starsEnabled,
    shootingStarEnabled,
    beltEnabled,
    starsOpacity,
    shootingStarOpacity,
    beltOpacity,
    soundEnabled,
    tickEnabled,
  } = useAppSettings();

  return (
    <div className="relative flex flex-col h-full">
      <StarCanvas
        theme={theme}
        starsEnabled={starsEnabled}
        shootingStarEnabled={shootingStarEnabled}
        beltEnabled={beltEnabled}
        starsOpacity={starsOpacity}
        shootingStarOpacity={shootingStarOpacity}
        beltOpacity={beltOpacity}
      />
      {/* Topic header */}
      <div className="px-4 pt-3 pb-2 md:px-0 md:pt-0 md:mb-4">
        <p className="text-[11px] font-medium text-primary uppercase tracking-widest">
          {category.name}
        </p>
        <h2 className="font-display text-lg md:text-2xl font-bold text-foreground leading-tight">
          {subTopic.name}
        </h2>
      </div>

      {/* Timer card */}
      <div className="mx-0 bg-card/80 md:rounded-xl border-y md:border border-border md:p-6 flex flex-col items-center gap-4 py-4 px-4">
        {/* Duration preset bar */}
        {timerState === "idle" && (
          <div className="w-full">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-center mb-2">
              Duration (Min)
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              {presets.map((preset, idx) => {
                const isSelected = selectedPreset === preset;
                return editingPresetIdx === idx ? (
                  <input
                    key={`edit-${preset}`}
                    type="number"
                    value={editingPresetVal}
                    onChange={(e) => setEditingPresetVal(e.target.value)}
                    onBlur={() => updatePreset(idx, editingPresetVal)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        updatePreset(idx, editingPresetVal);
                      if (e.key === "Escape") setEditingPresetIdx(null);
                    }}
                    className="w-14 h-10 text-center text-sm font-bold rounded-xl bg-muted text-foreground border border-primary"
                  />
                ) : (
                  <button
                    key={`preset-${preset}`}
                    type="button"
                    style={isSelected ? neoBtnPressed : neoBtnBase}
                    className={`w-14 h-10 text-sm font-bold rounded-xl transition-all ${
                      isSelected
                        ? "bg-primary/20 text-primary"
                        : "bg-card text-foreground hover:bg-muted"
                    }`}
                    onClick={() => setSelectedPreset(preset)}
                    onDoubleClick={() => {
                      setEditingPresetIdx(idx);
                      setEditingPresetVal(String(preset));
                    }}
                    title="Double-tap to edit"
                  >
                    {preset}
                  </button>
                );
              })}

              {/* Custom button */}
              <button
                type="button"
                style={selectedPreset === "custom" ? neoBtnPressed : neoBtnBase}
                className={`px-3 h-10 text-sm font-bold rounded-xl transition-all ${
                  selectedPreset === "custom"
                    ? "bg-primary/20 text-primary"
                    : "bg-card text-foreground hover:bg-muted"
                }`}
                onClick={() => setSelectedPreset("custom")}
              >
                Custom
              </button>

              {selectedPreset === "custom" && (
                <Input
                  type="number"
                  min={1}
                  max={300}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="w-16 h-10 text-center bg-muted/40 border-border text-foreground text-sm"
                  placeholder="min"
                />
              )}
            </div>
          </div>
        )}

        {/* Big timer circle */}
        <div className="relative flex items-center justify-center">
          {/* Mobile circle */}
          <svg
            width={mobileSize}
            height={mobileSize}
            className="md:hidden -rotate-90"
            aria-label="Timer progress"
          >
            <title>Timer progress ring</title>
            <circle
              cx={mobileSize / 2}
              cy={mobileSize / 2}
              r={mobileR}
              fill="none"
              stroke="oklch(var(--border))"
              strokeWidth="8"
            />
            <circle
              cx={mobileSize / 2}
              cy={mobileSize / 2}
              r={mobileR}
              fill="none"
              stroke="oklch(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${circumferenceMobile}`}
              strokeDashoffset={`${circumferenceMobile * (1 - progress / 100)}`}
              className="transition-[stroke-dashoffset] duration-500 ease-linear"
              style={
                timerState === "running"
                  ? {
                      filter:
                        "drop-shadow(0 0 10px oklch(var(--primary) / 0.5))",
                    }
                  : {}
              }
            />
          </svg>
          {/* Desktop circle */}
          <svg
            width={desktopSize}
            height={desktopSize}
            className="hidden md:block -rotate-90"
            aria-label="Timer progress"
          >
            <title>Timer progress ring</title>
            <circle
              cx={desktopSize / 2}
              cy={desktopSize / 2}
              r={desktopR}
              fill="none"
              stroke="oklch(var(--border))"
              strokeWidth="6"
            />
            <circle
              cx={desktopSize / 2}
              cy={desktopSize / 2}
              r={desktopR}
              fill="none"
              stroke="oklch(var(--primary))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${circumferenceDesktop}`}
              strokeDashoffset={`${circumferenceDesktop * (1 - progress / 100)}`}
              className="transition-[stroke-dashoffset] duration-500 ease-linear"
              style={
                timerState === "running"
                  ? {
                      filter:
                        "drop-shadow(0 0 8px oklch(var(--primary) / 0.4))",
                    }
                  : {}
              }
            />
          </svg>

          {/* Timer display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              data-ocid="timer.display"
              className="font-mono text-5xl md:text-4xl font-bold text-foreground tabular-nums tracking-tight"
            >
              {pad(minutes)}:{pad(seconds)}
            </span>
            <span className="text-[10px] md:text-xs text-muted-foreground mt-1 uppercase tracking-widest">
              {timerState === "running" ? (
                <>
                  Running
                  {stayAwake && <span className="ml-1 text-primary/70">☀</span>}
                </>
              ) : timerState === "paused" ? (
                "Paused"
              ) : (
                "Ready"
              )}
            </span>
          </div>
        </div>

        {/* Start button */}
        {timerState === "idle" && (
          <button
            data-ocid="timer.start_button"
            type="button"
            onClick={startTimer}
            className="w-full max-w-xs py-3 rounded-full flex items-center justify-center gap-2 text-base font-bold text-gray-800 transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #e8e8e8, #d4d4d4)",
              boxShadow:
                "4px 4px 12px rgba(0,0,0,0.2), -3px -3px 8px rgba(255,255,255,0.6)",
            }}
          >
            <Play className="h-4 w-4" />
            Start
          </button>
        )}
        {timerState === "running" && (
          <div className="flex gap-3">
            <button
              data-ocid="timer.pause_button"
              type="button"
              onClick={pauseTimer}
              className="px-6 py-2.5 rounded-full flex items-center gap-2 text-sm font-semibold text-foreground bg-muted hover:bg-muted/80 transition-all"
              style={neoBtnBase}
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>
            <button
              data-ocid="timer.stop_button"
              type="button"
              onClick={handleStop}
              className="px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all"
              style={neoBtnBase}
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          </div>
        )}
        {timerState === "paused" && (
          <div className="flex gap-3">
            <button
              data-ocid="timer.resume_button"
              type="button"
              onClick={startTimer}
              className="px-6 py-2.5 rounded-full flex items-center gap-2 text-sm font-semibold text-gray-800 transition-all"
              style={{
                background: "linear-gradient(135deg, #e8e8e8, #d4d4d4)",
                boxShadow:
                  "4px 4px 12px rgba(0,0,0,0.2), -3px -3px 8px rgba(255,255,255,0.6)",
              }}
            >
              <Play className="h-4 w-4" />
              Resume
            </button>
            <button
              data-ocid="timer.stop_button"
              type="button"
              onClick={handleStop}
              className="px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all"
              style={neoBtnBase}
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          </div>
        )}

        {/* Stay awake toggle */}
        <button
          data-ocid="timer.toggle"
          type="button"
          onClick={() => setStayAwake((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {stayAwake ? (
            <Sun className="h-3.5 w-3.5 text-yellow-500" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
          Stay Awake: [{stayAwake ? "On" : "Off"}]
        </button>
      </div>

      {/* Tasks section */}
      <div
        className="flex-1 mt-2 mx-0 px-4 py-4 overflow-hidden flex flex-col"
        style={{
          background: "oklch(var(--card) / 0.9)",
          boxShadow:
            "inset 2px 2px 8px rgba(0,0,0,0.12), inset -2px -2px 6px rgba(255,255,255,0.04)",
          borderTop: "1px solid oklch(var(--border))",
        }}
      >
        {/* Tasks header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">Tasks</h3>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            onClick={() => setShowAddTask((v) => !v)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </button>
        </div>

        {/* Add task input */}
        {showAddTask && (
          <div className="flex gap-2 mb-3">
            <Input
              autoFocus
              data-ocid="todo.input"
              placeholder="Task description..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTask();
                if (e.key === "Escape") setShowAddTask(false);
              }}
              className="bg-muted/40 border-border text-foreground text-sm h-9"
            />
            <button
              type="button"
              data-ocid="todo.add_button"
              onClick={handleAddTask}
              disabled={addTodo.isPending || !newTaskText.trim()}
              className="px-3 h-9 rounded-lg text-xs font-semibold bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 shrink-0 disabled:opacity-50"
            >
              {addTodo.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Add"
              )}
            </button>
          </div>
        )}

        {/* Task list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {todosLoading && (
            <div
              className="flex justify-center py-6"
              data-ocid="todo.loading_state"
            >
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!todosLoading && todos.length === 0 && (
            <p
              className="text-xs text-muted-foreground text-center py-6"
              data-ocid="todo.empty_state"
            >
              No tasks yet. Add one above!
            </p>
          )}
          {todos.map((todo, idx) => {
            const taskId = todo.id.toString();
            const extras = taskExtras[taskId];
            const now = Date.now();
            const deadline = extras?.deadline ?? null;
            const alarmEnabled = extras?.alarmEnabled ?? false;
            const timeLeft = deadline !== null ? deadline - now : null;
            const isExpired = timeLeft !== null && timeLeft <= 0;
            const isPickerOpen = showDeadlinePicker === taskId;

            return (
              <div
                key={Number(todo.id)}
                data-ocid={`todo.item.${idx + 1}`}
                className="rounded-2xl group transition-all"
                style={{
                  background: "oklch(var(--card))",
                  boxShadow: todo.completed
                    ? "inset 2px 2px 5px rgba(0,0,0,0.12), inset -1px -1px 4px rgba(255,255,255,0.04)"
                    : "3px 3px 8px rgba(0,0,0,0.15), -2px -2px 6px rgba(255,255,255,0.06)",
                }}
              >
                {/* Main task row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Circle checkbox */}
                  <button
                    type="button"
                    data-ocid={`todo.checkbox.${idx + 1}`}
                    onClick={() => toggleTodo.mutate(todo.id)}
                    className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                      todo.completed
                        ? "bg-primary border-primary"
                        : "border-border bg-transparent hover:border-primary"
                    }`}
                  >
                    {todo.completed && (
                      <svg
                        viewBox="0 0 10 8"
                        className="w-3 h-3 text-primary-foreground"
                        fill="none"
                        aria-hidden="true"
                        role="presentation"
                      >
                        <path
                          d="M1 4l2.5 2.5L9 1"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Task text + countdown pill */}
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <span
                      className={`text-sm truncate ${
                        todo.completed
                          ? "line-through text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {todo.text}
                    </span>
                    {deadline !== null && (
                      <span
                        className={`text-[10px] font-mono flex items-center gap-1 ${
                          isExpired
                            ? "text-red-500 font-bold"
                            : "text-muted-foreground"
                        }`}
                      >
                        <Clock className="h-2.5 w-2.5 shrink-0" />
                        {isExpired
                          ? "⏰ EXPIRED"
                          : `⏰ ${formatCountdown(timeLeft ?? 0)}`}
                      </span>
                    )}
                  </div>

                  {/* Alarm toggle */}
                  <button
                    type="button"
                    data-ocid={`todo.toggle.${idx + 1}`}
                    onClick={() => {
                      if (!alarmEnabled && "Notification" in window) {
                        Notification.requestPermission();
                      }
                      updateTaskExtras(taskId, { alarmEnabled: !alarmEnabled });
                    }}
                    title={alarmEnabled ? "Alarm on" : "Alarm off"}
                    className={`shrink-0 transition-colors ${
                      alarmEnabled
                        ? "text-amber-500 hover:text-amber-400"
                        : "text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {alarmEnabled ? (
                      <Bell className="h-3.5 w-3.5" />
                    ) : (
                      <BellOff className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {/* Deadline button */}
                  <button
                    type="button"
                    data-ocid={`todo.edit_button.${idx + 1}`}
                    onClick={() => {
                      if (isPickerOpen) {
                        setShowDeadlinePicker(null);
                      } else {
                        setShowDeadlinePicker(taskId);
                        if (deadline) {
                          const d = new Date(deadline);
                          const local = new Date(
                            d.getTime() - d.getTimezoneOffset() * 60000,
                          )
                            .toISOString()
                            .slice(0, 16);
                          setDeadlineInput(local);
                        } else {
                          setDeadlineInput("");
                        }
                      }
                    }}
                    title={deadline ? "Edit deadline" : "Add deadline"}
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Clock
                      className={`h-3.5 w-3.5 ${
                        deadline ? "text-primary" : ""
                      }`}
                    />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    data-ocid={`todo.delete_button.${idx + 1}`}
                    onClick={() => {
                      deleteTodo.mutate(todo.id);
                      clearDeadline(taskId);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Inline deadline picker */}
                {isPickerOpen && (
                  <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                    <input
                      type="datetime-local"
                      value={deadlineInput}
                      onChange={(e) => setDeadlineInput(e.target.value)}
                      className="flex-1 min-w-0 h-8 text-xs rounded-lg bg-muted/60 border border-border text-foreground px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      data-ocid={`todo.save_button.${idx + 1}`}
                      onClick={() => saveDeadline(taskId)}
                      className="px-3 h-8 rounded-lg text-xs font-semibold bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 shrink-0"
                    >
                      Save
                    </button>
                    {deadline && (
                      <button
                        type="button"
                        onClick={() => clearDeadline(taskId)}
                        className="px-3 h-8 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive border border-border shrink-0"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      data-ocid={`todo.cancel_button.${idx + 1}`}
                      onClick={() => setShowDeadlinePicker(null)}
                      className="px-3 h-8 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-border shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <SessionEndModal
        open={showModal}
        onSave={handleSaveSession}
        onClose={async () => {
          if (totalElapsedRef.current > 0) {
            await handleSaveSession("", "Medium");
          } else {
            setShowModal(false);
            setRemainingSecs(durationMinutesRef.current * 60);
          }
        }}
      />
    </div>
  );
}
