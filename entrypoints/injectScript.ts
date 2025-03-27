import { defineUnlistedScript } from "wxt/sandbox";
import { TEARLINE_HOST } from "./common/settings";

interface AuthMessage {
  type: 'LOGIN' | 'LOGOUT' | 'LOGIN_STATE_CHANGED' | 'LOGOUT_STATE_CHANGED';
  data?: string;
  timestamp?: number;
}

export default defineUnlistedScript(() => {
  // Script injected into the page context to monitor auth changes
  (function() {
    // Only run on the expected domain
    if (!window.location.hostname.includes(TEARLINE_HOST)) {
      return;
    }

    console.log('Tearline auth monitoring initialized');

    // Send initial auth state if already logged in
    if (localStorage.getItem('AUTHINFO')) {
      window.postMessage({
        type: 'LOGIN',
        data: localStorage.getItem('AUTHINFO')
      } as AuthMessage, window.location.origin);
    }

    // Monitor localStorage for auth changes
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key: string, value: string) {
      // Detect login
      if (key === 'AUTHINFO' && value) {
        window.postMessage({
          type: 'LOGIN',
          data: value
        } as AuthMessage, window.location.origin);
      }
      originalSetItem.call(this, key, value);
    };

    // Detect logout
    const originalRemoveItem = localStorage.removeItem;
    localStorage.removeItem = function(key: string) {
      if (key === 'AUTHINFO') {
        window.postMessage({ type: 'LOGOUT' } as AuthMessage, window.location.origin);
      }
      originalRemoveItem.call(this, key);
    };

    // Listen for auth state messages from the extension
    window.addEventListener('message', function(event: MessageEvent) {
      if (event.source !== window) return;

      const data = event.data as AuthMessage;

      // Handle login/logout state syncing
      if (data.type === 'LOGIN_STATE_CHANGED' && data.data) {
        const currentAuth = localStorage.getItem('AUTHINFO');
        if (currentAuth !== data.data) {
          originalSetItem.call(localStorage, 'AUTHINFO', data.data);
        }
      } else if (data.type === 'LOGOUT_STATE_CHANGED') {
        if (localStorage.getItem('AUTHINFO')) {
          originalRemoveItem.call(localStorage, 'AUTHINFO');
        }
      }
    });
  })();
});
