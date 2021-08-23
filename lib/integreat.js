const R = require('ramda')
const createService = require('./service')
const schema = require('./schema')
const setupMapping = require('./mapping')
const setupDispatch = require('./dispatch')
const builtinActions = require('./actions')

const version = '0.7.35'

/**
 * Return an Integreat instance with a dispatch method.
 * Use the dispatch method for sending actions to services, for retrieving typed
 * items and updating data.
 * @param {Object} defs - Services, schemas, mappings, and auths
 * @param {Object} resources - Object with adapters, authenticators, filters, transformers, and actions
 * @param {Array} middlewares - Array of middlewares
 * @returns {Object} Integration object with the dispatch method
 */
function integreat(
  {
    schemas: typeDefs,
    services: serviceDefs,
    mappings = [],
    auths: authDefs = [],
    ident: identOptions = {},
  },
  {
    adapters = {},
    authenticators = {},
    filters = {},
    transformers = {},
    actions = {},
  } = {},
  middlewares = []
) {
  if (!serviceDefs || !typeDefs) {
    throw new TypeError('Call integreat with at least services and schemas')
  }

  // Merge custom actions with built-in actions
  actions = { ...builtinActions, ...actions }

  // Setup schemas object from type defs
  const schemas = R.compose(R.indexBy(R.prop('id')), R.map(schema))(typeDefs)

  const pluralTypes = Object.keys(schemas).reduce(
    (plurals, type) => ({ ...plurals, [schemas[type].plural]: type }),
    {}
  )

  // Setup auths object from auth defs
  const auths = authDefs.reduce(
    (auths, def) =>
      def
        ? {
            ...auths,
            [def.id]: {
              authenticator: authenticators[def && def.authenticator],
              options: def.options,
              authentication: null,
            },
          }
        : auths,
    {}
  )

  // Setup services object from service defs.
  const services = R.compose(
    R.indexBy(R.prop('id')),
    R.map(
      createService({
        adapters,
        auths,
        transformers,
        schemas,
        setupMapping: setupMapping({
          filters,
          transformers,
          schemas,
          mappings,
        }),
      })
    )
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
      identOptions,
    }),

    /**
     * Adds the `listener` function to the service's emitter for events with the
     * given `eventName` name.
     */
    on(eventName, serviceId, listener) {
      const service = services[serviceId]
      if (service && service.on) {
        service.on(eventName, listener)
      }
    },

    /**
     * Return schema type from its plural form.
     */
    typeFromPlural(plural) {
      return pluralTypes[plural]
    },
  }
}

module.exports = integreat
