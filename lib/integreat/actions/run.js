const debug = require('debug')('great')

/**
 * Run a worker, based on the given action object.
 * @param {Object} action - Action object with type and payload
 * @param {Object} resources - Object with sources and types
 * @returns {Promise} Promise of the data from the source
 */
async function runJob (action, {workers} = {}) {
  debug('Action: RUN')
  if (action.worker) {
    const worker = workers[action.worker]
    if (worker) {
      debug('Run worker %s', action.worker)
      return worker(action.payload)
    }
  }
  return {status: 'notfound'}
}

module.exports = runJob
