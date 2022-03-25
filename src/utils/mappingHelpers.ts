import { Action, Response } from '../types'

export function prepareActionForMapping(
  action: Action,
  _isRequest = false
): Action {
  return action
}

const setStatus = (response: Partial<Response>): Response => ({
  ...response,
  status: response.status || (response.error ? 'error' : null),
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
    ...(response && { response: setStatus(response) }),
    meta: meta || action.meta,
  }
}
