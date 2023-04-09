import { isObject } from './is.js'
import type { Action, Response } from '../types.js'

export function prepareActionForMapping(
  action: Action,
  _isRequest = false
): Action {
  return action
}

const isResponseObject = (response: unknown): response is Response =>
  isObject(response) && Object.keys(response).length > 0

const setStatusAndError = (
  response: Partial<Response>,
  originalStatus: string | null = null
): Response => ({
  ...response,
  status:
    response.error &&
    ['ok', null, undefined].includes(response.status) &&
    (!originalStatus || originalStatus === 'ok')
      ? 'error'
      : response.status || originalStatus || undefined,
  ...(response.error
    ? {
        error: Array.isArray(response.error)
          ? response.error.join(' | ')
          : response.error,
      }
    : {}),
})

export function populateActionAfterMapping(
  action: Action,
  mappedAction?: Partial<Action>
): Action {
  if (!mappedAction) {
    return action
  }
  const { type, payload, meta } = mappedAction
  const response = mappedAction.response || action.response
  return {
    type: type || action.type,
    payload: payload || action.payload,
    ...(isResponseObject(response) && {
      response: setStatusAndError(response, action.response?.status),
    }),
    meta: meta || action.meta,
  }
}
