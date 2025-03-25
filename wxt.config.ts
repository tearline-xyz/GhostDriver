import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  browser: "chrome",
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  manifest: {
    name: "Tearline Auto Browser",
    permissions: [
      "debugger",
      "tabs",
      "contextMenus",
      "storage",
      "sidePanel",
      "background",
      "activeTab"
    ],
    commands: {
      "_execute_action": {
        suggested_key: {
          default: "Alt+T",
          mac: "Alt+T"
        },
        description: "Start the extension"
      }
    },
    host_permissions: [
      "http://*/*",
      "https://*/*",
      "ws://*/*",
      "wss://*/*"
    ],
    action: {
      default_title: "Click to open panel"
    },
  }
});
