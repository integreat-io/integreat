import EventEmitter from 'node:events'
import mapTransform from 'map-transform'
import type {
  Dictionaries,
  Transformer,
  TransformDefinition,
} from 'map-transform/types.js'
import type {
  Middleware,
  Transporter,
  Dispatch,
  JobDef,
  Action,
  Response,
  ActionHandler,
  Adapter,
  Authenticator,
} from './types.js'
import type { ServiceDef, IdentConfig, AuthDef } from './service/types.js'
import type { SchemaDef } from './schema/types.js'
import Auth from './service/Auth.js'
import builtinHandlers from './handlers/index.js'
import runFn from './handlers/run.js'
import builtinTransformers from './transformers/builtIns/index.js'
import createSchema, { Schema } from './schema/index.js'
import Service from './service/Service.js'
import { isObject } from './utils/is.js'
import createMapOptions from './utils/createMapOptions.js'
import { lookupById } from './utils/indexUtils.js'
import createDispatch from './dispatch.js'
import listen from './listen.js'
import close from './close.js'
import { indexById } from './utils/indexUtils.js'
import createSchedule from './utils/createSchedule.js'
import createDispatchScheduled from './dispatchScheduled.js'

export interface Definitions {
  id?: string
  schemas: SchemaDef[]
  services: ServiceDef[]
  mutations?: Record<string, TransformDefinition>
  auths?: AuthDef[]
  identConfig?: IdentConfig
  queueService?: string
  dictionaries?: Dictionaries
  jobs?: JobDef[]
}

export interface Resources {
  transporters?: Record<string, Transporter>
  adapters?: Record<string, Adapter>
  handlers?: Record<string, ActionHandler>
  authenticators?: Record<string, Authenticator>
  transformers?: Record<string, Transformer>
}

export interface Instance<ResponseData = unknown> {
  id?: string
  services: Record<string, Service>
  schemas: Record<string, Schema>
  identType?: string
  queueService?: string
  dispatch: Dispatch<ResponseData>
  dispatchScheduled: (from: Date, to: Date) => Promise<Action[]>
  listen: () => Promise<Response>
  close: () => Promise<Response>
  on: (
    eventName: string,
    listener: (...args: unknown[]) => void
  ) => EventEmitter
}

export const setUpAuth = (authenticators?: Record<string, Authenticator>) =>
  function setUpAuth(def: AuthDef) {
    const authenticator = lookupById(def.authenticator, authenticators)
    if (!authenticator) {
      throw new Error(
        `Auth config '${def.id}' references an unknown authenticator id '${def.authenticator}'`
      )
    }

    return new Auth(def.id, authenticator, def.options)
  }

const setAdapterIds = (adapters?: Record<string, Adapter>) =>
  adapters
    ? Object.fromEntries(
        Object.entries(adapters).map(([id, adapter]) => [
          id,
          { ...adapter, id },
        ])
      )
    : {}

/*
 * Create an Integreat instance.
 */
export default function create(
  {
    id,
    services: serviceDefs,
    schemas: schemaDefs,
    mutations,
    auths: authDefs,
    identConfig,
    queueService,
    dictionaries,
    jobs: jobsDefs = [],
  }: Definitions,
  { transporters, adapters, transformers, handlers, authenticators }: Resources,
  middlewareForDispatch: Middleware[] = [],
  middlewareForService: Middleware[] = []
): Instance {
  if (!Array.isArray(serviceDefs) || !Array.isArray(schemaDefs)) {
    throw new TypeError(
      'Please provide Integreat with at least services and schemas'
    )
  }

  // Set up event emitter
  const emitter = new EventEmitter()

  // Prepare schemas
  const schemas = schemaDefs
    .map(createSchema)
    .reduce(indexById, {} as Record<string, Schema>)

  // Prepare map options
  const mapOptions = createMapOptions(
    schemas,
    mutations,
    { ...builtinTransformers, ...transformers },
    dictionaries
  )

  // Prepare cast functions
  const castFns = Object.fromEntries(
    Object.entries(schemas).map(([type, schema]) => [
      type,
      mapTransform(schema.mapping, mapOptions),
    ])
  )

  // Setup auths object from auth defs
  const auths = Array.isArray(authDefs)
    ? authDefs
        .map(setUpAuth(authenticators))
        .reduce(indexById, {} as Record<string, Auth>)
    : undefined

  // Prepare services
  const services = serviceDefs
    .map(
      (def) =>
        new Service(def, {
          transporters,
          adapters: setAdapterIds(adapters),
          authenticators,
          auths,
          schemas,
          castFns,
          mapOptions,
          middleware: middlewareForService,
          emit: emitter.emit.bind(emitter),
        })
    )
    .reduce(indexById, {} as Record<string, Service>)

  // Prepare jobs
  const jobs = jobsDefs.reduce(
    (jobs, job) =>
      typeof job.id === 'string' ? { ...jobs, [job.id]: job } : jobs,
    {} as Record<string, JobDef>
  )

  // Create dispatch
  const dispatch = createDispatch({
    schemas,
    services,
    handlers: { ...builtinHandlers, ...handlers, RUN: runFn(jobs, mapOptions) }, // Set `RUN` handler here to include jobs
    middleware: middlewareForDispatch,
    options: { identConfig, queueService },
  })

  // Prepare scheduled actions
  const scheduled = jobsDefs.filter(isObject).map(createSchedule)
  const dispatchScheduled = createDispatchScheduled(dispatch, scheduled)

  // Return instance
  return {
    id,
    services,
    schemas,
    identType: identConfig?.type,
    queueService,
    dispatch,
    dispatchScheduled,
    listen: async () => listen(Object.values(services), dispatch),
    close: async () => close(Object.values(services)),
    on: (eventName, listener) => emitter.on(eventName, listener),
  }
}
