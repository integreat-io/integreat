import R = require('ramda')
import createService from './service'
import createSchema from './schema'
import setupDispatch from './dispatch'
import builtInActions from './actions'
import createMapOptions, { TransformFunctions } from './utils/createMapOptions'
import { MappingDef, SchemaDef } from './types'
import builtInFunctions from './transformers/builtIns'

const version = '0.8.0-alpha.0'

interface Definitions {
  schemas: SchemaDef[]
  mappings: MappingDef[]
}

interface Resources {
  transformers?: TransformFunctions
}

/**
 * Return an Integreat instance with a dispatch method.
 * Use the dispatch method for sending actions to services, for retrieving typed
 * items and updating data.
 * @param defs - Services, schemas, mappings, and auths
 * @param resources - Object with adapters, authenticators, transformers, and actions
 * @param middlewares - Array of middlewares
 * @returns Integration object with the dispatch method
 */
function integreat(
  {
    schemas: typeDefs,
    services: serviceDefs,
    mappings = [],
    auths: authDefs = [],
    ident: identOptions = {}
  }: Definitions,
  {
    adapters = {},
    authenticators = {},
    transformers = {},
    actions = {}
  }: Resources = {},
  middlewares = []
) {
  if (!serviceDefs || !typeDefs) {
    throw new TypeError('Call integreat with at least services and schemas')
  }

  // Merge custom actions with built-in actions
  actions = { ...builtInActions, ...actions }

  // Setup schemas object from type defs
  const schemaArr = typeDefs.map(createSchema)
  const schemas = schemaArr.reduce(
    (schemas, schema) => ({ ...schemas, [schema.id]: schema }),
    {}
  )
  const schemaMappings = schemaArr.reduce(
    (schemas, schema) => ({ ...schemas, [schema.id]: schema.mapping }),
    {}
  )

  const pluralTypes = Object.keys(schemas).reduce(
    (plurals, type) => ({ ...plurals, [schemas[type].plural]: type }),
    {}
  )

  const mapOptions = createMapOptions(mappings, schemaMappings, {
    ...transformers,
    ...builtInFunctions
  })

  // Setup auths object from auth defs
  const auths = authDefs.reduce(
    (auths, def) =>
      def
        ? {
            ...auths,
            [def.id]: {
              authenticator: authenticators[def && def.authenticator],
              options: def.options,
              authentication: null
            }
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
        mapOptions
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
      identOptions
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
    }
  }
}

export default integreat
