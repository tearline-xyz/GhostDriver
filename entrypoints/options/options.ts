// Available hosts for the extension
const AVAILABLE_HOSTS = [
  'auto.test.tearline.io',
  'auto.tearline.io',
  'auto.dev.tearline.io'
];

// DOM elements
const hostSelect = document.getElementById('host-select') as HTMLSelectElement;
const saveButton = document.getElementById('save-btn') as HTMLButtonElement;
const statusElement = document.getElementById('status') as HTMLDivElement;

// Populate the select options
function populateHostOptions(): void {
  AVAILABLE_HOSTS.forEach(host => {
    const option = document.createElement('option');
    option.value = host;
    option.textContent = host;
    hostSelect.appendChild(option);
  });
}

// Save settings to chrome.storage.sync
function saveOptions(): void {
  const host = hostSelect.value;
  chrome.storage.sync.set({ host }, () => {
    showStatus('Settings saved successfully!', 'success');
    setTimeout(() => {
      hideStatus();
    }, 2000);
  });
}

// Load saved settings from chrome.storage.sync
function loadOptions(): void {
  chrome.storage.sync.get({ host: AVAILABLE_HOSTS[0] }, (items: { host: string }) => {
    hostSelect.value = items.host;
  });
}

// Display status message
function showStatus(message: string, type: string): void {
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
  statusElement.style.display = 'block';
}

// Hide status message
function hideStatus(): void {
  statusElement.style.display = 'none';
}

// Initialize the options page
document.addEventListener('DOMContentLoaded', () => {
  populateHostOptions();
  loadOptions();
  saveButton.addEventListener('click', saveOptions);
});
