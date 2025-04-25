export enum TaskState {
  CREATED = "created",
  RUNNING = "running",
  PAUSED = "paused",
  COMPLETED = "completed",
  FAILED = "failed",
  STOPPED = "stopped",
}

export const TASK_TERMINAL_STATES: Set<TaskState> = new Set([
  TaskState.COMPLETED,
  TaskState.FAILED,
  TaskState.STOPPED,
])

export const TASK_ACTIVE_STATES: Set<TaskState> = new Set([
  TaskState.RUNNING,
  TaskState.PAUSED,
])

export interface Points {
  power: number
  computing: number
}

export interface TaskResult {
  points_consumption?: Points
  points_reward?: Points
  agent_history_list?: {
    history: Array<{
      model_output: {
        current_state: {
          evaluation_previous_goal: string
          memory: string
          next_goal: string
        }
        action: Array<Record<string, any>>
      }
      result: Array<{
        is_done: boolean
        success: boolean | null
        extracted_content: string
        error: string | null
        include_in_memory: boolean
      }>
      state: {
        url: string
        title: string
        tabs: Array<{
          page_id: number
          url: string
          title: string
        }>
        interacted_element: Array<any>
        screenshot: string | null
      }
      metadata: {
        step_start_time: number
        step_end_time: number
        input_tokens: number
        step_number: number
      }
    }>
  }
  total_input_tokens?: number
  input_token_usage?: number[]
  total_duration_seconds?: number
}

export interface TaskContext {
  id: string
  state: TaskState
  content: string
  created_at: string
  chat_model_tag: string
  initial_actions?: any
  result?: TaskResult
}

/**
 * Get the display text for task state
 * @param state Task state
 * @returns Display text corresponding to the state
 */
export function getTaskStateDisplayText(state?: TaskState): string {
  if (!state) return "Unknown"

  switch (state) {
    case TaskState.COMPLETED:
      return "Completed"
    case TaskState.FAILED:
      return "Failed"
    case TaskState.STOPPED:
      return "Stopped"
    case TaskState.RUNNING:
      return "Working"
    case TaskState.PAUSED:
      return "Paused"
    case TaskState.CREATED:
      return "Created"
    default:
      return "Unknown"
  }
}
