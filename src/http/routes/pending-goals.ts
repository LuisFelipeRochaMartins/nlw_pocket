import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { weekPendindGoals } from '../../functions/week-peding-goals'

export const getPendingGoalsRoute: FastifyPluginAsyncZod = async (
  app,
  _options
) => {
  app.get('/pending-goals', async () => {
    const { pendingGoals } = await weekPendindGoals()

    return { pendingGoals }
  })
}
