import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

// Available hosts for the extension
const AVAILABLE_HOSTS = [
  'auto.test.tearline.io',
  'auto.tearline.io',
  'auto.dev.tearline.io'
];

const Options: React.FC = () => {
  const [host, setHost] = useState<string>(AVAILABLE_HOSTS[0]);
  const [status, setStatus] = useState<{ message: string; type: string } | null>(null);

  // Load saved settings from chrome.storage.sync
  useEffect(() => {
    chrome.storage.sync.get({ host: AVAILABLE_HOSTS[0] }, (items: { host: string }) => {
      setHost(items.host);
    });
  }, []);

  // Save settings to chrome.storage.sync
  const saveOptions = () => {
    chrome.storage.sync.set({ host }, () => {
      showStatus('Settings saved successfully!', 'success');
      setTimeout(() => {
        setStatus(null);
      }, 2000);
    });
  };

  // Display status message
  const showStatus = (message: string, type: string) => {
    setStatus({ message, type });
  };

  return (
    <div>
      <h1>Tearline Auto Browser Settings</h1>

      <div className="form-group">
        <label htmlFor="host-select">API Host:</label>
        <select
          id="host-select"
          value={host}
          onChange={(e) => setHost(e.target.value)}
        >
          {AVAILABLE_HOSTS.map((hostOption) => (
            <option key={hostOption} value={hostOption}>
              {hostOption}
            </option>
          ))}
        </select>
      </div>

      <button onClick={saveOptions}>Save Settings</button>

      {status && (
        <div className={`status ${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  );
};

// Initialize the React app
const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(<Options />);
}
