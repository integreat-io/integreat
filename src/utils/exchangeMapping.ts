import { isEmptyObject } from './is'
import {
  Action,
  Exchange,
  Data,
  Response,
  Paging,
  Params,
  Ident,
  ExchangeResponse,
} from '../types'
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
  data: Data
  error?: string
  paging?: Paging
  options?: EndpointOptions
  ident?: Ident
}

const isOkStatus = (status: string | null) =>
  status !== null && ['ok', 'queued'].includes(status)

const removeError = <T>({ error, ...response }: ExchangeResponse<T>) => response

export const completeExchange = <ReqData = Data, RespData = Data>({
  type,
  id,
  status = null,
  request = {},
  response = {},
  endpointId,
  options,
  ident,
  meta = {},
  auth,
  source,
  target,
  authorized = false,
}: Partial<Exchange<ReqData, RespData>>): Exchange<ReqData, RespData> => ({
  type: type as string,
  id,
  status,
  request,
  response: isOkStatus(status) ? removeError(response) : response,
  endpointId,
  options,
  ident,
  meta,
  auth,
  source,
  target,
  authorized,
})

export function exchangeFromAction(action: Action): Exchange {
  const {
    type: actionType,
    payload: {
      type,
      id,
      page,
      pageSize,
      endpoint,
      params,
      data,
      returnNoDefaults,
      sourceService,
      targetService,
      service,
      ...rest
    } = {},
    meta: actionMeta,
  } = action
  const { ident, ...meta } = actionMeta || {}

  return completeExchange({
    type: actionType,
    request: {
      ...(type ? { type } : {}),
      ...(id ? { id } : {}),
      ...(page ? { page } : {}),
      ...(pageSize ? { pageSize } : {}),
      ...(data ? { data } : {}),
      params: { ...rest, ...params },
    },
    response: {
      ...(typeof returnNoDefaults === 'boolean' ? { returnNoDefaults } : {}),
    },
    ident,
    endpointId: endpoint,
    meta: meta as Record<string, Data>,
    source: sourceService,
    target: targetService || service,
  })
}

export function responseToExchange(
  exchange: Exchange,
  response: Response
): Exchange {
  const { status, ...responseObject } = response
  return completeExchange({
    ...exchange,
    status,
    response: { ...exchange.response, ...responseObject },
  })
}

export function responseFromExchange({
  status,
  response,
  ident,
}: Exchange): Response {
  return {
    ...response,
    status,
    access: { ident },
  }
}

export function mappingObjectFromExchange(
  exchange: Exchange,
  isRequest = false
): MappingObject {
  const {
    type: action,
    status,
    request: { data: requestData, params, ...reqParams },
    response: { data: responseData, error, paging },
    options,
    ident,
  } = exchange
  return {
    action,
    status,
    params: { ...reqParams, ...params },
    data: isRequest ? requestData : responseData,
    error,
    paging,
    ...(options && { options: { ...options } }),
    ident,
  }
}

export function exchangeFromMappingObject(
  exchange: Exchange,
  mappingObject?: MappingObject,
  isRequest = false
): Exchange {
  if (!mappingObject) {
    return exchange
  }
  const {
    status,
    data,
    paging,
    error,
    params: { id, type, sendNoDefaults, ...params } = {},
    options,
  } = mappingObject
  return completeExchange({
    ...exchange,
    ...(status && { status }),
    request: {
      ...exchange.request,
      ...(isRequest && { data }),
      ...(id && { id }),
      ...(type && { type }),
      ...(sendNoDefaults && { sendNoDefaults }),
      ...(!isEmptyObject(params) && { params }),
    },
    response: {
      ...exchange.response,
      ...(!isRequest && { data }),
      ...(paging ? { paging } : {}),
      ...(error ? { error } : {}),
    },
    ...(options && { options: { ...exchange?.options, ...options } }),
  })
}
