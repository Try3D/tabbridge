const WORKER_URL = 'https://tabsync-worker.rsarans186.workers.dev';
const WEB_URL = 'https://tabbridge.pages.dev';

function buildTabPayload(tabs) {
  return tabs
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
}

async function updateTabCount() {
  const tabs = await chrome.tabs.query({});
  const el = document.getElementById('tab-count');
  el.textContent = `${tabs.length} tab${tabs.length !== 1 ? 's' : ''}`;
}

function showSharePanel(code) {
  const panel = document.getElementById('share-panel');
  const codeEl = document.getElementById('share-code');
  const qrEl = document.getElementById('qr-code');
  const desc = document.getElementById('toggle-desc');

  codeEl.textContent = code;
  desc.textContent = 'On · syncing';
  desc.classList.add('active');

  const targetUrl = `${WEB_URL}/${code}`;
  qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=148x148&data=${encodeURIComponent(targetUrl)}&bgcolor=181825&color=cba6f7&margin=8`;

  panel.classList.remove('hidden');
}

function hideSharePanel() {
  document.getElementById('share-panel').classList.add('hidden');
  document.getElementById('share-code').textContent = '';
  document.getElementById('qr-code').src = '';
  const desc = document.getElementById('toggle-desc');
  desc.textContent = 'Off';
  desc.classList.remove('active');
}

async function startSharing(btn) {
  btn.disabled = true;
  document.getElementById('toggle-desc').textContent = 'Starting…';

  try {
    const tabs = await chrome.tabs.query({});
    const payload = buildTabPayload(tabs);

    const res = await fetch(`${WORKER_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabs: payload }),
    });

    if (!res.ok) throw new Error(`Worker error: ${res.status}`);

    const { code, secret_token } = await res.json();

    await chrome.storage.local.set({
      tabsync_active: true,
      tabsync_code: code,
      tabsync_secret: secret_token,
    });

    btn.setAttribute('aria-pressed', 'true');
    showSharePanel(code);
  } catch (err) {
    console.error('TabSync: failed to start sharing', err);
    document.getElementById('toggle-desc').textContent = 'Error — try again';
    btn.setAttribute('aria-pressed', 'false');
  } finally {
    btn.disabled = false;
  }
}

async function stopSharing(btn) {
  btn.disabled = true;
  document.getElementById('toggle-desc').textContent = 'Stopping…';

  const { tabsync_code, tabsync_secret } = await chrome.storage.local.get([
    'tabsync_code',
    'tabsync_secret',
  ]);

  try {
    if (tabsync_code && tabsync_secret) {
      await fetch(`${WORKER_URL}/sessions/${tabsync_code}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tabsync_secret}` },
      });
    }
  } catch (err) {
    console.error('TabSync: failed to delete session', err);
  }

  await chrome.storage.local.remove(['tabsync_active', 'tabsync_code', 'tabsync_secret']);

  btn.setAttribute('aria-pressed', 'false');
  btn.disabled = false;
  hideSharePanel();
}

async function init() {
  await updateTabCount();

  const btn = document.getElementById('share-toggle');
  const { tabsync_active, tabsync_code } = await chrome.storage.local.get([
    'tabsync_active',
    'tabsync_code',
  ]);

  if (tabsync_active && tabsync_code) {
    btn.setAttribute('aria-pressed', 'true');
    showSharePanel(tabsync_code);
  }

  btn.addEventListener('click', () => {
    const isOn = btn.getAttribute('aria-pressed') === 'true';
    isOn ? stopSharing(btn) : startSharing(btn);
  });
}

init();
