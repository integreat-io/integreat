import debugLib from 'debug'
import { isErrorResponse, isNotNullOrUndefined, isDuplicate } from './is.js'
import type { Response } from '../types.js'

const debug = debugLib('great')

/**
 * Create an error response.
 */
export function createErrorResponse(
  error: unknown,
  origin: string,
  status = 'error',
  reason?: string,
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
  actionType: string,
): Response {
  const error = serviceId
    ? `Service with id '${serviceId || '<not set>'}' does not exist`
    : `No service exists for type '${type || '<not set>'}'`
  debug(`${actionType}: ${error}`)
  return createErrorResponse(error, `handler:${actionType}`)
}

const getCombinedStatus = (responses: Response[]) =>
  responses
    .map((response) => response.status)
    .reduce((combined, status) => (combined === status ? combined : 'error'))

function getCombinedErrors(responses: Response[]) {
  const errors = responses
    .filter((response) => response.error || isErrorResponse(response))
    .map((response) => `[${response.status}] ${response.error}`)
    .filter(isDuplicate)
  return errors.length === 1 ? responses[0].error : errors.join(' | ')
}

const getCombinedWarnings = (responses: Response[]) =>
  responses
    .map((response) => response.warning)
    .filter(isNotNullOrUndefined)
    .filter(isDuplicate)
    .join(' | ')

function getCombinedOrigins(responses: Response[]) {
  const origins = responses
    .map((response) => response.origin)
    .filter(isNotNullOrUndefined)
    .filter(isDuplicate)
  return origins.length === 1 ? origins[0] : undefined
}

/**
 * Combine several error responses into one.
 */
export function combineResponses(responses: Response[]) {
  const realResponses = responses.filter(isNotNullOrUndefined)
  if (realResponses.length < 2) {
    return realResponses[0] // Will yield undefined if no responses
  } else {
    const status = getCombinedStatus(realResponses)
    const error = getCombinedErrors(realResponses)
    const warning = getCombinedWarnings(realResponses)
    const origin = getCombinedOrigins(realResponses)
    return {
      status,
      ...(error && { error }),
      ...(warning && { warning }),
      ...(origin && { origin }),
    }
  }
}

const generateOrigin = (
  origin: string,
  responseOrigin: string | undefined,
  doPrefix: boolean,
) =>
  responseOrigin
    ? doPrefix
      ? `${origin}:${responseOrigin}` // Prefix existing origin
      : responseOrigin // Keep existing origin as-is
    : origin

/**
 * Set the given origin on a response if the response status is not ok and there
 * is not an origin already specified.
 * If `doPrefix` is true, any existing origin will be prefixed with the given
 * origin.
 */
export const setOrigin = (
  response: Response,
  origin: string,
  doPrefix = false,
) =>
  response.status === 'ok' || response.status === 'queued'
    ? response
    : {
        ...response,
        origin: generateOrigin(origin, response.origin, doPrefix),
      }
