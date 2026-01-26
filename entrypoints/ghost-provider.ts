
import { defineContentScript } from "wxt/sandbox"
import { AuthMessageType } from "./auth/models"

/**
 * Global content script that injects window.ghost API on all pages
 * This allows any website to detect and interact with the GhostDriver extension
 */
export default defineContentScript({
  // Include all URLs, explicitly including localhost for local development
  matches: [
    "<all_urls>",
  ],
  runAt: "document_start",
  main() {
    // console.log("[GhostDriver] Content script loaded")

    // Function to inject window.ghost into page context using external script file
    const injectGhostProvider = () => {
      // Check if already injected
      if (document.documentElement && document.documentElement.dataset.ghostInjected === 'true') {
        // console.log("[GhostDriver] Already injected, skipping")
        return
      }

      // Use external script file to avoid CSP issues with inline scripts
      const script = document.createElement("script")
      script.src = chrome.runtime.getURL("ghost-inject.js")
      script.onload = function() {
        // console.log("[GhostDriver] External script loaded successfully")
        // Clean up
        const scriptElement = this as HTMLScriptElement
        const parent = scriptElement.parentNode
        if (parent) {
          parent.removeChild(scriptElement)
        }
      }
      script.onerror = function() {
        // console.error("[GhostDriver] Failed to load external script, falling back to inline injection")
        // Fallback to inline injection if external script fails
        injectInlineScript()
      }

      // Inject script into page context
      try {
        if (document.head) {
          document.head.appendChild(script)
          // console.log("[GhostDriver] External script element injected into head")
        } else if (document.documentElement) {
          document.documentElement.appendChild(script)
          // console.log("[GhostDriver] External script element injected into documentElement")
        } else {
          // Wait for DOM
          const checkDOM = setInterval(() => {
            if (document.head) {
              clearInterval(checkDOM)
              document.head.appendChild(script)
            } else if (document.documentElement) {
              clearInterval(checkDOM)
              document.documentElement.appendChild(script)
            }
          }, 10)
          setTimeout(() => clearInterval(checkDOM), 5000)
          return
        }

        // Mark as injected
        if (document.documentElement) {
          document.documentElement.dataset.ghostInjected = 'true'
        }
      } catch (error) {
        console.error("[GhostDriver] Failed to inject external script:", error)
        // Fallback to inline
        injectInlineScript()
      }
    }

    // Fallback: inline script injection (may be blocked by CSP)
    const injectInlineScript = () => {
      const script = document.createElement("script")
      script.textContent = `
        (function() {
         
          try {
            if (typeof window !== 'undefined' && !window.ghost) {
              window.ghost = {
                open: function() {
                  return new Promise((resolve) => {
                    window.postMessage({ type: '${AuthMessageType.OPEN_SIDEPANEL}' }, window.location.origin)
                    resolve(undefined)
                  })
                }
              }
              try {
                Object.defineProperty(window, 'ghost', { value: window.ghost, writable: false, configurable: false })
               
                window.postMessage({ type: 'GHOST_INITIALIZED' }, '*')
              } catch (e) {
                window.postMessage({ type: 'GHOST_INITIALIZED' }, '*')
              }
            }
          } catch (error) {
            console.error('[GhostDriver] ❌ Error:', error)
          }
        })()
      `

      if (document.head) {
        document.head.appendChild(script)
      } else if (document.documentElement) {
        document.documentElement.appendChild(script)
      }
    }

    // Inject immediately
    injectGhostProvider()

    // Also inject when DOM is ready (in case document_start was too early)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        // console.log("[GhostDriver] DOMContentLoaded, re-injecting if needed")
        injectGhostProvider()
      })
    } else if (document.readyState === 'interactive' || document.readyState === 'complete') {
      // DOM is already ready, inject again to be sure
      setTimeout(() => {
        // console.log("[GhostDriver] DOM already ready, re-injecting if needed")
        injectGhostProvider()
      }, 100)
    }

    // Listen for messages from the page
    window.addEventListener("message", (event) => {
      // Only accept messages from the same origin
      if (event.source !== window) return

      // Handle open side panel requests
      if (event.data && event.data.type === AuthMessageType.OPEN_SIDEPANEL) {
        // console.log("[GhostDriver] Open side panel request received from page")
        chrome.runtime.sendMessage({
          type: AuthMessageType.OPEN_SIDEPANEL,
          timestamp: Date.now(),
        }).catch((error) => {
          // Silently ignore "Receiving end does not exist" errors
          // This can happen if background script is not ready
          if (error.message && !error.message.includes('Receiving end does not exist')) {
            // console.error("[GhostDriver] Failed to send message to background:", error)
          }
        })
      }

      // Handle initialization confirmation
      if (event.data && event.data.type === 'GHOST_INITIALIZED') {
        // console.log("[GhostDriver] ✅ Received confirmation: window.ghost initialized in page context")
      }

      if (event.data && event.data.type === 'GHOST_ALREADY_EXISTS') {
        // console.log("[GhostDriver] ℹ️ window.ghost already exists in page context")
      }

      if (event.data && event.data.type === 'GHOST_INIT_ERROR') {
        // console.error("[GhostDriver] ❌ Error initializing window.ghost:", event.data.error)
      }
    })

    // Verify injection after a short delay
    setTimeout(() => {
      // Try to access window.ghost from page context
      // Note: This won't work directly due to context isolation,
      // but we can check if the script element was injected
      const scripts = document.querySelectorAll('script')
      let found = false
      scripts.forEach((script) => {
        if (script.textContent && script.textContent.includes('window.ghost')) {
          found = true
        }
      })

      if (found) {
        // console.log("[GhostDriver] Script element found in DOM")
      } else {
        // console.warn("[GhostDriver] Script element not found in DOM, injection may have failed")
      }

      // Also check if we can detect window.ghost (this will only work if context isolation allows)
      // We'll use a different approach: inject a verification script
      const verifyScript = document.createElement("script")
      verifyScript.textContent = `
        (function() {
          if (window.ghost) {
          
            // Send verification message back to content script
            window.postMessage({ type: 'GHOST_VERIFIED' }, '*')
          } else {
           
            window.postMessage({ type: 'GHOST_NOT_FOUND' }, '*')
          }
        })()
      `
      if (document.head) {
        document.head.appendChild(verifyScript)
      } else if (document.documentElement) {
        document.documentElement.appendChild(verifyScript)
      }
    }, 1000)

    // Listen for verification messages from page
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === 'GHOST_VERIFIED') {
        // console.log("[GhostDriver] ✅ Verified: window.ghost exists in page context")
      } else if (event.data && event.data.type === 'GHOST_NOT_FOUND') {
        // console.error("[GhostDriver] ❌ Verification failed: window.ghost not found in page context")
        // console.log("[GhostDriver] Attempting to re-inject...")
        injectGhostProvider()
      }
    })
  },
})
