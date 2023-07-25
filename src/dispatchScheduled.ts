import type Schedule from './utils/Schedule.js'
import type { Dispatch, Action } from './types.js'

export default (dispatch: Dispatch, schedules: Schedule[]) =>
  async function dispatchScheduled(from: Date, to: Date): Promise<Action[]> {
    const dispatched: Action[] = []
    const meta = { ident: { id: 'scheduler' }, queue: true }

    for (const schedule of schedules) {
      if (schedule && schedule.action) {
        if (schedule.shouldRun(from, to)) {
          const response = await dispatch({ ...schedule.action, meta })
          dispatched.push({ ...schedule.action, response, meta })
        }
      }
    }

    return dispatched
  }
