import type { ErrorHandler } from 'hono'
import type { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import * as Phrases from 'stoker/http-status-phrases'
import { HttpError } from '~/lib/error'

const onError: ErrorHandler = (err, c) => {
  // Handle custom HttpError
  console.error(err)
  if (err instanceof HttpError) {
    return c.json(
      {
        message: err.message,
        success: false,
      },
      err.statusCode as ContentfulStatusCode,
    )
  }

  // Get current status from error or response
  const currentStatus = 'status' in err ? err.status : c.res.status

  // Determine final status code
  const statusCode =
    currentStatus !== HttpStatusCodes.OK
      ? (currentStatus as StatusCode)
      : (HttpStatusCodes.INTERNAL_SERVER_ERROR as StatusCode)

  // Get environment

  const env = c.env?.NODE_ENV ?? process.env.NODE_ENV ?? 'development'

  // Return error response
  return c.json(
    {
      message: err.message || Phrases.INTERNAL_SERVER_ERROR,
      success: false,
      stack: env === 'production' ? undefined : err.stack,
    },
    statusCode as ContentfulStatusCode,
  )
}

export default onError
