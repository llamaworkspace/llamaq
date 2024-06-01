import { env } from '@/env'
import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { llamaqEnqueueHandler } from './handlers/llamaqEnqueueHandler'

const llamaqRouter = new Hono()
llamaqRouter.use(bearerAuth({ token: env.LLAMAQ_ACCESS_TOKEN }))

// Important! Keep routes after the .use middleware
llamaqRouter.route('/enqueue', llamaqEnqueueHandler)

export { llamaqRouter }
