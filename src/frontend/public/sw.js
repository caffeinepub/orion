// Naksha Study Timer - Service Worker
// Handles background timer notifications and 10-min beeps

const NOTIF_TAG = 'naksha-timer';
let bgTimerInterval = null;
let scheduledBeeps = [];
let swStartTs = 0;
let swRemainingSecs = 0;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
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
      });
      return;
    }

    self.registration.showNotification('Naksha Study Timer', {
      body: `⏱ ${formatTime(remaining)} remaining — studying in progress`,
      tag: NOTIF_TAG,
      silent: true,
      renotify: true,
      icon: '/favicon.ico',
    });
  }, 15000);
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'TIMER_STARTED') {
    // Called immediately when user taps Start — show notification right away
    swStartTs = data.startTs;
    swRemainingSecs = data.remainingSecs;

    self.registration.showNotification('Naksha Study Timer', {
      body: `⏱ ${formatTime(swRemainingSecs)} remaining — session started`,
      tag: NOTIF_TAG,
      silent: true,
      icon: '/favicon.ico',
    });
    startBgInterval();
  }

  if (data.type === 'TIMER_BACKGROUNDED') {
    // Called when app goes to background
    swStartTs = data.startTs;
    swRemainingSecs = data.remainingSecs;

    const remaining = Math.max(0, swRemainingSecs - Math.floor((Date.now() - swStartTs) / 1000));
    self.registration.showNotification('Naksha Study Timer', {
      body: `⏱ ${formatTime(remaining)} remaining — studying in progress`,
      tag: NOTIF_TAG,
      silent: true,
      icon: '/favicon.ico',
    });
    startBgInterval();
  }

  if (data.type === 'TIMER_FOREGROUNDED') {
    // App came back to foreground — stop updating notification (app handles display)
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
      });
    }, delay);
    scheduledBeeps.push(tid);
  }

  if (data.type === 'CANCEL_BEEPS') {
    for (const tid of scheduledBeeps) clearTimeout(tid);
    scheduledBeeps = [];
  }
});
