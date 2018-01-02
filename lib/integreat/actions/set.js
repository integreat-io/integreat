const debug = require('debug')('great')
const createError = require('../../utils/createError')

const send = (payload, source) => {
  const {type, id, data, useDefaults = false, params, endpoint} = payload

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('SET: Send to source %s at %s', source.id, endpointDebug)
  return source.send({
    action: 'SET',
    type: type || data.type,
    id: id || data.id,
    endpoint,
    params,
    data
  }, {
    useDefaults
  })
}

/**
 * Set several items to a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Object} Response object with any data returned from the source
 */
async function set (payload, {getSource} = {}) {
  debug('Action: SET')
  if (!payload) {
    debug('SET: No payload')
    return createError('No payload')
  }

  const {type, source: sourceId} = payload
  const source = (typeof getSource === 'function') ? getSource(type, sourceId) : null

  if (!source) {
    debug(`SET: No source '${sourceId}'`)
    return createError(`No source '${sourceId}'`)
  }

  return send(payload, source)
}

module.exports = set
