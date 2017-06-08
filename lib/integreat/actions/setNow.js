const debug = require('debug')('great')

/**
 * Set to a source, based on the given action object.
 * Will always set directly to the source, unlike the set action, which may
 * put the set action in a queue.
 * @param {Object} action - Action object with type and payload
 * @param {Object} sources - Sources object
 * @returns {Promise} Promise that will be resolved when item is set
 */
async function setNow (action, sources) {
  debug('Action: Set now')
  const source = sources[action.source]
  const {payload} = action

  debug('Send to source %s at endpoint \'send\'', source.id)
  return await source.send({endpoint: 'send', params: payload, data: payload})
}

module.exports = setNow
