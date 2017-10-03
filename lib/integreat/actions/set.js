const debug = require('debug')('great')
const createError = require('../../utils/createError')

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

  const {
    data,
    type,
    source: sourceId,
    endpoint = 'set',
    params = {},
    useDefaults = false
  } = payload
  const source = (typeof getSource === 'function') ? getSource(type, sourceId) : null

  if (!source) {
    debug(`SET: No source '${sourceId}'`)
    return createError(`No source '${sourceId}'`)
  }

  debug('SET: Send to source %s at endpoint \'%s\'', source.id, endpoint)
  return source.send({
    endpoint,
    params,
    data,
    useDefaults
  })
}

module.exports = set
