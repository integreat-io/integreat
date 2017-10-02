const EventEmitter = require('events')
const source = require('./source')
const datatype = require('./datatype')
const router = require('./router')
const actions = require('./actions')
const reduceToObject = require('../utils/reduceToObject')
const createError = require('../utils/createError')
const schedule = require('./schedule')
const debug = require('debug')('great')

const version = '0.4.0'

const setAuth = (strats) => (auths, def) => {
  if (def) {
    const strat = strats[def.strategy]
    if (strat) {
      auths[def.id] = strat(def.options)
    }
  }
  return auths
}

/**
 * Return an integration object with a dispatch method.
 * Use the dispatch method for sending actions to sources, for retrieving typed
 * items and updating data.
 * @param {Object} defs - Sources, datatypes, and auths
 * @param {Object} resources - Object with adapters, transformers, filters, formatters, workers, and queue
 * @returns {Object} Integration object with the dispatch method
 */
function integreat ({
  datatypes: typeDefs,
  sources: sourceDefs,
  auths: authDefs = []
},
{
  adapters = {},
  authstrats = {},
  transformers = {},
  filters = {},
  formatters = {},
  workers = {},
  hooks = {},
  bindToQueue
} = {}) {
  if (!sourceDefs || !typeDefs) {
    throw new TypeError('Call integreat with at least sources and datatypes')
  }

  const datatypes = typeDefs
    .map(datatype)
    .reduce(reduceToObject('id'), {})

  const auths = authDefs
    .reduce(setAuth(authstrats), {})

  const createSource = (def) => source(def, {
    datatypes,
    adapters,
    auths,
    transformers,
    filters,
    formatters,
    hooks
  })

  const sources = sourceDefs.map(createSource)
    .reduce(reduceToObject('id'), {})

  let pushToQueue = null
  const emitter = new EventEmitter()

  const great = {
    version,

    /**
     * Function for dispatching actions to Integreat. All actions are directed
     * to a router, which sends the action to the right action handler or
     * pushes it to the queue, depending on the properties of the action.
     * @param {Object} action - The action to dispatch
     * @returns {Promise} Promise of result object
     */
    async dispatch (action) {
      debug('Dispatch: %o', action)
      emitter.emit('dispatch', action)

      action = Object.assign({}, action, {dispatchedAt: new Date()})
      const result = await router(action, {
        actions,
        sources,
        datatypes,
        workers,
        dispatch: great.dispatch,
        queue: great.queue
      })

      emitter.emit('dispatched', action, result)
      return result
    },

    /**
     * Function for pushing an action to the queue. When the action is pulled
     * from the queue, it is passed to dispatched. If a timestamp is provided,
     * the action will not be pulled untill this time has passed.
     * @param {Object} action - The action to queue
     * @param {number|Date} timestamp - Optional timestamp for scheduling
     * @returns {Promise} Promise of result object
     */
    async queue (action, timestamp = null) {
      if (typeof pushToQueue !== 'function') {
        debug('Dispatch (no queue): %o', action)
        return great.dispatch(action)
      }

      if (timestamp) {
        debug('Schedule at %s: %o', timestamp, action)
      } else {
        debug('Queue: %o', action)
      }
      emitter.emit('queue', action, timestamp)

      action = Object.assign({}, action, {queuedAt: new Date(), dispatchedAt: null})
      try {
        const id = await pushToQueue(action, timestamp, action.id)

        const result = {status: 'queued', data: {id}}
        emitter.emit('queued', action, timestamp, result)
        return result
      } catch (err) {
        return createError(`Could not queue action ${action}. ${err}`)
      }
    },

    /**
     * Schedule actions from the given defs.
     * Actions are dispatched to Integreat with a timestamp, and are ran at the
     * set time with the worker given in the schedule definition.
     * @param {array} defs - An array of schedule definitions
     * @returns {array} Array of returned objects from dispatch
     */
    async schedule (defs) {
      defs = [].concat(defs)
      debug('Schedule: %d schedules', defs.length)
      return schedule(defs, great.queue)
    },

    /**
     * Create a source from the given definition and sets in the `sources`
     * object.
     * @param {Object} def - Source definition
     * @returns {Object} The created source
     */
    setSource (def) {
      if (!def) {
        return null
      }
      const source = createSource(def)
      sources[source.id] = source
      return source
    },

    /**
     * Remove the source with the given id from the `source` object.
     * @param {string} id - The id of the source to remove
     * @returns {void}
     */
    removeSource (id) {
      delete sources[id]
    },

    /**
     * Adds the `listener` function to the end of the listeners array for the
     * event named `eventName`.
     * @param {string} eventName - Name of the event to listen to
     * @param {function} listener - Listener to call on the event
     * @returns {Object} This Integreat instance, to allow chaining
     */
    on (eventName, listener) {
      emitter.on(eventName, listener)
      return great
    }
  }

  if (typeof bindToQueue === 'function') {
    pushToQueue = bindToQueue(great.dispatch)
  }

  return great
}

module.exports = integreat
