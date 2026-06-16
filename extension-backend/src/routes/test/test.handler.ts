import * as HttpStatusCodes from 'stoker/http-status-codes'
import type { TEST_ROUTES } from '~/routes/test/test.routes'
import type { HandlerMapFromRoutes } from '~/types'

export const TEST_ROUTE_HANDLER: HandlerMapFromRoutes<typeof TEST_ROUTES> = {
  get_test: async c => {
    return c.json(
      {
        message: 'Test route is working!',
        data: {},
      },
      HttpStatusCodes.OK
    )
  },
}
