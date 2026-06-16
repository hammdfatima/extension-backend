/* eslint-disable ts/no-explicit-any */
import type { OpenAPIHono, RouteConfig, RouteHandler, z } from '@hono/zod-openapi'
import type { Env } from 'hono'
import type { auth } from '~/lib/auth'

export interface AppBindings {
  Variables: {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
  }
}
export type AppOpenAPI = OpenAPIHono<AppBindings>
export type AppRouteHandler<R extends RouteConfig, A extends Env = AppBindings> = RouteHandler<R, A>
// eslint-disable-next-line ts/no-empty-object-type
export type AppMiddlewareVariables<T extends Record<string, unknown> = Record<string, never>> =
  AppBindings & {
    Variables: T
  }

export type ZodSchema =
  | z.ZodTypeAny // Matches any Zod schema
  | z.ZodUnion<z.ZodTypeAny[]>
  | z.ZodObject<Record<string, z.ZodTypeAny>>
  | z.ZodArray<z.ZodTypeAny>

export interface IPayload {
  user_id: string
  email: string
  role?: string
  stripe_account_id?: string
  stripe_customer_id?: string
}

export type HandlerMapFromRoutes<T extends Record<string, RouteConfig>> = {
  [K in keyof T]: AppRouteHandler<T[K]>
}
