import { version } from "../../package.json"

export const EXTENSION_NAME = "GhostDriver"

// The WXT framework automatically processes environment variables starting with WXT_ and injects them.
// @ts-ignore
const IS_DEVELOPMENT = import.meta.env.WXT_APP_ENV === "development"

export const VERSION =
  // @ts-ignore
  import.meta.env.WXT_APP_ENV || version

export const TEARLINE_WEBSITE = IS_DEVELOPMENT
  ? "www1.test.tearline.io"
  : "www.tearline.io"

export const ENABLE_DEVELOPER_SETTINGS = IS_DEVELOPMENT
  ? true
  : false

export const AVAILABLE_HOSTS = IS_DEVELOPMENT
  ? [
    "http://localhost:8000",
    "https://auto.test.tearline.io",
    "http://172.31.16.11:8004",
  ]
  : ["https://auto.tearline.io"]

// Mode configurations
export type ModeConfig = "agent_only" | "chat_only" | "both"

// Default settings for the extension
export const DEFAULT_SETTINGS = {
  apiHost: IS_DEVELOPMENT
    ? "http://localhost:8000"
    : "https://auto.tearline.io",
  enableAtSyntax: false,
  enableLlmSelect: false, // Added new setting, default to false
  modeConfig: "agent_only" as ModeConfig, // Default to agent only
}

export const AUTHINFO_KEY = 'AUTHINFO';
