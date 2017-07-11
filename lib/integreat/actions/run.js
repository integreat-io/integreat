const debug = require('debug')('great')

/**
 * Run a worker, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with sources and types
 * @returns {Promise} Promise of the data from the source
 */
async function run (payload, {workers, dispatch} = {}) {
  debug('Action: RUN')
  if (!payload) {
    debug('RUN: No payload')
    return {status: 'error', error: 'No payload'}
  }
  if (!workers) {
    debug('RUN: No workers')
    return {status: 'error', error: 'No workers'}
  }

  if (payload.worker && workers) {
    const worker = workers[payload.worker]
    if (worker) {
      debug('RUN: Worker %s', payload.worker)
      return worker(payload.params, dispatch)
    }
  }
  return {status: 'notfound'}
}

module.exports = run
