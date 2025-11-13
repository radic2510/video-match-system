import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { handlers } from './mock-handlers'

export const server = setupServer(...handlers)

export { http, HttpResponse }
