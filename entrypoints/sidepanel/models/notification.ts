export type NotificationType = "success" | "error" | "info" | "warning"

export interface NotificationState {
  message: string
  type: NotificationType
  visible: boolean
}

export const DEFAULT_NOTIFICATION_STATE: NotificationState = {
  message: "",
  type: "info",
  visible: false,
}
