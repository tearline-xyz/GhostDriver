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
        children: [
          { id: 'web-google-search-input', label: '+', needUserInput: true }
        ]
      },
      {
        id: 'go-to-url',
        label: 'Go to url',
        children: [
          { id: 'go-to-url-input', label: '+', needUserInput: true }
        ]
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
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('agent');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [currentMenuItems, setCurrentMenuItems] = useState<MenuItem[]>(menuItems);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isUserInput, setIsUserInput] = useState(false);
  const [userInputValue, setUserInputValue] = useState('');

  const filteredMenuItems = currentMenuItems.filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFullPath = (path: string[], userInput?: string): string => {
    let result = '@';
    let currentItems = menuItems;

    for (let i = 0; i < path.length; i++) {
      const id = path[i];
      const item = currentItems.find(i => i.id === id);
      if (item) {
        const label = i === 0 ? item.label.replace('@', '') : item.label;
        if (!item.needUserInput) {
          result += label + '/';
        }
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
            const selectedItem = filteredMenuItems[selectedIndex];
            if (selectedItem.children) {
              handleMenuItemClick(selectedItem);
            }
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < filteredMenuItems.length) {
            handleMenuItemClick(filteredMenuItems[selectedIndex]);
          }
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

  const handleSend = () => {
    console.log('Sending:', input);
  };

  return (
    <div className="app-container">
      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            placeholder="Plan, search, build anything"
            className="main-input"
            spellCheck={false}
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
            >
              <option value="agent">Agent</option>
              <option value="ask">Ask</option>
            </select>
            <select className="llm-select">
              <option value="gpt4">GPT-4</option>
              <option value="claude">Claude</option>
            </select>
          </div>

          <button className="send-button" onClick={handleSend}>
            Send ⏎
          </button>
        </div>
      </div>
    </div>
  );
}

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
