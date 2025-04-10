import React, { useEffect, useState, useCallback } from "react"
import "./App.css"
import {
  AVAILABLE_HOSTS,
  DEFAULT_SETTINGS,
  EXTENSION_NAME,
  ModeConfig,
  VERSION,
} from "../common/settings"
import { CopyIcon, UserIcon, ErrorIcon, ClearAllIcon } from "../../assets/icons"
import { ApiService } from "../common/services/api"
import { TaskContext, EMPTY_TASK_CONTEXT } from "../common/models/task"
import "reveal.js/dist/reveal.css"
import "reveal.js/dist/theme/black.css"
import TaskResultModal from "./components/TaskResultModal"
import { AuthStatus } from "../auth/models"
import useAuth from "../auth/useAuth"
import { getAllTasksSortedByCreatedAt, clearAllTasks } from "../db/taskStore"

const App: React.FC = () => {
  const [apiHost, setApiHost] = useState<string>(DEFAULT_SETTINGS.apiHost);
  const [status, setStatus] = useState<{
    message: string;
    type: string;
    visible: boolean;
  } | null>(null);
  const [activePage, setActivePage] = useState<string>("Account");
  const [enableAtSyntax, setEnableAtSyntax] = useState<boolean>(
    DEFAULT_SETTINGS.enableAtSyntax
  );
  const [enableLlmSelect, setEnableLlmSelect] = useState<boolean>(
    DEFAULT_SETTINGS.enableLlmSelect
  );
  const [modeConfig, setModeConfig] = useState<ModeConfig>(
    DEFAULT_SETTINGS.modeConfig
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [focusedTaskContext, setFocusedTaskContext] = useState<TaskContext>(EMPTY_TASK_CONTEXT);
  const [allTasks, setAllTasks] = useState<TaskContext[]>([]);

  const { authStatus, userInfo, handleLogin, handleLogout } = useAuth();

  const showStatus = useCallback(
    (message: string, type: string, duration: number = 3000) => {
      setStatus({ message, type, visible: true });
      setTimeout(() => {
        setStatus((prev) => (prev ? { ...prev, visible: false } : null));
        setTimeout(() => {
          setStatus(null);
        }, 300);
      }, duration);
    },
    []
  );

  useEffect(() => {
    setIsLoading(true);

    // Load settings
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      setApiHost(items.apiHost);
      setEnableAtSyntax(items.enableAtSyntax);
      setEnableLlmSelect(items.enableLlmSelect);
      setModeConfig(items.modeConfig);
      setIsLoading(false);
    });

    // Check URL parameters for page selection
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get("page");
    if (pageParam) {
      setActivePage(pageParam);
    }
  }, []);

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

  // 加载历史任务
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const allTasks = await getAllTasksSortedByCreatedAt();
        setAllTasks(allTasks);
      } catch (error) {
        console.error("Error loading tasks:", error);
        showStatus("Failed to load history", "error");
      }
    };

    if (activePage === "History") {
      loadTasks();
    }
  }, [activePage]);

  // 清空历史记录
  const handleClearHistory = useCallback(async () => {
    try {
      await clearAllTasks();
      setAllTasks([]);
      showStatus("History cleared successfully!", "success");
    } catch (error) {
      console.error("Error clearing history:", error);
      showStatus("Failed to clear history", "error");
    }
  }, [showStatus]);

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
              {authStatus === AuthStatus.NONE && (
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
                    onClick={() => handleLogin(showStatus)}
                  >
                    Login with Tearline
                  </button>
                </div>
              )}

              {authStatus === AuthStatus.PENDING && (
                <div className="profile-card pending">
                  <div className="loader"></div>
                  <div className="profile-status">Login in progress</div>
                  <p className="profile-message">
                    Please complete login in the opened page...
                  </p>
                </div>
              )}

              {authStatus === AuthStatus.ERROR && (
                <div className="profile-card error">
                  <div className="profile-avatar error">
                    <img src={ErrorIcon} alt="Error" />
                  </div>
                  <div className="profile-status">
                    Login failed or timed out
                  </div>
                  <button
                    className="auth-button login-button"
                    onClick={() => handleLogin(showStatus)}
                  >
                    Try Again
                  </button>
                </div>
              )}

              {authStatus === AuthStatus.SUCCESS && (
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
                    onClick={() => handleLogout(showStatus)}
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
            <div className="history-header">
              <h2>History</h2>
              <button
                className="clear-history-button"
                onClick={handleClearHistory}
                disabled={allTasks.length === 0}
              >
                <img src={ClearAllIcon} alt="Delete" />
                Clear History
              </button>
            </div>
            <div className="history-container">
              {allTasks.length === 0 ? (
                <p>No historical tasks found.</p>
              ) : (
                <div className="task-list">
                  {allTasks.map((task) => (
                    <div key={task.id} className="task-item">
                      <div className="task-header">
                        <span className="task-id">Task ID: {task.id}</span>
                        <span className="task-state">{task.state}</span>
                        <span className="task-time">
                          {task.created_at}
                        </span>
                      </div>
                      <div className="task-input">{task.content}</div>
                      <div className="task-actions">
                        <button
                          className="share-button"
                          onClick={() => {
                            const newUrl = `${window.location.pathname}?page=History&taskId=${task.id}&action=share`;
                            window.history.pushState({}, "", newUrl);
                            window.location.reload();
                          }}
                        >
                          Share
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* 模态窗口 */}
              {(() => {
                const urlParams = new URLSearchParams(window.location.search)
                const taskId = urlParams.get("taskId")
                const action = urlParams.get("action")

                if (taskId && action === "share") {
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
        <h1>{EXTENSION_NAME}</h1>
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
