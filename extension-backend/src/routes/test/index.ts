import { createRouter } from '~/lib/create-app'
import { TEST_ROUTE_HANDLER } from '~/routes/test/test.handler'
import { TEST_ROUTES } from '~/routes/test/test.routes'

const router = createRouter().openapi(TEST_ROUTES.get_test, TEST_ROUTE_HANDLER.get_test)
export default router
