import { TaskContext, TaskState } from "../models/task"
import { authService } from "../../auth/authService"
import { AuthMessageType } from "../../auth/models"

export class ApiService {
  private apiHost: string
  private apiVersion: string = 'api/v1'

  constructor(apiHost: string) {
    this.apiHost = apiHost
  }

  setApiHost(apiHost: string) {
    this.apiHost = apiHost
  }

  private async buildHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    try {
      // 检查是否已登录（这会同时检查token是否过期）
      const isLoggedIn = await authService.isLoggedIn();
      if (!isLoggedIn) {
        console.warn("User is not logged in or token has expired");
        // 尝试刷新token，即使当前未登录
        chrome.runtime.sendMessage({ type: AuthMessageType.REFRESH_TOKEN_REQUEST });
        // 注意: 此时仍然返回没有Authorization的headers
        // 当前请求可能会失败，但下一次请求可能会成功(如果用户完成了登录)
        return headers;
      }

      // 检查token是否需要刷新（接近过期）
      const needsRefresh = await authService.shouldRefreshToken();
      if (needsRefresh) {
        console.log("Token is about to expire, attempting to refresh");
        // 使用chrome.runtime.sendMessage来请求background脚本刷新token
        chrome.runtime.sendMessage({ type: AuthMessageType.REFRESH_TOKEN_REQUEST });
        // 注意：这里我们不等待刷新完成，继续使用当前token
        // 如果刷新失败，下次请求时用户可能需要重新登录
      }

      const authInfo = await authService.getAuthInfo();
      if (authInfo?.data?.authId) {
        headers["Authorization"] = `Bearer ${authInfo.data.authId}`;
      }
    } catch (error) {
      console.error("Error getting auth token:", error)
    }

    return headers
  }

  async createTask(content: string): Promise<TaskContext> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const headers = await this.buildHeaders();

      const response = await fetch(`${this.apiHost}/${this.apiVersion}/tasks`, {
        method: "POST",
        headers,
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
    const headers = await this.buildHeaders();

    const response = await fetch(`${this.apiHost}/${this.apiVersion}/tasks/${taskId}`, {
      method: "GET",
      headers: {
        ...headers,
        "accept": "application/json",
      },
    })

    if (!response.ok) {
      await this.handleErrorResponse(response, 'Failed to get task');
    }

    return response.json()
  }

  async updateTaskState(taskId: string, targetState: TaskState): Promise<void> {
    const headers = await this.buildHeaders();

    const response = await fetch(`${this.apiHost}/${this.apiVersion}/tasks/${taskId}`, {
      method: "PATCH",
      headers,
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

    // 检查是否是认证错误(401)，可能是token过期
    if (response.status === 401) {
      console.warn("Received 401 Unauthorized response, token might be expired");
      // 清除当前可能过期的token
      await authService.clearAuthInfo();
      // 通知用户需要重新登录
      errorMessage = "Authentication failed. Please log in again.";
      // 请求刷新token
      chrome.runtime.sendMessage({ type: AuthMessageType.REFRESH_TOKEN_REQUEST });
      throw new Error(errorMessage);
    }

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
