import { Action } from '../types'

export default function createError(
  action: Action,
  error?: string,
  status = 'error'
): Action {
  return {
    ...action,
    response: {
      ...action.response,
      status,
      error,
    },
  }
}
