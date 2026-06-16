import * as z from 'zod'

const envSchema = z.object({
  PORT_NO: z.coerce.number(),
  OPENAI_API_KEY: z.string().optional(),
  UPLOAD_DIR: z.string().default('./uploads'),
})

export async function parseENV() {
  try {
    envSchema.parse(Bun.env)
  } catch (err) {
    console.error('Invalid Env variables Configuration::::', err)
    process.exit(1)
  }
}

declare module 'bun' {
  interface Env extends z.TypeOf<typeof envSchema> {}
}
