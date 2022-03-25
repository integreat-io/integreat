import { isObject } from './is'
import { Action, Response } from '../types'

export function prepareActionForMapping(
  action: Action,
  _isRequest = false
): Action {
  return action
}

const isResponseObject = (response: unknown): response is Response =>
  isObject(response) && Object.keys(response).length > 0

const setStatus = (
  response: Partial<Response>,
  originalStatus: string | null = null
): Response => ({
  ...response,
  status:
    response.status === undefined
      ? response.error && (!originalStatus || originalStatus === 'ok')
        ? 'error'
        : originalStatus
      : response.status,
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
      response: setStatus(response, action.response?.status),
    }),
    meta: meta || action.meta,
  }
}
