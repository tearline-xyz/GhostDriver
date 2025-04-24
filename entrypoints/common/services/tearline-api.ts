import { authService } from "../../auth/authService"
import { InvalidTokenError } from "./ghost-driver-api"

interface PowerBalance {
  user_id: string
  power: number
}

export class TearlineApi {
  private apiHost: string
  private apiPrefix: string = 'api/v1'
  private timeout: number = 5000

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
      const isLoggedIn = await authService.isLoggedIn()
      if (!isLoggedIn) {
        throw new InvalidTokenError()
      }

      const authInfo = await authService.getAuthInfo()
      if (authInfo?.data?.authId) {
        // Set auth_id in cookie
        document.cookie = `auth_id=${authInfo.data.authId}`
      } else {
        throw new InvalidTokenError("Authentication token is missing or invalid")
      }
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw error
      }
      console.error("Error getting auth token:", error)
    }

    return headers
  }

  async getPowerBalance(): Promise<PowerBalance> {
    const funcName = 'getPowerBalance'
    try {
      const headers = await this.buildHeaders()
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.timeout)

      try {
        const response = await fetch(`${this.apiHost}/${this.apiPrefix}/user/power`, {
          method: "GET",
          headers,
          credentials: 'include', // Include cookies in the request
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (!response.ok) {
          await this.handleErrorResponse(response, 'Failed to get power balance')
        }

        const responseData = await response.json()
        return this.validateApiResponse(responseData, funcName)
      } catch (error) {
        clearTimeout(timeout)
        if (error.name === 'AbortError') {
          throw new Error('Request timed out')
        }
        throw error
      }
    } catch (error) {
      console.error(`Network error in ${funcName}:`, error)
      throw error
    }
  }

  private validateApiResponse<T>(
    response: any,
    funcName: string
  ): T {
    const errorMessagePrefix = `Failed to ${funcName}`

    if (!response) {
      throw new Error(`${errorMessagePrefix}: no response`)
    }

    if (response.code !== 0 || response.msg?.toLowerCase() !== 'success') {
      throw new Error(
        `${errorMessagePrefix}: response.code=${response.code}, response.msg=${response.msg}`
      )
    }

    return response.data as T
  }

  private async handleErrorResponse(response: Response, baseErrorMessage: string): Promise<never> {
    if (response.status === 401) {
      throw new InvalidTokenError("Authentication failed. Please sign in again.")
    }
    let errorMessage: string
    try {
      const jsonResponse = await response.clone().json()
      const detailMessage = jsonResponse?.detail
      errorMessage = `${baseErrorMessage}${detailMessage ? `. ${detailMessage}` : ''}`
    } catch {
      const textResponse = await response.clone().text()
      errorMessage = `${baseErrorMessage}. ${textResponse}`
    }
    throw new Error(errorMessage)
  }
}
