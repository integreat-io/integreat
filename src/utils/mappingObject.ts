import { isEmptyObject } from './is'
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
    payload: { data: requestData, params, ...reqParams },
    response: { status = null, data: responseData, error, paging } = {},
    meta: { options, ident, ...meta } = {},
  } = action
  return {
    action: actionType,
    status,
    params: { ...reqParams, ...params },
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
  const {
    status: mappedStatus,
    data,
    paging,
    error,
    params: { id, type, sendNoDefaults, ...params } = {},
    options,
  } = mappingObject
  const status =
    mappedStatus || action.response?.status || (error ? 'error' : null)
  const response =
    !isRequest || status
      ? {
          ...action.response,
          ...(!isRequest && { data }),
          ...(paging ? { paging } : {}),
          ...(error && !isOkStatus(status) ? { error } : {}),
          status,
        }
      : undefined

  return {
    ...action,
    payload: {
      ...action.payload,
      ...(isRequest && { data }),
      ...(id && { id }),
      ...(type && { type }),
      ...(sendNoDefaults && { sendNoDefaults }),
      ...(!isEmptyObject(params) && {
        params: { ...action.payload.params, ...(params as Params) },
      }),
    },
    ...(response && { response }),
    meta: {
      ...action.meta,
      ...(options && { options: { ...action?.meta?.options, ...options } }),
    },
  }
}
