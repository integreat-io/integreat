import debugLib from 'debug'
import { isErrorResponse } from './is.js'
import type { Response } from '../types.js'

const debug = debugLib('great')

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

export function createUnknownServiceError(
  type: string | string[] | undefined,
  serviceId: string | undefined,
  actionType: string
): Response {
  const error = serviceId
    ? `Service with id '${serviceId || '<not set>'}' does not exist`
    : `No service exists for type '${type || '<not set>'}'`
  debug(`${actionType}: ${error}`)
  return createErrorResponse(error, `handler:${actionType}`)
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

/**
 * Set the given origin on a response if the response status is not ok and there
 * is not an origin already specified.
 * If `doPrefix` is true, any existing origin will be prefixed with the given
 * origin.
 */
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
