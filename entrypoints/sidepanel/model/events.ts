/**
 * 父级事件模式集合
 * 用于识别事件流中的主要事件
 */
export const PARENT_EVENT_KEYWORDS = [
  "🚀 Starting",
  "📍 Step",
  "✅ Task completed",
  "✅ Successfully",
  "❌ Unfinished",
  "❌ Failed to complete task",
  "📄 Result",
]

/**
 * 任务事件接口
 * 对应 Python 后端的 TaskEvent 类
 */
export interface TaskEvent {
  task_id: string
  type: TaskEventType
  payload: SystemPayload | ActionPayload | LogPayload
  id: string
  timestamp: number
}

// Define event types and payload structures
export enum TaskEventType {
  LOG = "log",
  ACTION = "action",
  SYSTEM = "system",
}

export enum SystemEventStatus {
  EVENT_STREAM_ERROR = "event_stream_error",
  EVENT_STREAM_END = "event_stream_end",
}

export enum ActionType {
  QUESTION = "question",
}

export interface SystemPayload {
  status: SystemEventStatus
  message: string
}

export interface ActionPayload {
  type: ActionType
  message: string
}

export interface LogPayload {
  message: string
  level: string
  logger: string
  source: string
}
