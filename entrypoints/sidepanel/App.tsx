import { useState, useRef, useEffect } from 'react';
import './App.css';

type Mode = 'agent' | 'ask';

interface MenuItem {
  id: string;
  label: string;
  children?: MenuItem[];
  needUserInput?: boolean;
}

const menuItems: MenuItem[] = [
  {
    id: 'tearline',
    label: '@Tearline',
  },
  {
    id: 'web',
    label: '@Web',
    children: [
      {
        id: 'web-google-search',
        label: 'Google search',
        needUserInput: true
      },
      {
        id: 'go-to-url',
        label: 'Go to url',
        needUserInput: true
      },
    ]
  },
  {
    id: 'action',
    label: '@Action',
    children: [
      {
        id: 'action-ask-me',
        label: 'Ask me',
      },
    ]
  }
];

function App() {
  /** Main input text content */
  const [input, setInput] = useState('');

  /** Current operation mode - either 'agent' or 'ask' */
  const [mode, setMode] = useState<Mode>('agent');

  /** Controls visibility of suggestion dropdown menu */
  const [showSuggestions, setShowSuggestions] = useState(false);

  /** Position coordinates for suggestion dropdown */
  const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number } | null>(null);

  /** Array of selected menu item IDs representing current path */
  const [selectedPath, setSelectedPath] = useState<string[]>([]);

  /** Currently displayed menu items in dropdown */
  const [currentMenuItems, setCurrentMenuItems] = useState<MenuItem[]>(menuItems);

  /** Index of currently selected suggestion item */
  const [selectedIndex, setSelectedIndex] = useState(-1);

  /** Current search term for filtering suggestions */
  const [searchTerm, setSearchTerm] = useState('');

  /** Reference to main textarea element */
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** Whether currently accepting user input for a menu item */
  const [isUserInput, setIsUserInput] = useState(false);

  /** Value of user input field */
  const [userInputValue, setUserInputValue] = useState('');

  /** 操作结果信息 */
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info', visible: boolean}>({
    message: '',
    type: 'info',
    visible: false
  });

  /** 控制输入框是否禁用 */
  const [inputDisabled, setInputDisabled] = useState(false);

  /** 控制任务状态 */
  const [taskState, setTaskState] = useState<{
    running: boolean;
    taskId?: string;
    showControls: boolean;
  }>({
    running: false,
    taskId: undefined,
    showControls: false
  });

  /** Filtered menu items based on current search term */
  const filteredMenuItems = currentMenuItems.filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * Constructs a full path string from an array of menu item IDs
   * @param path - Array of menu item IDs representing the selected path
   * @param userInput - Optional user input value for menu items requiring input
   * @returns A formatted string starting with '@' followed by menu item labels joined with '/'
   * @example
   * getFullPath(['web', 'web-google-search']) // returns '@Web/Google search/'
   * getFullPath(['web', 'go-to-url']) // returns '@Web/Go to url/'
   */
  const getFullPath = (path: string[], userInput?: string): string => {
    let result = '@';
    let currentItems = menuItems;

    for (let i = 0; i < path.length; i++) {
      const id = path[i];
      const item = currentItems.find(i => i.id === id);
      if (item) {
        // Remove '@' from the first item
        const label = i === 0 ? item.label.replace('@', '') : item.label;
        result += label + '/';
        currentItems = item.children || [];
      }
    }
    return result;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSuggestions) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredMenuItems.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Tab':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < filteredMenuItems.length) {
            handleMenuItemClick(filteredMenuItems[selectedIndex]);
          }
          break;
        case 'Enter':
          e.preventDefault(); // 阻止默认行为
          break;
        case 'Escape':
          e.preventDefault();
          closeMenu();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSuggestions, selectedIndex, filteredMenuItems, selectedPath]);

  useEffect(() => {
    if (showSuggestions && selectedIndex === -1 && filteredMenuItems.length > 0) {
      setSelectedIndex(0);
    }
  }, [showSuggestions, filteredMenuItems]);

  const closeMenu = () => {
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setSearchTerm('');
    setCursorPosition(null);
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      textareaRef.current.setSelectionRange(start, start);
      textareaRef.current.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    const lastAtIndex = value.lastIndexOf('@', cursorPos);
    if (lastAtIndex > 0 && value[lastAtIndex - 1] !== ' ') {
      setShowSuggestions(false);
      setInput(value);
      return;
    }

    if (lastAtIndex !== -1 && lastAtIndex === cursorPos - 1) {
      const rect = e.target.getBoundingClientRect();
      const position = getCaretCoordinates(e.target, lastAtIndex);
      setShowSuggestions(true);
      setCursorPosition({
        top: rect.top + position.top,
        left: rect.left + position.left
      });
      setCurrentMenuItems(menuItems);
      setSelectedPath([]);
      setSelectedIndex(0);
      setSearchTerm('');
    } else if (lastAtIndex !== -1 && cursorPos > lastAtIndex) {
      const newSearchTerm = value.substring(lastAtIndex + 1, cursorPos);
      setSearchTerm(newSearchTerm);
      setShowSuggestions(true);

      const currentItem = getCurrentMenuItem();
      if (currentItem?.needUserInput) {
        return;
      }
    } else {
      closeMenu();
    }

    setInput(value);
  };

  const getCurrentMenuItem = (): MenuItem | undefined => {
    let currentItems = menuItems;
    let currentItem;

    for (const id of selectedPath) {
      currentItem = currentItems.find(i => i.id === id);
      if (currentItem?.children) {
        currentItems = currentItem.children;
      }
    }

    return currentItem;
  };

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.children) {
      setCurrentMenuItems(item.children);
      setSelectedPath([...selectedPath, item.id]);
      setSelectedIndex(0);
      setSearchTerm('');
    } else {
      const fullPath = [...selectedPath, item.id];
      const fullLabel = getFullPath(fullPath);
      const lastAtIndex = input.lastIndexOf('@');

      let newPath;
      if (item.needUserInput) {
        setSelectedPath(fullPath);
        setIsUserInput(true);
        setUserInputValue('');
        setSelectedIndex(-1);
        return;
      } else {
        newPath = `[${fullLabel}]()`;
      }

      const newInput = input.substring(0, lastAtIndex) + newPath + ' ' + input.substring(lastAtIndex + fullLabel.length);
      setInput(newInput);

      setShowSuggestions(false);
      setSelectedPath([]);
      setCurrentMenuItems(menuItems);
      setSelectedIndex(-1);
      setSearchTerm('');

      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPosition = lastAtIndex + newPath.length + 1;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }
  };

  const handleUserInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && userInputValue.trim()) {
      e.preventDefault();
      const fullPath = [...selectedPath];
      const menuPath = getFullPath(fullPath);
      const lastAtIndex = input.lastIndexOf('@');
      const newPath = `[${menuPath}](${userInputValue.trim()})`;
      const newInput = input.substring(0, lastAtIndex) + newPath + input.substring(lastAtIndex + menuPath.length);

      setInput(newInput);
      setShowSuggestions(false);
      setSelectedPath([]);
      setCurrentMenuItems(menuItems);
      setIsUserInput(false);
      setUserInputValue('');

      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPosition = lastAtIndex + newPath.length;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    } else if (e.key === 'Escape') {
      setIsUserInput(false);
      setUserInputValue('');
    }
  };

  const handleMenuBack = () => {
    if (selectedPath.length > 0) {
      const newPath = selectedPath.slice(0, -1);
      setSelectedPath(newPath);
      setSelectedIndex(-1);
      setSearchTerm('');

      let items = menuItems;
      for (const id of newPath) {
        const item = items.find(i => i.id === id);
        if (item && item.children) {
          items = item.children;
        }
      }
      setCurrentMenuItems(items);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !showSuggestions) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    try {
      setNotification({
        message: 'Sending your request...',
        type: 'info',
        visible: true
      });

      // 禁用输入框
      setInputDisabled(true);

      // 开始任务，默认为运行状态，并显示控制按钮
      setTaskState({
        running: true,
        showControls: true,
        taskId: undefined // 初始未知ID
      });

      const response = await fetch('https://auto.test.tearline.io/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: input,
          crx_mode: true
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response:', data);

      // 更新任务ID
      setTaskState(prev => ({
        ...prev,
        taskId: data.id || 'unknown'
      }));

      setNotification({
        message: 'Your request was sent successfully!',
        type: 'success',
        visible: true
      });

      // 关闭通知后，保持控制按钮可见
      setTimeout(() => {
        setNotification(prev => ({...prev, visible: false}));
      }, 2000);

    } catch (error) {
      console.error('Error:', error);
      setNotification({
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        type: 'error',
        visible: true
      });

      // 出错时重新启用输入框并隐藏控制按钮
      setInputDisabled(false);
      setTaskState(prev => ({...prev, showControls: false}));
    }
  };

  // 切换暂停/恢复状态
  const togglePauseResume = () => {
    setTaskState(prev => ({...prev, running: !prev.running}));
    // 这里可以添加实际的API调用
    console.log(`Task ${taskState.running ? 'paused' : 'resumed'}: ${taskState.taskId}`);
  };

  // 停止任务
  const stopTask = () => {
    // 这里可以添加实际的API调用
    console.log(`Task stopped: ${taskState.taskId}`);

    // 重置所有状态
    setTaskState({
      running: false,
      taskId: undefined,
      showControls: false
    });
    setInputDisabled(false);
  };

  return (
    <div className="app-container">
      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Plan, search, do anything"
            className="main-input"
            spellCheck={false}
            disabled={inputDisabled}  // 添加disabled属性
          />
        </div>

        {showSuggestions && cursorPosition && (
          <div
            className="suggestions-dropdown"
            style={{
              top: cursorPosition.top + 20,
              left: cursorPosition.left
            }}
          >
            {selectedPath.length > 0 && (
              <div className="menu-header">
                <button className="menu-back" onClick={handleMenuBack}>
                  ← Back
                </button>
                <span className="menu-path">{getFullPath(selectedPath)}</span>
              </div>
            )}
            {isUserInput ? (
              <div className="user-input-container">
                <input
                  type="text"
                  value={userInputValue}
                  onChange={(e) => setUserInputValue(e.target.value)}
                  onKeyDown={handleUserInput}
                  placeholder="Type and press Enter"
                  autoFocus
                  className="user-input"
                />
              </div>
            ) : (
              filteredMenuItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleMenuItemClick(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {item.label}
                  {item.children && <span className="submenu-indicator">→</span>}
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
              <option value="ask">Ask</option>
            </select>
            <select
              className="llm-select"
              disabled={inputDisabled}
            >
              <option value="gpt4">GPT-4</option>
              <option value="claude">Claude</option>
            </select>
          </div>

          <div className="right-controls">
            {/* Pause/Resume 和 Stop 按钮 */}
            {taskState.showControls ? (
              <>
                <button
                  className={`pause-resume-button ${taskState.running ? 'running' : 'paused'}`}
                  onClick={togglePauseResume}
                >
                  {taskState.running ? 'Pause' : 'Resume'}
                </button>
                <button
                  className="stop-button"
                  onClick={stopTask}
                >
                  Stop
                </button>
              </>
            ) : (
              <button
                className="send-button"
                onClick={handleSend}
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
              onClick={() => setNotification(prev => ({...prev, visible: false}))}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Calculates caret coordinates in a textarea
 * @param element - Target textarea element
 * @param position - Caret position in the text
 * @returns Coordinates {left, top} of the caret position
 */
function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
  const { offsetLeft, offsetTop } = element;
  const div = document.createElement('div');
  const style = getComputedStyle(element);
  const properties = [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'wordWrap',
    'whiteSpace',
    'borderLeftWidth',
    'borderTopWidth',
    'paddingLeft',
    'paddingTop',
  ] as const;

  properties.forEach((prop) => {
    div.style[prop] = style[prop];
  });

  div.textContent = element.value.substring(0, position);
  document.body.appendChild(div);
  const coordinates = {
    left: div.offsetWidth + offsetLeft,
    top: div.offsetHeight + offsetTop,
  };
  document.body.removeChild(div);
  return coordinates;
}

export default App;
