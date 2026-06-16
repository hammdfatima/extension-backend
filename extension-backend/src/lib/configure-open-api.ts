import { Scalar } from '@scalar/hono-api-reference'
import type { AppOpenAPI } from '~/types'

export default function configureOpenAPI(app: AppOpenAPI) {
  app.doc('/doc', {
    openapi: '3.0.0',
    info: {
      version: '1',
      title: 'API Docs',
    },
  })

  app.get(
    '/reference',
    Scalar({
      // Theme and Layout - Enhanced for better UX
      theme: 'kepler',
      layout: 'modern',

      // OpenAPI specification URL
      url: '/doc',

      // UI Customization for better developer experience
      showSidebar: true,
      hideModels: true,
      hideDownloadButton: false,
      hideTestRequestButton: false,

      // Search functionality with hotkey
      searchHotKey: 'k',
      hiddenClients: true,
      hideClientButton: true,

      // HTTP Client Configuration - Use supported values
      defaultHttpClient: {
        targetKey: 'js',
        clientKey: 'fetch',
      },

      // Authentication configuration
      authentication: {
        preferredSecurityScheme: 'bearerAuth',
      },
    })
  )
}
