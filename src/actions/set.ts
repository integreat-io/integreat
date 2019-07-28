import is = require('@sindresorhus/is')
import { mergeDeepWith } from 'ramda'
import createUnknownServiceError from '../utils/createUnknownServiceError'
import appendToAction from '../utils/appendToAction'
const debug = require('debug')('great')

const mergeDiff = (left, right) =>
  right === undefined || (is.emptyArray(right) && is.nonEmptyArray(left))
    ? left
    : right

const merge = (requestData, responseData) => {
  requestData = [].concat(requestData)
  if (!responseData || is.emptyArray(responseData)) {
    return requestData
  }
  responseData = [].concat(responseData)

  return requestData.map((data, index) =>
    data
      ? mergeDeepWith(mergeDiff, data, responseData[index])
      : responseData[index]
  )
}

const mergeRequestAndResponseData = (response, requestData) =>
  response.status === 'ok'
    ? { ...response, data: merge(requestData, response.data) }
    : response

const extractType = (action, data) =>
  action.payload.type || (data && data.$schema) || undefined

const extractId = data => (data && data.id) || undefined

/**
 * Set several items to a service, based on the given action object.
 * @param payload - Payload from action object
 * @param resources - Object with getService
 * @returns Response object with any data returned from the service
 */
export default async function set(action, { getService }) {
  debug('Action: SET')

  const {
    service: serviceId,
    data,
    endpoint,
    onlyMappedValues = true
  } = action.payload
  const type = extractType(action, data)
  const id = extractId(data)

  const service = getService(type, serviceId)
  if (!service) {
    return createUnknownServiceError(type, serviceId, 'SET')
  }

  const endpointDebug = endpoint ? `at endpoint '${endpoint}'` : ''
  debug('SET: Send to service %s %s', service.id, endpointDebug)

  const { response, authorizedRequestData } = await service.send(
    appendToAction(action, { id, type, onlyMappedValues })
  )

  return mergeRequestAndResponseData(response, authorizedRequestData)
}
