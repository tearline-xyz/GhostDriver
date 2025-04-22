// AuthService: Centralized service for handling authentication

import { AUTHINFO_KEY } from "../common/settings"
import { AuthInfo, AuthMessageType, TokenData, UserDisplayData } from "./models"

// Time before expiration to trigger refresh (15 minutes)
const AUTH_TOKEN_REFRESH_THRESHOLD_MS = 15 * 60 * 1000

class AuthService {
  // Store auth info in chrome.storage.local for better security
  async getAuthInfo(): Promise<AuthInfo | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(AUTHINFO_KEY, (result) => {
        resolve(result[AUTHINFO_KEY] || null)
      })
    })
  }

  // Build user display data from auth info
  buildUserDisplayData(authInfo: AuthInfo | null): UserDisplayData | null {
    if (!authInfo) {
      return null
    }

    // 从数据中提取用户信息
    if (authInfo.data) {
      return {
        userId: authInfo.data.userId,
        email: authInfo.data.email,
        isActive: authInfo.data.isActive
      }
    }

    return null
  }

  async setAuthInfo(authInfo: AuthInfo): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [AUTHINFO_KEY]: authInfo }, resolve)
    })
  }

  async clearAuthInfo(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(AUTHINFO_KEY, resolve)
    })
  }

  async isLoggedIn(): Promise<boolean> {
    const authInfo = await this.getAuthInfo()
    if (!authInfo || !authInfo.data) {
      return false
    }

    // Check if token is expired
    if (authInfo.data.expired && authInfo.data.expired < Date.now() / 1000) {
      return false
    }

    return true
  }

  async shouldRefreshToken(): Promise<boolean> {
    const authInfo = await this.getAuthInfo()
    if (!authInfo || !authInfo.data || !authInfo.data.expired) {
      return false
    }

    // NOTE: The expired field is a Unix timestamp in seconds, and the JavaScript Date.now() returns a millisecond timestamp. Hence we need to multiply expired by 1000
    return (authInfo.data.expired * 1000) - Date.now() < AUTH_TOKEN_REFRESH_THRESHOLD_MS
  }

  // Broadcast login state to all extension components
  async broadcastLoginState(
    isLogin: boolean,
    authData?: string
  ): Promise<void> {
    chrome.runtime.sendMessage({
      type: isLogin ? AuthMessageType.LOGIN_STATE_CHANGED : AuthMessageType.LOGOUT_STATE_CHANGED,
      data: authData,
      timestamp: Date.now(),
    })
  }

  // Parse auth data from Tearline site
  parseAuthData(authData: string): AuthInfo {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(authData)

      // Validate data structure
      if (!parsed.data) {
        throw new Error('Missing data field in auth data')
      }

      // Return the parsed structure directly as AuthInfo
      return {
        data: {
          userId: parsed.data.user_id,
          email: parsed.data.email,
          authId: parsed.data.auth_id,
          expired: parsed.data.expired,
          isNew: parsed.data.is_new,
          isActive: parsed.data.is_active
        },
        expire: parsed.expire
      }
    } catch (e) {
      // If parsing failed or required data is missing, rethrow
      throw new Error('Invalid auth data format: ' + e.message)
    }
  }
}

export const authService = new AuthService()
