import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import type {
  Category,
  ImprovementNote,
  Session,
  SubTopic,
  TodoItem,
} from "../backend.d";
import { useActor } from "./useActor";

export type { Category, SubTopic, Session, TodoItem, ImprovementNote };

export function useCategories() {
  const { actor, isFetching } = useActor();
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllCategories();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSubTopics() {
  const { actor, isFetching } = useActor();
  return useQuery<SubTopic[]>({
    queryKey: ["subTopics"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllSubTopics();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTotalSecondsByCategory() {
  const { actor, isFetching } = useActor();
  return useQuery<[bigint, bigint][]>({
    queryKey: ["totalSecondsByCategory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTotalSecondsByCategory();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTotalSecondsBySubTopic() {
  const { actor, isFetching } = useActor();
  return useQuery<[bigint, bigint][]>({
    queryKey: ["totalSecondsBySubTopic"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTotalSecondsBySubTopic();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTodoItemsBySubTopic(subTopicId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<TodoItem[]>({
    queryKey: ["todos", subTopicId?.toString()],
    queryFn: async () => {
      if (!actor || subTopicId === null) return [];
      return actor.getTodoItemsBySubTopic(subTopicId);
    },
    enabled: !!actor && !isFetching && subTopicId !== null,
  });
}

export function useSessionsByTimeRange(
  startNs: bigint,
  endNs: bigint,
  enabled: boolean,
) {
  const { actor, isFetching } = useActor();
  return useQuery<Session[]>({
    queryKey: ["sessions", startNs.toString(), endNs.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSessionsByTimeRange(startNs, endNs);
    },
    enabled: !!actor && !isFetching && enabled,
  });
}

export function useAllImprovementNotes() {
  const { actor, isFetching } = useActor();
  return useQuery<ImprovementNote[]>({
    queryKey: ["improvementNotes"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllImprovementNotes();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddCategory() {
  const { actor } = useActor();
  const actorRef = useRef(actor);
  actorRef.current = actor;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => {
      if (!actorRef.current) throw new Error("Not ready");
      return actorRef.current.addCategory(name);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useAddSubTopic() {
  const { actor } = useActor();
  const actorRef = useRef(actor);
  actorRef.current = actor;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      categoryId,
      name,
    }: { categoryId: bigint; name: string }) => {
      if (!actorRef.current) throw new Error("Not ready");
      return actorRef.current.addSubTopic(categoryId, name);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subTopics"] });
      qc.invalidateQueries({ queryKey: ["totalSecondsByCategory"] });
    },
  });
}

export function useDeleteCategory() {
  const { actor } = useActor();
  const actorRef = useRef(actor);
  actorRef.current = actor;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => {
      if (!actorRef.current) throw new Error("Not ready");
      return actorRef.current.deleteCategory(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["subTopics"] });
    },
  });
}

export function useDeleteSubTopic() {
  const { actor } = useActor();
  const actorRef = useRef(actor);
  actorRef.current = actor;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => {
      if (!actorRef.current) throw new Error("Not ready");
      return actorRef.current.deleteSubTopic(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subTopics"] }),
  });
}

export function useAddSession() {
  const { actor } = useActor();
  const actorRef = useRef(actor);
  actorRef.current = actor;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      subTopicId: bigint;
      categoryId: bigint;
      startTime: bigint;
      durationSeconds: bigint;
      note: string;
      energyRating: string;
    }) => {
      if (!actorRef.current) throw new Error("Not ready");
      return actorRef.current.addSession(
        args.subTopicId,
        args.categoryId,
        args.startTime,
        args.durationSeconds,
        args.note,
        args.energyRating,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["totalSecondsByCategory"] });
      qc.invalidateQueries({ queryKey: ["totalSecondsBySubTopic"] });
    },
  });
}

export function useAddTodoItem() {
  const { actor } = useActor();
  const actorRef = useRef(actor);
  actorRef.current = actor;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      subTopicId,
      text,
    }: { subTopicId: bigint; text: string }) => {
      if (!actorRef.current) throw new Error("Not ready");
      return actorRef.current.addTodoItem(subTopicId, text);
    },
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["todos", vars.subTopicId.toString()] }),
  });
}

export function useToggleTodoItem(subTopicId: bigint | null) {
  const { actor } = useActor();
  const actorRef = useRef(actor);
  actorRef.current = actor;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => {
      if (!actorRef.current) throw new Error("Not ready");
      return actorRef.current.toggleTodoItemCompleted(id);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["todos", subTopicId?.toString()] }),
  });
}

export function useDeleteTodoItem(subTopicId: bigint | null) {
  const { actor } = useActor();
  const actorRef = useRef(actor);
  actorRef.current = actor;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => {
      if (!actorRef.current) throw new Error("Not ready");
      return actorRef.current.deleteTodoItem(id);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["todos", subTopicId?.toString()] }),
  });
}

export function useUpsertImprovementNote() {
  const { actor } = useActor();
  const actorRef = useRef(actor);
  actorRef.current = actor;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dateKey, note }: { dateKey: string; note: string }) => {
      if (!actorRef.current) throw new Error("Not ready");
      return actorRef.current.upsertImprovementNote(dateKey, note);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["improvementNotes"] }),
  });
}
