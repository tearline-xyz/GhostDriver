import { defineConfig } from "wxt"
import { TEARLINE_HOST } from "./entrypoints/common/settings"

// See https://wxt.dev/api/config.html
export default defineConfig({
  outDir: "dist",
  browser: "chrome",
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-react"],
  manifestVersion: 3,
  manifest: {
    name: "GhostDriver",
    permissions: [
      "debugger",
      "tabs",
      "contextMenus",
      "storage",
      "sidePanel",
      "background",
      "activeTab",
    ],
    commands: {
      _execute_action: {
        suggested_key: {
          default: "Alt+T",
          mac: "Alt+T",
        },
        description: "Start the extension",
      },
    },
    host_permissions: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"],
    action: {
      default_title: "Click to open panel",
    },
    web_accessible_resources: [
      {
        resources: ["injectScript.js"],
        matches: [`*://${TEARLINE_HOST}/*`],
      },
    ],
  },
})
