import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface SubTopic {
    id: bigint;
    categoryId: bigint;
    owner: Principal;
    name: string;
    createdAt: bigint;
}
export interface Session {
    id: bigint;
    categoryId: bigint;
    startTime: bigint;
    owner: Principal;
    note: string;
    subTopicId: bigint;
    durationSeconds: bigint;
    energyRating: string;
}
export interface Category {
    id: bigint;
    owner: Principal;
    name: string;
    createdAt: bigint;
}
export interface TodoItem {
    id: bigint;
    owner: Principal;
    createdAt: bigint;
    text: string;
    completed: boolean;
    subTopicId: bigint;
}
export interface ImprovementNote {
    id: bigint;
    dateKey: string;
    owner: Principal;
    note: string;
    updatedAt: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCategory(name: string): Promise<Category>;
    addSession(subTopicId: bigint, categoryId: bigint, startTime: bigint, durationSeconds: bigint, note: string, energyRating: string): Promise<Session>;
    addSubTopic(categoryId: bigint, name: string): Promise<SubTopic>;
    addTodoItem(subTopicId: bigint, text: string): Promise<TodoItem>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteCategory(id: bigint): Promise<void>;
    deleteSubTopic(id: bigint): Promise<void>;
    deleteTodoItem(id: bigint): Promise<void>;
    getAllCategories(): Promise<Array<Category>>;
    getAllImprovementNotes(): Promise<Array<ImprovementNote>>;
    getAllSessions(): Promise<Array<Session>>;
    getAllSubTopics(): Promise<Array<SubTopic>>;
    getCallerUserRole(): Promise<UserRole>;
    getImprovementNoteByDateKey(dateKey: string): Promise<ImprovementNote | null>;
    getSessionsByTimeRange(startTime: bigint, endTime: bigint): Promise<Array<Session>>;
    getSubTopicsByCategory(categoryId: bigint): Promise<Array<SubTopic>>;
    getTodoItemsBySubTopic(subTopicId: bigint): Promise<Array<TodoItem>>;
    getTotalSecondsByCategory(): Promise<Array<[bigint, bigint]>>;
    getTotalSecondsBySubTopic(): Promise<Array<[bigint, bigint]>>;
    isCallerAdmin(): Promise<boolean>;
    toggleTodoItemCompleted(id: bigint): Promise<TodoItem>;
    upsertImprovementNote(dateKey: string, note: string): Promise<ImprovementNote>;
}
