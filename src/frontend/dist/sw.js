// Naksha Study Timer - Service Worker
// Handles background timer notifications and 10-min beeps

const NOTIF_TAG = 'naksha-timer';
let bgTimerInterval = null;
let scheduledBeeps = [];
let swStartTs = 0;
let swRemainingSecs = 0;
let swTotalDurationSecs = 0;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function buildProgressBar(remaining, total) {
  if (!total || total <= 0) return '';
  const elapsed = total - remaining;
  const pct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
  return `${bar} ${pct}% done`;
}

function showTimerNotification(remaining, total) {
  const progressBar = buildProgressBar(remaining, total);
  return self.registration.showNotification('Naksha \ud83e\udded Study Timer', {
    body: `\u23f1 ${formatTime(remaining)} remaining\n${progressBar}`,
    tag: NOTIF_TAG,
    silent: true,
    renotify: true,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    requireInteraction: false,
    vibrate: [50],
    actions: [
      { action: 'stop', title: '\u23f9 Stop' }
    ],
  });
}

function startBgInterval() {
  if (bgTimerInterval) clearInterval(bgTimerInterval);
  bgTimerInterval = setInterval(() => {
    if (!swStartTs) return;
    const elapsed = Math.floor((Date.now() - swStartTs) / 1000);
    const remaining = Math.max(0, swRemainingSecs - elapsed);

    if (remaining <= 0) {
      clearInterval(bgTimerInterval);
      bgTimerInterval = null;
      self.registration.showNotification('Naksha Study Timer', {
        body: '\u2705 Session complete! Great work.',
        tag: NOTIF_TAG,
        silent: false,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: true,
        renotify: true,
        vibrate: [200, 100, 200, 100, 200],
      });
      return;
    }

    showTimerNotification(remaining, swTotalDurationSecs);
  }, 5000);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'stop') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        for (const client of clients) {
          client.postMessage({ type: 'SW_STOP_TIMER' });
        }
        if (clients.length === 0) {
          return self.clients.openWindow('/');
        }
      })
    );
  } else {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        for (const client of clients) {
          if ('focus' in client) return client.focus();
        }
        return self.clients.openWindow('/');
      })
    );
  }
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'TIMER_STARTED' || data.type === 'TIMER_BACKGROUNDED') {
    swStartTs = data.startTs;
    swRemainingSecs = data.remainingSecs;
    if (data.totalDurationSecs) swTotalDurationSecs = data.totalDurationSecs;

    const elapsed = Math.floor((Date.now() - swStartTs) / 1000);
    const remaining = Math.max(0, swRemainingSecs - elapsed);
    showTimerNotification(remaining, swTotalDurationSecs);
    startBgInterval();
  }

  // Keep notification alive when app is foregrounded
  if (data.type === 'TIMER_FOREGROUNDED') {
    // notification stays visible
  }

  if (data.type === 'TIMER_PAUSED') {
    // Stop the interval, show paused state notification
    if (bgTimerInterval) {
      clearInterval(bgTimerInterval);
      bgTimerInterval = null;
    }
    swStartTs = 0;
    const remaining = data.remainingSecs || swRemainingSecs;
    const total = data.totalDurationSecs || swTotalDurationSecs;
    const progressBar = buildProgressBar(remaining, total);
    self.registration.showNotification('Naksha \ud83e\udded Study Timer', {
      body: `\u23f8\ufe0f Paused \u2022 ${formatTime(remaining)} remaining\n${progressBar}`,
      tag: NOTIF_TAG,
      silent: true,
      renotify: true,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: false,
      vibrate: [50],
      actions: [
        { action: 'stop', title: '\u23f9 Stop' }
      ],
    });
  }

  if (data.type === 'TIMER_STOPPED') {
    swStartTs = 0;
    swRemainingSecs = 0;
    swTotalDurationSecs = 0;
    if (bgTimerInterval) {
      clearInterval(bgTimerInterval);
      bgTimerInterval = null;
    }
    self.registration.getNotifications({ tag: NOTIF_TAG }).then((notifs) => {
      for (const n of notifs) n.close();
    });
  }

  if (data.type === 'SCHEDULE_BEEP') {
    const { delay, label } = data;
    const tid = setTimeout(() => {
      self.registration.showNotification('Naksha \u23f0 10-Min Mark!', {
        body: label,
        tag: `naksha-beep-${Date.now()}`,
        silent: false,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: false,
        vibrate: [200, 100, 200, 100, 200],
      });
    }, delay);
    scheduledBeeps.push(tid);
  }

  if (data.type === 'CANCEL_BEEPS') {
    for (const tid of scheduledBeeps) clearTimeout(tid);
    scheduledBeeps = [];
  }
});
