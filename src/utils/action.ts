import { isErrorResponse } from './is.js'
import type { Action, Payload, Meta, Response } from '../types.js'
import type Endpoint from '../service/Endpoint.js'

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
 * Set the general options from an endpoint on `action.meta.options`.
 */
export function setOptionsOnAction(action: Action, endpoint: Endpoint): Action {
  return {
    ...action,
    meta: { ...action.meta, options: endpoint?.options.transporter || {} },
  }
}

/**
 * Create an error response.
 */
export function createErrorResponse(
  error: unknown,
  origin: string,
  status = 'error',
  reason?: string
): Response {
  return {
    status,
    error:
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Unknown error',
    ...(reason ? { reason } : {}),
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

/**
 * Combine several error responses into one.
 */
export function combineResponses(responses: Response[]) {
  if (responses.length < 2) {
    return responses[0] // Will yield undefined if no responses
  } else {
    const error = responses
      .filter((response) => response.error || isErrorResponse(response))
      .map((response) => `[${response.status}] ${response.error}`)
      .join(' | ')
    const warning = responses
      .filter((response) => response.warning)
      .map((response) => response.warning)
      .join(' | ')
    return {
      status: 'error',
      ...(error && { error }),
      ...(warning && { warning }),
    }
  }
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
