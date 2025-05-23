import { defineBackground } from "wxt/sandbox"
import { authService } from "./auth/authService"
import { browser } from "wxt/browser"
import { TEARLINE_WEBSITE } from "./common/settings"
import { AuthMessageType } from "./auth/models"

export default defineBackground(() => {
  // Check auth status on startup
  chrome.runtime.onStartup.addListener(async () => {
    const isLoggedIn = await authService.isLoggedIn()
    if (isLoggedIn && (await authService.shouldRefreshToken())) {
      // Attempt to refresh token if needed
      attemptTokenRefresh()
    }
  })

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle INIT_LOGIN from options or sidepanel
    if (message.type === AuthMessageType.INIT_LOGIN) {
      // Forward to all matching Tearline tabs
      chrome.tabs.query({ url: `*://${TEARLINE_WEBSITE}/*` }, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: AuthMessageType.INIT_LOGIN })
          }
        })
      })

      // Also reply with current auth status
      authService.isLoggedIn().then((isLoggedIn) => {
        sendResponse({ isLoggedIn })
      })
      return true // Indicates async response
    }

    // Handle LOGIN message from content script
    if (message.type === AuthMessageType.LOGIN && message.data) {
      handleLogin(message.data, sender)
    }

    // Handle LOGOUT message
    if (message.type === AuthMessageType.LOGOUT) {
      handleLogout()
    }

    // Handle token refresh request
    if (message.type === AuthMessageType.REFRESH_TOKEN_REQUEST) {
      attemptTokenRefresh()
    }

    // Forward login state changes to all extension views
    if (
      message.type === AuthMessageType.LOGIN_STATE_CHANGED ||
      message.type === AuthMessageType.LOGOUT_STATE_CHANGED
    ) {
      broadcastToAllViews(message)
    }
  })

  async function handleLogin(authData, sender) {
    try {
      // Parse and store auth data securely
      const authInfo = authService.parseAuthData(authData)
      await authService.setAuthInfo(authInfo)

      // Broadcast login success to all extension components
      await authService.broadcastLoginState(true, authData)

      console.log("Login successful")
    } catch (error) {
      console.error("Login failed:", error)
    }
  }

  async function handleLogout() {
    try {
      await authService.clearAuthInfo()
      await authService.broadcastLoginState(false)
      console.log("Logout successful")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  // Function to broadcast messages to all extension views
  function broadcastToAllViews(message) {
    // Send to all content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {
            // Ignore errors from tabs that don't have the listener
          })
        }
      })
    })
  }

  // Attempt to refresh the token by opening Tearline in background
  async function attemptTokenRefresh() {
    console.log("Attempting to refresh token")

    // 获取当前登录状态
    const isLoggedIn = await authService.isLoggedIn()
    if (!isLoggedIn) {
      console.log("Not logged in, cannot refresh token")
      return
    }

    try {
      // 创建新标签页并激活它，以便用户可以在此页面登录
      await chrome.tabs.create({
        url: `https://${TEARLINE_WEBSITE}/tgLogin`,
        active: true // 在前台打开，以便用户可以进行登录操作
      })
      console.log("Opened Tearline tab for user to login and refresh token")
    } catch (error) {
      console.error("Error during token refresh:", error)
    }
  }

  // @ts-ignore
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})
