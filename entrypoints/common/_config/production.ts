import { version } from "../../../package.json"
import { ModeConfig } from "../models/mode"

export const VERSION = version

export const TEARLINE_WEBSITE = "www.tearline.io"

export const ENABLE_DEVELOPER_SETTINGS = false

export const ENABLE_HISTORICAL_TASK_SHARING = false

export const AVAILABLE_HOSTS = [
  "https://auto.tearline.io",
]

export const DEFAULT_SETTINGS = {
  apiHost: AVAILABLE_HOSTS[0],
  enableAtSyntax: false,
  enableLlmSelect: false,
  modeConfig: "agent_only" as ModeConfig,
}
