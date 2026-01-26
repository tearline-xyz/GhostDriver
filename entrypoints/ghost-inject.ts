import { defineUnlistedScript } from "wxt/sandbox"
import { AuthMessageType } from "./auth/models"

// Extend Window interface
declare global {
  interface Window {
    ghost?: {
      open: () => Promise<void>
    }
  }
}

/**
 * This script is injected into the page context (not content script context)
 * It creates the window.ghost API that pages can use
 */
export default defineUnlistedScript(() => {
  // console.log('[GhostDriver] Injection script starting in page context...');

  try {
    // Only create if it doesn't exist
    if (typeof window !== 'undefined' && !window.ghost) {
      // console.log('[GhostDriver] Creating window.ghost object...');

      window.ghost = {
        /**
         * Open the GhostDriver extension side panel
         * @returns {Promise<void>}
         */
        open: function() {
          return new Promise((resolve, reject) => {
            // Send message to content script to open side panel
            window.postMessage(
              {
                type: AuthMessageType.OPEN_SIDEPANEL,
              },
              window.location.origin
            )
            // Resolve immediately (fire and forget pattern)
            resolve(undefined)
          })
        }
      }

      // Make window.ghost non-configurable and non-writable to prevent tampering
      try {
        Object.defineProperty(window, 'ghost', {
          value: window.ghost,
          writable: false,
          configurable: false,
        })
        // console.log('[GhostDriver] ✅ window.ghost initialized successfully')
        // Send confirmation message
        window.postMessage({ type: 'GHOST_INITIALIZED' }, '*')
      } catch (e) {
        // console.warn('[GhostDriver] Failed to make window.ghost read-only:', e)
        // Still send confirmation even if read-only failed
        window.postMessage({ type: 'GHOST_INITIALIZED' }, '*')
      }
    } else {
      // console.log('[GhostDriver] window.ghost already exists')
      window.postMessage({ type: 'GHOST_ALREADY_EXISTS' }, '*')
    }
  } catch (error: any) {
    // console.error('[GhostDriver] ❌ Error initializing window.ghost:', error)
    window.postMessage({ type: 'GHOST_INIT_ERROR', error: error?.message || 'Unknown error' }, '*')
  }
})
