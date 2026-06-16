import { createRoute, z } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'

export const TEST_ROUTES = {
  get_test: createRoute({
    method: 'get',
    tags: ['Test'],
    path: '/test',
    summary: 'Health check',
    request: {},
    responses: {
      [HttpStatusCodes.OK]: jsonContent(zodResponseSchema(z.object({})), 'OK'),
    },
  }),
}
