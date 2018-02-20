const debug = require('debug')('great')
const createError = require('../utils/createError')

const castItem = (datatypes, useDefaults, item) => {
  const datatype = datatypes[item.type]
  return datatype.cast(item, {useDefaults})
}
const cast = (datatypes, useDefaults, items) => Array.isArray(items)
  ? items.map((item) => castItem(datatypes, useDefaults, item))
  : castItem(datatypes, useDefaults, items)

/**
 * Set several items to a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Object} Response object with any data returned from the source
 */
async function set ({payload, ident}, {getSource, datatypes}) {
  debug('Action: SET')
  if (!payload) {
    debug('SET: No payload')
    return createError('No payload')
  }

  const {source: sourceId, data, params, endpoint, useDefaults = false} = payload
  const type = payload.type || data.type
  const id = data.id
  const source = getSource(type, sourceId)

  if (!source) {
    debug(`SET: No source for type '${type}' or with id '${sourceId}'`)
    return createError(`No source for type '${type}' or with id '${sourceId}'`)
  }

  const endpointDebug = (endpoint) ? `at endpoint '${endpoint}'` : ''
  debug('SET: Send to source %s %s', source.id, endpointDebug)

  const request = source.prepareRequest({
    action: 'SET',
    endpoint,
    params: {id, type, ...params},
    data: cast(datatypes, useDefaults, data),
    access: {ident}
  })
  const authorizedData = request.data
  request.data = source.mapToSource(request.data)
  const response = await source.send(request)

  return (response.status === 'ok') ? {...response, data: [].concat(authorizedData)} : response
}

module.exports = set
