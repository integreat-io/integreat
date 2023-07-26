import { isObject } from './is.js'
import type { Action, Response } from '../types.js'

const isResponseObject = (response: unknown): response is Response =>
  isObject(response) && Object.keys(response).length > 0

const joinErrorMessages = (errors?: string | string[]) =>
  Array.isArray(errors)
    ? errors.length > 0
      ? errors.join(' | ')
      : undefined
    : errors

const isOkOrEmpty = (status: string | null | undefined) =>
  ['ok', null, undefined].includes(status)

function setStatusAndError(
  { error: responseError, ...response }: Partial<Response>,
  originalStatus: string | null = null
): Response {
  const error = joinErrorMessages(responseError)
  const status =
    error && isOkOrEmpty(response.status) && isOkOrEmpty(originalStatus)
      ? 'error'
      : response.status || originalStatus || undefined
  return error ? { ...response, status, error } : { ...response, status }
}
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
