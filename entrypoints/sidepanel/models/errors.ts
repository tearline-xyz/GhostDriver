export function isConnectionRefusedError(errorMessage: string): boolean {
  const connectionRefusedErrorKeywords = new Set([
    "err_connection_refused",
    "failed to fetch",
    "networkerror",
    "network error",
    "<center>nginx",
    "<h1>403",
  ])
  return Array.from(connectionRefusedErrorKeywords).some((keyword) =>
    errorMessage.toLowerCase().includes(keyword)
  )
}

export function isInsufficientPowerError(errorMessage: string): boolean {
  const insufficientPowerErrorKeywords = new Set([
    "insufficient power",
  ])
  return Array.from(insufficientPowerErrorKeywords).some((keyword) =>
    errorMessage.toLowerCase().includes(keyword)
  )
}
