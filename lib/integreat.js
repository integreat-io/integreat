const service = require('./service')
const schema = require('./schema')
const setupMapping = require('./mapping')
const setupDispatch = require('./dispatch')
const builtinActions = require('./actions')
const reduceToObject = require('./utils/reduceToObject')

const version = '0.7.0-alpha'

/**
 * Return an Integreat instance with a dispatch method.
 * Use the dispatch method for sending actions to services, for retrieving typed
 * items and updating data.
 * @param {Object} defs - Services, schemas, mappings, and auths
 * @param {Object} resources - Object with adapters, authstrats, transformers, filters, formatters, actions, and middlewares
 * @returns {Object} Integration object with the dispatch method
 */
function integreat (
  {
    schemas: typeDefs,
    services: serviceDefs,
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
    actions = {},
    middlewares = []
  } = {}
) {
  if (!serviceDefs || !typeDefs) {
    throw new TypeError('Call integreat with at least services and schemas')
  }

  // Merge custom actions with built-in actions
  actions = {...builtinActions, ...actions}

  // Setup schemas object from type defs
  const schemas = typeDefs
    .map(schema)
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
        schemas
      })))
    .reduce((outer, inner) => [...outer, ...inner], [])

  // Setup services object from service defs.
  const services = serviceDefs
    .map((def) => service(def, {
      mappings,
      adapters,
      auths
    }))
    .reduce(reduceToObject('id'), {})

  // Return Integreat instance
  return {
    version,
    schemas,
    services,
    identType: identOptions.type,

    /**
     * Function for dispatching actions to Integreat. Will be run through the
     * chain of middlewares before the relevant action handler is called.
     * @param {Object} action - The action to dispatch
     * @returns {Promise} Promise of result object
     */
    dispatch: setupDispatch({
      actions,
      services,
      schemas,
      middlewares,
      identOptions
    })
  }
}

module.exports = integreat
