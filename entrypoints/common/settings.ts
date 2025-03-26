// Available hosts for the extension
export const AVAILABLE_HOSTS = [
  "https://auto.test.tearline.io",
  "http://localhost:8000",
  "http://172.31.16.11:8004",
]

// Mode configurations
export type ModeConfig = "agent_only" | "chat_only" | "both"

// Default settings for the extension
export const DEFAULT_SETTINGS = {
  apiHost: AVAILABLE_HOSTS[0],
  enableAtSyntax: false,
  enableLlmSelect: false, // Added new setting, default to false
  modeConfig: "agent_only" as ModeConfig, // Default to agent only
}
