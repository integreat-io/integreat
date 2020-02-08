const is = require('@sindresorhus/is')
const debug = require('debug')('great')
const createUnknownServiceError = require('../utils/createUnknownServiceError')
const appendToAction = require('../utils/appendToAction')
const { mergeDeepWith } = require('ramda')

const mergeDiff = (left, right) =>
  (is.undefined(right) || (is.emptyArray(right) && is.nonEmptyArray(left)))
    ? left : right

const merge = (requestData, responseData) => {
  requestData = [].concat(requestData)
  if (!responseData || is.emptyArray(responseData)) {
    return requestData
  }
  responseData = [].concat(responseData)

  return requestData.map(
    (data, index) => (data) ? mergeDeepWith(mergeDiff, data, responseData[index]) : responseData[index]
  )
}

const mergeRequestAndResponseData = (response, requestData) => (response.status === 'ok')
  ? { ...response, data: merge(requestData, response.data) }
  : response

const extractType = (action, data) => action.payload.type || (data && data.type) || undefined

const extractId = (data) => (data && data.id) || undefined

/**
 * Set several items to a service, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getService
 * @returns {Object} Response object with any data returned from the service
 */
async function set (action, { getService, schemas }) {
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

  const endpointDebug = (endpoint) ? `at endpoint '${endpoint}'` : ''
  debug('SET: Send to service %s %s', service.id, endpointDebug)

  const {
    response,
    authorizedRequestData,
    mapResponseWithType
  } = await service.send(appendToAction(action, { id, type, onlyMappedValues }))

  return mapResponseWithType
    ? mergeRequestAndResponseData(response, authorizedRequestData)
    : response
}

module.exports = set
