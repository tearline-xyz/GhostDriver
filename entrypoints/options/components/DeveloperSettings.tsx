import React from "react"
import { AVAILABLE_HOSTS, ModeConfig } from "../../common/settings"

interface DeveloperSettingsProps {
  apiHost: string;
  setApiHost: (host: string) => void;
  modeConfig: ModeConfig;
  setModeConfig: (config: ModeConfig) => void;
  enableAtSyntax: boolean;
  setEnableAtSyntax: (enabled: boolean) => void;
  enableLlmSelect: boolean;
  setEnableLlmSelect: (enabled: boolean) => void;
  saveOptions: () => void;
}

const DeveloperSettings: React.FC<DeveloperSettingsProps> = ({
  apiHost,
  setApiHost,
  modeConfig,
  setModeConfig,
  enableAtSyntax,
  setEnableAtSyntax,
  enableLlmSelect,
  setEnableLlmSelect,
  saveOptions,
}) => {
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
        <label htmlFor="mode-config-select">Available modes:</label>
        <select
          id="mode-config-select"
          value={modeConfig}
          onChange={(e) => setModeConfig(e.target.value as ModeConfig)}
          className="mode-config-select"
        >
          <option value="agent_only">Agent only</option>
          <option value="chat_only">Chat only</option>
          <option value="both">Both Agent and Chat</option>
        </select>
        <div className="setting-description">
          Configure which mode options are available in the sidepanel
        </div>
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
          <div className="toggle-item">
            <input
              type="checkbox"
              id="enable-llm-select"
              checked={enableLlmSelect}
              onChange={(e) => setEnableLlmSelect(e.target.checked)}
            />
            <label htmlFor="enable-llm-select">
              Enable LLM selection
            </label>
          </div>
        </div>
      </div>
      <button className="save-button" onClick={saveOptions}>
        Save Settings
      </button>
    </>
  )
}

export default DeveloperSettings
