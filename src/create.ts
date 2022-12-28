import EventEmitter = require('node:events')
import { Dictionaries, CustomFunction, MapDefinition } from 'map-transform'
import {
  Middleware,
  Transporter,
  Dispatch,
  JobDef,
  Action,
  Response,
  ActionHandler,
} from './types'
import {
  ServiceDef,
  IdentConfig,
  AuthDef,
  Authenticator,
  Service,
} from './service/types'
import { SchemaDef } from './schema/types'
import Auth from './service/Auth'
import builtinHandlers from './handlers'
import runFn from './handlers/run'
import builtinTransformers from './transformers/builtIns'
import createSchema, { Schema } from './schema'
import createService from './service'
import { isObject } from './utils/is'
import createMapOptions from './utils/createMapOptions'
import { lookupById } from './utils/indexUtils'
import createDispatch from './dispatch'
import listen from './listen'
import close from './close'
import { indexById } from './utils/indexUtils'
import createSchedule from './utils/createSchedule'
import createDispatchScheduled from './dispatchScheduled'

export interface Definitions {
  schemas: SchemaDef[]
  services: ServiceDef[]
  mutations?: Record<string, MapDefinition>
  auths?: AuthDef[]
  identConfig?: IdentConfig
  queueService?: string
  dictionaries?: Dictionaries
  jobs?: JobDef[]
}

export interface Resources {
  transporters?: Record<string, Transporter>
  handlers?: Record<string, ActionHandler>
  authenticators?: Record<string, Authenticator>
  transformers?: Record<string, CustomFunction>
}

export interface Instance<ResponseData = unknown> {
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

/*
 * Create an Integreat instance.
 */
export default function create(
  {
    services: serviceDefs,
    schemas: schemaDefs,
    mutations,
    auths: authDefs,
    identConfig,
    queueService,
    dictionaries,
    jobs: jobsDefs = [],
  }: Definitions,
  { transporters, transformers, handlers, authenticators }: Resources,
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

  // Setup auths object from auth defs
  const auths = Array.isArray(authDefs)
    ? authDefs
        .map(
          (def) =>
            new Auth(
              def.id,
              lookupById(def.authenticator, authenticators),
              def.options
            )
        )
        .reduce(indexById, {} as Record<string, Auth>)
    : undefined

  // Prepare services
  const services = serviceDefs
    .map(
      createService({
        transporters,
        authenticators,
        auths,
        schemas,
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
    handlers: { ...builtinHandlers, ...handlers, RUN: runFn(jobs, mapOptions) }, // Set `RUN` handle here to include jobs
    middleware: middlewareForDispatch,
    options: { identConfig, queueService },
  })

  // Prepare scheduled actions
  const scheduled = jobsDefs.filter(isObject).map(createSchedule)
  const dispatchScheduled = createDispatchScheduled(dispatch, scheduled)

  // Return instance
  return {
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
