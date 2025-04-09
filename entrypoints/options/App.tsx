import React, { useEffect, useState, useCallback } from "react"
import "./App.css"
import {
  AVAILABLE_HOSTS,
  DEFAULT_SETTINGS,
  ModeConfig,
  TEARLINE_HOST,
  VERSION,
} from "../common/settings"
import { authService } from "../common/services/authService"
import { CopyIcon, UserIcon, ErrorIcon } from "../../assets/icons"
import { ApiService } from "../common/services/api"
import { TaskContext, EMPTY_TASK_CONTEXT } from "../common/model/task"
import "reveal.js/dist/reveal.css"
import "reveal.js/dist/theme/black.css"
import TaskResultModal from "./components/TaskResultModal"

const App: React.FC = () => {
  const [apiHost, setApiHost] = useState<string>(DEFAULT_SETTINGS.apiHost)
  const [status, setStatus] = useState<{
    message: string
    type: string
    visible: boolean
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
  const [focusedTaskContext, setFocusedTaskContext] = useState<TaskContext>(EMPTY_TASK_CONTEXT)

  // 状态更新函数
  const updateAuthStatus = useCallback(
    (
      newStatus: "none" | "pending" | "success" | "error",
      shouldOverridePending: boolean = false
    ) => {
      setAuthStatus((currentStatus) => {
        // 如果当前状态是 pending，且没有强制覆盖，则保持 pending 状态
        if (!shouldOverridePending && currentStatus === "pending") {
          return "pending"
        }
        // 否则更新为新状态
        return newStatus
      })
    },
    []
  )

  // Load auth status from secure storage (chrome.storage.local)
  const loadAuthStatus = useCallback(
    async (shouldOverridePending: boolean = false) => {
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

          updateAuthStatus("success", shouldOverridePending)
          setUserInfo(parsedUserInfo || authInfo?.user || null)
        } else {
          updateAuthStatus("none", shouldOverridePending)
          setUserInfo(null)
        }
      } catch (error) {
        console.error("Error checking auth status:", error)
        updateAuthStatus("error", shouldOverridePending)
      }
    },
    [updateAuthStatus]
  )

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
          loadAuthStatus(true)
        }
      }
    )

    // Check URL parameters for page selection
    const urlParams = new URLSearchParams(window.location.search)
    const pageParam = urlParams.get("page")
    if (pageParam) {
      setActivePage(pageParam)
    }

    // Listen for auth state changes
    const messageListener = (message) => {
      if (message.type === "LOGIN_STATE_CHANGED") {
        // Clear any pending login timeout
        if (loginTimeoutId) {
          window.clearTimeout(loginTimeoutId)
          setLoginTimeoutId(null)
        }

        // 强制更新状态
        loadAuthStatus(true)
      }

      if (message.type === "LOGOUT_STATE_CHANGED") {
        updateAuthStatus("none", true)
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
  }, [loadAuthStatus, loginTimeoutId, updateAuthStatus])

  // 在组件挂载时检查 URL 参数并获取任务数据
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const taskId = urlParams.get("taskId")
    const action = urlParams.get("action")

    if (taskId && action === "share") {
      const fetchTaskData = async () => {
        try {
          const apiService = new ApiService(apiHost)
          const taskContext = await apiService.getTask(taskId)
          setFocusedTaskContext(taskContext)
        } catch (error) {
          console.error("Error fetching task data:", error)
          setFocusedTaskContext(EMPTY_TASK_CONTEXT)
        }
      }
      fetchTaskData()
    }
  }, [apiHost])

  // Display status message with auto-clear functionality
  const showStatus = useCallback(
    (message: string, type: string, duration: number = 3000) => {
      // First set the status with visible: true
      setStatus({ message, type, visible: true })

      // Automatically clear the status after the specified duration
      setTimeout(() => {
        // First set visible to false to trigger the slide-out animation
        setStatus((prev) => (prev ? { ...prev, visible: false } : null))

        // Then completely remove it after the animation completes
        setTimeout(() => {
          setStatus(null)
        }, 300) // Match this with the CSS transition duration
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

  // Handle login button click - extracted outside render
  const handleLogin = useCallback(async () => {
    try {
      // Check current auth status first
      const isLoggedIn = await authService.isLoggedIn()
      if (isLoggedIn) {
        updateAuthStatus("success", true)
        loadAuthStatus()
        return
      }

      // Set pending state and open login page
      updateAuthStatus("pending")

      // Set a timeout to revert to "none" if login doesn't complete
      const timeoutId = window.setTimeout(() => {
        updateAuthStatus("error", true)
        showStatus("Login timed out. Please try again.", "error")
      }, 120000) // 2 minutes timeout

      setLoginTimeoutId(timeoutId)

      // Open the login page
      const url = `https://${TEARLINE_HOST}/#`
      await chrome.tabs.create({ url })
    } catch (error) {
      console.error("Login error:", error)
      updateAuthStatus("error", true)
      showStatus("Login failed. Please try again.", "error")
    }
  }, [showStatus, updateAuthStatus])

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await authService.clearAuthInfo()
      await authService.broadcastLoginState(false)
      updateAuthStatus("none", true)
      setUserInfo(null)
    } catch (error) {
      console.error("Logout error:", error)
      showStatus("Logout failed. Please try again.", "error")
    }
  }, [showStatus, updateAuthStatus])

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


  // Helper function to check if current version is alpha
  const isAlphaVersion = useCallback(() => {
    return VERSION.toLowerCase().includes("alpha")
  }, [])

  // 初始化 Reveal.js
  useEffect(() => {
    console.log('Current focusedTaskContext:', focusedTaskContext)
    console.log('History data:', focusedTaskContext.result?.history)
  }, [focusedTaskContext.result?.history])

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
              {authStatus === "none" && (
                <div className="profile-card not-logged-in">
                  <div className="profile-avatar">
                    <img src={UserIcon} alt="User" />
                  </div>
                  <div className="profile-status">Not logged in</div>
                  <p className="profile-message">
                    Sign in to access Tearline services
                  </p>
                  <button
                    className="auth-button login-button"
                    onClick={handleLogin}
                  >
                    Login with Tearline
                  </button>
                </div>
              )}

              {authStatus === "pending" && (
                <div className="profile-card pending">
                  <div className="loader"></div>
                  <div className="profile-status">Login in progress</div>
                  <p className="profile-message">
                    Please complete login in the opened page...
                  </p>
                </div>
              )}

              {authStatus === "error" && (
                <div className="profile-card error">
                  <div className="profile-avatar error">
                    <img src={ErrorIcon} alt="Error" />
                  </div>
                  <div className="profile-status">
                    Login failed or timed out
                  </div>
                  <button
                    className="auth-button login-button"
                    onClick={handleLogin}
                  >
                    Try Again
                  </button>
                </div>
              )}

              {authStatus === "success" && (
                <div className="profile-card logged-in">
                  <div className="profile-header">
                    <div className="profile-avatar success">
                      <img src={UserIcon} alt="User" />
                    </div>
                  </div>

                  <div className="profile-info-container">
                    {userInfo?.name && (
                      <div className="profile-detail">
                        <span className="detail-label">Name</span>
                        <span className="detail-value">{userInfo.name}</span>
                      </div>
                    )}

                    {userInfo?.email && (
                      <div className="profile-detail">
                        <span className="detail-label">Email</span>
                        <span className="detail-value">{userInfo.email}</span>
                      </div>
                    )}

                    {userInfo?.userId && (
                      <div className="profile-detail">
                        <span className="detail-label">User ID</span>
                        <div className="detail-value-with-action">
                          <span className="detail-value user-id">
                            {userInfo.userId}
                          </span>
                          <button
                            className="copy-button"
                            onClick={() =>
                              userInfo.userId &&
                              copyToClipboard(userInfo.userId)
                            }
                            title="Copy User ID"
                          >
                            <img src={CopyIcon} alt="Copy" />
                          </button>
                        </div>
                      </div>
                    )}

                    {!userInfo?.name &&
                      !userInfo?.email &&
                      !userInfo?.userId && (
                        <div className="profile-detail">
                          <span className="detail-value">
                            Account connected successfully
                          </span>
                        </div>
                      )}
                  </div>

                  <button
                    className="auth-button logout-button"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        )
      case "About":
        return (
          <>
            <h2>About</h2>
            <p>Version: {VERSION}</p>
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
      case "History":
        return (
          <>
            <h2>History</h2>
            <div className="history-container">
              <p>Historical tasks will be displayed here.</p>
              {/* 模态窗口 */}
              {(() => {
                const urlParams = new URLSearchParams(window.location.search)
                const taskId = urlParams.get("taskId")
                const action = urlParams.get("action")

                if (taskId && action === "share") {
                  console.log('Rendering modal with taskId:', taskId)
                  return (
                    <TaskResultModal
                      taskContext={focusedTaskContext}
                      onClose={() => {
                        const newUrl = window.location.pathname + "?page=History"
                        window.history.replaceState({}, "", newUrl)
                        window.location.reload()
                      }}
                    />
                  )
                }
                return null
              })()}
            </div>
          </>
        )
      default:
        return <div>Select an option from the sidebar</div>
    }
  }

  return (
    <div className="options-container">
      {status && (
        <div
          className={`status ${status.type} ${status.visible ? "visible" : ""}`}
        >
          {status.message}
        </div>
      )}
      <div className="sidebar">
        <h1>GhostDriver</h1>
        <ul className="nav-menu">
          {[
            "Account",
            "History",
            ...(isAlphaVersion() ? ["Developer settings"] : []),
            "About",
          ].map((page) => (
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
      <div className="content">{renderContent()}</div>
    </div>
  )
}

export default App
