/**
 * popup.js — Slot Auto-Tracker popup UI logic
 */

const $ = id => document.getElementById(id);

async function loadSettings() {
  const settings = await chrome.storage.local.get(['userId', 'lastSlotName', 'lastProvider']);
  const { userId, lastSlotName, lastProvider } = settings;

  if (userId) {
    $('userId').value = userId;
    $('status').className = 'status-bar connected';
    $('statusText').textContent = 'Connected — tracking active';
    $('clearBtn').style.display = 'block';
  }

  if (lastSlotName) {
    $('detectedSlot').style.display = 'block';
    $('detectedName').textContent = lastSlotName;
    $('detectedProvider').textContent = lastProvider || '';
  }
}

$('saveBtn').addEventListener('click', async () => {
  const userId = $('userId').value.trim();

  if (!userId) {
    $('statusText').textContent = 'Please enter your User ID';
    return;
  }

  // Validate UUID format for user ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    $('statusText').textContent = 'Invalid User ID (needs full UUID)';
    return;
  }

  await chrome.storage.local.set({ userId });

  $('status').className = 'status-bar connected';
  $('statusText').textContent = 'Connected — tracking active';
  $('clearBtn').style.display = 'block';
});

$('clearBtn').addEventListener('click', async () => {
  await chrome.storage.local.clear();
  $('userId').value = '';
  $('status').className = 'status-bar disconnected';
  $('statusText').textContent = 'Disconnected';
  $('clearBtn').style.display = 'none';
  $('detectedSlot').style.display = 'none';
  chrome.action.setBadgeText({ text: '' });
});

// Listen for detected slots from background
chrome.storage.onChanged.addListener((changes) => {
  if (changes.lastSlotName) {
    $('detectedSlot').style.display = 'block';
    $('detectedName').textContent = changes.lastSlotName.newValue || '—';
  }
  if (changes.lastProvider) {
    $('detectedProvider').textContent = changes.lastProvider.newValue || '';
  }
});

loadSettings();
