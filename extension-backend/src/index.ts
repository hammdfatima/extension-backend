import { cors } from 'hono/cors'
import { registerRoutes } from '~/app'
import { auth } from '~/lib/auth'
import configureOpenAPI from '~/lib/configure-open-api'
import createApp from '~/lib/create-app'

// parseENV()
const app = createApp()

app.get('/health', c => c.json({ ok: true, service: 'text-extension-api' }))

app.use('*', async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    c.set('user', null)
    c.set('session', null)
    return next()
  }
  c.set('user', session.user)
  c.set('session', session.session)
  return next()
})
app.use(
  '*',
  cors({
    origin: origin => {
      if (!origin) return Bun.env.BETTER_AUTH_URL ?? 'http://localhost:5173'
      if (origin.startsWith('chrome-extension://')) return origin
      if (origin.startsWith('http://localhost:')) return origin
      if (origin.endsWith('.onrender.com')) return origin
      if (Bun.env.BETTER_AUTH_URL && origin === Bun.env.BETTER_AUTH_URL) return origin
      return Bun.env.BETTER_AUTH_URL ?? 'http://localhost:5173'
    },
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  }),
)
app.on(['POST', 'GET'], '/api/auth/*', c => {
  return auth.handler(c.req.raw)
})
registerRoutes(app)
configureOpenAPI(app)

const port = Number(Bun.env.PORT ?? Bun.env.PORT_NO ?? 5000)
const baseUrl = Bun.env.BETTER_AUTH_URL ?? `http://localhost:${port}`

console.log(`Server running on port ${port}`)
console.log(`Auth reference available at ${baseUrl}/api/auth/reference`)
console.log(`API reference available at ${baseUrl}/reference`)

export default {
  fetch: app.fetch,
  port,
}
