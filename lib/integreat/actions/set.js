const debug = require('debug')('great')
const sourceIdFromType = require('../../utils/sourceIdFromType')

/**
 * Set to a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with sources and types
 * @returns {Promise} Promise that will be resolved when item is set
 */
async function set (payload, {sources, types} = {}) {
  debug('Action: Set')
  const {data} = payload || {}
  const sourceId = payload.source || sourceIdFromType(data.type, types)
  const source = sources[sourceId]

  debug('Send to source %s at endpoint \'send\'', source.id)
  return await source.send({endpoint: 'send', params: data, data})
}

module.exports = set
