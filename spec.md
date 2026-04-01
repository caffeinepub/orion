# Naksha — Sound System + Timer Persistence Fixes

## Current State
- `playBeep.ts` uses a plain sine-wave oscillator — no real "sounds"
- No clock tick sound, no sound on/off controls in Settings
- When timer is running and user navigates away then comes back, the timer is restored as "paused" requiring manual Resume tap — user says it feels like a restart
- Notifications are only sent to SW when page becomes hidden (visibilitychange), not immediately on Start
- Notification permission is requested async without waiting, so if user starts timer and immediately backgrounds the app, no notification may appear

## Requested Changes (Diff)

### Add
- **Cute sound system** in `playBeep.ts`:
  - `playStartSound()` — short ascending arpeggio (C4-E4-G4, each 0.12s, volume ~0.12)
  - `playPauseSound()` — two soft descending tones (G4-E4)
  - `playTickSound()` — very quiet, brief click (800Hz, 0.05s, volume 0.05) for clock tick
  - `playMilestoneSound()` — musical chime sequence: C5-E5-G5-C6 for 10-min marks (gentle, not harsh)
  - `playCompleteSound()` — celebratory fanfare: ascending arpeggio then sustained high note
  - `playResumeSound()` — single soft chime
- **Sound settings** in `useAppSettings.ts`:
  - `soundEnabled: boolean` (default true) — master sound on/off, key `naksha-sound-enabled`
  - `tickEnabled: boolean` (default false) — clock tick every second, key `naksha-tick-enabled`
  - Expose setters
- **Sound Settings section** in `App.tsx` Settings sheet — two toggles: "Sounds" (master) and "Clock Tick" (sub-option, only visible when Sounds enabled)
- **Auto-resume timer** on mount: when a running timer is restored from localStorage, auto-start it immediately (don't require user to tap Resume). Show a brief toast "Timer resumed" instead of "Tap Resume to continue".
- **Immediate notification on timer start**: call `requestNotifPermission()` and immediately show a notification via SW as soon as the user starts the timer (not just when backgrounded). This way the notification is already active and updates as they use the app.

### Modify
- `TimerView.tsx`:
  - Import and call the new sound functions at appropriate moments:
    - `playStartSound()` on start (alongside `initAudioContext`)
    - `playPauseSound()` on pause
    - `playMilestoneSound()` replaces the 3-beep milestone logic
    - `playCompleteSound()` replaces the 3-beep complete logic
    - `playTickSound()` every second when `tickEnabled` is true
    - `playResumeSound()` on resume
  - All sounds respect `soundEnabled` (check before playing)
  - Timer restore logic: when `saved.state === 'running'` and `remaining > 0`, auto-resume instead of pausing. Use a `pendingAutoResumeRef` flag + a `useEffect` watching `timerState === 'paused'` to call `startTimer()` automatically
  - On `startTimer()`: after `requestNotifPermission()`, also post `TIMER_BACKGROUNDED` to SW immediately so the notification exists from the start (not just when hidden)
- `App.tsx`: Add Sound section to settings sheet
- `useAppSettings.ts`: Add sound-related keys and state

### Remove
- Nothing removed

## Implementation Plan
1. Update `playBeep.ts` with new sound functions (`playStartSound`, `playPauseSound`, `playTickSound`, `playMilestoneSound`, `playCompleteSound`, `playResumeSound`) — all use AudioContext, respect `soundEnabled` via a module-level flag or parameter
2. Update `useAppSettings.ts` to add `soundEnabled`, `tickEnabled` with localStorage persistence
3. Update `App.tsx` Settings sheet to add Sound toggles (master + tick sub-option)
4. Update `TimerView.tsx`:
   a. Import new sound functions
   b. Use `soundEnabled`, `tickEnabled` from `useAppSettings`
   c. Call sounds at the right moments
   d. Add tick sound to the interval (every second when `tickEnabled`)
   e. Replace old beep calls with new musical ones
   f. Fix auto-resume: use `pendingAutoResumeRef` + effect
   g. Post `TIMER_BACKGROUNDED` to SW immediately on start (as well as on visibilitychange)
5. Validate and fix any TypeScript errors
