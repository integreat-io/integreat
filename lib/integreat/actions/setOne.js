const debug = require('debug')('great')
const createError = require('../../utils/createError')

/**
 * Set to a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Promise} Promise that will be resolved when item is set
 */
async function setOne (payload, {getSource} = {}) {
  debug('Action: SET_ONE')
  if (!payload) {
    debug('SET_ONE: No payload')
    return createError('No payload')
  }

  const {
    data,
    source: sourceId,
    endpoint = 'setOne',
    params = {},
    useDefaults = false
  } = payload
  const source = (typeof getSource === 'function') ? getSource(data.type, sourceId) : null

  if (!source) {
    debug('SET_ONE: No source')
    return createError('No source')
  }

  debug('SET_ONE: Send to source %s at endpoint \'%s\'', source.id, endpoint)
  return source.send({
    endpoint,
    params: Object.assign({}, data, params),
    data,
    useDefaults
  })
}

module.exports = setOne
