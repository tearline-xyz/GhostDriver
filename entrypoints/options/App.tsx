import React, { useEffect, useState, useCallback } from "react"
import { createRoot } from "react-dom/client"
import "./App.css"
import {
  AVAILABLE_HOSTS,
  DEFAULT_SETTINGS,
  ModeConfig,
  TEARLINE_HOST,
} from "../common/settings"
import { authService } from "../../services/authService"

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
  const [enableLlmSelect, setEnableLlmSelect] = useState<boolean>(
    DEFAULT_SETTINGS.enableLlmSelect
  )
  const [modeConfig, setModeConfig] = useState<ModeConfig>(
    DEFAULT_SETTINGS.modeConfig
  )
  const [isLoading, setIsLoading] = useState<boolean>(true)
  // Track login status with timeout handling
  const [authStatus, setAuthStatus] = useState<
    "none" | "pending" | "success" | "error"
  >("none")
  // Track login timeout
  const [loginTimeoutId, setLoginTimeoutId] = useState<number | null>(null)
  // User info
  const [userInfo, setUserInfo] = useState<{
    name?: string
    email?: string
    userId?: string
  } | null>(null)

  // Load auth status from secure storage (chrome.storage.local)
  const loadAuthStatus = useCallback(async () => {
    try {
      const isLoggedIn = await authService.isLoggedIn()
      if (isLoggedIn) {
        const authInfo = await authService.getAuthInfo()

        // Extract user information from the nested JSON token
        let parsedUserInfo: {
          email?: string
          name?: string
          userId?: string
        } | null = null
        if (authInfo?.token) {
          try {
            // Parse the token which is a JSON string
            const parsedToken = JSON.parse(authInfo.token)

            // Extract user data from the nested structure
            if (parsedToken.data) {
              parsedUserInfo = {
                email: parsedToken.data.email,
                name: parsedToken.data.name,
                userId: parsedToken.data.user_id,
              }
            }
          } catch (err) {
            console.error("Error parsing token data:", err)
          }
        }

        setAuthStatus("success")
        setUserInfo(parsedUserInfo || authInfo?.user || null)
      } else {
        setAuthStatus("none")
        setUserInfo(null)
      }
    } catch (error) {
      console.error("Error checking auth status:", error)
      setAuthStatus("error")
    }
  }, [])

  // Load saved settings from chrome.storage.sync
  useEffect(() => {
    setIsLoading(true)

    // Load settings
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      setApiHost(items.apiHost)
      setEnableAtSyntax(items.enableAtSyntax)
      setEnableLlmSelect(items.enableLlmSelect)
      setModeConfig(items.modeConfig)
      setIsLoading(false)
    })

    // Load auth status
    loadAuthStatus()

    // Initialize login check
    chrome.runtime.sendMessage(
      {
        type: "INIT_LOGIN",
      },
      (response) => {
        // If response indicates already logged in, update state
        if (response && response.isLoggedIn) {
          loadAuthStatus()
        }
      }
    )

    // Listen for auth state changes
    const messageListener = (message) => {
      if (message.type === "LOGIN_STATE_CHANGED") {
        // Clear any pending login timeout
        if (loginTimeoutId) {
          window.clearTimeout(loginTimeoutId)
          setLoginTimeoutId(null)
        }

        loadAuthStatus()
      }

      if (message.type === "LOGOUT_STATE_CHANGED") {
        setAuthStatus("none")
        setUserInfo(null)
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)

    // Clean up listener on unmount
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener)
      // Clear any pending timeout
      if (loginTimeoutId) {
        window.clearTimeout(loginTimeoutId)
      }
    }
  }, [loadAuthStatus, loginTimeoutId])

  // Display status message with auto-clear functionality
  const showStatus = useCallback(
    (message: string, type: string, duration: number = 3000) => {
      setStatus({ message, type })

      // Automatically clear the status after the specified duration
      setTimeout(() => {
        setStatus(null)
      }, duration)
    },
    []
  )

  // Save settings to chrome.storage.sync
  const saveOptions = useCallback(() => {
    const settings = {
      apiHost,
      enableAtSyntax,
      enableLlmSelect,
      modeConfig,
    }

    chrome.storage.sync.set(settings, () => {
      showStatus("Settings saved!", "success")
    })
  }, [apiHost, enableAtSyntax, enableLlmSelect, modeConfig, showStatus])

  // Helper function to get display name for mode config
  const getModeConfigDisplayName = useCallback((config: ModeConfig): string => {
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
  }, [])

  // Handle login button click - extracted outside render
  const handleLogin = useCallback(async () => {
    try {
      // Check current auth status first
      const isLoggedIn = await authService.isLoggedIn()
      if (isLoggedIn) {
        setAuthStatus("success")
        loadAuthStatus()
        return
      }

      // Set pending state and open login page
      setAuthStatus("pending")

      // Set a timeout to revert to "none" if login doesn't complete
      const timeoutId = window.setTimeout(() => {
        setAuthStatus("error")
        showStatus("Login timed out. Please try again.", "error")
      }, 120000) // 2 minutes timeout

      setLoginTimeoutId(timeoutId)

      // Open the login page
      const url = `https://${TEARLINE_HOST}/#`
      await chrome.tabs.create({ url })
    } catch (error) {
      console.error("Login error:", error)
      setAuthStatus("error")
      showStatus("Login failed. Please try again.", "error")
    }
  }, [loadAuthStatus, showStatus])

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await authService.clearAuthInfo()
      await authService.broadcastLoginState(false)
      setAuthStatus("none")
      setUserInfo(null)
    } catch (error) {
      console.error("Logout error:", error)
      showStatus("Logout failed. Please try again.", "error")
    }
  }, [showStatus])

  // Copy text to clipboard
  const copyToClipboard = useCallback(
    (text: string) => {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          showStatus("Copied to clipboard!", "success")
        })
        .catch((err) => {
          console.error("Failed to copy: ", err)
          showStatus("Failed to copy!", "error")
        })
    },
    [showStatus]
  )

  // Format user display information
  const formatUserDisplay = useCallback(() => {
    if (!userInfo) return null

    const name = userInfo.name?.trim()
    const email = userInfo.email?.trim()
    const userId = userInfo.userId?.trim()

    return (
      <>
        {name && <p className="user-name">{name}</p>}
        {email && <p className="user-email">{email}</p>}
        {userId && (
          <div className="user-id-container">
            <p className="user-id">{userId}</p>
            <button
              className="copy-button"
              onClick={() => copyToClipboard(userId)}
              title="Copy User ID"
            >
              {/* 替换PNG图片为SVG图标 */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="9"
                  y="9"
                  width="13"
                  height="13"
                  rx="2"
                  ry="2"
                  fill="#888"
                />
                <path
                  d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                  stroke="#888"
                  strokeWidth="2"
                />
              </svg>
            </button>
          </div>
        )}
        {!name && !email && !userId && (
          <p className="user-unknown">Account connected</p>
        )}
      </>
    )
  }, [userInfo, copyToClipboard])

  // Render different content based on active page
  const renderContent = () => {
    if (isLoading) {
      return <div>Loading settings...</div>
    }

    switch (activePage) {
      case "Account":
        return (
          <>
            <h2>Account Settings</h2>
            <div className="account-container">
              <div className="profile-section">
                <div className="avatar-button-container">
                  <div className="avatar-container">
                    {/* Default profile avatar */}
                    <div className="profile-avatar">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="48"
                        height="48"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                      </svg>
                    </div>
                  </div>
                  <div className="auth-button-container">
                    {authStatus === "none" && (
                      <button
                        className="auth-button login-button"
                        onClick={handleLogin}
                      >
                        Login
                      </button>
                    )}
                    {authStatus === "error" && (
                      <button
                        className="auth-button login-button"
                        onClick={handleLogin}
                      >
                        Try Again
                      </button>
                    )}
                    {authStatus === "success" && (
                      <button
                        className="auth-button logout-button"
                        onClick={handleLogout}
                      >
                        Logout
                      </button>
                    )}
                  </div>
                </div>
                <div className="profile-info">
                  {authStatus === "none" && <p>Not logged in</p>}
                  {authStatus === "pending" && (
                    <p>Please complete login in the opened page...</p>
                  )}
                  {authStatus === "error" && <p>Login failed or timed out</p>}
                  {authStatus === "success" && formatUserDisplay()}
                </div>
              </div>
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
            <button className="save-button" onClick={saveOptions}>
              Save
            </button>
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
