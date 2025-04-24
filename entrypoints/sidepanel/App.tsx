import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  connectToPlaywrightServer,
  disconnectFromPlaywrightServer,
} from "../../playwright-crx/lib/index.mjs"
import { DEFAULT_SETTINGS, TEARLINE_WEBSITE } from "../common/settings"
import { ModeConfig } from "../common/models/mode"
import "./App.css"
import { isConnectionRefusedError, isInsufficientPowerError } from "./models/errors"
import {
  ActionPayload,
  LogPayload,
  PARENT_EVENT_KEYWORDS,
  SystemEventStatus,
  SystemPayload,
  TaskEvent,
  TaskEventType,
} from "./models/events"
import {
  DEFAULT_INTERACTION_TOGGLE,
  InteractionToggle,
} from "./models/interactionToggle"
import { Mode } from "../common/models/mode"
import { SuggestionMenuItem, suggestionMenuItems } from "./models/suggestion"
import {
  BACK_SYMBOL,
  DOWN_ARROW_SYMBOL,
  FORWARD_SYMBOL,
  PAUSE_SYMBOL,
  RESUME_SYMBOL,
  STOP_SYMBOL,
  TO_COLLAPSE_SYMBOL,
  TO_EXPAND_SYMBOL,
} from "./models/symbols"
import {
  TASK_ACTIVE_STATES,
  TaskContext,
  TaskState,
  getTaskStateDisplayText,
} from "../common/models/task"
import {
  NotificationState,
  DEFAULT_NOTIFICATION_STATE,
} from "./models/notification"
import { GhostDriverApi, InvalidTokenError } from "../common/services/ghost-driver-api"
import { HistoryIcon, SettingsIcon, CopyIcon, ShareIcon, PowerIcon } from "../../assets/icons"
import { addTask, updateTask } from "../db/taskStore"
import { AuthMessageType } from "../auth/models"
import { EventSourcePlus, EventSourceController } from "event-source-plus"
import { TearlineApi } from "../common/services/tearline-api"

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
  const [currentSuggestionMenuItems, setCurrentSuggestionMenuItems] =
    useState<SuggestionMenuItem[]>(suggestionMenuItems)

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

  /** Operation result information */
  const [notification, setNotification] = useState<NotificationState>(
    DEFAULT_NOTIFICATION_STATE
  )

  /** Control UI state */
  const [interactionToggle, setInteractionToggle] = useState<InteractionToggle>(
    DEFAULT_INTERACTION_TOGGLE
  )

  /** Control task state */
  const [taskContext, setTaskContext] = useState<TaskContext | null>(null)

  /** apiHost from settings */
  const [apiHost, setApiHost] = useState<string>(DEFAULT_SETTINGS.apiHost)
  const apiService = new GhostDriverApi(apiHost)
  const tearlineApi = new TearlineApi(`https://${TEARLINE_WEBSITE}`)

  /** Power balance state */
  const [powerBalance, setPowerBalance] = useState<{ power: number } | null>(null)

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
  const eventSourceRef = useRef<EventSourcePlus | null>(null)

  /** Reference to the event source controller for aborting connections */
  const eventControllerRef = useRef<EventSourceController | null>(null)

  /** Whether to auto-scroll to bottom when new events arrive */
  const [autoScroll, setAutoScroll] = useState(true)

  /** Store the button position based on event stream area */
  const [buttonPosition, setButtonPosition] = useState({
    bottom: 20,
    right: 20,
  })

  /** Track which event groups are collapsed */
  const [collapsedGroups, setCollapsedGroups] = useState<{
    [key: string]: boolean
  }>({})

  /** Track if user is currently in IME composition */
  const [isComposing, setIsComposing] = useState(false)

  // Load saved settings on component mount
  useEffect(() => {
    // Load initial settings
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      setApiHost(items.apiHost)
      apiService.setApiHost(items.apiHost)
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
        apiService.setApiHost(changes.apiHost.newValue)
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

  // Fetch power balance on component mount and every 30 seconds
  useEffect(() => {
    const fetchPowerBalance = async () => {
      try {
        const balance = await tearlineApi.getPowerBalance()
        setPowerBalance(balance)
      } catch (error) {
        console.error('Failed to fetch power balance:', error)
      }
    }

    // Initial fetch
    fetchPowerBalance()

    // Set up interval for periodic updates
    const intervalId = setInterval(fetchPowerBalance, 30000)

    // Clean up interval on component unmount
    return () => {
      clearInterval(intervalId)
    }
  }, [taskContext?.state])

  /** Filtered menu items based on current search term */
  const filteredSuggestionMenuItems = currentSuggestionMenuItems.filter(
    (item) => item.label.toLowerCase().includes(searchTerm.toLowerCase())
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
    let currentItems = suggestionMenuItems

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
            prev < filteredSuggestionMenuItems.length - 1 ? prev + 1 : prev
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
          break
        case "Tab":
          e.preventDefault()
          if (
            selectedIndex >= 0 &&
            selectedIndex < filteredSuggestionMenuItems.length
          ) {
            handleMenuItemSelection(filteredSuggestionMenuItems[selectedIndex])
          }
          break
        case "Enter":
          e.preventDefault() // Prevent default behavior
          break
        case "Escape":
          e.preventDefault()
          closeAndResetMenu()
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [
    showSuggestions,
    selectedIndex,
    filteredSuggestionMenuItems,
    selectedPath,
  ])

  useEffect(() => {
    if (
      showSuggestions &&
      selectedIndex === -1 &&
      filteredSuggestionMenuItems.length > 0
    ) {
      setSelectedIndex(0)
    }
  }, [showSuggestions, filteredSuggestionMenuItems])

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
      setCurrentSuggestionMenuItems(suggestionMenuItems)
      setSelectedPath([])
      setSelectedIndex(0)
      setSearchTerm("")
    } else if (
      lastAtSymbolPosition !== -1 &&
      cursorPos > lastAtSymbolPosition
    ) {
      const newSearchTerm = value.substring(
        lastAtSymbolPosition + 1,
        cursorPos
      )
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

  const findCurrentMenuItemByPath = (): SuggestionMenuItem | undefined => {
    let currentItems = suggestionMenuItems
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
    setNotification((prev) => ({ ...prev, visible: false }))
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
  const handleMenuItemSelection = (item: SuggestionMenuItem) => {
    hideNotification() // Hide notification on button press
    if (item.children) {
      setCurrentSuggestionMenuItems(item.children)
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
      setCurrentSuggestionMenuItems(suggestionMenuItems)
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
      setCurrentSuggestionMenuItems(suggestionMenuItems)
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

      let items = suggestionMenuItems
      for (const id of newPath) {
        const item = items.find((i) => i.id === id)
        if (item && item.children) {
          items = item.children
        }
      }
      setCurrentSuggestionMenuItems(items)
    }
  }

  const handleTextareaEnterKey = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    // Don't handle Enter key during IME composition
    if (isComposing) {
      return
    }

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
  const connectToEventStream = async (taskId: string) => {
    // Close any existing connection
    if (eventControllerRef.current) {
      eventControllerRef.current.abort();
      eventControllerRef.current = null;
    }

    eventSourceRef.current = null;

    // Clear previous events when starting a new task
    setEvents([])

    try {
      // Create EventSourcePlus object with authentication
      const eventSource = await apiService.createEventSource(taskId);

      // Connect to event stream using listen method
      const controller = eventSource.listen({
        onMessage(message) {
          try {
            const data = JSON.parse(message.data) as TaskEvent

            // Check for completion message from server
            if (
              data.type === TaskEventType.SYSTEM &&
              (data.payload as SystemPayload).status ===
              SystemEventStatus.EVENT_STREAM_END
            ) {
              console.log("Server indicated event stream end")

              // Clean up event source connection
              if (eventControllerRef.current) {
                eventControllerRef.current.abort();
                eventControllerRef.current = null;
              }
              eventSourceRef.current = null;
              return
            }

            // Log non-LOG type events to console but still add them to the events array
            if (data.type !== TaskEventType.LOG) {
              console.log("Received non-log event:", data)
            }

            setEvents((prev) => [...prev, data])
          } catch (error) {
            console.error("Error parsing event data:", error)
          }
        },
        onRequestError({ error }) {
          console.log("EventSource connection error occurred", error)

          // This is a real error, not a normal close
          setNotification({
            message:
              "Connection to event stream failed. Task may still be running.",
            type: "error",
            visible: true,
          })

          // Clean up references
          eventControllerRef.current = null;
          eventSourceRef.current = null;
        }
      });

      // Store event source and controller references for cleanup
      eventSourceRef.current = eventSource;
      eventControllerRef.current = controller;

    } catch (error) {
      console.error("Failed to connect to event stream:", error);

      // Handle authentication errors
      if (error instanceof InvalidTokenError) {
        handleTokenRefresh();
      } else {
        setNotification({
          message: `Unable to connect to event stream: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: "error",
          visible: true,
        });
      }
    }
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
      if (eventControllerRef.current) {
        eventControllerRef.current.abort();
        eventControllerRef.current = null;
      }
      eventSourceRef.current = null;
    }
  }, [])

  /** Update task status */
  const onPlaywrightServerDisconnectCallback = async (taskId: string) => {
    try {
      const taskContext = await apiService.getTask(taskId)
      setTaskContext(taskContext)
      await updateTask(taskContext)

      // Highlight the New Task button when task completes
      setInteractionToggle((prev) => ({
        ...prev,
        newTaskButton: {
          ...prev.newTaskButton,
          highlight: true
        },
      }))
    } catch (error) {
      // Handle InvalidTokenError
      if (error instanceof InvalidTokenError) {
        handleTokenRefresh();
      }
      console.error("Error fetching task status:", error)
    }
  }

  // Add token refresh method before handleTaskSubmission
  const handleTokenRefresh = () => {
    // Show more friendly, clearer notification
    setNotification({
      message: "Your login session has expired. Please sign in again to continue.",
      type: "warning",
      visible: true,
    });

    // Send token refresh request
    chrome.runtime.sendMessage({ type: AuthMessageType.REFRESH_TOKEN_REQUEST });
  };

  const terminateTaskOrConnection = async () => {
    // NOTE: check if the task is in TASK_ACTIVE_STATES, and stop it if so
    if (
      taskContext?.state &&
      TASK_ACTIVE_STATES.has(taskContext.state) &&
      taskContext.id
    ) {
      try {
        // Show loading notification
        setNotification({
          message: "Stopping task...",
          type: "info",
          visible: true,
        })

        await apiService.updateTaskState(taskContext.id, TaskState.STOPPED)

        // Hide notification after 1 second
        setTimeout(() => {
          hideNotification()
        }, 1000)
      } catch (error) {
        // Handle InvalidTokenError
        if (error instanceof InvalidTokenError) {
          handleTokenRefresh();
          // Even if token is invalid, try to close the WebSocket connection to stop the task
          await disconnectFromPlaywrightServer();
          return;
        }

        console.warn(
          "Error stopping task so that the websocket will be closed directly:",
          error
        )
        await disconnectFromPlaywrightServer()
      }
    }
  }

  const handleTaskSubmission = async () => {
    hideNotification()

    setInteractionToggle((prev) => ({
      ...prev,
      input: { ...prev.input, enabled: false },
      taskControls: {
        ...prev.taskControls,
        enabled: true,
        visible: true,
        pauseButton: { enabled: true, visible: true },
        stopButton: { enabled: true, visible: true },
      },
      sendButton: { enabled: false, visible: false },
    }))

    try {
      const taskContext = await apiService.createTask(input)
      const taskId = taskContext.id

      if (!taskId) {
        throw new Error("Failed to get task ID from server")
      }

      // Save task to database
      await addTask(taskContext)

      // Start task using taskId from response
      setTaskContext(taskContext)

      // Get WebSocket URL first - this could throw InvalidTokenError
      const wsUrl = await apiService.getPlaywrightWebSocketUrl(taskId);

      // Use Promise.all to process connections in parallel
      await Promise.all([
        connectToPlaywrightServer(
          wsUrl,
          () => onPlaywrightServerDisconnectCallback(taskId)
        ),
        // Create a Promise to connect to event stream
        new Promise<void>((resolve) => {
          connectToEventStream(taskId)
          resolve()
        }),
      ])

      const updatedTaskContext = {
        ...taskContext,
        state: TaskState.RUNNING,
      }

      setTaskContext(updatedTaskContext)
      await updateTask(updatedTaskContext)
    } catch (error) {
      // Handle InvalidTokenError
      if (error instanceof InvalidTokenError) {
        handleTokenRefresh();
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred"

        if (isInsufficientPowerError(errorMessage)) {
          setNotification({
            message: `${errorMessage} Please visit <a href="https://${TEARLINE_WEBSITE}/shop" target="_blank" rel="noopener noreferrer">Tearline Shop</a> to purchase.`,
            type: "warning",
            visible: true,
          })
        } else if (isConnectionRefusedError(errorMessage)) {
          setNotification({
            message: `Unable to connect to ${apiHost}`,
            type: "error",
            visible: true,
          })
        } else {
          setNotification({
            message: errorMessage,
            type: "error",
            visible: true,
          })
        }
      }

      // Restore UI state when error occurs
      setInteractionToggle((prev) => ({
        ...prev,
        input: { ...prev.input, enabled: true },
        taskControls: {
          ...prev.taskControls,
          enabled: false,
          visible: false,
          pauseButton: { enabled: false, visible: false },
          stopButton: { enabled: false, visible: false },
        },
        sendButton: { enabled: true, visible: true },
      }))
    }
  }

  // Toggle pause/resume state
  const toggleTaskPauseState = async () => {
    hideNotification()
    if (taskContext?.id) {
      try {
        // Show loading notification
        setNotification({
          message: `${taskContext.state === TaskState.RUNNING ? "Pausing" : "Resuming"} task...`,
          type: "info",
          visible: true,
        })

        // Determine the target state based on current running state
        const targetState =
          taskContext.state === TaskState.RUNNING
            ? TaskState.PAUSED
            : TaskState.RUNNING

        await apiService.updateTaskState(taskContext.id, targetState)

        console.log(
          `Task ${taskContext.state === TaskState.RUNNING ? TaskState.PAUSED : TaskState.RUNNING}: ${taskContext.id}`
        )

        const updatedTaskContext = {
          ...taskContext,
          state: targetState,
        }

        setTaskContext(updatedTaskContext)
        await updateTask(updatedTaskContext)

        // Hide notification after 1 second
        setTimeout(() => {
          hideNotification()
        }, 1000)
      } catch (error) {
        // Handle InvalidTokenError
        if (error instanceof InvalidTokenError) {
          handleTokenRefresh();
          return;
        }

        console.error("Error toggling task state:", error)
        setNotification({
          message: `Failed to ${taskContext.state === TaskState.RUNNING ? TaskState.PAUSED : TaskState.RUNNING} task: ${error instanceof Error ? error.message : "Unknown error"}`,
          type: "error",
          visible: true,
        })
      }
    }
  }

  // Reset to new task state
  const resetToNewTask = async () => {
    hideNotification()
    try {
      await terminateTaskOrConnection()

      // Close event source connection if exists
      if (eventControllerRef.current) {
        eventControllerRef.current.abort();
        eventControllerRef.current = null;
      }
      eventSourceRef.current = null;

      // Reset task state
      setTaskContext(null)

      // Clear input and events
      setInput("")
      setEvents([])

      // Reset UI state
      setInteractionToggle((prev) => ({
        ...DEFAULT_INTERACTION_TOGGLE,
        newTaskButton: {
          ...DEFAULT_INTERACTION_TOGGLE.newTaskButton,
          highlight: false // Make sure highlight is turned off for new tasks
        }
      }))

      // Focus on the textarea
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    } catch (error) {
      console.error("Error disconnecting from Playwright server:", error)
      setNotification({
        message: "Failed to disconnect from Playwright server",
        type: "error",
        visible: true,
      })
    }
  }

  // Stop the task
  const stopTask = async () => {
    hideNotification()
    if (taskContext?.id) {
      try {
        await terminateTaskOrConnection()

        // Close the event stream connection
        if (eventControllerRef.current) {
          eventControllerRef.current.abort();
          eventControllerRef.current = null;
        }
        eventSourceRef.current = null;

        // Reset states but keep taskId
        setTaskContext((prev) => {
          if (!prev) return null
          return {
            id: prev.id,
            state: TaskState.STOPPED,
            content: prev.content,
            created_at: prev.created_at,
            chat_model_tag: prev.chat_model_tag,
          }
        })
        setInteractionToggle((prev) => ({
          ...prev,
          input: { ...prev.input, enabled: false },
          taskControls: {
            ...prev.taskControls,
            enabled: false,
            visible: false,
            pauseButton: { enabled: false, visible: false },
            stopButton: { enabled: false, visible: false },
          },
          sendButton: { enabled: false, visible: false },
        }))
      } catch (error) {
        console.warn(
          "Error stopping task so that the websocket will be closed directly:",
          error
        )
        await disconnectFromPlaywrightServer()
        setNotification({
          message: `Failed to stop task: ${error instanceof Error ? error.message : "Unknown error"}`,
          type: "error",
          visible: true,
        })
      }
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
          disabled={!interactionToggle.input.enabled}
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
    if (event.type !== TaskEventType.LOG) return false
    const payload = event.payload as LogPayload
    const lowercaseEventMessage = payload.message.toLowerCase()
    return PARENT_EVENT_KEYWORDS.some((pattern) =>
      lowercaseEventMessage.includes(pattern.toLowerCase())
    )
  }

  /** Toggle collapse state for a group */
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  // Copy text to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setNotification({
          message: "Copied to clipboard!",
          type: "success",
          visible: true,
        })

        // Auto-hide notification after 2 seconds
        setTimeout(() => {
          setNotification((prev) => ({ ...prev, visible: false }))
        }, 2000)
      })
      .catch((err) => {
        console.warn("Failed to copy:", err)
        setNotification({
          message: "Failed to copy to clipboard",
          type: "error",
          visible: true,
        })
      })
  }, [])

  const handleShareAction = async () => {
    if (!taskContext?.id) return

    try {
      // 跳转到 history 页面，并携带 task id 和 share 动作参数
      chrome.tabs.create({
        url: chrome.runtime.getURL(
          `options.html?page=History&taskId=${taskContext.id}&action=share`
        ),
      })
    } catch (error) {
      setNotification({
        message: "Failed to open history page",
        type: "error",
        visible: true,
      })
    }
  }

  return (
    <div className="app-container">
      {/* Toolbar container that can hold multiple buttons */}
      <div className="toolbar-container">
        <div className="toolbar-left">
          <button
            className="new-task-button"
            onClick={resetToNewTask}
            data-highlight={interactionToggle.newTaskButton.highlight}
          >
            New Task
          </button>
        </div>
        <div className="toolbar-center">
          {powerBalance && (
            <div className="power-balance">
              <img src={PowerIcon} alt="Power" className="power-icon" />
              <span className="power-value">{powerBalance.power}</span>
            </div>
          )}
        </div>
        <div className="toolbar-right">
          <button
            className="history-button"
            onClick={() =>
              chrome.tabs.create({
                url: chrome.runtime.getURL("options.html?page=History"),
              })
            }
            title="View History"
          >
            <img src={HistoryIcon} alt="History" className="toolbar-icon" />
          </button>
          <button
            className="settings-button"
            onClick={() => chrome.tabs.create({
              url: chrome.runtime.getURL("options.html?page=Account")
            })}
            title="Settings"
          >
            <img src={SettingsIcon} alt="Settings" className="toolbar-icon" />
          </button>
        </div>
      </div>

      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextInputAndSuggestions}
            onKeyDown={handleTextareaEnterKey}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder="Plan, search, do anything"
            className="main-input"
            spellCheck={false}
            disabled={!interactionToggle.input.enabled}
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
              filteredSuggestionMenuItems.map((item, index) => (
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
              <select
                className="llm-select"
                disabled={!interactionToggle.input.enabled}
              >
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
            {interactionToggle.taskControls.visible &&
              taskContext?.state &&
              TASK_ACTIVE_STATES.has(taskContext.state) && (
                // NOTE: Not show control buttons when task state is created as there is no agent being attached to the task
                <div className="task-control-buttons">
                  <button
                    className={`pause-resume-button ${taskContext.state}`}
                    onClick={toggleTaskPauseState}
                    disabled={
                      !interactionToggle.taskControls.pauseButton.enabled
                    }
                  >
                    {taskContext.state === TaskState.RUNNING
                      ? PAUSE_SYMBOL
                      : RESUME_SYMBOL}
                  </button>
                  <button
                    className="stop-button"
                    onClick={stopTask}
                    disabled={
                      !interactionToggle.taskControls.stopButton.enabled
                    }
                  >
                    {STOP_SYMBOL}
                  </button>
                </div>
              )}
            {interactionToggle.shareButton.visible &&
              taskContext?.state &&
              taskContext.state === TaskState.COMPLETED && (
                <button
                  className="icon-share-button"
                  onClick={handleShareAction}
                  title="Share"
                  disabled={!interactionToggle.shareButton.enabled}
                >
                  <img src={ShareIcon} alt="Share" />
                </button>
              )}
            {interactionToggle.sendButton.visible && (
              <button
                className="send-button"
                onClick={handleTaskSubmission}
                disabled={!interactionToggle.sendButton.enabled}
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
            <span dangerouslySetInnerHTML={{ __html: notification.message }} />
            <button className="notification-close" onClick={hideNotification}>
              ×
            </button>
          </div>
        </div>
      )}

      {/* Display task ID when notification is closed and we have a task running */}
      {interactionToggle.taskId.visible &&
        taskContext?.id &&
        !notification.visible && (
          <div className="task-id-display">
            <small>
              Task ID: {taskContext.id}
              <button
                className="copy-task-id-button"
                onClick={() => copyToClipboard(taskContext.id || "")}
                title="Copy Task ID"
              >
                <img src={CopyIcon} alt="Copy" />
              </button>
            </small>
          </div>
        )}

      {/* Event Stream Area */}
      <div ref={eventStreamRef} className="event-stream-area">
        {events.map((event, index) => {
          // Determine content based on event type
          let eventMessage = ""
          const eventItemClassNameList = ["event-item"]
          const isParent = isParentEvent(event)

          // Add class based on hierarchy level
          if (isParent) {
            eventItemClassNameList.push("event-level-1")
          } else {
            eventItemClassNameList.push("event-level-2")
          }

          if (event.type === TaskEventType.LOG) {
            const payload = event.payload as LogPayload
            eventMessage = payload.message
            eventItemClassNameList.push(
              "event-log",
              `event-log-${payload.level.toLowerCase()}`
            )
          } else if (event.type === TaskEventType.ACTION) {
            const payload = event.payload as ActionPayload
            eventMessage = JSON.stringify(payload)
            eventItemClassNameList.push("event-action")
          } else {
            const payload = event.payload as SystemPayload
            eventMessage = JSON.stringify(payload)
            eventItemClassNameList.push("event-unknown")
          }

          // Find parent for this event
          let parentIndex = -1
          if (!isParent) {
            for (let i = index - 1; i >= 0; i--) {
              if (isParentEvent(events[i])) {
                parentIndex = i
                break
              }
            }
          }

          // Skip child items if their parent is collapsed
          if (parentIndex !== -1 && collapsedGroups[events[parentIndex].id]) {
            return null
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
                    {collapsedGroups[event.id]
                      ? TO_EXPAND_SYMBOL
                      : TO_COLLAPSE_SYMBOL}
                  </div>
                )}
                <div className="event-content-wrapper">
                  <div className="event-timestamp">
                    {formatTimestampWith24HourAndMicros(event.timestamp)}
                  </div>
                  <div className="event-content">{eventMessage}</div>
                </div>
              </div>
            </div>
          )
        })}

        {/* progress indicator - shown when task is working, stopped,... */}
        {taskContext?.state && (
          <div
            className={`progress-indicator ${taskContext.state === TaskState.RUNNING ? "working" : taskContext.state}`}
          >
            {getTaskStateDisplayText(taskContext.state)}
          </div>
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
