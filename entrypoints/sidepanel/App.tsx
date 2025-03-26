import { useState, useRef, useEffect } from "react"
import "./App.css"
import React from "react"
import { DEFAULT_SETTINGS, ModeConfig } from "../common/settings"
import { connectToPlaywrightServer } from "../playwright-crx/index.mjs"
import {
  BULLET_SYMBOL,
  BACK_SYMBOL,
  FORWARD_SYMBOL,
  PAUSE_SYMBOL,
  RESUME_SYMBOL,
  STOP_SYMBOL,
  DOWN_ARROW_SYMBOL,
} from "../common/symbols"

// Define event types and payload structures
enum TaskEventType {
  LOG = "log",
  ACTION = "action",
}

interface LogPayload {
  message: string
  level: string
  logger: string
  source: string
}

// Define event type for task events
interface TaskEvent {
  task_id: string
  type: TaskEventType
  payload: LogPayload | Record<string, any>
  id: string
  timestamp: number
}

type Mode = "agent" | "chat"

interface MenuItem {
  id: string
  label: string
  children?: MenuItem[]
  needUserInput?: boolean
}

const menuItems: MenuItem[] = [
  {
    id: "tearline",
    label: "@Tearline",
  },
  {
    id: "web",
    label: "@Web",
    children: [
      {
        id: "web-google-search",
        label: "Google search",
        needUserInput: true,
      },
      {
        id: "go-to-url",
        label: "Go to url",
        needUserInput: true,
      },
    ],
  },
  {
    id: "action",
    label: "@Action",
    children: [
      {
        id: "action-ask-me",
        label: "Ask me",
      },
    ],
  },
]

function App() {
  /** Main input text content */
  const [input, setInput] = useState("")

  /** Current operation mode - either 'agent' or 'chat' */
  const [mode, setMode] = useState<Mode>("agent")

  /** Controls visibility of suggestion dropdown menu */
  const [showSuggestions, setShowSuggestions] = useState(false)

  /** Position coordinates for suggestion dropdown */
  const [cursorPosition, setCursorPosition] = useState<{
    top: number
    left: number
  } | null>(null)

  /** Array of selected menu item IDs representing current path */
  const [selectedPath, setSelectedPath] = useState<string[]>([])

  /** Currently displayed menu items in dropdown */
  const [currentMenuItems, setCurrentMenuItems] =
    useState<MenuItem[]>(menuItems)

  /** Index of currently selected suggestion item */
  const [selectedIndex, setSelectedIndex] = useState(-1)

  /** Current search term for filtering suggestions */
  const [searchTerm, setSearchTerm] = useState("")

  /** Reference to main textarea element */
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /** Whether currently accepting user input for a menu item */
  const [isUserInput, setIsUserInput] = useState(false)

  /** Value of user input field */
  const [userInputValue, setUserInputValue] = useState("")

  /** 操作结果信息 */
  const [notification, setNotification] = useState<{
    message: string
    type: "success" | "error" | "info"
    visible: boolean
  }>({
    message: "",
    type: "info",
    visible: false,
  })

  /** 控制输入框是否禁用 */
  const [inputDisabled, setInputDisabled] = useState(false)

  /** 控制任务状态 */
  const [taskState, setTaskState] = useState<{
    running: boolean
    taskId?: string
    showControls: boolean
  }>({
    running: false,
    taskId: undefined,
    showControls: false,
  })

  /** 控制是否显示任务ID信息 */
  const [showTaskId, setShowTaskId] = useState(false)

  /** apiHost from settings */
  const [apiHost, setApiHost] = useState<string>(DEFAULT_SETTINGS.apiHost)

  /** Whether @ syntax is enabled from settings */
  const [atSyntaxEnabled, setAtSyntaxEnabled] = useState<boolean>(
    DEFAULT_SETTINGS.enableAtSyntax
  )

  /** Whether LLM selection is enabled from settings */
  const [llmSelectEnabled, setLlmSelectEnabled] = useState<boolean>(
    DEFAULT_SETTINGS.enableLlmSelect
  )

  /** Mode configuration from settings */
  const [modeConfig, setModeConfig] = useState<ModeConfig>(
    DEFAULT_SETTINGS.modeConfig
  )

  /** Events received from the server */
  const [events, setEvents] = useState<TaskEvent[]>([])

  /** Reference to the event stream area for auto-scrolling */
  const eventStreamRef = useRef<HTMLDivElement>(null)

  /** Reference to the event source connection */
  const eventSourceRef = useRef<EventSource | null>(null)

  /** Whether to auto-scroll to bottom when new events arrive */
  const [autoScroll, setAutoScroll] = useState(true)

  /** Store the button position based on event stream area */
  const [buttonPosition, setButtonPosition] = useState({
    bottom: 20,
    right: 20,
  })

  /** Track which event groups are collapsed */
  const [collapsedGroups, setCollapsedGroups] = useState<{[key: string]: boolean}>({});

  // Load saved settings on component mount
  useEffect(() => {
    // Load initial settings
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      setApiHost(items.apiHost)
      setAtSyntaxEnabled(items.enableAtSyntax)
      setLlmSelectEnabled(items.enableLlmSelect)
      setModeConfig(items.modeConfig)

      // If current mode is not available in the new config, set it to the first available mode
      if (
        (items.modeConfig === "agent_only" && mode === "chat") ||
        (items.modeConfig === "chat_only" && mode === "agent")
      ) {
        setMode(items.modeConfig === "agent_only" ? "agent" : "chat")
      }
    })

    // Add listener for settings changes
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "sync") return

      if (changes.apiHost) {
        setApiHost(changes.apiHost.newValue)
      }

      if (changes.enableAtSyntax !== undefined) {
        setAtSyntaxEnabled(changes.enableAtSyntax.newValue)
      }

      if (changes.enableLlmSelect !== undefined) {
        setLlmSelectEnabled(changes.enableLlmSelect.newValue)
      }

      if (changes.modeConfig !== undefined) {
        setModeConfig(changes.modeConfig.newValue)

        // If current mode is not available in the new config, set it to the first available mode
        if (
          (changes.modeConfig.newValue === "agent_only" && mode === "chat") ||
          (changes.modeConfig.newValue === "chat_only" && mode === "agent")
        ) {
          setMode(
            changes.modeConfig.newValue === "agent_only" ? "agent" : "chat"
          )
        }
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    // Clean up listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [mode])

  /** Filtered menu items based on current search term */
  const filteredMenuItems = currentMenuItems.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  /**
   * Constructs a full path string from an array of menu item IDs
   * @param path - Array of menu item IDs representing the selected path
   * @param userInput - Optional user input value for menu items requiring input
   * @returns A formatted string starting with '@' followed by menu item labels joined with '/'
   * @example
   * buildMenuPathString(['web', 'web-google-search']) // returns '@Web/Google search/'
   * buildMenuPathString(['web', 'go-to-url']) // returns '@Web/Go to url/'
   */
  const buildMenuPathString = (path: string[], userInput?: string): string => {
    let result = "@"
    let currentItems = menuItems

    for (let i = 0; i < path.length; i++) {
      const id = path[i]
      const item = currentItems.find((i) => i.id === id)
      if (item) {
        // Remove '@' from the first item
        const label = i === 0 ? item.label.replace("@", "") : item.label
        result += label + "/"
        currentItems = item.children || []
      }
    }
    return result
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSuggestions) return

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < filteredMenuItems.length - 1 ? prev + 1 : prev
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
          break
        case "Tab":
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < filteredMenuItems.length) {
            handleMenuItemSelection(filteredMenuItems[selectedIndex])
          }
          break
        case "Enter":
          e.preventDefault() // 阻止默认行为
          break
        case "Escape":
          e.preventDefault()
          closeAndResetMenu()
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [showSuggestions, selectedIndex, filteredMenuItems, selectedPath])

  useEffect(() => {
    if (
      showSuggestions &&
      selectedIndex === -1 &&
      filteredMenuItems.length > 0
    ) {
      setSelectedIndex(0)
    }
  }, [showSuggestions, filteredMenuItems])

  const closeAndResetMenu = () => {
    setShowSuggestions(false)
    setSelectedIndex(-1)
    setSearchTerm("")
    setCursorPosition(null)
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart
      textareaRef.current.setSelectionRange(start, start)
      textareaRef.current.focus()
    }
  }

  // Check if @ syntax is enabled before showing suggestions
  const handleTextInputAndSuggestions = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart

    // Don't show suggestions if @ syntax is disabled
    if (!atSyntaxEnabled) {
      setInput(value)
      return
    }

    const lastAtSymbolPosition = value.lastIndexOf("@", cursorPos)
    if (lastAtSymbolPosition > 0 && value[lastAtSymbolPosition - 1] !== " ") {
      setShowSuggestions(false)
      setInput(value)
      return
    }

    if (lastAtSymbolPosition !== -1 && lastAtSymbolPosition === cursorPos - 1) {
      const rect = e.target.getBoundingClientRect()
      const position = calculateTextareaCaretPosition(
        e.target,
        lastAtSymbolPosition
      )
      setShowSuggestions(true)
      setCursorPosition({
        top: rect.top + position.top,
        left: rect.left + position.left,
      })
      setCurrentMenuItems(menuItems)
      setSelectedPath([])
      setSelectedIndex(0)
      setSearchTerm("")
    } else if (
      lastAtSymbolPosition !== -1 &&
      cursorPos > lastAtSymbolPosition
    ) {
      const newSearchTerm = value.substring(lastAtSymbolPosition + 1, cursorPos)
      setSearchTerm(newSearchTerm)
      setShowSuggestions(true)

      const currentItem = findCurrentMenuItemByPath()
      if (currentItem?.needUserInput) {
        return
      }
    } else {
      closeAndResetMenu()
    }

    setInput(value)
  }

  const findCurrentMenuItemByPath = (): MenuItem | undefined => {
    let currentItems = menuItems
    let currentItem

    for (const id of selectedPath) {
      currentItem = currentItems.find((i) => i.id === id)
      if (currentItem?.children) {
        currentItems = currentItem.children
      }
    }

    return currentItem
  }

  /**
   * Helper function to hide notifications
   */
  const hideNotification = () => {
    if (notification.visible) {
      setNotification((prev) => ({ ...prev, visible: false }))
    }
  }

  /**
   * Handles the selection of an item from the suggestion menu dropdown
   *
   * This function processes two main scenarios:
   * 1. When a menu item with children is selected (navigation into submenu)
   * 2. When a terminal menu item is selected (insertion into textarea)
   *
   * @param item - The menu item that was clicked or selected
   *
   * For items with children:
   * - Updates current menu display to show children items
   * - Adds the selected item's ID to the path
   *
   * For terminal items:
   * - If item requires user input: Opens user input field
   * - If not: Creates a markdown-style link in the format [path]()
   *   and inserts it at the @ position in the textarea
   * - Resets menu state and returns focus to textarea
   *
   * @example
   * // Clicking on '@Web' (with children) will display Web submenu items
   * // Clicking on 'Ask me' (without children) will insert '[Action/Ask me]()'
   */
  const handleMenuItemSelection = (item: MenuItem) => {
    hideNotification() // Hide notification on button press
    if (item.children) {
      setCurrentMenuItems(item.children)
      setSelectedPath([...selectedPath, item.id])
      setSelectedIndex(0)
      setSearchTerm("")
    } else {
      const fullPath = [...selectedPath, item.id]
      const fullLabel = buildMenuPathString(fullPath)
      const lastAtIndex = input.lastIndexOf("@")

      let newPath
      if (item.needUserInput) {
        setSelectedPath(fullPath)
        setIsUserInput(true)
        setUserInputValue("")
        setSelectedIndex(-1)
        return
      } else {
        newPath = `[${fullLabel}]()`
      }

      const newInput =
        input.substring(0, lastAtIndex) +
        newPath +
        " " +
        input.substring(lastAtIndex + fullLabel.length)
      setInput(newInput)

      setShowSuggestions(false)
      setSelectedPath([])
      setCurrentMenuItems(menuItems)
      setSelectedIndex(-1)
      setSearchTerm("")

      if (textareaRef.current) {
        textareaRef.current.focus()
        const newPosition = lastAtIndex + newPath.length + 1
        textareaRef.current.setSelectionRange(newPosition, newPosition)
      }
    }
  }

  /**
   * Handles keyboard events for user input field that appears when a menu item with needUserInput is selected
   *
   * This function processes:
   * - Enter key: Commits the input by adding it to the main textarea with proper formatting
   * - Escape key: Cancels the input operation and returns to menu selection
   *
   * @param e - React keyboard event from the input field
   *
   * On Enter press:
   * 1. Gets the full menu path string
   * 2. Creates a markdown-style link: [path](userInput)
   * 3. Inserts it into the main textarea at @ position
   * 4. Resets the menu state and focus
   *
   * @example
   * // If user selects '@Web/Google search' and enters 'react hooks':
   * // Input will become: '[Web/Google search](react hooks)'
   */
  const handleUserInputMenuSubmit = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter" && userInputValue.trim()) {
      hideNotification() // Hide notification on input submit
      e.preventDefault()
      const fullPath = [...selectedPath]
      const menuPath = buildMenuPathString(fullPath)
      const lastAtIndex = input.lastIndexOf("@")
      const newPath = `[${menuPath}](${userInputValue.trim()})`
      const newInput =
        input.substring(0, lastAtIndex) +
        newPath +
        input.substring(lastAtIndex + menuPath.length)

      setInput(newInput)
      setShowSuggestions(false)
      setSelectedPath([])
      setCurrentMenuItems(menuItems)
      setIsUserInput(false)
      setUserInputValue("")

      if (textareaRef.current) {
        textareaRef.current.focus()
        const newPosition = lastAtIndex + newPath.length
        textareaRef.current.setSelectionRange(newPosition, newPosition)
      }
    } else if (e.key === "Escape") {
      hideNotification() // Hide notification on escape
      setIsUserInput(false)
      setUserInputValue("")
    }
  }

  const handleMenuNavigationBack = () => {
    hideNotification() // Hide notification on button press
    if (selectedPath.length > 0) {
      const newPath = selectedPath.slice(0, -1)
      setSelectedPath(newPath)
      setSelectedIndex(-1)
      setSearchTerm("")

      let items = menuItems
      for (const id of newPath) {
        const item = items.find((i) => i.id === id)
        if (item && item.children) {
          items = item.children
        }
      }
      setCurrentMenuItems(items)
    }
  }

  const handleTextareaEnterKey = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey && !showSuggestions) {
      e.preventDefault()
      hideNotification() // Hide notification on Enter key
      handleTaskSubmission()
    }
  }

  /**
   * Sets up an EventSource connection to stream task events
   * @param taskId - The ID of the current task
   */
  const connectToEventStream = (taskId: string) => {
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    // Clear previous events when starting a new task
    setEvents([])

    // Create a new EventSource connection
    // `${apiHost}/tasks/${taskId}/events/stream`
    const eventSource = new EventSource("http://localhost:9000/events/stream")

    // Handle incoming events
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // Log non-LOG type events to console but still add them to the events array
        if (data.type !== TaskEventType.LOG) {
          console.log("Received non-log event:", data)
        }

        setEvents((prev) => [...prev, data])
      } catch (error) {
        console.error("Error parsing event data:", error)
      }
    }

    // Handle connection errors
    eventSource.onerror = (error) => {
      console.error("EventSource error:", error)
      eventSource.close()
    }

    // Store reference for cleanup
    eventSourceRef.current = eventSource
  }

  // Add scroll event listener to detect when user scrolls away from bottom
  useEffect(() => {
    const handleScroll = () => {
      if (eventStreamRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = eventStreamRef.current
        // Check if user is at the bottom (with a small tolerance)
        const isAtBottom = scrollTop >= scrollHeight - clientHeight - 10
        setAutoScroll(isAtBottom)
      }
    }

    const eventStreamElement = eventStreamRef.current
    if (eventStreamElement) {
      eventStreamElement.addEventListener("scroll", handleScroll)
    }

    return () => {
      if (eventStreamElement) {
        eventStreamElement.removeEventListener("scroll", handleScroll)
      }
    }
  }, [])

  // Modified auto-scroll behavior to respect autoScroll state
  useEffect(() => {
    if (eventStreamRef.current && events.length > 0 && autoScroll) {
      const { scrollHeight, clientHeight } = eventStreamRef.current
      eventStreamRef.current.scrollTop = scrollHeight - clientHeight
    }
  }, [events, autoScroll])

  // Function to scroll to bottom and re-enable auto-scroll
  const scrollToBottom = () => {
    if (eventStreamRef.current) {
      const { scrollHeight, clientHeight } = eventStreamRef.current
      eventStreamRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: "smooth",
      })
      setAutoScroll(true)
    }
  }

  // Calculate button position based on event stream area
  useEffect(() => {
    const updateButtonPosition = () => {
      if (eventStreamRef.current) {
        const rect = eventStreamRef.current.getBoundingClientRect()
        setButtonPosition({
          bottom: window.innerHeight - rect.bottom + 20,
          right: 20,
        })
      }
    }

    updateButtonPosition()

    // Update position on window resize
    window.addEventListener("resize", updateButtonPosition)

    return () => {
      window.removeEventListener("resize", updateButtonPosition)
    }
  }, [])

  // Cleanup event source on component unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const handleTaskSubmission = async () => {
    hideNotification() // Hide notification on task submission
    try {
      // 禁用输入框
      setInputDisabled(true)

      // 开始任务，默认为运行状态，并显示控制按钮
      setTaskState({
        running: true,
        showControls: true,
        taskId: undefined, // 初始未知ID
      })

      const response = await fetch(`${apiHost}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: input,
          crx_mode: true,
        }),
      })

      if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status}`)
      }

      const data = await response.json()
      const taskId = data.id

      // Connect to both Playwright and event stream
      // await connectToPlaywrightServer(
      //   `${apiHost}/ws/playwright?task_id=${taskId}`
      // )
      connectToEventStream(taskId)

      // 更新任务ID，并开启显示taskId
      setTaskState((prev) => ({
        ...prev,
        taskId: data.id || "unknown",
      }))
      setShowTaskId(true) // Enable task ID display when we have a valid ID
    } catch (error) {
      console.error("Error:", error)

      // Check for connection refused errors
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred"
      const isConnectionRefused =
        errorMessage.toLowerCase().includes("err_connection_refused") ||
        errorMessage.toLowerCase().includes("failed to fetch") ||
        errorMessage.toLowerCase().includes("networkerror") ||
        errorMessage.toLowerCase().includes("network error")

      setNotification({
        message: isConnectionRefused
          ? `Unable to connect to server ${apiHost}. Please:
            ${BULLET_SYMBOL} Check the network connection.
            ${BULLET_SYMBOL} Config the accessible server in the options page.`
          : errorMessage,
        type: "error",
        visible: true,
      })

      // 出错时重新启用输入框并隐藏控制按钮
      setInputDisabled(false)
      setTaskState((prev) => ({ ...prev, showControls: false }))
    }
  }

  // 切换暂停/恢复状态
  const toggleTaskPauseState = async () => {
    hideNotification() // Hide notification on pause/resume
    if (taskState.taskId) {
      try {
        // Determine the target state based on current running state
        const targetState = taskState.running ? "paused" : "running"

        const response = await fetch(`${apiHost}/tasks/${taskState.taskId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            target_state: targetState,
          }),
        })

        if (!response.ok) {
          throw new Error(
            `Failed to ${taskState.running ? "pause" : "resume"} task: ${response.status}`
          )
        }

        console.log(
          `Task ${taskState.running ? "paused" : "resumed"}: ${taskState.taskId}`
        )

        // Update task state after successful API call
        setTaskState((prev) => ({ ...prev, running: !prev.running }))
      } catch (error) {
        console.error("Error toggling task state:", error)
        setNotification({
          message: `Failed to ${taskState.running ? "pause" : "resume"} task: ${error instanceof Error ? error.message : "Unknown error"}`,
          type: "error",
          visible: true,
        })
      }
    }
  }

  // 停止任务
  const stopAndResetTask = async () => {
    hideNotification() // Hide notification on stop
    if (taskState.taskId) {
      try {
        const response = await fetch(`${apiHost}/tasks/${taskState.taskId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            target_state: "stopped",
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to stop task: ${response.status}`)
        }

        console.log(`Task stopped: ${taskState.taskId}`)

        // Close the event stream connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
          eventSourceRef.current = null
        }

        // Reset all states only after successful API call
        setTaskState({
          running: false,
          taskId: undefined,
          showControls: false,
        })
        setInputDisabled(false)
        setShowTaskId(false) // Hide task ID when task is stopped
      } catch (error) {
        console.error("Error stopping task:", error)
        setNotification({
          message: `Failed to stop task: ${error instanceof Error ? error.message : "Unknown error"}`,
          type: "error",
          visible: true,
        })
        // Do not reset task state on error - keep showing task controls
      }
    }
  }

  // 新增: 重置为新任务状态
  const resetToNewTask = () => {
    // Hide any existing notification
    hideNotification()

    // Close event source connection if exists
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    // Clear input and events
    setInput("")
    setEvents([])

    // Reset task state and controls
    setTaskState({
      running: false,
      taskId: undefined,
      showControls: false,
    })

    // Enable input field
    setInputDisabled(false)

    // Hide task ID display
    setShowTaskId(false)

    // Focus on the textarea
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  // Helper function to render mode selector based on configuration
  const renderModeSelector = () => {
    if (modeConfig === "both") {
      return (
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          className="mode-select"
          disabled={inputDisabled}
        >
          <option value="agent">Agent</option>
          <option value="chat">Chat</option>
        </select>
      )
    } else if (modeConfig === "agent_only" || modeConfig === "chat_only") {
      // For single mode configs, use a disabled button showing the current mode
      const displayMode = modeConfig === "agent_only" ? "Agent" : "Chat"
      return <div className="mode-display">{displayMode}</div>
    }
    return null
  }

  /** Determine if an event is a parent (level 1) */
  const isParentEvent = (event: TaskEvent) => {
    if (event.type !== TaskEventType.LOG) return false;
    const content = event.payload.message;
    return content.includes("📍 Step") || content.includes("🚀 Starting");
  };

  /** Toggle collapse state for a group */
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <div className="app-container">
      {/* Toolbar container that can hold multiple buttons */}
      <div className="toolbar-container">
        <div className="toolbar-left">
          <button className="new-task-button" onClick={resetToNewTask}>
            New Task
          </button>
          {/* Future buttons can be added here */}
        </div>
        <div className="toolbar-right">
          {/* Space for right-aligned buttons */}
        </div>
      </div>

      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextInputAndSuggestions}
            onKeyDown={handleTextareaEnterKey}
            placeholder="Plan, search, do anything"
            className="main-input"
            spellCheck={false}
            disabled={inputDisabled} // 添加disabled属性
          />
        </div>

        {showSuggestions && cursorPosition && (
          <div
            className="suggestions-dropdown"
            style={{
              top: cursorPosition.top + 20,
              left: cursorPosition.left,
            }}
          >
            {selectedPath.length > 0 && (
              <div className="menu-header">
                <button
                  className="menu-back"
                  onClick={handleMenuNavigationBack}
                >
                  {BACK_SYMBOL} Back
                </button>
                <span className="menu-path">
                  {buildMenuPathString(selectedPath)}
                </span>
              </div>
            )}
            {isUserInput ? (
              <div className="user-input-container">
                <input
                  type="text"
                  value={userInputValue}
                  onChange={(e) => setUserInputValue(e.target.value)}
                  onKeyDown={handleUserInputMenuSubmit}
                  placeholder="Type and press Enter"
                  autoFocus
                  className="user-input"
                />
              </div>
            ) : (
              filteredMenuItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`suggestion-item ${index === selectedIndex ? "selected" : ""}`}
                  onClick={() => handleMenuItemSelection(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {item.label}
                  {item.children && (
                    <span className="submenu-indicator">{FORWARD_SYMBOL}</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <div className="input-controls">
          <div className="left-controls">
            {renderModeSelector()}
            {llmSelectEnabled && (
              <select className="llm-select" disabled={inputDisabled}>
                <option value="gpt4">GPT-4o</option>
                <option value="claude">Claude 3.5 Sonnet (Preview)</option>
                <option value="claude">Claude 3.7 Sonnet (Preview)</option>
                <option value="claude">
                  Claude 3.7 Sonnet Thinking (Preview)
                </option>
                <option value="claude">Gemini 2.0 Flash (Preview)</option>
              </select>
            )}
          </div>

          <div className="right-controls">
            {taskState.showControls ? (
              <div className="task-control-buttons">
                <button
                  className={`pause-resume-button ${taskState.running ? "running" : "paused"}`}
                  onClick={toggleTaskPauseState}
                >
                  {taskState.running ? PAUSE_SYMBOL : RESUME_SYMBOL}
                </button>
                <button className="stop-button" onClick={stopAndResetTask}>
                  {STOP_SYMBOL}
                </button>
              </div>
            ) : (
              <button
                className="send-button"
                onClick={handleTaskSubmission}
                disabled={inputDisabled}
              >
                Send ⏎
              </button>
            )}
          </div>
        </div>
      </div>

      {notification.visible && (
        <div className={`notification notification-${notification.type}`}>
          <div className="notification-content">
            <span>{notification.message}</span>
            <button
              className="notification-close"
              onClick={hideNotification} // Updated to use the helper function
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Display task ID when notification is closed and we have a task running */}
      {showTaskId && taskState.taskId && !notification.visible && (
        <div className="task-id-display">
          <small>Task ID: {taskState.taskId}</small>
        </div>
      )}

      {/* Event Stream Area */}
      <div ref={eventStreamRef} className="event-stream-area">
        {events.map((event, index) => {
          // Determine content based on event type
          let content = "";
          const eventItemClassNameList = ["event-item"];
          const isParent = isParentEvent(event);

          // Add class based on hierarchy level
          if (isParent) {
            eventItemClassNameList.push("event-level-1");
          } else {
            eventItemClassNameList.push("event-level-2");
          }

          if (event.type === TaskEventType.LOG) {
            content = event.payload.message;
            eventItemClassNameList.push(
              "event-log",
              `event-log-${event.payload.level.toLowerCase()}`
            );
          } else if (event.type === TaskEventType.ACTION) {
            content = JSON.stringify(event.payload);
            eventItemClassNameList.push("event-action");
          } else {
            content = JSON.stringify(event.payload);
            eventItemClassNameList.push("event-unknown");
          }

          // Find parent for this event
          let parentIndex = -1;
          if (!isParent) {
            for (let i = index - 1; i >= 0; i--) {
              if (isParentEvent(events[i])) {
                parentIndex = i;
                break;
              }
            }
          }

          // Skip child items if their parent is collapsed
          if (parentIndex !== -1 && collapsedGroups[events[parentIndex].id]) {
            return null;
          }

          return (
            <div
              key={event.id || index}
              className={eventItemClassNameList.join(" ")}
            >
              <div className="event-item-container">
                {isParent && (
                  <div
                    className="collapse-toggle"
                    onClick={() => toggleGroupCollapse(event.id)}
                  >
                    {collapsedGroups[event.id] ? '▶' : '▼'}
                  </div>
                )}
                <div className="event-content-wrapper">
                  <div className="event-timestamp">
                    {formatTimestampWith24HourAndMicros(event.timestamp)}
                  </div>
                  <div className="event-content">{content}</div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Working indicator - only shown when task is running */}
        {taskState.running && (
          <div className="working-indicator">Working...</div>
        )}
      </div>

      {/* Moved scroll button outside of the scrollable area */}
      {!autoScroll && events.length > 0 && (
        <button
          className="scroll-to-bottom-button"
          onClick={scrollToBottom}
          title="Scroll to newest messages"
          style={{
            bottom: `${buttonPosition.bottom}px`,
            right: `${buttonPosition.right}px`,
          }}
        >
          {DOWN_ARROW_SYMBOL || "↓"}
        </button>
      )}
    </div>
  )
}

/**
 * Formats a timestamp to display in 24-hour format with microseconds
 * @param timestamp - Timestamp in seconds
 * @returns Formatted time string in format HH:MM:SS.μμμμμμ
 */
function formatTimestampWith24HourAndMicros(timestamp: number): string {
  const date = new Date(timestamp * 1000)

  // Get hours, minutes, seconds with leading zeros
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const seconds = date.getSeconds().toString().padStart(2, "0")

  // Get microseconds (convert fractional part of seconds to microseconds)
  // Note: JavaScript only has millisecond precision, so last 3 digits will be zeros
  const microsStr = (timestamp % 1).toFixed(3).substring(2)

  return `${hours}:${minutes}:${seconds}.${microsStr}`
}

/**
 * Calculates caret coordinates in a textarea
 * @param element - Target textarea element
 * @param position - Caret position in the text
 * @returns Coordinates {left, top} of the caret position
 */
function calculateTextareaCaretPosition(
  element: HTMLTextAreaElement,
  position: number
) {
  const { offsetLeft, offsetTop } = element
  const div = document.createElement("div")
  const style = getComputedStyle(element)
  const properties = [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "wordWrap",
    "whiteSpace",
    "borderLeftWidth",
    "borderTopWidth",
    "paddingLeft",
    "paddingTop",
  ] as const

  properties.forEach((prop) => {
    div.style[prop] = style[prop]
  })

  div.textContent = element.value.substring(0, position)
  document.body.appendChild(div)
  const coordinates = {
    left: div.offsetWidth + offsetLeft,
    top: div.offsetHeight + offsetTop,
  }
  document.body.removeChild(div)
  return coordinates
}

export default App
