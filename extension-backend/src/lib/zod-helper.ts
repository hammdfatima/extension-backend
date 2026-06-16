import { z } from '@hono/zod-openapi'
import type { ZodSchema } from '~/types'

export function zodResponseSchema(schema?: ZodSchema) {
  const baseSchema = z
    .object({
      message: z.string().openapi({ description: 'Response message' }),
      // success: z.boolean().openapi({ description: 'Request success status' }),
    })
    .openapi({ description: 'Base response schema' })

  if (!schema) {
    return baseSchema
  }

  return z
    .object({
      message: z.string().openapi({ description: 'Response message' }),
      success: z.boolean().openapi({ description: 'Request success status' }),
      data: schema,
    })
    .openapi({ description: 'Response with data' })
}
