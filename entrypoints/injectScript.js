import { defineUnlistedScript } from "wxt/sandbox"

export default defineUnlistedScript(() => {
  // Script injected into the page context to monitor auth changes
  (function() {
    // Only run on the expected domain
    if (!window.location.hostname.includes('test.tearline.io')) {
      return;
    }

    console.log('Tearline auth monitoring initialized');

    // Send initial auth state if already logged in
    if (localStorage.getItem('AUTHINFO')) {
      window.postMessage({
        type: 'LOGIN',
        data: localStorage.getItem('AUTHINFO')
      }, window.location.origin);
    }

    // Monitor localStorage for auth changes
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      // Detect login
      if (key === 'AUTHINFO' && value) {
        window.postMessage({
          type: 'LOGIN',
          data: value
        }, window.location.origin);
      }
      originalSetItem.call(this, key, value);
    };

    // Detect logout
    const originalRemoveItem = localStorage.removeItem;
    localStorage.removeItem = function(key) {
      if (key === 'AUTHINFO') {
        window.postMessage({ type: 'LOGOUT' }, window.location.origin);
      }
      originalRemoveItem.call(this, key);
    };

    // Listen for auth state messages from the extension
    window.addEventListener('message', function(event) {
      if (event.source !== window) return;

      // Handle login/logout state syncing
      if (event.data.type === 'LOGIN_STATE_CHANGED' && event.data.data) {
        const currentAuth = localStorage.getItem('AUTHINFO');
        if (currentAuth !== event.data.data) {
          originalSetItem.call(localStorage, 'AUTHINFO', event.data.data);
        }
      } else if (event.data.type === 'LOGOUT_STATE_CHANGED') {
        if (localStorage.getItem('AUTHINFO')) {
          originalRemoveItem.call(localStorage, 'AUTHINFO');
        }
      }
    });
  })();
})
