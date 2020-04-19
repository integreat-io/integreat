import debugLib = require('debug')
import pPipe = require('p-pipe')
// import { mergeDeepWith } from 'ramda'
import createUnknownServiceError from '../utils/createUnknownServiceError'
import { isTypedData } from '../utils/is'
import { Exchange, InternalDispatch, Data } from '../types'
import { GetService } from '../dispatch'

const debug = debugLib('great')

// const isEmptyArray = (arr: unknown): arr is [] =>
//   Array.isArray(arr) && arr.length === 0
// const isNonEmptyArray = (arr: unknown): arr is [] =>
//   Array.isArray(arr) && arr.length > 0
//
// const mergeDiff = (left: unknown, right: unknown) =>
//   right === undefined || (isEmptyArray(right) && isNonEmptyArray(left))
//     ? left
//     : right
//
// const merge = (requestData, responseData) => {
//   requestData = [].concat(requestData)
//   if (!responseData || isEmptyArray(responseData)) {
//     return requestData
//   }
//   responseData = [].concat(responseData)
//
//   return requestData.map(
//     (data, index) =>
//       data
//         ? mergeDeepWith(mergeDiff, data, responseData[index]) // eslint-disable-line security/detect-object-injection
//         : responseData[index] // eslint-disable-line security/detect-object-injection
//   )
// }
//
// const mergeRequestAndResponseData = (response, requestData) =>
//   response.status === 'ok'
//     ? { ...response, data: merge(requestData, response.data) }
//     : response

const extractType = (exchange: Exchange, data?: Data) =>
  exchange.request.type || (isTypedData(data) && data.$type) || undefined

const extractId = (data?: Data) => (isTypedData(data) && data.id) || undefined

const setIdAndTypeOnExchange = (
  exchange: Exchange,
  id?: string | string[],
  type?: string | string[]
) => ({
  ...exchange,
  request: { ...exchange.request, id, type },
})

/**
 * Set several items to a service, based on the given action object.
 */
export default async function set(
  exchange: Exchange,
  _dispatch: InternalDispatch,
  getService: GetService
): Promise<Exchange> {
  const {
    request: { service: serviceId, data },
    endpoint,
  } = exchange

  const type = extractType(exchange, data)
  const id = extractId(data)

  const service = getService(type, serviceId)
  if (!service) {
    return createUnknownServiceError(exchange, type, serviceId, 'SET')
  }

  const endpointDebug = endpoint ? `at endpoint '${endpoint}'` : ''
  debug('SET: Send to service %s %s', service.id, endpointDebug)

  return pPipe<Exchange, Exchange, Exchange, Exchange, Exchange, Exchange>(
    service.authorizeExchange,
    service.assignEndpointMapper,
    service.mapRequest,
    service.sendExchange,
    service.mapResponse
  )(setIdAndTypeOnExchange(exchange, id, type))
}
