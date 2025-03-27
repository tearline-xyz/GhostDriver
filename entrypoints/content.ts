import { defineContentScript } from "wxt/sandbox"
import { TEARLINE_HOST } from "./common/settings"

export default defineContentScript({
  matches: [`*://${TEARLINE_HOST}/*`],
  main() {
    // Securely post login message to background
    const postLoginMessage = (authData) => {
      if (!authData) {
        console.error("Empty auth data received")
        return
      }

      chrome.runtime.sendMessage({
        type: "LOGIN",
        data: authData,
        timestamp: Date.now(),
      })
    }

    // Handle initialization request
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "INIT_LOGIN") {
        console.log("Initializing login state")
        if (localStorage.getItem("AUTHINFO")) {
          postLoginMessage(localStorage.getItem("AUTHINFO"))
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
        event.origin !== `https://${TEARLINE_HOST}` &&
        event.origin !== `http://${TEARLINE_HOST}`
      ) {
        console.warn(`Ignored message from untrusted origin: ${event.origin}`)
        return
      }

      // Handle logout messages
      if (event.data && event.data.type === "LOGOUT") {
        console.log("Logout event received from page")
        chrome.runtime.sendMessage({
          type: "LOGOUT",
          timestamp: Date.now(),
        })
      }

      // Handle login messages
      if (event.data && event.data.type === "LOGIN" && event.data.data) {
        console.log("Login event received from page")
        postLoginMessage(event.data.data)
      }
    })

    // Handle extension messages from background
    chrome.runtime.onMessage.addListener((message) => {
      if (
        message.type === "LOGIN_STATE_CHANGED" ||
        message.type === "LOGOUT_STATE_CHANGED"
      ) {
        // Forward state changes to the page
        window.postMessage(message, window.location.origin)
      }
    })
  },
})
