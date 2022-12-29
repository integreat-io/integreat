import { Action, Response } from '../types'

export function createErrorResponse(
  error: unknown,
  status = 'error'
): Response {
  return {
    status,
    error:
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Unknown error',
  }
}

export function createErrorOnAction(
  action: Action,
  error: unknown,
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
