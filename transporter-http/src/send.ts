import got, { HTTPError, Response } from 'got'
import queryString = require('query-string')
import { Exchange, Data, Connection } from 'integreat'
import { EndpointOptions } from './types'

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
  data: Data,
  error?: string
): Exchange => ({
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
  url: string
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
        response.error = exchange.auth
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

const removeLeadingSlashIf = (uri: string | undefined, doRemove: boolean) =>
  doRemove && typeof uri === 'string' && uri.startsWith('/')
    ? uri.substr(1)
    : uri

const generateUrl = ({ uri, baseUri }: EndpointOptions = {}) =>
  removeLeadingSlashIf(uri, !!baseUri)

function extractQueryParamsFromUri(uri?: string) {
  if (typeof uri === 'string') {
    const position = uri.indexOf('?')
    if (position > -1) {
      return queryString.parse(uri.substr(position))
    }
  }
  return {}
}

const isValidQueryValue = (value: unknown) =>
  ['string', 'number', 'boolean'].includes(typeof value) || value === null

const prepareQueryValue = (value: unknown) =>
  value instanceof Date
    ? value.toISOString()
    : isValidQueryValue(value)
    ? value
    : JSON.stringify(value)

const prepareQueryParams = (params: Record<string, unknown>) =>
  Object.entries(params).reduce(
    (params, [key, value]) =>
      value === undefined
        ? params // Don't include undefined
        : { ...params, [key]: prepareQueryValue(value) },
    {}
  )

const generateQueryParams = (
  { queryParams, authAsQuery, uri }: EndpointOptions = {},
  auth?: Record<string, unknown> | boolean | null
) =>
  prepareQueryParams({
    ...extractQueryParamsFromUri(uri),
    ...queryParams,
    ...(authAsQuery && auth && auth !== true ? auth : {}),
  })

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
  endpoint?: EndpointOptions,
  data?: unknown,
  headers?: Record<string, unknown>,
  auth?: Record<string, unknown> | boolean | null
) => ({
  ...(typeof data === 'string'
    ? { 'Content-Type': 'text/plain' }
    : { 'Content-Type': 'application/json' }), // Will be removed later on if GET
  ...endpoint?.headers,
  ...headers,
  ...(auth === true || endpoint?.authAsQuery ? {} : auth),
})

const selectMethod = (endpoint?: EndpointOptions, data?: unknown) =>
  endpoint?.method || (data ? ('PUT' as const) : ('GET' as const))

const prepareBody = (data: unknown) =>
  typeof data === 'string' || data === undefined ? data : JSON.stringify(data)

function optionsFromEndpoint(exchange: Exchange, endpoint?: EndpointOptions) {
  const method = selectMethod(endpoint, exchange.request.data)
  return {
    prefixUrl: endpoint?.baseUri,
    url: generateUrl(endpoint),
    searchParams: generateQueryParams(endpoint, exchange.auth),
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
): Promise<Exchange> {
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
