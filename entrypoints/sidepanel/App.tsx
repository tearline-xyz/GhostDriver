import { useState, useRef, useEffect } from "react"
import "./App.css"
import React from "react"
import { DEFAULT_SETTINGS } from "../common/settings"
import { connectToPlaywrightServer } from "../playwright-crx/index.mjs"
import { BULLET_SYMBOL, BACK_SYMBOL, FORWARD_SYMBOL, PAUSE_SYMBOL, RESUME_SYMBOL, STOP_SYMBOL } from "../common/symbols"

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

  // Load saved settings on component mount
  useEffect(() => {
    // Load initial settings
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      setApiHost(items.apiHost)
      setAtSyntaxEnabled(items.enableAtSyntax)
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
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    // Clean up listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

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
      setIsUserInput(false)
      setUserInputValue("")
    }
  }

  const handleMenuNavigationBack = () => {
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
      handleTaskSubmission()
    }
  }

  const handleTaskSubmission = async () => {
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
      await connectToPlaywrightServer(
        `${apiHost}/ws/playwright?task_id=${taskId}`
      )

      // 更新任务ID
      setTaskState((prev) => ({
        ...prev,
        taskId: data.id || "unknown",
      }))
    } catch (error) {
      console.error("Error:", error)

      // Check for connection refused errors
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      const isConnectionRefused =
        errorMessage.toLowerCase().includes("err_connection_refused") ||
        errorMessage.toLowerCase().includes("failed to fetch") ||
        errorMessage.toLowerCase().includes("networkerror") ||
        errorMessage.toLowerCase().includes("network error");

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
  const toggleTaskPauseState = () => {
    setTaskState((prev) => ({ ...prev, running: !prev.running }))
    // 这里可以添加实际的API调用
    console.log(
      `Task ${taskState.running ? "paused" : "resumed"}: ${taskState.taskId}`
    )
  }

  // 停止任务
  const stopAndResetTask = () => {
    // 这里可以添加实际的API调用
    console.log(`Task stopped: ${taskState.taskId}`)

    // 重置所有状态
    setTaskState({
      running: false,
      taskId: undefined,
      showControls: false,
    })
    setInputDisabled(false)
  }

  return (
    <div className="app-container">
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
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="mode-select"
              disabled={inputDisabled}
            >
              <option value="agent">Agent</option>
              <option value="chat">Chat</option>
            </select>
            <select className="llm-select" disabled={inputDisabled}>
              <option value="gpt4">GPT-4o</option>
              <option value="claude">Claude 3.5 Sonnet (Preview)</option>
              <option value="claude">Claude 3.7 Sonnet (Preview)</option>
              <option value="claude">Claude 3.7 Sonnet Thinking (Preview)</option>
              <option value="claude">Gemini 2.0 Flash (Preview)</option>
            </select>
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
              onClick={() =>
                setNotification((prev) => ({ ...prev, visible: false }))
              }
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
    </div>
  )
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
