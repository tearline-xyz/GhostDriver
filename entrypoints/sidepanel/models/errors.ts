/**
 * Collection of connection error keywords
 * Used to determine if an error message is of connection error type
 */
const CONNECTION_REFUSED_ERROR_KEYWORDS = new Set([
  "err_connection_refused",
  "failed to fetch",
  "networkerror",
  "network error",
  "<center>nginx",
  "<h1>403",
])

export function isConnectionRefusedError(errorMessage: string): boolean {
  return Array.from(CONNECTION_REFUSED_ERROR_KEYWORDS).some((keyword) =>
    errorMessage.toLowerCase().includes(keyword)
  )
}
