# Naksha Study Timer

## Current State
- Timer state (start timestamp, remaining seconds, accumulated) is saved to localStorage every 500ms via `saveTimerState()`.
- On TimerView mount, `loadTimerState()` restores the timer if subTopicId matches.
- **Bug**: The selected subtopic/category is NOT persisted. On app relaunch from home screen, `selectedSubTopic` is `null`, so `WelcomePage` renders instead of `TimerView`, and timer restoration code never runs → timer shows as 0.
- Notification permission is requested 2s after login inside `AppWithState`, but Android PWA may suppress silent JS permission requests in standalone mode.
- `navigator.storage.persist()` is never called, so Android can evict localStorage.
- Service Worker is registered somewhere but sw.js is present in public/.

## Requested Changes (Diff)

### Add
- Persist `selectedSubTopic` and `selectedCategory` to localStorage on selection, restore on app load so user returns directly to TimerView after app relaunch
- In-app permission banner: if notifications are `"default"` or `"denied"`, show a sticky banner inside the app with a button to request permission (or instructions to enable in settings if denied)
- Call `navigator.storage.persist()` on app load to request persistent storage from Android
- Register Service Worker explicitly in `main.tsx` with proper error handling and update logic
- Add a `"notificationpermission"` section in Settings showing current permission status with a re-request button

### Modify
- `AppWithState`: restore persisted `selectedSubTopic`/`selectedCategory` from localStorage on mount; save them to localStorage whenever they change
- Notification permission request: trigger immediately on mount (not delayed 2s) AND show visible in-app prompt so Android actually shows the system dialog
- SW registration: move to `main.tsx`, ensure it fires before any user interaction, add `updatefound` handler

### Remove
- Nothing to remove

## Implementation Plan
1. Create `src/utils/persistSelection.ts` — helpers to save/load `selectedSubTopic` and `selectedCategory` from localStorage
2. In `App.tsx` `AppWithState`: load persisted selection on init, save to localStorage whenever `onSelectSubTopic` is called
3. In `App.tsx` `AppWithState`: move notification permission request to fire immediately on mount (0ms delay, not 2s), AND add a visible in-app permission banner component that shows when `Notification.permission !== 'granted'`
4. In `App.tsx` `AppWithState`: call `navigator.storage.persist()` on mount
5. In `main.tsx`: register the Service Worker with proper `updatefound` and error handling
6. In `SettingsSheet`: add a Notifications section showing permission status + "Enable Notifications" button
