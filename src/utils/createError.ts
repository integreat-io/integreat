import { Action, Response } from '../types'

export function createErrorResponse(
  error?: string,
  status = 'error'
): Response {
  return {
    status,
    error,
  }
}

export function createErrorOnAction(
  action: Action,
  error?: string,
  status = 'error'
): Action {
  return {
    ...action,
    response: {
      ...action.response,
      ...createErrorResponse(error, status),
    },
  }
}
