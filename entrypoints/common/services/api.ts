import { TaskContext, TaskState } from "../models/task"
import { authService } from "../../auth/authService"
import { AuthMessageType } from "../../auth/models"

// 自定义Token无效异常类（包括过期、缺失、格式错误等情况）
export class InvalidTokenError extends Error {
  constructor(message = "Authentication token is invalid or expired") {
    super(message)
    this.name = "InvalidTokenError"
  }
}

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
        // 抛出InvalidTokenError而不是静默继续
        throw new InvalidTokenError();
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
      } else {
        // 如果没有authId，也应该抛出异常
        throw new InvalidTokenError("Authentication token is missing or invalid");
      }
    } catch (error) {
      // 重新抛出InvalidTokenError，保留其他错误的原始类型
      if (error instanceof InvalidTokenError) {
        throw error;
      }
      console.error("Error getting auth token:", error)
      // 其他类型的错误不应该阻止API调用继续
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
      // 这里我们抛出InvalidTokenError而不是一般错误
      throw new InvalidTokenError("Authentication failed. Please sign in again.");
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
