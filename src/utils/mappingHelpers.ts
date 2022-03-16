import { Action, Paging, Params, Ident, Meta } from '../types'
import { EndpointOptions } from '../service/endpoints/types'

export interface MappingParams extends Params {
  id?: string | string[]
  type?: string | string[]
  sendNoDefaults?: boolean
}

export interface MappingObject {
  action: string
  status: null | string
  params: MappingParams
  data: unknown
  error?: string
  paging?: Paging
  options?: EndpointOptions
  headers?: Record<string, string>
  ident?: Ident
  meta?: Meta
}

const isOkStatus = (status?: string | null) =>
  typeof status === 'string' && ['ok', 'queued'].includes(status)

export function prepareActionForMapping(
  action: Action,
  _isRequest = false
): Action {
  return action
}

export function populateActionAfterMapping(
  action: Action,
  mappedAction?: Partial<Action>,
  isRequest = false
): Action {
  if (!mappedAction) {
    return action
  }
  const actionStatus = action.response?.status
  const {
    type: actionType,
    payload: { data: requestData, ...params } = {},
    response: {
      status: mappedStatus,
      error,
      paging,
      headers,
      data: responseData,
      params: responseParams,
    } = {},
    meta: { options, ident } = {},
  } = mappedAction
  const status =
    actionStatus &&
    !isOkStatus(actionStatus) &&
    (isOkStatus(mappedStatus) || actionStatus !== 'error')
      ? actionStatus // Don't override action error status with ok or a more generic error from mapping
      : mappedStatus || actionStatus || null // Use status from mapping if it exists
  const response =
    !isRequest || status
      ? {
          ...action.response,
          status: isOkStatus(status) && error ? 'error' : status,
          ...(mappedAction.response?.hasOwnProperty('data')
            ? { data: responseData }
            : {}),
          ...(paging && { paging }),
          ...(error && { error }),
          ...(headers && { headers }),
          ...(responseParams && { params: responseParams }),
        }
      : undefined

  return {
    ...action,
    type: actionType || action.type,
    payload: {
      ...action.payload,
      ...params,
      ...(mappedAction.payload?.hasOwnProperty('data')
        ? { data: requestData }
        : {}),
    },
    ...(response && { response }),
    meta: {
      ...action.meta,
      ident: ident || action.meta?.ident,
      ...(options && { options: { ...action?.meta?.options, ...options } }),
    },
  }
}
