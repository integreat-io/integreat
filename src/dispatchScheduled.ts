import type Job from './jobs/Job.js'
import { IdentType, Dispatch, Action } from './types.js'

export default (dispatch: Dispatch, jobs: Job[]) =>
  async function dispatchScheduled(from: Date, to: Date): Promise<Action[]> {
    const dispatched: Action[] = []
    const meta = {
      ident: { id: 'scheduler', type: IdentType.Scheduler },
      queue: true,
    }

    for (const job of jobs) {
      if (job && job.schedule) {
        if (job.schedule.shouldRun(from, to)) {
          const action = { type: 'RUN', payload: { jobId: job.id }, meta }
          const response = await dispatch(action)
          dispatched.push({ ...action, response })
        }
      }
    }

    return dispatched
  }
