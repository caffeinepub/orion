import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  useAddTodoItem,
  useDeleteTodoItem,
  useTodoItemsBySubTopic,
  useToggleTodoItem,
} from "../hooks/useQueries";

type Section = "today" | "tomorrow" | "upcoming";

const SECTION_LABELS: Record<Section, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  upcoming: "Upcoming",
};

const SECTIONS: Section[] = ["today", "tomorrow", "upcoming"];

function getSectionMap(subTopicId: bigint): Record<string, Section> {
  try {
    const raw = localStorage.getItem(`todo-sections-${subTopicId.toString()}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSectionMap(subTopicId: bigint, map: Record<string, Section>) {
  localStorage.setItem(
    `todo-sections-${subTopicId.toString()}`,
    JSON.stringify(map),
  );
}

interface Props {
  subTopicId: bigint;
}

export function TodoList({ subTopicId }: Props) {
  const [newText, setNewText] = useState("");
  const [newSection, setNewSection] = useState<Section>("today");
  const [sectionMap, setSectionMap] = useState<Record<string, Section>>(() =>
    getSectionMap(subTopicId),
  );
  const [collapsed, setCollapsed] = useState<Set<Section>>(new Set());

  const { data: todos = [], isLoading } = useTodoItemsBySubTopic(subTopicId);
  const addTodo = useAddTodoItem();
  const toggleTodo = useToggleTodoItem(subTopicId);
  const deleteTodo = useDeleteTodoItem(subTopicId);

  function updateSection(todoId: string, section: Section) {
    const next = { ...sectionMap, [todoId]: section };
    setSectionMap(next);
    saveSectionMap(subTopicId, next);
  }

  function handleAdd() {
    const text = newText.trim();
    if (!text) return;
    addTodo.mutate(
      { subTopicId, text },
      {
        onSuccess: (newId) => {
          // newId may be the todo object or an id; handle both cases
          // We'll assign section after the fact when we see new todos
          // Store a pending section assignment keyed by text+timestamp (best effort)
          const pendingKey = `__pending_${Date.now()}`;
          const next = { ...sectionMap, [pendingKey]: newSection };
          setSectionMap(next);
          saveSectionMap(subTopicId, next);
          void newId;
        },
      },
    );
    setNewText("");
  }

  function toggleCollapse(section: Section) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  function getSection(todoId: string): Section {
    return sectionMap[todoId] ?? "today";
  }

  const todosBySection = SECTIONS.reduce(
    (acc, s) => {
      acc[s] = todos.filter((t) => getSection(t.id.toString()) === s);
      return acc;
    },
    {} as Record<Section, typeof todos>,
  );

  let globalIdx = 0;

  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        To-Do List
      </h3>

      {/* Add task row */}
      <div className="flex gap-2">
        <Input
          data-ocid="todo.input"
          placeholder="Add a task..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground text-sm"
        />
        <Select
          value={newSection}
          onValueChange={(v) => setNewSection(v as Section)}
        >
          <SelectTrigger
            data-ocid="todo.select"
            className="w-[110px] h-9 text-xs bg-muted/40 border-border shrink-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="tomorrow">Tomorrow</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
          </SelectContent>
        </Select>
        <Button
          data-ocid="todo.add_button"
          size="sm"
          onClick={handleAdd}
          disabled={addTodo.isPending || !newText.trim()}
          className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 shrink-0 h-9"
        >
          {addTodo.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isLoading ? (
        <div
          data-ocid="todo.loading_state"
          className="flex justify-center py-4"
        >
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : todos.length === 0 ? (
        <p
          data-ocid="todo.empty_state"
          className="text-muted-foreground text-sm py-2 text-center"
        >
          No tasks yet
        </p>
      ) : (
        <div className="space-y-3">
          {SECTIONS.map((section) => {
            const items = todosBySection[section];
            if (items.length === 0) return null;
            const isCollapsed = collapsed.has(section);

            return (
              <div key={section}>
                {/* Section header */}
                <button
                  type="button"
                  onClick={() => toggleCollapse(section)}
                  className="flex items-center gap-1.5 w-full text-left mb-1.5 group"
                  data-ocid={`todo.${section}_tab`}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                    {SECTION_LABELS[section]}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 ml-1">
                    ({items.length})
                  </span>
                </button>

                {!isCollapsed && (
                  <ul className="space-y-1">
                    {items.map((todo) => {
                      globalIdx++;
                      const idx = globalIdx;
                      return (
                        <li
                          key={Number(todo.id)}
                          data-ocid={`todo.item.${idx}`}
                          className="flex items-center gap-2 py-1.5 px-2.5 rounded-md bg-muted/30 group"
                        >
                          <Checkbox
                            data-ocid={`todo.checkbox.${idx}`}
                            checked={todo.completed}
                            onCheckedChange={() => toggleTodo.mutate(todo.id)}
                            className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                          />
                          <span
                            className={`flex-1 text-sm ${
                              todo.completed
                                ? "line-through text-muted-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {todo.text}
                          </span>
                          {/* Section mover */}
                          <Select
                            value={getSection(todo.id.toString())}
                            onValueChange={(v) =>
                              updateSection(todo.id.toString(), v as Section)
                            }
                          >
                            <SelectTrigger className="w-[85px] h-6 text-[10px] border-0 bg-transparent text-muted-foreground p-0 gap-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="today">Today</SelectItem>
                              <SelectItem value="tomorrow">Tomorrow</SelectItem>
                              <SelectItem value="upcoming">Upcoming</SelectItem>
                            </SelectContent>
                          </Select>
                          <button
                            type="button"
                            data-ocid={`todo.delete_button.${idx}`}
                            onClick={() => deleteTodo.mutate(todo.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
