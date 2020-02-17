import {
  Action,
  Exchange,
  Dictionary,
  Data,
  Request,
  Response,
  Params,
  ExchangeRequest
} from '../types'

// NOTE: The isRev logic is a temporar solution. A more robust way of handling
// mapping from a request and to a response, should be found.

export function exchangeFromAction(action: Action, isRev = false): Exchange {
  const {
    type,
    payload: { endpoint, params, data, ...payload },
    meta: actionMeta
  } = action
  const { ident, ...meta } = actionMeta || {}

  return {
    type,
    status: null,
    request: { ...payload, params, data },
    response: isRev ? { params, data } : {},
    ident,
    endpointId: endpoint,
    meta: meta as Dictionary<Data>
  }
}

export function requestFromExchange(exchange: Exchange): Request {
  const {
    type: action,
    request: { data, ...params },
    ident,
    endpoint: { options: endpoint = {} } = {}
  } = exchange

  return {
    action,
    params: { ...params.params, ...params } as Params, // Hack until params on requests are properly sorted
    data,
    endpoint,
    access: ident ? { ident } : undefined
  }
}

export function responseToExchange(
  exchange: Exchange,
  response: Response,
  isRev = false
): Exchange {
  const { status, ...responseObject } = response
  return {
    ...exchange,
    status,
    response: isRev
      ? exchange.response
      : { ...exchange.response, ...responseObject },
    request: isRev
      ? { ...exchange.request, ...responseObject }
      : exchange.request
  }
}

const responseFromRequest = ({ data, params, error }: ExchangeRequest) => ({
  ...(data !== undefined ? { data } : {}),
  ...(params ? { params } : {}),
  ...(error ? { error } : {})
})

export function responseFromExchange(
  { status, response, request, ident }: Exchange,
  isRev = false
): Response {
  return {
    ...(isRev ? responseFromRequest(request) : response),
    status,
    access: { ident }
  }
}

export function mappingObjectFromExchange(exchange: Exchange, data: Data) {
  const {
    type: action,
    request: { data: reqData, params, ...reqParams },
    endpoint: { options = undefined } = {},
    ident
  } = exchange
  return {
    action,
    params: { ...reqParams, ...params },
    data,
    options,
    ident
  }
}
