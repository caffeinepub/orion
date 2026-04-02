# Naksha Study Timer

## Current State
The app has a Service Worker file (`sw.js`) that handles background timer, notifications, and 10-min beeps. However, the SW is **never registered** — no call to `navigator.serviceWorker.register('/sw.js')` exists anywhere in the codebase. Additionally, `swPost()` only sends messages if `navigator.serviceWorker.controller` is non-null, which it won't be until the SW is registered and activated. The notification permission request is inside `startTimer()` but relies on SW messages that silently fail. Timer state IS persisted to localStorage correctly on every tick.

## Requested Changes (Diff)

### Add
- SW registration in `main.tsx` on app load, waiting for SW activation before first use
- A utility `swReady()` helper that returns the active SW controller, waiting via `navigator.serviceWorker.ready` if needed
- Notification permission request on app startup (after first user interaction or on mount with a gentle prompt) so Android shows the permission dialog

### Modify
- `main.tsx`: add `navigator.serviceWorker.register('/sw.js')` call
- `swPost()` in `TimerView.tsx`: use `navigator.serviceWorker.ready` to get the active worker instead of checking `controller` (which is null on first load after SW activation)
- `startTimer()`: request notification permission immediately and then send `TIMER_STARTED` to the SW once it's ready
- `App.tsx`: request notification permission on mount for Android users so the prompt appears before they start a timer

### Remove
- Nothing removed

## Implementation Plan
1. Add SW registration in `main.tsx`
2. Update `swPost` to use `navigator.serviceWorker.ready.then(reg => reg.active.postMessage(...))` so it works even before `controller` is set
3. Add notification permission request in `App.tsx` on mount (runs once, only if `permission === 'default'`)
4. Ensure `startTimer()` in `TimerView.tsx` waits for SW ready before sending `TIMER_STARTED`
