import type { MiddlewareHandler } from 'hono'

const colors = {
  reset: '\x1B[0m',
  green: '\x1B[32m',
  yellow: '\x1B[33m',
  red: '\x1B[31m',
  blue: '\x1B[34m',
  cyan: '\x1B[36m',
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) {
    return colors.green
  }

  if (status >= 300 && status < 400) {
    return colors.yellow
  }
  if (status >= 400) {
    return colors.red
  }
  return colors.reset
}

export function customLogger(): MiddlewareHandler {
  return async (c, next) => {
    const { method, url } = c.req
    await next()
    const status = c.res.status
    const statusColor = getStatusColor(status)
    // eslint-disable-next-line no-console
    console.log(
      `${statusColor}${status}${colors.reset} ${colors.blue}${method}${colors.reset} ${url}`
    )
  }
}
