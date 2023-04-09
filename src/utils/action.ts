import type { Action, Payload, Meta, Response } from '../types.js'

/**
 * Create an action object.
 */
export function createAction(
  type?: string,
  payload: Payload = {},
  meta: Meta = {}
): Action | null {
  if (!type) {
    return null
  }
  return { type, payload, meta }
}

/**
 * Set payload data on given action.
 */
export function setDataOnActionPayload(action: Action, data?: unknown) {
  return {
    ...action,
    payload: { ...action.payload, data },
  }
}

/**
 * Set response on given action.
 */
export function setResponseOnAction(action: Action, response?: Response) {
  return { ...action, response: response || {} }
}

/**
 * Create an error response.
 */
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

/**
 * Set error message and status on an action.
 */
export function setErrorOnAction(
  action: Action,
  error: unknown,
  status = 'error'
): Action {
  return setResponseOnAction(action, {
    ...action.response,
    ...createErrorResponse(error, status),
  })
}
