import { version } from "../../package.json"

export const VERSION = version

export const TEARLINE_HOST = "www1.test.tearline.io"

export const AVAILABLE_HOSTS = [
  "http://localhost:8000",
  "https://auto.test.tearline.io",
  "http://172.31.16.11:8004",
]

// Mode configurations
export type ModeConfig = "agent_only" | "chat_only" | "both"

// Default settings for the extension
export const DEFAULT_SETTINGS = {
  apiHost: AVAILABLE_HOSTS[1],
  enableAtSyntax: false,
  enableLlmSelect: false, // Added new setting, default to false
  modeConfig: "agent_only" as ModeConfig, // Default to agent only
}
