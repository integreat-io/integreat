import { isEmptyObject } from './is'
import {
  Action,
  Exchange,
  Dictionary,
  Data,
  Request,
  Response,
  Params,
  Ident,
} from '../types'
import { EndpointOptions } from '../service/endpoints/types'

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
    },
    meta: actionMeta,
  } = action
  const { ident, ...meta } = actionMeta || {}
  const incoming = actionType === 'REQUEST'

  return {
    type: actionType,
    status: null,
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
    meta: meta as Dictionary<Data>,
    incoming,
  }
}

export function requestFromExchange(exchange: Exchange): Request {
  const {
    type: action,
    request: { data, params, ...rest },
    ident,
    auth,
    endpoint: { options: endpoint = {} } = {},
  } = exchange

  return {
    action,
    params: { ...params, ...rest } as Params, // Hack until params on requests are properly sorted
    data,
    endpoint,
    auth,
    access: ident ? { ident } : undefined,
  }
}

export function responseToExchange(
  exchange: Exchange,
  response: Response
): Exchange {
  const { status, ...responseObject } = response
  return {
    ...exchange,
    status,
    response: { ...exchange.response, ...responseObject },
  }
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

export interface MappingParams extends Params {
  id?: string | string[]
  type?: string | string[]
  service?: string
}

export interface MappingObject {
  action: string
  status: null | string
  params: MappingParams
  data: Data
  error?: string
  paging?: object
  options?: EndpointOptions
  ident?: Ident
}

export function mappingObjectFromExchange(
  exchange: Exchange,
  isTo = false
): MappingObject {
  const {
    type: action,
    status,
    request: { data: requestData, params, ...reqParams },
    response: { data: responseData, error, paging },
    endpoint: { options = undefined } = {},
    ident,
    incoming,
  } = exchange
  return {
    action,
    status,
    params: { ...reqParams, ...params },
    data: (isTo ? !incoming : incoming) ? requestData : responseData,
    error,
    paging,
    options,
    ident,
  }
}

export function exchangeFromMappingObject(
  exchange: Exchange,
  mappingObject: MappingObject,
  isTo = false
): Exchange {
  const { incoming = false } = exchange
  const {
    status,
    data,
    paging,
    error,
    params: { id, type, service, ...params },
  } = mappingObject

  return {
    ...exchange,
    status,
    request: {
      ...exchange.request,
      ...((isTo ? !incoming : incoming) && { data }),
      ...(id && { id }),
      ...(type && { type }),
      ...(service && { service }),
      ...(!isEmptyObject(params) && { params }),
    },
    response: {
      ...exchange.response,
      ...((!isTo ? !incoming : incoming) && { data }),
      ...(paging ? { paging } : {}),
      ...(error ? { error } : {}),
    },
  }
}

export const completeExchange = <ReqData = Data, RespData = Data>({
  type,
  status = null,
  request = {},
  response = {},
  endpointId,
  ident,
  meta = {},
  auth,
  incoming = false,
  authorized = false,
}: Partial<Exchange<ReqData, RespData>>) => ({
  type: type as string,
  status,
  request,
  response,
  endpointId,
  ident,
  meta,
  auth,
  incoming,
  authorized,
})
