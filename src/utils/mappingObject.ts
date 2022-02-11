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

const isOkStatus = (status: string | null) =>
  status !== null && ['ok', 'queued'].includes(status)

export function mappingObjectFromAction(
  action: Action,
  isRequest = false
): MappingObject {
  const {
    type: actionType,
    payload: { data: requestData, ...requestParams },
    response: {
      status = null,
      data: responseData,
      error,
      params: responseParams,
      paging,
    } = {},
    meta: { options, ident, ...meta } = {},
  } = action
  return {
    action: actionType,
    status,
    params: { ...requestParams, ...responseParams },
    data: isRequest ? requestData : responseData,
    error,
    paging,
    ...(options ? { options } : {}),
    ident,
    meta,
  }
}

export function actionFromMappingObject(
  action: Action,
  mappingObject?: MappingObject,
  isRequest = false
): Action {
  if (!mappingObject) {
    return action
  }
  const actionStatus = action.response?.status
  const {
    action: actionType,
    status: mappedStatus,
    data,
    paging,
    error,
    params,
    options,
    headers,
  } = mappingObject
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
          ...(!isRequest && { data }),
          ...(paging && { paging }),
          ...(error && { error }),
          ...(headers && { headers }),
          status: isOkStatus(status) && error ? 'error' : status,
        }
      : undefined

  return {
    ...action,
    type: actionType || action.type,
    payload: {
      ...action.payload,
      ...params,
      ...(isRequest && { data }),
    },
    ...(response && { response }),
    meta: {
      ...action.meta,
      ...(options && { options: { ...action?.meta?.options, ...options } }),
    },
  }
}
