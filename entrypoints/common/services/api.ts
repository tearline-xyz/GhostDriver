import { TaskContext, TaskState } from "../models/task"

export class ApiService {
  private apiHost: string
  private apiVersion: string = 'api/v1'

  constructor(apiHost: string) {
    this.apiHost = apiHost
  }

  setApiHost(apiHost: string) {
    this.apiHost = apiHost
  }

  async createTask(content: string): Promise<TaskContext> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${this.apiHost}/${this.apiVersion}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          crx_mode: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        await this.handleErrorResponse(response, 'Failed to create task');
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  }

  async getTask(taskId: string): Promise<TaskContext> {
    const response = await fetch(`${this.apiHost}/${this.apiVersion}/tasks/${taskId}`, {
      method: "GET",
      headers: {
        "accept": "application/json",
      },
    })

    if (!response.ok) {
      await this.handleErrorResponse(response, 'Failed to get task');
    }

    return response.json()
  }

  async updateTaskState(taskId: string, targetState: TaskState): Promise<void> {
    const response = await fetch(`${this.apiHost}/${this.apiVersion}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target_state: targetState,
      }),
    })

    if (!response.ok) {
      await this.handleErrorResponse(response, 'Failed to set task state');
    }
  }

  getEventStreamUrl(taskId: string): string {
    return `${this.apiHost}/${this.apiVersion}/tasks/${taskId}/events/stream`
  }

  getPlaywrightWebSocketUrl(taskId: string): string {
    return `${this.apiHost}/${this.apiVersion}/ws/playwright?task_id=${taskId}`
  }

  private async handleErrorResponse(response: Response, defaultMessage: string): Promise<never> {
    let errorMessage = defaultMessage;
    let responseBody: any;

    try {
      responseBody = await response.clone().json();
      const msg = responseBody?.detail?.[0]?.msg;
      errorMessage += msg ? `. ${msg}` : '';
    } catch {
      responseBody = await response.clone().text();
      errorMessage += `. ${responseBody}`;
    }

    throw new Error(errorMessage);
  }
}
