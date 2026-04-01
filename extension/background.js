const WORKER_URL = 'https://tabsync-worker.rsarans186.workers.dev';
const DEBOUNCE_MS = 1500;

let debounceTimer = null;

function scheduleSync() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(doSync, DEBOUNCE_MS);
}

async function doSync() {
  const { tabsync_active, tabsync_code, tabsync_secret } = await chrome.storage.local.get([
    'tabsync_active',
    'tabsync_code',
    'tabsync_secret',
  ]);

  if (!tabsync_active || !tabsync_code || !tabsync_secret) return;

  const tabs = await chrome.tabs.query({});
  const payload = tabs
    .filter(t => t.url?.startsWith('http'))
    .map(t => ({
      id: t.id,
      windowId: t.windowId,
      title: t.title || '',
      url: t.url || '',
      favIconUrl: t.favIconUrl || '',
      active: t.active,
      pinned: t.pinned,
    }));

  try {
    await fetch(`${WORKER_URL}/sessions/${tabsync_code}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tabsync_secret}`,
      },
      body: JSON.stringify({ tabs: payload }),
    });
  } catch (err) {
    console.error('TabSync background: sync failed', err);
  }
}

// Listen to tab events and debounce sync
chrome.tabs.onCreated.addListener(scheduleSync);
chrome.tabs.onRemoved.addListener(scheduleSync);
chrome.tabs.onActivated.addListener(scheduleSync);
chrome.tabs.onUpdated.addListener((_id, changeInfo) => {
  if (changeInfo.title || changeInfo.url || changeInfo.status === 'complete') {
    scheduleSync();
  }
});
