const source = require('./source')
const prepareSource = require('./sourceDef/prepareSource')
const router = require('./router')
const actions = require('./actions')
const reduceToObject = require('../utils/reduceToObject')
const scheduleToAction = require('../utils/scheduleToAction')
const debug = require('debug')('great')

const version = '0.1'

const formatTypeVal = (val) => (typeof val === 'string') ? {type: val} : val
const reduceFormattedVal = (vals) => (obj, val) => Object.assign(obj, {[val]: formatTypeVal(vals[val])})
const prepareVals = (vals) => (vals) ? Object.keys(vals).reduce(reduceFormattedVal(vals), {}) : vals
const prepareType = (type) => Object.assign({}, type, {
  attributes: prepareVals(type.attributes),
  relationships: prepareVals(type.relationships)
})

/**
 * Return an integration object with a dispatch method.
 * Use the dispatch method for sending actions to sources, for retrieving typed
 * items and updating data.
 * @param {Array} sourceDefs - Array of source definitions
 * @param {Array} typeDefs - Array of type definitions
 * @param {Object} resources - Object with adapters, auths, mappers, filters, transforms, and workers
 * @returns {Object} Integration object with the dispatch method
 */
function integreat (sourceDefs, typeDefs, {
  adapters,
  auths,
  mappers,
  filters,
  transforms,
  workers
} = {}) {
  if (!sourceDefs || !typeDefs) {
    throw new TypeError('Call integreat with at least sources and types')
  }

  const types = typeDefs.map(prepareType).reduce(reduceToObject('id'), {})

  const mapSource = (def) => source(def.id, prepareSource(def, {
    types,
    adapters,
    auths,
    mappers,
    filters,
    transforms
  }))
  const sources = sourceDefs.map(mapSource).reduce(reduceToObject('id'), {})

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
        dispatch: this.dispatch,
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