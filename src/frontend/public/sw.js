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
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${bar} ${pct}% complete`;
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
        body: '✅ Session complete! Great work.',
        tag: NOTIF_TAG,
        silent: false,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: false,
        renotify: true,
        vibrate: [200, 100, 200],
      });
      return;
    }

    const progressBar = buildProgressBar(remaining, swTotalDurationSecs);
    self.registration.showNotification('Naksha 🧭 Study Timer', {
      body: `⏱ ${formatTime(remaining)} remaining\n${progressBar}`,
      tag: NOTIF_TAG,
      silent: true,
      renotify: true,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: false,
      vibrate: [100],
      actions: [
        { action: 'stop', title: '⏹ Stop' }
      ],
    });
  }, 10000);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'stop') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        for (const client of clients) {
          client.postMessage({ type: 'SW_STOP_TIMER' });
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

  if (data.type === 'TIMER_STARTED') {
    swStartTs = data.startTs;
    swRemainingSecs = data.remainingSecs;
    if (data.totalDurationSecs) swTotalDurationSecs = data.totalDurationSecs;

    const progressBar = buildProgressBar(swRemainingSecs, swTotalDurationSecs);
    self.registration.showNotification('Naksha 🧭 Study Timer', {
      body: `⏱ ${formatTime(swRemainingSecs)} remaining\n${progressBar}`,
      tag: NOTIF_TAG,
      silent: true,
      renotify: true,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: false,
      vibrate: [100],
      actions: [
        { action: 'stop', title: '⏹ Stop' }
      ],
    });
    startBgInterval();
  }

  if (data.type === 'TIMER_BACKGROUNDED') {
    swStartTs = data.startTs;
    swRemainingSecs = data.remainingSecs;
    if (data.totalDurationSecs) swTotalDurationSecs = data.totalDurationSecs;

    const remaining = Math.max(0, swRemainingSecs - Math.floor((Date.now() - swStartTs) / 1000));
    const progressBar = buildProgressBar(remaining, swTotalDurationSecs);
    self.registration.showNotification('Naksha 🧭 Study Timer', {
      body: `⏱ ${formatTime(remaining)} remaining\n${progressBar}`,
      tag: NOTIF_TAG,
      silent: true,
      renotify: true,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: false,
      vibrate: [100],
      actions: [
        { action: 'stop', title: '⏹ Stop' }
      ],
    });
    startBgInterval();
  }

  if (data.type === 'TIMER_FOREGROUNDED') {
    if (bgTimerInterval) {
      clearInterval(bgTimerInterval);
      bgTimerInterval = null;
    }
    self.registration.getNotifications({ tag: NOTIF_TAG }).then((notifs) => {
      for (const n of notifs) n.close();
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
      self.registration.showNotification('Naksha ⏰ 10-Min Mark!', {
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
