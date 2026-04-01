import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  type Category,
  type SubTopic,
  useAddCategory,
  useAddSubTopic,
  useCategories,
  useDeleteCategory,
  useDeleteSubTopic,
  useSubTopics,
  useTotalSecondsByCategory,
} from "../hooks/useQueries";

interface Chapter {
  id: string;
  name: string;
}

function getChapters(categoryId: string): Chapter[] {
  try {
    const raw = localStorage.getItem(`orion-chapters-${categoryId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveChapters(categoryId: string, chapters: Chapter[]) {
  localStorage.setItem(
    `orion-chapters-${categoryId}`,
    JSON.stringify(chapters),
  );
}

function getTopicChapter(subTopicId: string): string | null {
  return localStorage.getItem(`orion-topic-chapter-${subTopicId}`);
}

function setTopicChapter(subTopicId: string, chapterId: string) {
  localStorage.setItem(`orion-topic-chapter-${subTopicId}`, chapterId);
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

interface Props {
  selectedSubTopicId: bigint | null;
  onSelectSubTopic: (subTopic: SubTopic, category: Category) => void;
}

export function Sidebar({ selectedSubTopicId, onSelectSubTopic }: Props) {
  const { data: categories = [], isLoading: catLoading } = useCategories();
  const { data: subTopics = [] } = useSubTopics();
  const { data: totalByCategory = [] } = useTotalSecondsByCategory();
  const addCategory = useAddCategory();
  const addSubTopic = useAddSubTopic();
  const deleteCategory = useDeleteCategory();
  const deleteSubTopic = useDeleteSubTopic();

  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(),
  );

  // Chapter data stored in state but persisted to localStorage
  const [chaptersMap, setChaptersMap] = useState<Map<string, Chapter[]>>(() => {
    const map = new Map<string, Chapter[]>();
    // pre-load chapters for any known categories from localStorage
    return map;
  });

  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [addingChapter, setAddingChapter] = useState<string | null>(null); // categoryId
  const [newChapterName, setNewChapterName] = useState("");
  const [addingTopic, setAddingTopic] = useState<{
    categoryId: bigint;
    chapterId: string;
  } | null>(null);
  const [newTopicName, setNewTopicName] = useState("");

  const totalMap = new Map(
    totalByCategory.map(([id, secs]) => [id.toString(), Number(secs)]),
  );

  function getChaptersForCat(catId: string): Chapter[] {
    if (chaptersMap.has(catId)) return chaptersMap.get(catId)!;
    const chapters = getChapters(catId);
    setChaptersMap((prev) => new Map(prev).set(catId, chapters));
    return chapters;
  }

  function toggleCat(id: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleChapter(id: string) {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAddCategory() {
    const name = newCatName.trim();
    if (!name) return;
    addCategory.mutate(name, {
      onSuccess: () => {
        setNewCatName("");
        setAddingCat(false);
      },
      onError: (err) => {
        console.error("Failed to add category:", err);
      },
    });
  }

  function handleAddChapter(catId: string) {
    const name = newChapterName.trim();
    if (!name) return;
    const chapter: Chapter = { id: `ch-${Date.now()}`, name };
    const current = getChapters(catId);
    const updated = [...current, chapter];
    saveChapters(catId, updated);
    setChaptersMap((prev) => new Map(prev).set(catId, updated));
    setNewChapterName("");
    setAddingChapter(null);
  }

  function handleDeleteChapter(catId: string, chapterId: string) {
    const current = getChapters(catId);
    const updated = current.filter((c) => c.id !== chapterId);
    saveChapters(catId, updated);
    setChaptersMap((prev) => new Map(prev).set(catId, updated));
  }

  function handleAddTopic(categoryId: bigint, chapterId: string) {
    const name = newTopicName.trim();
    if (!name) return;
    addSubTopic.mutate(
      { categoryId, name },
      {
        onSuccess: (newId) => {
          // assign chapter mapping - newId is the subTopicId
          if (newId !== undefined) {
            setTopicChapter(newId.toString(), chapterId);
          }
          setNewTopicName("");
          setAddingTopic(null);
        },
      },
    );
  }

  const accentLine = (
    <div
      style={{
        width: "4px",
        borderRadius: "4px 0 0 4px",
        background: "linear-gradient(to bottom, #60a5fa, #38bdf8)",
        boxShadow: "0 0 8px #38bdf8aa",
        alignSelf: "stretch",
        flexShrink: 0,
      }}
    />
  );

  return (
    <aside
      className="w-64 min-h-screen flex flex-col bg-sidebar"
      style={{
        boxShadow:
          "inset 2px 2px 8px rgba(0,0,0,0.15), inset -2px -2px 6px rgba(255,255,255,0.04)",
      }}
    >
      {/* Header */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <h1 className="font-display text-xl font-bold text-sky-400 tracking-tight">
          Orion
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Focus. Learn. Grow.
        </p>
      </div>

      {/* Add Subject button */}
      <div className="px-3 py-3 border-b border-sidebar-border">
        {addingCat ? (
          <div className="space-y-1.5">
            <Input
              autoFocus
              data-ocid="sidebar.category.input"
              placeholder="Subject name..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCategory();
                if (e.key === "Escape") setAddingCat(false);
              }}
              className="h-8 text-sm bg-muted/50 border-border"
            />
            <div className="flex gap-1.5">
              <Button
                size="sm"
                data-ocid="sidebar.category.submit_button"
                className="flex-1 h-7 text-xs bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
                onClick={handleAddCategory}
                disabled={addCategory.isPending}
              >
                {addCategory.isPending && (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                )}
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setAddingCat(false)}
                data-ocid="sidebar.category.cancel_button"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            data-ocid="sidebar.add_category_button"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-primary hover:bg-sidebar-accent text-xs"
            onClick={() => setAddingCat(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Subject
          </Button>
        )}
      </div>

      {/* Categories list */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {catLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {categories.map((cat, catIdx) => {
          const catId = cat.id.toString();
          const isExpanded = expandedCats.has(catId);
          const totalSecs = totalMap.get(catId) ?? 0;
          const chapters = getChaptersForCat(catId);
          const catSubTopics = subTopics.filter(
            (st) => st.categoryId.toString() === catId,
          );
          // subTopics without any chapter (ungrouped)
          const ungroupedTopics = catSubTopics.filter(
            (st) => !getTopicChapter(st.id.toString()),
          );

          return (
            <div key={Number(cat.id)} data-ocid={`sidebar.item.${catIdx + 1}`}>
              {/* Subject card */}
              <div
                className="rounded-xl overflow-hidden group"
                style={{
                  boxShadow:
                    "4px 4px 10px rgba(0,0,0,0.2), -2px -2px 6px rgba(255,255,255,0.05)",
                  background: "oklch(var(--card))",
                }}
              >
                <div className="flex items-stretch">
                  {accentLine}
                  <div className="flex-1 p-3">
                    {/* Card header row */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="flex-1 flex items-center gap-2 text-left"
                        onClick={() => toggleCat(catId)}
                        data-ocid="sidebar.toggle"
                      >
                        <span className="text-base font-bold text-foreground flex-1 truncate">
                          {cat.name}
                        </span>
                        {totalSecs > 0 && (
                          <span className="text-xs text-muted-foreground font-mono shrink-0">
                            {formatTime(totalSecs)}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCategory.mutate(cat.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity ml-1"
                        title="Delete subject"
                        data-ocid="sidebar.delete_button"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="mt-2 space-y-1">
                        {/* Chapters */}
                        {chapters.map((chapter) => {
                          const chId = `${catId}-${chapter.id}`;
                          const isChapterExpanded = expandedChapters.has(chId);
                          const chapterTopics = catSubTopics.filter(
                            (st) =>
                              getTopicChapter(st.id.toString()) === chapter.id,
                          );

                          return (
                            <div key={chapter.id} className="ml-1">
                              <div className="flex items-center gap-1 group/ch">
                                <button
                                  type="button"
                                  className="flex-1 flex items-center gap-1.5 py-1 text-left text-sm font-medium text-sidebar-foreground hover:text-primary transition-colors"
                                  onClick={() => toggleChapter(chId)}
                                >
                                  {isChapterExpanded ? (
                                    <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                  )}
                                  <span className="truncate">
                                    {chapter.name}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddingTopic({
                                      categoryId: cat.id,
                                      chapterId: chapter.id,
                                    });
                                    setNewTopicName("");
                                  }}
                                  className="opacity-0 group-hover/ch:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                                  title="Add topic"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteChapter(catId, chapter.id)
                                  }
                                  className="opacity-0 group-hover/ch:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                  title="Delete chapter"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>

                              {/* Topics under chapter */}
                              {isChapterExpanded && (
                                <div className="ml-4 space-y-0.5">
                                  {chapterTopics.map((st, stIdx) => {
                                    const isSelected =
                                      selectedSubTopicId?.toString() ===
                                      st.id.toString();
                                    return (
                                      <div
                                        key={Number(st.id)}
                                        data-ocid={`sidebar.subtopic.item.${stIdx + 1}`}
                                        className="flex items-center group/topic rounded-md overflow-hidden"
                                        style={{
                                          background: isSelected
                                            ? "oklch(var(--primary) / 0.15)"
                                            : undefined,
                                        }}
                                      >
                                        <button
                                          type="button"
                                          className="flex-1 flex items-center gap-1.5 px-2 py-1 text-left hover:bg-sidebar-accent transition-colors"
                                          onClick={() =>
                                            onSelectSubTopic(st, cat)
                                          }
                                        >
                                          <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                                          <span
                                            className={`flex-1 text-xs truncate ${
                                              isSelected
                                                ? "text-primary font-medium"
                                                : "text-sidebar-foreground"
                                            }`}
                                          >
                                            {st.name}
                                          </span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            deleteSubTopic.mutate(st.id)
                                          }
                                          className="opacity-0 group-hover/topic:opacity-100 px-2 py-1 text-muted-foreground hover:text-destructive transition-opacity"
                                          data-ocid={`sidebar.subtopic.delete_button.${stIdx + 1}`}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    );
                                  })}

                                  {/* Add topic input */}
                                  {addingTopic?.chapterId === chapter.id &&
                                    addingTopic.categoryId === cat.id && (
                                      <div className="px-1 py-1">
                                        <Input
                                          autoFocus
                                          data-ocid="sidebar.subtopic.input"
                                          placeholder="Topic name..."
                                          value={newTopicName}
                                          onChange={(e) =>
                                            setNewTopicName(e.target.value)
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter")
                                              handleAddTopic(
                                                cat.id,
                                                chapter.id,
                                              );
                                            if (e.key === "Escape")
                                              setAddingTopic(null);
                                          }}
                                          className="h-7 text-xs bg-muted/50 border-border"
                                        />
                                        <div className="flex gap-1 mt-1">
                                          <Button
                                            size="sm"
                                            className="h-6 text-xs px-2 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
                                            onClick={() =>
                                              handleAddTopic(cat.id, chapter.id)
                                            }
                                            disabled={addSubTopic.isPending}
                                          >
                                            Add
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 text-xs px-2 text-muted-foreground"
                                            onClick={() => setAddingTopic(null)}
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Ungrouped topics (no chapter) */}
                        {ungroupedTopics.map((st, stIdx) => {
                          const isSelected =
                            selectedSubTopicId?.toString() === st.id.toString();
                          return (
                            <div
                              key={Number(st.id)}
                              data-ocid={`sidebar.subtopic.item.ug.${stIdx + 1}`}
                              className="flex items-center group/topic rounded-md overflow-hidden"
                              style={{
                                background: isSelected
                                  ? "oklch(var(--primary) / 0.15)"
                                  : undefined,
                              }}
                            >
                              <button
                                type="button"
                                className="flex-1 flex items-center gap-1.5 px-2 py-1 text-left hover:bg-sidebar-accent transition-colors"
                                onClick={() => onSelectSubTopic(st, cat)}
                              >
                                <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span
                                  className={`flex-1 text-xs truncate ${
                                    isSelected
                                      ? "text-primary font-medium"
                                      : "text-sidebar-foreground"
                                  }`}
                                >
                                  {st.name}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteSubTopic.mutate(st.id)}
                                className="opacity-0 group-hover/topic:opacity-100 px-2 py-1 text-muted-foreground hover:text-destructive transition-opacity"
                                data-ocid={`sidebar.subtopic.delete_button.ug.${stIdx + 1}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}

                        {/* Add chapter button */}
                        {addingChapter === catId ? (
                          <div className="px-1 py-1">
                            <Input
                              autoFocus
                              placeholder="Chapter name..."
                              value={newChapterName}
                              onChange={(e) =>
                                setNewChapterName(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddChapter(catId);
                                if (e.key === "Escape") setAddingChapter(null);
                              }}
                              className="h-7 text-xs bg-muted/50 border-border"
                            />
                            <div className="flex gap-1 mt-1">
                              <Button
                                size="sm"
                                className="h-6 text-xs px-2 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
                                onClick={() => handleAddChapter(catId)}
                              >
                                Add
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs px-2 text-muted-foreground"
                                onClick={() => setAddingChapter(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
                            onClick={() => {
                              setAddingChapter(catId);
                              setNewChapterName("");
                            }}
                          >
                            <Plus className="h-3 w-3" />
                            Add Chapter
                          </button>
                        )}

                        {/* Add topic directly (without chapter) */}
                        {addingTopic?.chapterId === "__direct__" &&
                        addingTopic.categoryId === cat.id ? (
                          <div className="px-1 py-1">
                            <Input
                              autoFocus
                              data-ocid="sidebar.subtopic.input"
                              placeholder="Topic name..."
                              value={newTopicName}
                              onChange={(e) => setNewTopicName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleAddTopic(cat.id, "__direct__");
                                if (e.key === "Escape") setAddingTopic(null);
                              }}
                              className="h-7 text-xs bg-muted/50 border-border"
                            />
                            <div className="flex gap-1 mt-1">
                              <Button
                                size="sm"
                                className="h-6 text-xs px-2 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
                                onClick={() =>
                                  handleAddTopic(cat.id, "__direct__")
                                }
                                disabled={addSubTopic.isPending}
                              >
                                Add
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs px-2 text-muted-foreground"
                                onClick={() => setAddingTopic(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            data-ocid="sidebar.add_subtopic_button"
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
                            onClick={() => {
                              setAddingTopic({
                                categoryId: cat.id,
                                chapterId: "__direct__",
                              });
                              setNewTopicName("");
                            }}
                          >
                            <Plus className="h-3 w-3" />
                            Add Topic
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {categories.length === 0 && !catLoading && (
          <p className="text-xs text-muted-foreground text-center py-6 px-2">
            No subjects yet. Add one above!
          </p>
        )}
      </nav>
    </aside>
  );
}
