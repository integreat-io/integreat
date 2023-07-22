import EventEmitter from 'node:events'
import mapTransform from 'map-transform'
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
import type {
  Definitions,
  Resources,
  Middleware,
  Dispatch,
  JobDef,
  Action,
  Response,
  Adapter,
  Authenticator,
} from './types.js'
import type { AuthDef } from './service/types.js'

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

export default class Instance extends EventEmitter {
  id?: string
  services: Record<string, Service>
  schemas: Record<string, Schema>
  identType?: string
  queueService?: string

  dispatch: Dispatch
  dispatchScheduled: (from: Date, to: Date) => Promise<Action[]>

  constructor(
    defs: Definitions,
    resources: Resources,
    middlewareForDispatch: Middleware[] = [],
    middlewareForService: Middleware[] = []
  ) {
    super()

    if (!Array.isArray(defs.services) || !Array.isArray(defs.schemas)) {
      throw new TypeError(
        'Please provide Integreat with at least services and schemas'
      )
    }

    // Prepare schemas
    const schemas = defs.schemas
      .map(createSchema)
      .reduce(indexById, {} as Record<string, Schema>)

    // Prepare map options
    const mapOptions = createMapOptions(
      schemas,
      defs.mutations,
      { ...builtinTransformers, ...resources.transformers },
      defs.dictionaries
    )

    // Prepare cast functions
    const castFns = Object.fromEntries(
      Object.entries(schemas).map(([type, schema]) => [
        type,
        mapTransform(schema.mapping, mapOptions),
      ])
    )

    // Set id on all authenticators
    const authenticatorsWithId = Object.fromEntries(
      Object.entries(resources.authenticators ?? {}).map(([id, auth]) => [
        id,
        { ...auth, id },
      ])
    )

    // Setup auths object from auth defs
    const auths = Array.isArray(defs.auths)
      ? defs.auths
          .map(setUpAuth(authenticatorsWithId))
          .reduce(indexById, {} as Record<string, Auth>)
      : undefined

    // Prepare services
    const services = defs.services
      .map(
        (def) =>
          new Service(def, {
            transporters: resources.transporters,
            adapters: setAdapterIds(resources.adapters),
            authenticators: authenticatorsWithId,
            auths,
            schemas,
            castFns,
            mapOptions,
            middleware: middlewareForService,
            emit: this.emit.bind(this),
          })
      )
      .reduce(indexById, {} as Record<string, Service>)

    // Prepare jobs
    const { jobs: jobsDefs = [] } = defs
    const jobs = jobsDefs.reduce(
      (jobs, job) =>
        typeof job.id === 'string' ? { ...jobs, [job.id]: job } : jobs,
      {} as Record<string, JobDef>
    )

    // Create dispatch
    const dispatch = createDispatch({
      schemas,
      services,
      handlers: {
        ...builtinHandlers,
        ...resources.handlers,
        RUN: runFn(jobs, mapOptions),
      }, // Set `RUN` handler here to include jobs
      middleware: middlewareForDispatch,
      options: {
        identConfig: defs.identConfig,
        queueService: defs.queueService,
      },
    })

    // Prepare scheduled actions
    const scheduled = jobsDefs.filter(isObject).map(createSchedule)
    const dispatchScheduled = createDispatchScheduled(dispatch, scheduled)

    this.id = defs.id
    this.services = services
    this.schemas = schemas
    this.identType = defs.identConfig?.type
    this.queueService = defs.queueService
    this.dispatch = dispatch
    this.dispatchScheduled = dispatchScheduled
  }

  async listen(): Promise<Response> {
    return listen(Object.values(this.services), this.dispatch)
  }

  async close(): Promise<Response> {
    return close(Object.values(this.services))
  }
}
