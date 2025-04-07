import { TaskContext, TaskState } from "../model/task"

export class ApiService {
  private apiHost: string

  constructor(apiHost: string) {
    this.apiHost = apiHost
  }

  setApiHost(apiHost: string) {
    this.apiHost = apiHost
  }

  async createTask(content: string): Promise<TaskContext> {
    const response = await fetch(`${this.apiHost}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        crx_mode: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }

    return response.json()
  }

  async getTask(taskId: string): Promise<TaskContext> {
    const response = await fetch(`${this.apiHost}/tasks/${taskId}`, {
      method: "GET",
      headers: {
        "accept": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch task: ${response.status}`)
    }

    return response.json()
  }

  async updateTaskState(taskId: string, targetState: TaskState): Promise<void> {
    const response = await fetch(`${this.apiHost}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target_state: targetState,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to update task state: ${response.status}`)
    }
  }

  getEventStreamUrl(taskId: string): string {
    return `${this.apiHost}/tasks/${taskId}/events/stream`
  }

  getPlaywrightWebSocketUrl(taskId: string): string {
    return `${this.apiHost}/ws/playwright?task_id=${taskId}`
  }
}
