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
  service?: string
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
  endpoint,
  ident,
  meta = {},
  auth,
  incoming = false,
  authorized = false,
}: Partial<Exchange<ReqData, RespData>>): Exchange<ReqData, RespData> => ({
  type: type as string,
  id,
  status,
  request,
  response: isOkStatus(status) ? removeError(response) : response,
  endpointId,
  endpoint,
  ident,
  meta,
  auth,
  incoming,
  authorized,
})

export function exchangeFromAction(action: Action): Exchange {
  const {
    type: actionType,
    payload: {
      type,
      id,
      service,
      page,
      pageSize,
      endpoint,
      params,
      data,
      returnNoDefaults,
      ...rest
    } = {},
    meta: actionMeta,
  } = action
  const { ident, ...meta } = actionMeta || {}
  const incoming = actionType === 'REQUEST'

  return completeExchange({
    type: actionType,
    request: {
      ...(type ? { type } : {}),
      ...(id ? { id } : {}),
      ...(service ? { service } : {}),
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
    incoming,
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
    endpoint: { options = undefined } = {},
    ident,
  } = exchange
  return {
    action,
    status,
    params: { ...reqParams, ...params },
    data: isRequest ? requestData : responseData,
    error,
    paging,
    options,
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
    params: { id, type, service, sendNoDefaults, ...params } = {},
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
      ...(service && { service }),
      ...(sendNoDefaults && { sendNoDefaults }),
      ...(!isEmptyObject(params) && { params }),
    },
    response: {
      ...exchange.response,
      ...(!isRequest && { data }),
      ...(paging ? { paging } : {}),
      ...(error ? { error } : {}),
    },
    endpoint: exchange.endpoint
      ? {
          ...exchange.endpoint,
          ...(options && {
            options: { ...exchange.endpoint?.options, ...options },
          }),
        }
      : undefined,
  })
}
