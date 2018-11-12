const is = require('@sindresorhus/is')
const debug = require('debug')('great')
const createError = require('../utils/createError')
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

/**
 * Set several items to a service, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getService
 * @returns {Object} Response object with any data returned from the service
 */
async function set (action, { getService, schemas }) {
  debug('Action: SET')

  const { service: serviceId, data, endpoint, onlyMappedValues = true } = action.payload
  const type = action.payload.type || data.type
  const id = data.id
  const service = getService(type, serviceId)

  if (!service) {
    debug(`SET: No service for type '${type}' or with id '${serviceId}'`)
    return createError(`No service for type '${type}' or with id '${serviceId}'`)
  }

  const endpointDebug = (endpoint) ? `at endpoint '${endpoint}'` : ''
  debug('SET: Send to service %s %s', service.id, endpointDebug)

  const { response, authorizedRequestData } = await service.send(appendToAction(action, { id, type, onlyMappedValues }))

  return (response.status === 'ok') ? { ...response, data: merge(authorizedRequestData, response.data) } : response
}

module.exports = set
