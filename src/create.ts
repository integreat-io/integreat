import { Dictionaries, CustomFunction } from 'map-transform'
import {
  Dictionary,
  MappingDef,
  SchemaDef,
  ServiceDef,
  IdentConfig,
  Middleware
} from './types'
import { AuthDef, Auth, Authenticator } from './auth/types'
import builtinActionHandlers from './actions'
import builtinTransformers from './transformers/builtIns'
import createSchema, { Schema } from './schema'
import createService from './service'
import createMapOptions from './utils/createMapOptions'
import createAuth from './auth'
import createDispatch, { ActionHandler } from './dispatch'
import { indexById, ObjectWithId } from './utils/indexUtils'

interface Definitions {
  schemas: SchemaDef[]
  services: ServiceDef[]
  mappings?: MappingDef[]
  auths?: AuthDef[]
  identConfig?: IdentConfig
  dictionaries?: Dictionaries
}

interface Resources {
  adapters: Dictionary<ObjectWithId> // TODO: Needs better typing
  actionHandlers?: Dictionary<ActionHandler>
  authenticators?: Dictionary<Authenticator>
  transformers?: Dictionary<CustomFunction>
}

/*
 * Create an Integreat instance.
 */
export default function create(
  {
    services: serviceDefs,
    schemas: schemaDefs,
    mappings,
    auths: authDefs,
    identConfig,
    dictionaries
  }: Definitions,
  { adapters, transformers, actionHandlers, authenticators }: Resources,
  middlewares: Middleware[] = []
) {
  if (!Array.isArray(serviceDefs) || !Array.isArray(schemaDefs)) {
    throw new TypeError(
      'Please provide Integreat with at least services and schemas'
    )
  }

  // Prepare schemas
  const schemas = schemaDefs
    .map(createSchema)
    .reduce(indexById, {} as Dictionary<Schema>)

  // Prepare map options
  const mapOptions = createMapOptions(
    schemas,
    mappings,
    { ...builtinTransformers, ...transformers },
    dictionaries
  )

  // Setup auths object from auth defs
  const auths = Array.isArray(authDefs)
    ? authDefs
        .map(auth => createAuth(auth, authenticators))
        .reduce(indexById, {} as Dictionary<Auth>)
    : undefined

  // Prepare services
  const services = serviceDefs
    .map(
      createService({
        adapters,
        auths,
        transformers, // Provided for validation pipeline only
        schemas,
        mapOptions
      })
    )
    .reduce(indexById, {} as Dictionary<ObjectWithId>) // TODO: Properly type Service

  // Create dispatch
  const dispatch = createDispatch({
    identConfig,
    schemas,
    services,
    actionHandlers: { ...builtinActionHandlers, ...actionHandlers },
    middlewares
  })

  // Return instance
  return {
    services,
    schemas,
    identType: identConfig && identConfig.type,
    dispatch

    // on(eventName, serviceId, listener) {
    //   // eslint-disable-next-line security/detect-object-injection
    //   const service = services[serviceId]
    //   if (service && service.on) {
    //     service.on(eventName, listener)
    //   }
    // }
  }
}
