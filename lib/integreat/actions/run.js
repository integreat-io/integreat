const debug = require('debug')('great')

/**
 * Run a worker, based on the given action object.
 * @param {Object} action - Action object with type and payload
 * @param {function} dispatch - Dispatch function
 * @param {Object} resources - Object with sources and types
 * @returns {Promise} Promise of the data from the source
 */
async function run (action, {workers, dispatch} = {}) {
  debug('Action: RUN')
  if (action.worker) {
    const worker = workers[action.worker]
    if (worker) {
      debug('Run worker %s', action.worker)
      return worker(action.payload, dispatch)
    }
  }
  return {status: 'notfound'}
}

module.exports = run
