const debug = require('debug')('great')
const createError = require('../utils/createError')

const cast = (datatypes, item, useDefaults) => {
  const datatype = datatypes[item.type]
  return datatype.cast(item, {useDefaults})
}

const send = (payload, source, datatypes) => {
  const {type, id, useDefaults = false, params, endpoint} = payload
  const data = Array.isArray(payload.data)
    ? payload.data.map((item) => cast(datatypes, item, useDefaults))
    : cast(datatypes, payload.data, useDefaults)

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('SET: Send to source %s at %s', source.id, endpointDebug)

  const mapped = source.mapToSource(data)
  const request = source.prepareRequest({
    action: 'SET',
    type: type || data.type,
    endpoint,
    params: {...params, id: id || data.id},
    data: mapped
  })
  return source.send(request)
}

/**
 * Set several items to a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Object} Response object with any data returned from the source
 */
async function set (payload, {getSource, datatypes}) {
  debug('Action: SET')
  if (!payload) {
    debug('SET: No payload')
    return createError('No payload')
  }

  const {source: sourceId, data} = payload
  const type = payload.type || data.type
  const source = getSource(type, sourceId)

  if (!source) {
    debug(`SET: No source '${sourceId}'`)
    return createError(`No source '${sourceId}'`)
  }

  return send(payload, source, datatypes)
}

module.exports = set
