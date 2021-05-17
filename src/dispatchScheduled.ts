import Later = require('later')
import { Dispatch, Action, Response } from './types'

export interface Scheduled {
  later: Later.Schedule
  action: Action
}

export default (dispatch: Dispatch, scheduled: (Scheduled | undefined)[]) =>
  async function dispatchScheduled(from: Date, to: Date) {
    const dispatched: Action[] = []
    const meta = { ident: { id: 'scheduler' }, queue: true }

    for (const schedule of scheduled) {
      if (schedule) {
        const { later, action } = schedule
        const next = later.next(1, from, to)
        if (next) {
          const response = await dispatch({ ...action, meta })
          dispatched.push({ ...action, response, meta })
        }
      }
    }

    return dispatched
  }
