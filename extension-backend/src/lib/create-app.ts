import { OpenAPIHono } from '@hono/zod-openapi'
import { notFound } from 'stoker/middlewares'

import onError from '~/middleware/error-middleware'
import { customLogger } from '~/middleware/pino-logger'
import type { AppBindings } from '~/types'

export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
  })
}

export default function createApp() {
  const app = createRouter()
  app.use(customLogger())
  app.notFound(notFound)
  app.onError(onError)
  return app
}
