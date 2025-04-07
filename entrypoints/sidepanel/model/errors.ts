/**
 * 连接错误的关键词集合
 * 用于判断错误消息是否属于连接错误类型
 */
export const CONNECTION_REFUSED_ERROR_KEYWORDS = new Set([
  "err_connection_refused",
  "failed to fetch",
  "networkerror",
  "network error",
])
