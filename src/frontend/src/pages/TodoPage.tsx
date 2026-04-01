import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, BellOff, CheckSquare, Clock, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { playBeep } from "../utils/playBeep";

interface TodoItem {
  id: string;
  text: string;
  label: string;
  completed: boolean;
  createdAt: number;
  deadline: number | null;
  alarmEnabled: boolean;
}

function loadTodos(): TodoItem[] {
  try {
    const raw = localStorage.getItem("orion-global-todos") || "[]";
    const items = JSON.parse(raw) as TodoItem[];
    // Migrate old items without deadline/alarm fields
    return items.map((t) => ({
      ...t,
      deadline: t.deadline ?? null,
      alarmEnabled: t.alarmEnabled ?? false,
    }));
  } catch {
    return [];
  }
}

function saveTodos(todos: TodoItem[]) {
  localStorage.setItem("orion-global-todos", JSON.stringify(todos));
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

export function TodoPage() {
  const [todos, setTodos] = useState<TodoItem[]>(loadTodos);
  const [text, setText] = useState("");
  const [label, setLabel] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deadlinePickerId, setDeadlinePickerId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const firedAlarms = useRef<Set<string>>(new Set());

  // Tick every second for countdown + alarm check
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      const now = Date.now();
      for (const todo of todos) {
        if (
          todo.deadline !== null &&
          todo.alarmEnabled &&
          !todo.completed &&
          now >= todo.deadline &&
          !firedAlarms.current.has(todo.id)
        ) {
          firedAlarms.current.add(todo.id);
          // 3 beeps with 400ms stagger
          playBeep();
          setTimeout(playBeep, 400);
          setTimeout(playBeep, 800);
          toast.warning(`⏰ Deadline reached: "${todo.text}"`);
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [todos]);

  void tick; // used to force re-render for countdown updates

  function addTodo() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const item: TodoItem = {
      id: `todo-${Date.now()}`,
      text: trimmed,
      label: label.trim(),
      completed: false,
      createdAt: Date.now(),
      deadline: null,
      alarmEnabled: false,
    };
    const next = [item, ...todos];
    setTodos(next);
    saveTodos(next);
    setText("");
    setLabel("");
  }

  function toggleTodo(id: string) {
    const next = todos.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t,
    );
    setTodos(next);
    saveTodos(next);
  }

  function deleteTodo(id: string) {
    const next = todos.filter((t) => t.id !== id);
    firedAlarms.current.delete(id);
    setTodos(next);
    saveTodos(next);
  }

  function setDeadline(id: string, value: string) {
    const ts = value ? new Date(value).getTime() : null;
    firedAlarms.current.delete(id); // reset alarm if deadline changes
    const next = todos.map((t) => (t.id === id ? { ...t, deadline: ts } : t));
    setTodos(next);
    saveTodos(next);
    setDeadlinePickerId(null);
  }

  function toggleAlarm(id: string) {
    firedAlarms.current.delete(id);
    const next = todos.map((t) =>
      t.id === id ? { ...t, alarmEnabled: !t.alarmEnabled } : t,
    );
    setTodos(next);
    saveTodos(next);
  }

  const filtered = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <CheckSquare className="h-6 w-6 text-primary" />
          <h2 className="font-display text-2xl font-bold text-foreground">
            To-Do List
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Your personal reminders &amp; alarms
        </p>
      </div>

      {/* Add form */}
      <div
        className="rounded-2xl border border-border bg-card p-4 space-y-3"
        style={{
          boxShadow:
            "4px 4px 10px rgba(0,0,0,0.1), -2px -2px 6px rgba(255,255,255,0.6)",
        }}
        data-ocid="todo.panel"
      >
        <Input
          data-ocid="todo.input"
          placeholder="What do you need to do?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          className="text-base h-11"
        />
        <Input
          data-ocid="todo.search_input"
          placeholder="Label / alarm tag (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          className="text-sm h-9"
        />
        <Button
          type="button"
          data-ocid="todo.add_button"
          className="w-full h-10 gap-2"
          onClick={addTodo}
          disabled={!text.trim()}
        >
          <Plus className="h-4 w-4" />
          Add To-Do
        </Button>
      </div>

      {/* Filter tabs */}
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as "all" | "active" | "completed")}
      >
        <TabsList className="w-full bg-card border border-border">
          <TabsTrigger
            value="all"
            className="flex-1 cursor-pointer"
            data-ocid="todo.filter.tab"
          >
            All ({todos.length})
          </TabsTrigger>
          <TabsTrigger
            value="active"
            className="flex-1 cursor-pointer"
            data-ocid="todo.filter.tab"
          >
            Active ({todos.filter((t) => !t.completed).length})
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="flex-1 cursor-pointer"
            data-ocid="todo.filter.tab"
          >
            Done ({todos.filter((t) => t.completed).length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Todo list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div
            data-ocid="todo.empty_state"
            className="text-center py-12 text-muted-foreground"
          >
            <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {filter === "completed"
                ? "No completed items yet."
                : filter === "active"
                  ? "All done! No active to-dos."
                  : "Add your first to-do above."}
            </p>
          </div>
        )}
        {filtered.map((todo, i) => {
          const now = Date.now();
          const remaining = todo.deadline !== null ? todo.deadline - now : null;
          const isExpired = remaining !== null && remaining <= 0;

          return (
            <div
              key={todo.id}
              data-ocid={`todo.item.${i + 1}`}
              onMouseEnter={() => setHoveredId(todo.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="rounded-3xl border border-border bg-card px-5 py-4 flex flex-col gap-3 transition-all"
              style={{
                boxShadow:
                  "4px 4px 12px rgba(0,0,0,0.08), -2px -2px 8px rgba(255,255,255,0.5)",
              }}
            >
              <div className="flex items-center gap-4">
                {/* Circle checkbox */}
                <button
                  type="button"
                  data-ocid={`todo.checkbox.${i + 1}`}
                  onClick={() => toggleTodo(todo.id)}
                  className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    todo.completed
                      ? "bg-primary border-primary"
                      : "border-border hover:border-primary"
                  }`}
                >
                  {todo.completed && (
                    <svg
                      viewBox="0 0 10 8"
                      fill="none"
                      className="w-3 h-3"
                      role="img"
                      aria-label="Completed"
                    >
                      <path
                        d="M1 4l3 3 5-6"
                        stroke="white"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-base font-medium leading-snug ${
                      todo.completed
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {todo.text}
                  </p>
                  {todo.label && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      🏷 {todo.label}
                    </p>
                  )}
                  {/* Countdown pill */}
                  {remaining !== null && (
                    <span
                      className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        isExpired
                          ? "bg-red-100 text-red-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      ⏰ {formatCountdown(remaining)}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div
                  className={`flex items-center gap-1 transition-opacity ${
                    hoveredId === todo.id || todo.alarmEnabled
                      ? "opacity-100"
                      : "opacity-0"
                  }`}
                >
                  {/* Clock / deadline button */}
                  <button
                    type="button"
                    data-ocid={`todo.edit_button.${i + 1}`}
                    onClick={() =>
                      setDeadlinePickerId(
                        deadlinePickerId === todo.id ? null : todo.id,
                      )
                    }
                    className={`p-1.5 rounded-lg transition-colors ${
                      todo.deadline !== null
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Set deadline"
                  >
                    <Clock className="h-4 w-4" />
                  </button>

                  {/* Bell alarm toggle */}
                  <button
                    type="button"
                    data-ocid={`todo.toggle.${i + 1}`}
                    onClick={() => toggleAlarm(todo.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      todo.alarmEnabled
                        ? "text-amber-500"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={todo.alarmEnabled ? "Alarm on" : "Alarm off"}
                  >
                    {todo.alarmEnabled ? (
                      <Bell className="h-4 w-4" />
                    ) : (
                      <BellOff className="h-4 w-4" />
                    )}
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    data-ocid={`todo.delete_button.${i + 1}`}
                    onClick={() => deleteTodo(todo.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Deadline picker (inline) */}
              {deadlinePickerId === todo.id && (
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <input
                    type="datetime-local"
                    data-ocid="todo.input"
                    className="flex-1 text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground"
                    defaultValue={
                      todo.deadline
                        ? new Date(
                            todo.deadline -
                              new Date().getTimezoneOffset() * 60000,
                          )
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                    onChange={(e) => setDeadline(todo.id, e.target.value)}
                  />
                  {todo.deadline && (
                    <button
                      type="button"
                      className="text-xs text-destructive hover:underline"
                      onClick={() => setDeadline(todo.id, "")}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
