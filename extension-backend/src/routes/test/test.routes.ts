import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import { UserSchema } from '~/zod/models'
export const TEST_ROUTES = {
  get_test: createRoute({
    method: 'get',
    tags: ['Test'],
    path: '/test',
    summary: 'Get Test',
    request: {},
    responses: {
      [HttpStatusCodes.OK]: jsonContent(zodResponseSchema(UserSchema), 'Some description'),
    },
  }),
}
