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
  const [activePage, setActivePage] = useState<string>('Account');

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

  // Render different content based on active page
  const renderContent = () => {
    switch (activePage) {
      case 'Account':
        return (
          <>
            <h2>Account Settings</h2>
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
          </>
        );
      case 'About':
        return (
          <>
            <h2>About</h2>
            <p>Tearline Auto Browser Extension</p>
            <p>Version: 1.0.0</p>
            <p>This extension allows automated browsing and testing for Tearline services.</p>
          </>
        );
      case 'Developer settings':
        return (
          <>
            <h2>Developer Settings</h2>
            <div className="form-group">
              <label htmlFor="debug-mode">Debug Mode:</label>
              <input type="checkbox" id="debug-mode" />
            </div>
            <div className="form-group">
              <label htmlFor="log-level">Log Level:</label>
              <select id="log-level">
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>
            <button>Save Developer Settings</button>
          </>
        );
      default:
        return <div>Select an option from the sidebar</div>;
    }
  };

  return (
    <div className="options-container">
      <div className="sidebar">
        <h1>Tearline</h1>
        <ul className="nav-menu">
          {['Account', 'About', 'Developer settings'].map((page) => (
            <li
              key={page}
              className={activePage === page ? 'active' : ''}
              onClick={() => setActivePage(page)}
            >
              {page}
            </li>
          ))}
        </ul>
      </div>
      <div className="content">
        {renderContent()}
        {status && (
          <div className={`status ${status.type}`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
};

// Initialize the React app
const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(<Options />);
}
