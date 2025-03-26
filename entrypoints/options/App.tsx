import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import "./App.css"
import {
  AVAILABLE_HOSTS,
  DEFAULT_SETTINGS,
  ModeConfig,
} from "../common/settings"

const App: React.FC = () => {
  const [apiHost, setApiHost] = useState<string>(DEFAULT_SETTINGS.apiHost)
  const [status, setStatus] = useState<{
    message: string
    type: string
  } | null>(null)
  const [activePage, setActivePage] = useState<string>("Account")
  const [enableAtSyntax, setEnableAtSyntax] = useState<boolean>(
    DEFAULT_SETTINGS.enableAtSyntax
  )
  // Add state for LLM selection toggle
  const [enableLlmSelect, setEnableLlmSelect] = useState<boolean>(
    DEFAULT_SETTINGS.enableLlmSelect
  )
  // Add state for mode configuration
  const [modeConfig, setModeConfig] = useState<ModeConfig>(
    DEFAULT_SETTINGS.modeConfig
  )
  const [isLoading, setIsLoading] = useState<boolean>(true)
  // 记录登录状态
  const [authStatus, setAuthStatus] = useState<"none" | "pending" | "success">(
    "none"
  )

  // Load saved settings from chrome.storage.sync
  useEffect(() => {
    setIsLoading(true)
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      setApiHost(items.apiHost)
      setEnableAtSyntax(items.enableAtSyntax)
      setEnableLlmSelect(items.enableLlmSelect)
      setModeConfig(items.modeConfig)
      setIsLoading(false)
    })
    if (window.localStorage.getItem("AUTHINFO")) {
      setAuthStatus("success")
    } else {
      chrome.runtime.sendMessage({
        type: "INIT_LOGIN",
      })
    }

    // 监听来自 background 当页面localStorage改变产生的消息
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "LOGIN") {
        if (authStatus !== "success") {
          setAuthStatus("success")
          window.localStorage.setItem("AUTHINFO", message.data)
        }
      }
      if (message.type === "LOGOUT") {
        setAuthStatus("none")
        window.localStorage.removeItem("AUTHINFO")
      }
    })
  }, [])

  // Save settings to chrome.storage.sync
  const saveOptions = () => {
    const settings = {
      apiHost,
      enableAtSyntax,
      enableLlmSelect,
      modeConfig,
    }

    chrome.storage.sync.set(settings, () => {
      showStatus("Settings saved successfully!", "success")
      setTimeout(() => {
        setStatus(null)
      }, 2000)
    })
  }

  // Display status message
  const showStatus = (message: string, type: string) => {
    setStatus({ message, type })
  }

  // Helper function to get display name for mode config
  const getModeConfigDisplayName = (config: ModeConfig): string => {
    switch (config) {
      case "agent_only":
        return "Agent only"
      case "chat_only":
        return "Chat only"
      case "both":
        return "Both Agent and Chat"
      default:
        return config
    }
  }

  // Render different content based on active page
  const renderContent = () => {
    if (isLoading) {
      return <div>Loading settings...</div>
    }

    switch (activePage) {
      case "Account":
        // 登录按钮点击事件处理函数
        const handleLogin = async () => {
          // 检查插件的 localStorage
          const authInfo = localStorage.getItem("AUTHINFO")
          if (!authInfo) {
            setAuthStatus("pending")
            // 打开登录页面
            const url = "https://www1.test.tearline.io/#"
            await chrome.tabs.create({ url })
          }
        }

        return (
          <>
            <h2>Account Settings</h2>
            <div>
              {authStatus === "none" && (
                <button onClick={handleLogin}>登录</button>
              )}
              {authStatus === "pending" && <p>请在打开的页面完成登录</p>}
              {authStatus === "success" && <p>登录成功</p>}
            </div>
          </>
        )
      case "About":
        return (
          <>
            <h2>About</h2>
            <p>Tearline Auto Browser Extension</p>
            <p>Version: 1.0.0</p>
            <p>
              This extension empowers AI to work alongside you in the browser.
            </p>
          </>
        )
      case "Developer settings":
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
              <label htmlFor="mode-config-select">Mode Configuration:</label>
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
            <button onClick={saveOptions}>Save</button>
          </>
        )
      default:
        return <div>Select an option from the sidebar</div>
    }
  }

  return (
    <div className="options-container">
      <div className="sidebar">
        <h1>Tearline</h1>
        <ul className="nav-menu">
          {["Account", "Developer settings", "About"].map((page) => (
            <li
              key={page}
              className={activePage === page ? "active" : ""}
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
          <div className={`status ${status.type}`}>{status.message}</div>
        )}
      </div>
    </div>
  )
}

// Initialize the React app
const container = document.getElementById("app")
if (container) {
  const root = createRoot(container)
  root.render(<App />)
}

export default App
