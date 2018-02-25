const source = require('./source')
const datatype = require('./datatype')
const setupMapping = require('./mapping')
const setupDispatch = require('./dispatch')
const builtinActions = require('./actions')
const reduceToObject = require('./utils/reduceToObject')

const version = '0.6.0'

/**
 * Return an Integreat instance with a dispatch method.
 * Use the dispatch method for sending actions to sources, for retrieving typed
 * items and updating data.
 * @param {Object} defs - Sources, datatypes, mappings, and auths
 * @param {Object} resources - Object with adapters, authstrats, transformers, filters, formatters, and actions
 * @param {function[]} middlewares - Array of middleware functions
 * @returns {Object} Integration object with the dispatch method
 */
function integreat (
  {
    datatypes: typeDefs,
    sources: sourceDefs,
    mappings: mappingDefs = [],
    auths: authDefs = [],
    ident: identOptions = {}
  },
  {
    adapters = {},
    authstrats = {},
    transformers = {},
    filters = {},
    formatters = {},
    actions = {}
  } = {},
  middlewares = []
) {
  if (!sourceDefs || !typeDefs) {
    throw new TypeError('Call integreat with at least sources and datatypes')
  }

  // Merge custom actions with built-in actions
  actions = {...builtinActions, ...actions}

  // Setup datatypes object from type defs
  const datatypes = typeDefs
    .map(datatype)
    .reduce(reduceToObject('id'), {})

  // Setup auths object from auth defs
  const auths = authDefs
    .reduce((auths, def) => {
      const strat = authstrats[def && def.strategy]
      if (strat) {
        auths[def.id] = strat(def.options)
      }
      return auths
    }, {})

  // Setup mappings from mapping defs.
  // Will split up mappings for several types, so that there's one mapping per
  // type.
  const mappings = mappingDefs.map((mapping) =>
    [].concat(mapping.type).map((type) =>
      setupMapping({...mapping, type}, {
        transformers,
        filters,
        formatters,
        datatypes
      })))
    .reduce((outer, inner) => [...outer, ...inner], [])

  // Setup sources object from source defs.
  const sources = sourceDefs
    .map((def) => source(def, {
      mappings,
      adapters,
      auths
    }))
    .reduce(reduceToObject('id'), {})

  // Return Integreat instance
  return {
    version,
    datatypes,
    sources,
    identType: identOptions.type,

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
      middlewares,
      identOptions
    })
  }
}

module.exports = integreat
