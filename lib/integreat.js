const source = require('./source')
const datatype = require('./datatype')
const setupMapping = require('./mapping')
const setupDispatch = require('./dispatch')
const actions = require('./actions')
const reduceToObject = require('./utils/reduceToObject')
const createError = require('./utils/createError')
const schedule = require('./schedule')
const debug = require('debug')('great')

const version = '0.6.0'

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
 * @param {Object} defs - Sources, datatypes, mappings, and auths
 * @param {Object} resources - Object with adapters, transformers, filters, formatters, workers, and queue
 * @returns {Object} Integration object with the dispatch method
 */
function integreat ({
  datatypes: typeDefs,
  sources: sourceDefs,
  mappings: mappingDefs = [],
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
} = {},
middlewares = []) {
  if (!sourceDefs || !typeDefs) {
    throw new TypeError('Call integreat with at least sources and datatypes')
  }

  const datatypes = typeDefs
    .map(datatype)
    .reduce(reduceToObject('id'), {})

  const auths = authDefs
    .reduce(setAuth(authstrats), {})

  // Setup mappings. Will split up mappings for several types, so that there's
  // one mapping per type
  const mappings = mappingDefs.map((mapping) =>
    [].concat(mapping.type).map((type) =>
      setupMapping({...mapping, type}, {
        transformers,
        filters,
        formatters,
        datatypes
      })))
    .reduce((outer, inner) => [...outer, ...inner], [])

  const createSource = (def) => source(def, {
    datatypes,
    mappings,
    adapters,
    auths,
    hooks
  })
  const sources = sourceDefs.map(createSource).reduce(reduceToObject('id'), {})

  let pushToQueue = null

  const great = {
    version,
    datatypes,

    /**
     * Function for dispatching actions to Integreat. Will be run through the
     * chain of middlewares before the relevant action handler is called.
     * @param {Object} action - The action to dispatch
     * @returns {Promise} Promise of result object
     */
    dispatch: setupDispatch({
      actions,
      sources,
      datatypes,
      workers,
      middlewares
    }),

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

      action = {...action, queuedAt: new Date(), dispatchedAt: null}
      try {
        const id = await pushToQueue(action, timestamp, action.id)

        const result = {status: 'queued', data: {id}}
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
    }
  }

  if (typeof bindToQueue === 'function') {
    pushToQueue = bindToQueue(great.dispatch)
  }

  return great
}

module.exports = integreat
