/**
 * Default email addresses for the application.
 */
export const DEFAULT_FROM_EMAIL = {
  no_reply: 'no-reply@teleneo.com',
  info: 'info@teleneo.com',
} as const
export type IDefaultEmail = keyof typeof DEFAULT_FROM_EMAIL
export const COMPANY_NAME = 'Teleneo'
export const API_START_POINT = '/api/v1'
