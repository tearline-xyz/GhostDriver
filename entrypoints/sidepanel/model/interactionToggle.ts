// UI状态接口
export interface InteractionToggle {
  // 输入区域控制
  input: {
    enabled: boolean
    visible: boolean
  }

  // 任务控制按钮
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

  // 发送按钮
  sendButton: {
    enabled: boolean
    visible: boolean
  }

  // 分享按钮
  shareButton: {
    enabled: boolean
    visible: boolean
  }

  // 任务ID显示
  taskId: {
    enabled: boolean
    visible: boolean
  }

  // 模式选择器
  modeSelector: {
    enabled: boolean
    visible: boolean
  }

  // LLM选择器
  llmSelector: {
    enabled: boolean
    visible: boolean
  }
}

// 默认UI状态
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
    enabled: true,
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
}
