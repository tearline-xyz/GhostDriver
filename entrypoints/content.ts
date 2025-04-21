import { defineContentScript } from "wxt/sandbox"
import { AUTHINFO_KEY, TEARLINE_WEBSITE } from "./common/settings"
import { AuthMessageType } from "./auth/models"

export default defineContentScript({
  matches: [`*://${TEARLINE_WEBSITE}/*`],
  main() {
    // Securely post login message to background
    const postLoginMessage = (authData) => {
      if (!authData) {
        console.error("Empty auth data received")
        return
      }

      chrome.runtime.sendMessage({
        type: AuthMessageType.LOGIN,
        data: authData,
        timestamp: Date.now(),
      })
    }

    // Handle initialization request
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === AuthMessageType.INIT_LOGIN) {
        console.log("Initializing login state")
        if (localStorage.getItem(AUTHINFO_KEY)) {
          postLoginMessage(localStorage.getItem(AUTHINFO_KEY))
        }
        // Acknowledge receipt
        sendResponse({ success: true })
      }
      return true // For async response
    })

    // Inject script to page context safely
    const injectScript = (file, node) => {
      try {
        const targetNode = document.querySelector(node)
        if (!targetNode) {
          console.error(`Target node "${node}" not found for script injection`)
          return false
        }

        const s = document.createElement("script")
        s.setAttribute("type", "module")
        s.setAttribute("src", chrome.runtime.getURL(file))
        targetNode.appendChild(s)
        return true
      } catch (error) {
        console.error("Failed to inject script:", error)
        return false
      }
    }

    // Attempt script injection
    const injected = injectScript("injectScript.js", "body")

    if (!injected) {
      // If immediate injection fails, try again when DOM is fully loaded
      window.addEventListener("DOMContentLoaded", () => {
        injectScript("injectScript.js", "body")
      })
    }

    // Listen for messages from page with secure origin validation
    window.addEventListener("message", (event) => {
      // Verify message origin for security
      if (
        event.origin !== `https://${TEARLINE_WEBSITE}` &&
        event.origin !== `http://${TEARLINE_WEBSITE}`
      ) {
        console.warn(`Ignored message from untrusted origin: ${event.origin}`)
        return
      }

      // Handle logout messages
      if (event.data && event.data.type === AuthMessageType.LOGOUT) {
        console.log("Logout event received from page")
        chrome.runtime.sendMessage({
          type: AuthMessageType.LOGOUT,
          timestamp: Date.now(),
        })
      }

      // Handle login messages
      if (event.data && event.data.type === AuthMessageType.LOGIN && event.data.data) {
        console.log("Login event received from page")
        postLoginMessage(event.data.data)
      }
    })

    // Handle extension messages from background
    chrome.runtime.onMessage.addListener((message) => {
      if (
        message.type === AuthMessageType.LOGIN_STATE_CHANGED ||
        message.type === AuthMessageType.LOGOUT_STATE_CHANGED
      ) {
        // Forward state changes to the page
        window.postMessage(message, window.location.origin)
      }

      // 处理token刷新请求
      if (message.type === AuthMessageType.REFRESH_TOKEN) {
        console.log("Received token refresh request");
        // 使用页面的localStorage检查是否有有效的token
        const currentToken = localStorage.getItem(AUTHINFO_KEY);
        if (currentToken) {
          // 如果存在token，将它发送到background.js以更新存储
          postLoginMessage(currentToken);
          console.log("Token refreshed from current page");
        } else {
          console.warn("No token found in page, cannot refresh");
        }
      }
    })
  },
})
