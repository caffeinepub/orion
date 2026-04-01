// Naksha Study Timer - Service Worker
// Handles background timer notifications and 10-min beeps

const NOTIF_TAG = 'naksha-timer';
let bgTimerInterval = null;
let scheduledBeeps = [];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'TIMER_BACKGROUNDED') {
    // Show periodic notification while timer runs in background
    const { remainingSecs, startTs } = data;
    if (bgTimerInterval) clearInterval(bgTimerInterval);

    // Immediate notification
    const m = Math.floor(remainingSecs / 60);
    const s = remainingSecs % 60;
    self.registration.showNotification('Naksha Study Timer', {
      body: `\u23F1 ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} remaining`,
      tag: NOTIF_TAG,
      silent: true,
      icon: '/favicon.ico',
    });

    bgTimerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTs) / 1000);
      const remaining = Math.max(0, remainingSecs - elapsed);

      if (remaining <= 0) {
        clearInterval(bgTimerInterval);
        bgTimerInterval = null;
        self.registration.showNotification('Naksha Study Timer', {
          body: '\u2705 Session complete! Great work.',
          tag: NOTIF_TAG,
          silent: false,
          icon: '/favicon.ico',
        });
        return;
      }

      const rm = Math.floor(remaining / 60);
      const rs = remaining % 60;
      self.registration.showNotification('Naksha Study Timer', {
        body: `\u23F1 ${String(rm).padStart(2,'0')}:${String(rs).padStart(2,'0')} remaining`,
        tag: NOTIF_TAG,
        silent: true,
        renotify: true,
        icon: '/favicon.ico',
      });
    }, 30000); // Update every 30s
  }

  if (data.type === 'TIMER_FOREGROUNDED' || data.type === 'TIMER_STOPPED') {
    if (bgTimerInterval) {
      clearInterval(bgTimerInterval);
      bgTimerInterval = null;
    }
    // Close the ongoing timer notification
    self.registration.getNotifications({ tag: NOTIF_TAG }).then((notifs) => {
      for (const n of notifs) n.close();
    });
  }

  if (data.type === 'SCHEDULE_BEEP') {
    // Schedule a 10-min milestone notification
    const { delay, label } = data;
    const tid = setTimeout(() => {
      self.registration.showNotification('Naksha \u23F0 10-Min Mark!', {
        body: label,
        tag: `naksha-beep-${Date.now()}`,
        silent: false,
        icon: '/favicon.ico',
      });
    }, delay);
    scheduledBeeps.push(tid);
  }

  if (data.type === 'CANCEL_BEEPS') {
    for (const tid of scheduledBeeps) clearTimeout(tid);
    scheduledBeeps = [];
  }
});
