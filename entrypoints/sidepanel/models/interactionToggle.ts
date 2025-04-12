export interface InteractionToggle {
  // Input area control
  input: {
    enabled: boolean
    visible: boolean
  }

  // Task control buttons
  taskControls: {
    enabled: boolean
    visible: boolean
    pauseButton: {
      enabled: boolean
      visible: boolean
    }
    stopButton: {
      enabled: boolean
      visible: boolean
    }
  }

  // Send button
  sendButton: {
    enabled: boolean
    visible: boolean
  }

  // Share button
  shareButton: {
    enabled: boolean
    visible: boolean
  }

  // Task ID display
  taskId: {
    visible: boolean
  }

  // Mode selector
  modeSelector: {
    enabled: boolean
    visible: boolean
  }

  // LLM selector
  llmSelector: {
    enabled: boolean
    visible: boolean
  }

  // New task button
  newTaskButton: {
    highlight: boolean,
  },
}

// Default UI state
export const DEFAULT_INTERACTION_TOGGLE: InteractionToggle = {
  input: {
    enabled: true,
    visible: true,
  },
  taskControls: {
    enabled: false,
    visible: false,
    pauseButton: {
      enabled: false,
      visible: false,
    },
    stopButton: {
      enabled: false,
      visible: false,
    },
  },
  sendButton: {
    enabled: true,
    visible: true,
  },
  shareButton: {
    enabled: true,
    visible: true,
  },
  taskId: {
    visible: true,
  },
  modeSelector: {
    enabled: true,
    visible: true,
  },
  llmSelector: {
    enabled: true,
    visible: true,
  },
  newTaskButton: {
    highlight: false,
  },
}
