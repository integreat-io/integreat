import debugLib = require('debug')
import { mergeDeepWith } from 'ramda'
import createUnknownServiceError from '../utils/createUnknownServiceError'
import appendToAction from '../utils/appendToAction'

const debug = debugLib('great')

const isEmptyArray = (arr: unknown): arr is [] =>
  Array.isArray(arr) && arr.length === 0
const isNonEmptyArray = (arr: unknown): arr is [] =>
  Array.isArray(arr) && arr.length > 0

const mergeDiff = (left: unknown, right: unknown) =>
  right === undefined || (isEmptyArray(right) && isNonEmptyArray(left))
    ? left
    : right

const merge = (requestData, responseData) => {
  requestData = [].concat(requestData)
  if (!responseData || isEmptyArray(responseData)) {
    return requestData
  }
  responseData = [].concat(responseData)

  return requestData.map(
    (data, index) =>
      data
        ? mergeDeepWith(mergeDiff, data, responseData[index]) // eslint-disable-line security/detect-object-injection
        : responseData[index] // eslint-disable-line security/detect-object-injection
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
