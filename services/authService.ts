// AuthService: Centralized service for handling authentication

interface AuthInfo {
  token: string;
  expiresAt?: number; // Timestamp when token expires
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
}

// Time before expiration to trigger refresh (15 minutes)
const REFRESH_THRESHOLD_MS = 15 * 60 * 1000;

class AuthService {
  // Store auth info in chrome.storage.local for better security
  async getAuthInfo(): Promise<AuthInfo | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get('authInfo', (result) => {
        resolve(result.authInfo || null);
      });
    });
  }

  async setAuthInfo(authInfo: AuthInfo): Promise<void> {
    // Add expiresAt if not provided (default 24 hours from now)
    if (!authInfo.expiresAt) {
      authInfo.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    }

    return new Promise((resolve) => {
      chrome.storage.local.set({ authInfo }, resolve);
    });
  }

  async clearAuthInfo(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove('authInfo', resolve);
    });
  }

  async isLoggedIn(): Promise<boolean> {
    const authInfo = await this.getAuthInfo();
    if (!authInfo || !authInfo.token) {
      return false;
    }

    // Check if token is expired
    if (authInfo.expiresAt && authInfo.expiresAt < Date.now()) {
      // Token expired, clear it
      await this.clearAuthInfo();
      return false;
    }

    return true;
  }

  async shouldRefreshToken(): Promise<boolean> {
    const authInfo = await this.getAuthInfo();
    if (!authInfo || !authInfo.expiresAt) {
      return false;
    }

    // Check if token is approaching expiration
    return authInfo.expiresAt - Date.now() < REFRESH_THRESHOLD_MS;
  }

  // Broadcast login state to all extension components
  async broadcastLoginState(isLogin: boolean, authData?: string): Promise<void> {
    chrome.runtime.sendMessage({
      type: isLogin ? 'LOGIN_STATE_CHANGED' : 'LOGOUT_STATE_CHANGED',
      data: authData,
      timestamp: Date.now()
    });
  }

  // Parse auth data from Tearline site
  parseAuthData(authData: string): AuthInfo {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(authData);
      return {
        token: parsed.token || parsed.accessToken || authData,
        user: parsed.user || undefined,
        expiresAt: parsed.expiresAt || (Date.now() + 24 * 60 * 60 * 1000)
      };
    } catch (e) {
      // If not valid JSON, use as raw token
      return {
        token: authData,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      };
    }
  }
}

export const authService = new AuthService();
