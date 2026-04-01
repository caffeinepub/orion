import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Category,
  ImprovementNote,
  Session,
  SubTopic,
  TodoItem,
} from "../backend.d";

export type { Category, SubTopic, Session, TodoItem, ImprovementNote };

// ---------------------------------------------------------------------------
// localStorage key constants
// ---------------------------------------------------------------------------
const LS_CATS = "naksha_categories";
const LS_SUBTOPICS = "naksha_subtopics";
const LS_SESSIONS = "naksha_sessions";
const LS_TODOS = "naksha_todos";
const LS_NOTES = "naksha_notes";
const LS_NEXT_ID = "naksha_next_id";

function getNextId(): bigint {
  const n = Number.parseInt(localStorage.getItem(LS_NEXT_ID) || "1", 10);
  localStorage.setItem(LS_NEXT_ID, String(n + 1));
  return BigInt(n);
}

// ---------------------------------------------------------------------------
// Category helpers
// ---------------------------------------------------------------------------
function loadCategories(): Category[] {
  try {
    const raw = localStorage.getItem(LS_CATS);
    if (!raw) return [];
    return JSON.parse(raw).map((c: any) => ({
      ...c,
      id: BigInt(c.id),
      createdAt: BigInt(c.createdAt),
    }));
  } catch {
    return [];
  }
}

function saveCategories(cats: Category[]) {
  localStorage.setItem(
    LS_CATS,
    JSON.stringify(
      cats.map((c) => ({
        ...c,
        id: c.id.toString(),
        createdAt: c.createdAt.toString(),
      })),
    ),
  );
}

// ---------------------------------------------------------------------------
// SubTopic helpers
// ---------------------------------------------------------------------------
function loadSubTopics(): SubTopic[] {
  try {
    const raw = localStorage.getItem(LS_SUBTOPICS);
    if (!raw) return [];
    return JSON.parse(raw).map((s: any) => ({
      ...s,
      id: BigInt(s.id),
      categoryId: BigInt(s.categoryId),
      createdAt: BigInt(s.createdAt),
    }));
  } catch {
    return [];
  }
}

function saveSubTopics(subs: SubTopic[]) {
  localStorage.setItem(
    LS_SUBTOPICS,
    JSON.stringify(
      subs.map((s) => ({
        ...s,
        id: s.id.toString(),
        categoryId: s.categoryId.toString(),
        createdAt: s.createdAt.toString(),
      })),
    ),
  );
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------
function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(LS_SESSIONS);
    if (!raw) return [];
    return JSON.parse(raw).map((s: any) => ({
      ...s,
      id: BigInt(s.id),
      categoryId: BigInt(s.categoryId),
      subTopicId: BigInt(s.subTopicId),
      startTime: BigInt(s.startTime),
      durationSeconds: BigInt(s.durationSeconds),
      owner: "",
    }));
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]) {
  localStorage.setItem(
    LS_SESSIONS,
    JSON.stringify(
      sessions.map((s) => ({
        ...s,
        id: s.id.toString(),
        categoryId: s.categoryId.toString(),
        subTopicId: s.subTopicId.toString(),
        startTime: s.startTime.toString(),
        durationSeconds: s.durationSeconds.toString(),
        owner: "",
      })),
    ),
  );
}

// ---------------------------------------------------------------------------
// TodoItem helpers
// ---------------------------------------------------------------------------
function loadTodos(): TodoItem[] {
  try {
    const raw = localStorage.getItem(LS_TODOS);
    if (!raw) return [];
    return JSON.parse(raw).map((t: any) => ({
      ...t,
      id: BigInt(t.id),
      subTopicId: BigInt(t.subTopicId),
      createdAt: BigInt(t.createdAt),
      owner: "",
    }));
  } catch {
    return [];
  }
}

function saveTodos(todos: TodoItem[]) {
  localStorage.setItem(
    LS_TODOS,
    JSON.stringify(
      todos.map((t) => ({
        ...t,
        id: t.id.toString(),
        subTopicId: t.subTopicId.toString(),
        createdAt: t.createdAt.toString(),
        owner: "",
      })),
    ),
  );
}

// ---------------------------------------------------------------------------
// ImprovementNote helpers
// ---------------------------------------------------------------------------
function loadNotes(): ImprovementNote[] {
  try {
    const raw = localStorage.getItem(LS_NOTES);
    if (!raw) return [];
    return JSON.parse(raw).map((n: any) => ({
      ...n,
      id: BigInt(n.id),
      updatedAt: BigInt(n.updatedAt),
      owner: "",
    }));
  } catch {
    return [];
  }
}

function saveNotes(notes: ImprovementNote[]) {
  localStorage.setItem(
    LS_NOTES,
    JSON.stringify(
      notes.map((n) => ({
        ...n,
        id: n.id.toString(),
        updatedAt: n.updatedAt.toString(),
        owner: "",
      })),
    ),
  );
}

// ---------------------------------------------------------------------------
// Category hooks
// ---------------------------------------------------------------------------
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => loadCategories(),
    staleTime: 0,
  });
}

export function useAddCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<Category> => {
      const cats = loadCategories();
      const cat: Category = {
        id: getNextId(),
        owner: "" as any,
        name,
        createdAt: BigInt(Date.now()),
      };
      saveCategories([...cats, cat]);
      return cat;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      saveCategories(loadCategories().filter((c) => c.id !== id));
      saveSubTopics(loadSubTopics().filter((s) => s.categoryId !== id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["subTopics"] });
    },
  });
}

// ---------------------------------------------------------------------------
// SubTopic hooks
// ---------------------------------------------------------------------------
export function useSubTopics() {
  return useQuery<SubTopic[]>({
    queryKey: ["subTopics"],
    queryFn: () => loadSubTopics(),
    staleTime: 0,
  });
}

export function useAddSubTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      categoryId,
      name,
    }: { categoryId: bigint; name: string }): Promise<SubTopic> => {
      const subs = loadSubTopics();
      const sub: SubTopic = {
        id: getNextId(),
        categoryId,
        owner: "" as any,
        name,
        createdAt: BigInt(Date.now()),
      };
      saveSubTopics([...subs, sub]);
      return sub;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subTopics"] });
      qc.invalidateQueries({ queryKey: ["totalSecondsByCategory"] });
    },
  });
}

export function useDeleteSubTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      saveSubTopics(loadSubTopics().filter((s) => s.id !== id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subTopics"] }),
  });
}

// ---------------------------------------------------------------------------
// Session hooks (localStorage)
// ---------------------------------------------------------------------------
export function useTotalSecondsByCategory() {
  return useQuery<[bigint, bigint][]>({
    queryKey: ["totalSecondsByCategory"],
    queryFn: () => {
      const sessions = loadSessions();
      const map = new Map<string, bigint>();
      for (const s of sessions) {
        const key = s.categoryId.toString();
        map.set(key, (map.get(key) ?? 0n) + s.durationSeconds);
      }
      return Array.from(map.entries()).map(
        ([k, v]) => [BigInt(k), v] as [bigint, bigint],
      );
    },
    staleTime: 0,
  });
}

export function useTotalSecondsBySubTopic() {
  return useQuery<[bigint, bigint][]>({
    queryKey: ["totalSecondsBySubTopic"],
    queryFn: () => {
      const sessions = loadSessions();
      const map = new Map<string, bigint>();
      for (const s of sessions) {
        const key = s.subTopicId.toString();
        map.set(key, (map.get(key) ?? 0n) + s.durationSeconds);
      }
      return Array.from(map.entries()).map(
        ([k, v]) => [BigInt(k), v] as [bigint, bigint],
      );
    },
    staleTime: 0,
  });
}

export function useSessionsByTimeRange(
  startNs: bigint,
  endNs: bigint,
  enabled: boolean,
) {
  return useQuery<Session[]>({
    queryKey: ["sessions", startNs.toString(), endNs.toString()],
    queryFn: () => {
      const sessions = loadSessions();
      return sessions.filter(
        (s) => s.startTime >= startNs && s.startTime <= endNs,
      );
    },
    enabled,
    staleTime: 0,
  });
}

export function useAddSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      subTopicId: bigint;
      categoryId: bigint;
      startTime: bigint;
      durationSeconds: bigint;
      note: string;
      energyRating: string;
    }): Promise<Session> => {
      const sessions = loadSessions();
      const session: Session = {
        id: getNextId(),
        owner: "" as any,
        subTopicId: args.subTopicId,
        categoryId: args.categoryId,
        startTime: args.startTime,
        durationSeconds: args.durationSeconds,
        note: args.note,
        energyRating: args.energyRating,
      };
      saveSessions([...sessions, session]);
      return session;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["totalSecondsByCategory"] });
      qc.invalidateQueries({ queryKey: ["totalSecondsBySubTopic"] });
    },
  });
}

// ---------------------------------------------------------------------------
// TodoItem hooks (localStorage)
// ---------------------------------------------------------------------------
export function useTodoItemsBySubTopic(subTopicId: bigint | null) {
  return useQuery<TodoItem[]>({
    queryKey: ["todos", subTopicId?.toString()],
    queryFn: () => {
      if (subTopicId === null) return [];
      const todos = loadTodos();
      return todos
        .filter((t) => t.subTopicId === subTopicId)
        .sort((a, b) => Number(a.createdAt - b.createdAt));
    },
    enabled: subTopicId !== null,
    staleTime: 0,
  });
}

export function useAddTodoItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      subTopicId,
      text,
    }: { subTopicId: bigint; text: string }): Promise<TodoItem> => {
      const todos = loadTodos();
      const item: TodoItem = {
        id: getNextId(),
        owner: "" as any,
        subTopicId,
        text,
        completed: false,
        createdAt: BigInt(Date.now()),
      };
      saveTodos([...todos, item]);
      return item;
    },
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["todos", vars.subTopicId.toString()] }),
  });
}

export function useToggleTodoItem(subTopicId: bigint | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const todos = loadTodos();
      saveTodos(
        todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
      );
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["todos", subTopicId?.toString()] }),
  });
}

export function useDeleteTodoItem(subTopicId: bigint | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      saveTodos(loadTodos().filter((t) => t.id !== id));
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["todos", subTopicId?.toString()] }),
  });
}

// ---------------------------------------------------------------------------
// ImprovementNote hooks (localStorage)
// ---------------------------------------------------------------------------
export function useAllImprovementNotes() {
  return useQuery<ImprovementNote[]>({
    queryKey: ["improvementNotes"],
    queryFn: () => loadNotes(),
    staleTime: 0,
  });
}

export function useUpsertImprovementNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dateKey,
      note,
    }: { dateKey: string; note: string }): Promise<ImprovementNote> => {
      const notes = loadNotes();
      const existing = notes.find((n) => n.dateKey === dateKey);
      let updated: ImprovementNote[];
      if (existing) {
        updated = notes.map((n) =>
          n.dateKey === dateKey
            ? { ...n, note, updatedAt: BigInt(Date.now()) }
            : n,
        );
      } else {
        const newNote: ImprovementNote = {
          id: getNextId(),
          owner: "" as any,
          dateKey,
          note,
          updatedAt: BigInt(Date.now()),
        };
        updated = [...notes, newNote];
      }
      saveNotes(updated);
      return updated.find((n) => n.dateKey === dateKey)!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["improvementNotes"] }),
  });
}
