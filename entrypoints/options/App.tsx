import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './App.css';
import { AVAILABLE_HOSTS, DEFAULT_SETTINGS } from '../common/settings';

const App: React.FC = () => {
  const [apiHost, setApiHost] = useState<string>(DEFAULT_SETTINGS.apiHost);
  const [status, setStatus] = useState<{ message: string; type: string } | null>(null);
  const [activePage, setActivePage] = useState<string>('Account');
  const [enableAtSyntax, setEnableAtSyntax] = useState<boolean>(DEFAULT_SETTINGS.enableAtSyntax);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load saved settings from chrome.storage.sync
  useEffect(() => {
    setIsLoading(true);
    chrome.storage.sync.get(
      DEFAULT_SETTINGS,
      (items) => {
        setApiHost(items.apiHost);
        setEnableAtSyntax(items.enableAtSyntax);
        setIsLoading(false);
      }
    );
  }, []);

  // Save settings to chrome.storage.sync
  const saveOptions = () => {
    const settings = {
      apiHost,
      enableAtSyntax
    };

    chrome.storage.sync.set(
      settings,
      () => {
        showStatus('Settings saved successfully!', 'success');
        setTimeout(() => {
          setStatus(null);
        }, 2000);
      }
    );
  };

  // Display status message
  const showStatus = (message: string, type: string) => {
    setStatus({ message, type });
  };

  // Render different content based on active page
  const renderContent = () => {
    if (isLoading) {
      return <div>Loading settings...</div>;
    }

    switch (activePage) {
      case 'Account':
        return (
          <>
            <h2>Account Settings</h2>
            <div className="account-container">
              <div className="profile-section">
                <div className="avatar-container">
                  {/* Default profile avatar */}
                  <div className="profile-avatar">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                  </div>
                </div>
                <div className="profile-info">
                  <p>Not logged in</p>
                  <button className="login-button">Login</button>
                </div>
              </div>
            </div>
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
              <label htmlFor="api-host-select">API Host:</label>
              <select
                id="api-host-select"
                value={apiHost}
                onChange={(e) => setApiHost(e.target.value)}
              >
                {AVAILABLE_HOSTS.map((hostOption) => (
                  <option key={hostOption} value={hostOption}>
                    {hostOption}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Feature Toggles:</label>
              <div className="toggle-options">
                <div className="toggle-item">
                  <input
                    type="checkbox"
                    id="enable-at-syntax"
                    checked={enableAtSyntax}
                    onChange={(e) => setEnableAtSyntax(e.target.checked)}
                  />
                  <label htmlFor="enable-at-syntax">Enable @ syntax</label>
                </div>
              </div>
            </div>
            <button onClick={saveOptions}>Save</button>
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
          {['Account', 'Developer settings', 'About'].map((page) => (
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
  root.render(<App />);
}

export default App;
