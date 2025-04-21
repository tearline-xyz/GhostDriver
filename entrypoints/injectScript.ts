import { defineUnlistedScript } from "wxt/sandbox"
import { TEARLINE_WEBSITE, AUTHINFO_KEY } from "./common/settings"
import { AuthMessage, AuthMessageType } from "./auth/models"

export default defineUnlistedScript(() => {
  // Script injected into the page context to monitor auth changes
  ;(function () {
    // Only run on the expected domain
    if (!window.location.hostname.includes(TEARLINE_WEBSITE)) {
      return
    }

    console.log("Tearline auth monitoring initialized")

    // Send initial auth state if already logged in
    if (localStorage.getItem(AUTHINFO_KEY)) {
      window.postMessage(
        {
          type: AuthMessageType.LOGIN,
          data: localStorage.getItem(AUTHINFO_KEY),
        } as AuthMessage,
        window.location.origin
      )
    }

    // Monitor localStorage for auth changes
    const originalSetItem = localStorage.setItem
    localStorage.setItem = function (key: string, value: string) {
      // Detect login
      if (key === AUTHINFO_KEY && value) {
        window.postMessage(
          {
            type: AuthMessageType.LOGIN,
            data: value,
          } as AuthMessage,
          window.location.origin
        )
      }
      originalSetItem.call(this, key, value)
    }

    // Detect logout
    const originalRemoveItem = localStorage.removeItem
    localStorage.removeItem = function (key: string) {
      if (key === AUTHINFO_KEY) {
        window.postMessage(
          { type: AuthMessageType.LOGOUT } as AuthMessage,
          window.location.origin
        )
      }
      originalRemoveItem.call(this, key)
    }

    // Listen for auth state messages from the extension
    window.addEventListener("message", function (event: MessageEvent) {
      if (event.source !== window) return

      const data = event.data as AuthMessage

      // Handle login/logout state syncing
      if (data.type === AuthMessageType.LOGIN_STATE_CHANGED && data.data) {
        const currentAuth = localStorage.getItem(AUTHINFO_KEY)
        if (currentAuth !== data.data) {
          originalSetItem.call(localStorage, AUTHINFO_KEY, data.data)
        }
      } else if (data.type === AuthMessageType.LOGOUT_STATE_CHANGED) {
        if (localStorage.getItem(AUTHINFO_KEY)) {
          originalRemoveItem.call(localStorage, AUTHINFO_KEY)
        }
      } else if (data.type === AuthMessageType.REFRESH_TOKEN) {
        // 处理刷新token请求
        const currentAuth = localStorage.getItem(AUTHINFO_KEY)
        if (currentAuth) {
          // 如果存在token，触发一个更新事件
          // 这将在更新的情况下通知content script
          window.postMessage(
            {
              type: AuthMessageType.LOGIN,
              data: currentAuth,
            } as AuthMessage,
            window.location.origin
          )
        }
      }
    })
  })()
})
