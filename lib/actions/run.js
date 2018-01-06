const debug = require('debug')('great')

/**
 * Run a worker, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with workers, dispathc, and queue
 * @returns {Promise} Promise of the data from the source
 */
async function run (payload, {workers, dispatch, queue} = {}) {
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
      try {
        return await worker(payload.params, {dispatch, queue})
      } catch (error) {
        debug(`RUN: Error in worker '${payload.worker}'. ${error.toString()}`)
        return {status: 'error', error: `Error in worker '${payload.worker}'. ${error.toString()}`}
      }
    }
  }
  return {status: 'notfound'}
}

module.exports = run
