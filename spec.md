# Naksha 🧭

## Current State

Full-stack PWA study timer. Frontend uses TanStack Router, React Query, and a Motoko backend. Three bugs are reported by the user:

1. **Stats page not opening** -- Bottom nav "Stats" button calls `window.history.pushState` + manual `PopStateEvent` dispatch. TanStack Router does not respond correctly to manually dispatched popstate events, so the URL changes but the router state does not update. Additionally, the router is re-created on every render inside `AppWithState` because `createRouter` is called in the function body without memoization -- any state change (e.g. selecting a subtopic) rebuilds the entire router and resets navigation.

2. **Unable to add subject (category)** -- `useDeleteCategory` in `useQueries.ts` has a duplicate `const qc = useQueryClient()` declaration which causes a TypeScript/build error in the module. This likely prevents the entire `useQueries` module from compiling cleanly. Even if it builds, there is zero user-visible error feedback when `addCategory.mutate` fails -- errors are only logged to console.

3. **Alarms not working** -- Alarms in `TodoPage` call `playBeep()` which requires `AudioContext` to be previously initialized via user interaction. On mobile, AudioContext is blocked if not triggered by a tap. No system Notifications API is used, so there is no alarm when the app is backgrounded. No permission request is made.

## Requested Changes (Diff)

### Add
- Notification permission request: when user enables an alarm on any to-do item, call `Notification.requestPermission()` once and store result
- System notification when alarm fires: `new Notification(title, { body, icon })` in addition to the beep
- Error toast shown to user when `addCategory.mutate` fails (currently only console.log)
- `initAudioContext()` call in the alarm tick when AudioContext is suspended, as a fallback beep path

### Modify
- `useQueries.ts` `useDeleteCategory`: remove duplicate `const qc = useQueryClient()` declaration
- `App.tsx` `AppWithState`: memoize the router creation with `useMemo` and move selected subtopic/category state into a `React.createContext` so route components can read it without the router being recreated
- `App.tsx` `AppShell`: replace `window.history.pushState + PopStateEvent` navigation with TanStack Router's `useNavigate` hook
- `TodoPage.tsx`: on alarm fire, call `initAudioContext()` before `playBeep()`, and show a system notification if permission is granted

### Remove
- `handleNavigate` prop and `onNavigate` prop from `AppShell` / `BottomNav` for path navigation (replace with `useNavigate`)

## Implementation Plan

1. Fix `useDeleteCategory` duplicate `const qc` in `src/frontend/src/hooks/useQueries.ts`
2. Create `SelectionContext` in `App.tsx` to hold `selectedSubTopic`, `selectedCategory`, and `onSelectSubTopic` so routes can read them without recreating the router
3. In `AppWithState`, create router with `useMemo([])` (stable), wrap `RouterProvider` in `SelectionContext.Provider`
4. Update `AppShell` to read selection from context (not props), use `useNavigate` from `@tanstack/react-router` for path changes, remove `onNavigate` prop
5. Update `BottomNav` to remove `onNavigate` prop (call `useNavigate` inside or keep it as a callback prop that AppShell now properly provides via TanStack navigate)
6. In `TodoPage.tsx`, add notification permission request when alarm is toggled on, fire `new Notification(...)` when deadline hits in addition to `playBeep()`
7. In `Sidebar.tsx`, add `toast.error(...)` in `addCategory`'s `onError` callback
8. Build and validate
