import React, { useEffect, useState, useCallback } from "react"
import "./App.css"
import {
  DEFAULT_SETTINGS,
  ENABLE_DEVELOPER_SETTINGS,
  EXTENSION_NAME,
  ModeConfig,
} from "../common/settings"
import { TaskContext } from "../common/models/task"
import "reveal.js/dist/reveal.css"
import "reveal.js/dist/theme/black.css"
import Account from "./components/Account"
import About from "./components/About"
import DeveloperSettings from "./components/DeveloperSettings"
import History from "./components/History"
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
  const [allTasks, setAllTasks] = useState<TaskContext[]>([]);

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


  // Load history tasks
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

  // Clear history
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

  // 处理页面切换
  const handlePageChange = (page: string) => {
    setActivePage(page);
    const newUrl = `${window.location.pathname}?page=${page}`;
    window.history.pushState({}, "", newUrl);
  };

  // Render different content based on active page
  const renderContent = () => {
    if (isLoading) {
      return <div>Loading settings...</div>
    }

    switch (activePage) {
      case "Account":
        return <Account showStatus={showStatus} />
      case "About":
        return <About />
      case "Developer settings":
        return (
          <DeveloperSettings
            apiHost={apiHost}
            setApiHost={setApiHost}
            modeConfig={modeConfig}
            setModeConfig={setModeConfig}
            enableAtSyntax={enableAtSyntax}
            setEnableAtSyntax={setEnableAtSyntax}
            enableLlmSelect={enableLlmSelect}
            setEnableLlmSelect={setEnableLlmSelect}
            saveOptions={saveOptions}
          />
        )
      case "History":
        return (
          <History
            allTasks={allTasks}
            handleClearHistory={handleClearHistory}
            showStatus={showStatus}
          />
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
            ...(ENABLE_DEVELOPER_SETTINGS ? ["Developer settings"] : []),
            "About",
          ].map((page) => (
            <li
              key={page}
              className={activePage === page ? "active" : ""}
              onClick={() => handlePageChange(page)}
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
