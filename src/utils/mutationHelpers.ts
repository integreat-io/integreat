import { isObject } from './is.js'
import type { Action, Response } from '../types.js'

const isResponseObject = (response: unknown): response is Response =>
  isObject(response) && Object.keys(response).length > 0

const removeEmptyError = ({ error, ...response }: Response) =>
  error ? { ...response, error } : response

const setStatusAndError = (
  response: Partial<Response>,
  originalStatus: string | null = null
): Response =>
  removeEmptyError({
    ...response,
    status:
      response.error &&
      ['ok', null, undefined].includes(response.status) &&
      (!originalStatus || originalStatus === 'ok')
        ? 'error'
        : response.status || originalStatus || undefined,
    error: Array.isArray(response.error)
      ? response.error.join(' | ')
      : response.error,
  })

export function populateActionAfterMutation(
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
