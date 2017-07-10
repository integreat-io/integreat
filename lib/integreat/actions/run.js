const debug = require('debug')('great')

/**
 * Run a worker, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with sources and types
 * @returns {Promise} Promise of the data from the source
 */
async function run (payload, {workers, dispatch} = {}) {
  debug('Action: RUN')
  if (payload.worker && workers) {
    const worker = workers[payload.worker]
    if (worker) {
      debug('Run worker %s', payload.worker)
      return worker(payload.params, dispatch)
    }
  }
  return {status: 'notfound'}
}

module.exports = run
