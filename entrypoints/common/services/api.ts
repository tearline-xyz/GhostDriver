import { TaskContext, TaskState } from "../models/task"
import { authService } from "../../auth/authService"
import { AuthMessageType } from "../../auth/models"
import { EventSourcePlus } from "event-source-plus"

// Custom Token Invalid Exception Class (covering expired, missing, wrong format, etc.)
export class InvalidTokenError extends Error {
  constructor(message = "Authentication token is invalid or expired") {
    super(message)
    this.name = "InvalidTokenError"
  }
}

export class ApiService {
  private apiHost: string
  private apiPrefix: string = 'api/v1'

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
      // Check if logged in (this also checks if token is expired)
      const isLoggedIn = await authService.isLoggedIn();
      if (!isLoggedIn) {
        console.warn("User is not logged in or token has expired");
        // Throw InvalidTokenError instead of continuing silently
        throw new InvalidTokenError();
      }

      // Check if token needs refreshing (approaching expiration)
      const needsRefresh = await authService.shouldRefreshToken();
      if (needsRefresh) {
        console.log("Token is about to expire, attempting to refresh");
        // Use chrome.runtime.sendMessage to request token refresh from background script
        chrome.runtime.sendMessage({ type: AuthMessageType.REFRESH_TOKEN_REQUEST });
        // Note: We don't wait for refresh to complete, continuing with current token
        // If refresh fails, user may need to login again on next request
      }

      const authInfo = await authService.getAuthInfo();
      if (authInfo?.data?.authId) {
        headers["Authorization"] = `Bearer ${authInfo.data.authId}`;
      } else {
        // Throw exception if authId is missing
        throw new InvalidTokenError("Authentication token is missing or invalid");
      }
    } catch (error) {
      // Re-throw InvalidTokenError, preserve original type for other errors
      if (error instanceof InvalidTokenError) {
        throw error;
      }
      console.error("Error getting auth token:", error)
      // Other types of errors should not prevent API call from continuing
    }

    return headers
  }

  async createTask(content: string): Promise<TaskContext> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const headers = await this.buildHeaders();

      const response = await fetch(`${this.apiHost}/${this.apiPrefix}/tasks`, {
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

    const response = await fetch(`${this.apiHost}/${this.apiPrefix}/tasks/${taskId}`, {
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

    const response = await fetch(`${this.apiHost}/${this.apiPrefix}/tasks/${taskId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        state: {
          target: targetState,
        },
      }),
    })

    if (!response.ok) {
      await this.handleErrorResponse(response, 'Failed to set task state');
    }
  }

  getEventStreamUrl(taskId: string): string {
    return `${this.apiHost}/${this.apiPrefix}/tasks/${taskId}/events/stream`
  }

  async getPlaywrightWebSocketUrl(taskId: string): Promise<string> {
    const authInfo = await authService.getAuthInfo();
    if (!authInfo?.data?.authId) {
      throw new InvalidTokenError("Authentication token is missing or invalid");
    }
    return `${this.apiHost}/${this.apiPrefix}/ws/playwright?task_id=${taskId}&token=${authInfo.data.authId}`;
  }

  /**
   * Create an EventSourcePlus object with authentication
   * @param taskId Task ID
   * @returns Promise<EventSourcePlus> Returns a Promise that resolves to configured EventSourcePlus instance
   */
  async createEventSource(taskId: string): Promise<EventSourcePlus> {
    try {
      // Get current authentication headers
      const headers = await this.buildHeaders();

      // Remove potentially undefined values to avoid type errors
      const cleanHeaders = {};
      Object.entries(headers).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanHeaders[key] = value;
        }
      });

      // Create and return EventSourcePlus instance
      return new EventSourcePlus(this.getEventStreamUrl(taskId), {
        headers: cleanHeaders,
        method: 'get'
      });
    } catch (error) {
      // Handle authentication errors
      if (error instanceof InvalidTokenError) {
        console.warn("Authentication error: Failed to create EventSource:", error.message);
        throw error;
      }
      // Handle other errors
      console.error("Failed to create EventSource:", error);
      throw new Error(`Failed to create EventSource: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleErrorResponse(response: Response, defaultMessage: string): Promise<never> {
    let errorMessage = defaultMessage;
    let responseBody: any;

    // Check if it's an authentication error (401), which might be an expired token
    if (response.status === 401) {
      console.warn("Received 401 Unauthorized response, token might be expired");
      // Clear the potentially expired token
      await authService.clearAuthInfo();
      // Throw InvalidTokenError instead of a general error
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
