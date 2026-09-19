export function logInfo(msg: string, data?: unknown): void {
  const ts = new Date().toISOString().substring(11, 23)
  if (data !== undefined) {
    console.log(`[${ts}] ℹ ${msg}`, data)
  } else {
    console.log(`[${ts}] ℹ ${msg}`)
  }
}

export function logSuccess(msg: string, data?: unknown): void {
  const ts = new Date().toISOString().substring(11, 23)
  if (data !== undefined) {
    console.log(`[${ts}] OK ${msg}`, data)
  } else {
    console.log(`[${ts}] OK ${msg}`)
  }
}

export function logError(msg: string, error?: unknown): void {
  const ts = new Date().toISOString().substring(11, 23)
  if (error instanceof Error) {
    console.error(`[${ts}] ERR ${msg}: ${error.message}`)
  } else if (error !== undefined) {
    console.error(`[${ts}] ERR ${msg}`, error)
  } else {
    console.error(`[${ts}] ERR ${msg}`)
  }
}

export function logStep(step: string, msg: string): void {
  const ts = new Date().toISOString().substring(11, 23)
  console.log(`[${ts}] >>> ${step} > ${msg}`)
}
