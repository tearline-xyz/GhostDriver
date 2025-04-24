import { ModeConfig } from "../models/mode"

// @ts-ignore
export const VERSION = import.meta.env.WXT_APP_ENV

export const TEARLINE_WEBSITE = "www1.test.tearline.io"

export const ENABLE_DEVELOPER_SETTINGS = true

export const ENABLE_HISTORICAL_TASK_SHARING = true

export const AVAILABLE_HOSTS = [
  "http://localhost:8000",
  "https://auto.test.tearline.io",
  "http://172.31.16.11:8004",
]

export const DEFAULT_SETTINGS = {
  apiHost: AVAILABLE_HOSTS[0],
  enableAtSyntax: false,
  enableLlmSelect: false,
  modeConfig: "agent_only" as ModeConfig,
}
