const R = require('ramda')
const createService = require('./service')
const schema = require('./schema')
const setupMapping = require('./mapping')
const setupDispatch = require('./dispatch')
const builtinActions = require('./actions')

const version = '0.7.0-alpha.4'

/**
 * Return an Integreat instance with a dispatch method.
 * Use the dispatch method for sending actions to services, for retrieving typed
 * items and updating data.
 * @param {Object} defs - Services, schemas, mappings, and auths
 * @param {Object} resources - Object with adapters, authenticators, mutators, filters, transformers, actions, and middlewares
 * @returns {Object} Integration object with the dispatch method
 */
function integreat (
  {
    schemas: typeDefs,
    services: serviceDefs,
    mappings = [],
    auths: authDefs = [],
    ident: identOptions = {}
  },
  {
    adapters = {},
    authenticators = {},
    mutators = {},
    filters = {},
    transformers = {},
    actions = {},
    middlewares = []
  } = {}
) {
  if (!serviceDefs || !typeDefs) {
    throw new TypeError('Call integreat with at least services and schemas')
  }

  // Merge custom actions with built-in actions
  actions = { ...builtinActions, ...actions }

  // Setup schemas object from type defs
  const schemas = R.compose(
    R.indexBy(R.prop('id')),
    R.map(schema)
  )(typeDefs)

  // Setup auths object from auth defs
  const auths = authDefs
    .reduce((auths, def) => (def)
      ? {
        ...auths,
        [def.id]: {
          authenticator: authenticators[def && def.authenticator],
          options: def.options,
          authentication: null
        }
      }
      : auths,
    {})

  // Setup services object from service defs.
  const services = R.compose(
    R.indexBy(R.prop('id')),
    R.map(createService({
      mappings,
      adapters,
      auths,
      setupMapping: setupMapping({ mutators, filters, transformers, schemas })
    }))
  )(serviceDefs)

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
