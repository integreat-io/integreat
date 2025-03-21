import { createErrorResponse } from '../utils/response.js'
import type { Action, ActionHandlerResources, Response } from '../types.js'
import type Job from '../jobs/Job.js'

export default (jobs: Map<string, Job>) =>
  async function run(
    action: Action,
    { dispatch, setProgress }: ActionHandlerResources,
  ): Promise<Response> {
    const {
      payload: { jobId },
      meta: { id } = {},
    } = action
    const job = typeof jobId === 'string' ? jobs.get(jobId) : undefined
    if (!job) {
      return createErrorResponse(
        `No valid job with id '${jobId}'`,
        'handler:RUN',
        'notfound',
      )
    }

    return await job.run(action, dispatch, setProgress, id)
  }
