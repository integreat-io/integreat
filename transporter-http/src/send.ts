import got, { HTTPError, Response } from 'got'
import { Exchange, Connection } from '../../core/src'
import { Options } from './types'

const extractFromError = (error: HTTPError | Error) =>
  error instanceof HTTPError
    ? {
        statusCode: error.response.statusCode,
        statusMessage: error.response.statusMessage,
      }
    : {
        statusCode: undefined,
        statusMessage: error.message, // TODO: Return error.message in debug mode only?
      }

const updateExchange = (
  exchange: Exchange,
  status: string,
  data: unknown,
  error?: string
) => ({
  ...exchange,
  status,
  response: {
    ...exchange.response,
    ...(data !== undefined ? { data } : {}),
    ...(error !== undefined ? { error } : {}),
  },
})

function updateExchangeWithError(
  exchange: Exchange,
  error: HTTPError | Error,
  url: string,
  auth?: unknown
) {
  const { statusCode, statusMessage } = extractFromError(error)
  const response = {
    status: 'error',
    error: `Server returned ${statusCode} for ${url}`,
  }

  if (statusCode === undefined) {
    response.error = `Server returned '${statusMessage}' for ${url}`
  } else {
    switch (statusCode) {
      case 400:
        response.status = 'badrequest'
        break
      case 401:
      case 403:
        response.status = 'noaccess'
        response.error = auth
          ? 'Not authorized'
          : 'Service requires authentication'
        break
      case 404:
        response.status = 'notfound'
        response.error = `Could not find the url ${url}`
        break
      case 408:
        response.status = 'timeout'
    }
  }

  return updateExchange(exchange, response.status, undefined, response.error)
}

const createQueryString = (params: Record<string, string>) =>
  Object.keys(params)
    // eslint-disable-next-line security/detect-object-injection
    .map((key) => `${key.toLowerCase()}=${encodeURIComponent(params[key])}`)
    .join('&')

const appendQueryParams = (uri: string, params: Record<string, string>) =>
  `${uri}${uri.indexOf('?') >= 0 ? '&' : '?'}${createQueryString(params)}`

const addAuthToUri = (
  url?: string,
  endpoint?: Options,
  auth?: Record<string, string> | boolean | null
) => {
  if (url && endpoint?.authAsQuery && auth && auth !== true) {
    return appendQueryParams(url, auth)
  }
  return url
}

const removeContentTypeIf = (
  headers: Record<string, string>,
  doRemove: boolean
) =>
  doRemove
    ? Object.entries(headers).reduce(
        (headers, [key, value]) =>
          key.toLowerCase() === 'content-type'
            ? headers
            : { ...headers, [key]: value },
        {}
      )
    : headers

const createHeaders = (
  endpoint?: Options,
  data?: unknown,
  headers?: object,
  auth?: object | boolean | null
) => ({
  ...(typeof data === 'string'
    ? { 'Content-Type': 'text/plain' }
    : { 'Content-Type': 'application/json' }), // Will be removed later on if GET
  ...endpoint?.headers,
  ...headers,
  ...(auth === true || endpoint?.authAsQuery ? {} : auth),
})

const selectMethod = (endpoint?: Options, data?: unknown) =>
  endpoint?.method || (data ? ('PUT' as const) : ('GET' as const))

const prepareBody = (data: unknown) =>
  typeof data === 'string' || data === undefined ? data : JSON.stringify(data)

function optionsFromEndpoint(exchange: Exchange, endpoint?: Options) {
  const method = selectMethod(endpoint, exchange.request.data)
  return {
    url: addAuthToUri(endpoint?.uri, endpoint, exchange.auth),
    method,
    body: prepareBody(exchange.request.data),
    headers: removeContentTypeIf(
      createHeaders(
        endpoint,
        exchange.request.data,
        exchange.request.headers,
        exchange.auth
      ),
      method === 'GET'
    ),
    retry: 0,
  }
}

export default async function send(
  exchange: Exchange,
  _connection: Connection | null
) {
  const { url, ...options } = optionsFromEndpoint(
    exchange,
    exchange.endpoint?.options
  )

  if (!url) {
    return updateExchange(
      exchange,
      'badrequest',
      undefined,
      'Request is missing endpoint or uri'
    )
  }

  try {
    // Type hack, as the CancelableRequest type returned by got is not identified as a Promise
    const response = await ((got(url, options) as unknown) as Promise<
      Response<string>
    >)
    return updateExchange(exchange, 'ok', response.body)
  } catch (error) {
    return updateExchangeWithError(exchange, error, url)
  }
}
