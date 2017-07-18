const source = require('./source')
const datatype = require('./datatype')
const router = require('./router')
const actions = require('./actions')
const reduceToObject = require('../utils/reduceToObject')
const scheduleToAction = require('../utils/scheduleToAction')
const debug = require('debug')('great')

const version = '0.1'

/**
 * Return an integration object with a dispatch method.
 * Use the dispatch method for sending actions to sources, for retrieving typed
 * items and updating data.
 * @param {Array} sourceDefs - Array of source definitions
 * @param {Array} typeDefs - Array of type definitions
 * @param {Object} resources - Object with adapters, auths, transformers, filters, formatters, and workers
 * @returns {Object} Integration object with the dispatch method
 */
function integreat ({
  sources: sourceDefs,
  types: typeDefs,
  adapters,
  auths,
  transformers,
  filters,
  formatters,
  workers
}) {
  if (!sourceDefs || !typeDefs) {
    throw new TypeError('Call integreat with at least sources and types')
  }

  const types = typeDefs
    .map(datatype)
    .reduce(reduceToObject('id'), {})

  const sources = sourceDefs
    .map((def) => source(def, {
      types,
      adapters,
      auths,
      transformers,
      filters,
      formatters
    }))
    .reduce(reduceToObject('id'), {})

  return {
    version,
    queue: null,

    /**
     * Function for dispatching actions to Integreat. All actions are directed
     * to a router, which sends the action to the right action handler or
     * pushes it to the queue, depending on the properties of the action.
     * @param {Object} action - The action to dispatch
     * @returns {Promise} Promise of returned data
     */
    async dispatch (action) {
      debug('Dispatch: %o', action)
      return router(action, {
        actions,
        sources,
        types,
        workers,
        dispatch: this.dispatch.bind(this),
        queue: this.queue
      })
    },

    /**
     * Schedule actions from the given scheduleDef.
     * Actions are dispatched to Integreat with a timestamp, and are ran at the
     * set time with the worker given in the schedule definition.
     * @param {array} scheduleDef - An array of schedule definitions
     * @returns {array} Array of returned objects from dispatch
     */
    async schedule (scheduleDef) {
      debug('Schedule: %d schedules', scheduleDef.length)
      const rets = scheduleDef.map(scheduleToAction).map((action) => this.dispatch(action))
      return Promise.all(rets)
    }
  }
}

module.exports = integreat
