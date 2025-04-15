// AuthService: Centralized service for handling authentication

import { AUTHINFO_KEY } from "../common/settings"
import { AuthInfo, AuthMessageType, TokenData } from "./models"

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

  // Parse raw token data to extract user info
  parseTokenString(tokenStr: string): TokenData | null {
    try {
      const tokenData = JSON.parse(tokenStr)
      if (tokenData.data) {
        return {
          userId: tokenData.data.user_id,
          email: tokenData.data.email,
          name: tokenData.data.name,
          authId: tokenData.data.auth_id,
          expired: tokenData.data.expired,
          isNew: tokenData.data.is_new,
          isActive: tokenData.data.is_active
        }
      }
    } catch (error) {
      console.error("Error parsing token string:", error)
    }
    return null
  }

  async setAuthInfo(authInfo: AuthInfo): Promise<void> {
    // Add expiresAt if not provided (default 24 hours from now)
    if (!authInfo.expiresAt) {
      authInfo.expiresAt = Date.now() + 24 * 60 * 60 * 1000
    }

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
    if (!authInfo || !authInfo.token) {
      return false
    }

    // Check if token is expired
    if (authInfo.expiresAt && authInfo.expiresAt < Date.now()) {
      // Token expired, clear it
      await this.clearAuthInfo()
      return false
    }

    return true
  }

  async shouldRefreshToken(): Promise<boolean> {
    const authInfo = await this.getAuthInfo()
    if (!authInfo || !authInfo.expiresAt) {
      return false
    }

    // Check if token is approaching expiration
    return authInfo.expiresAt - Date.now() < AUTH_TOKEN_REFRESH_THRESHOLD_MS
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
      return {
        token: parsed.token || parsed.accessToken || authData,
        user: parsed.user || undefined,
        expiresAt: parsed.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
      }
    } catch (e) {
      // If not valid JSON, use as raw token
      return {
        token: authData,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      }
    }
  }
}

export const authService = new AuthService()
