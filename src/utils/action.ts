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
  origin: string,
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
    ...(origin ? { origin } : {}),
  }
}

/**
 * Set error message and status on an action.
 */
export function setErrorOnAction(
  action: Action,
  error: unknown,
  origin: string,
  status = 'error'
): Action {
  return setResponseOnAction(action, {
    ...action.response,
    ...createErrorResponse(error, origin, status),
  })
}

// Set origin on response if status is not ok.
export const setOrigin = (
  response: Response,
  origin: string,
  doPrefix = false
) =>
  response.status === 'ok' || response.status === 'queued'
    ? response
    : {
        ...response,
        origin: response.origin
          ? doPrefix
            ? `${origin}:${response.origin}` // Prefix existing origin
            : response.origin // Keep existing origin as-is
          : origin,
      }

// Set on response of action if status is not ok.
export const setOriginOnAction = (
  action: Action,
  origin: string,
  doPrefix = false
) =>
  typeof action.response?.status === 'string' &&
  action.response?.status !== 'ok'
    ? { ...action, response: setOrigin(action.response, origin, doPrefix) }
    : action
