import { version } from "../../package.json"

export const EXTENSION_NAME = "GhostDriver"

// WXT 框架会自动处理 WXT_ 开头的环境变量，并将其注入到客户端代码中。
// 这里我们使用 WXT_GHOST_DRIVER_DEV_VERSION 环境变量来优先获取版本号，以确保开发阶段的版本号能自定义
export const VERSION =
  // @ts-ignore
  import.meta.env.WXT_GHOST_DRIVER_DEV_VERSION || version

export const TEARLINE_WEBSITE = "www.tearline.io"

export const AVAILABLE_HOSTS = [
  "http://localhost:8000",
  "https://auto.test.tearline.io",
  "http://172.31.16.11:8004",
]

// Mode configurations
export type ModeConfig = "agent_only" | "chat_only" | "both"

// Default settings for the extension
export const DEFAULT_SETTINGS = {
  // @ts-ignore
  apiHost: import.meta.env.WXT_GHOST_DRIVER_DEV_VERSION
    ? AVAILABLE_HOSTS[0]
    : AVAILABLE_HOSTS[1],
  enableAtSyntax: false,
  enableLlmSelect: false, // Added new setting, default to false
  modeConfig: "agent_only" as ModeConfig, // Default to agent only
}

export const AUTHINFO_KEY = 'AUTHINFO';
