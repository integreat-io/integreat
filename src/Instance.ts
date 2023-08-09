import EventEmitter from 'node:events'
import Auth from './service/Auth.js'
import builtinHandlers from './handlers/index.js'
import runFn from './handlers/run.js'
import Schema from './schema/Schema.js'
import Service from './service/Service.js'
import { ensureArray } from './utils/array.js'
import createMapOptions from './utils/createMapOptions.js'
import { lookupById } from './utils/indexUtils.js'
import createDispatch from './dispatch.js'
import listen from './listen.js'
import close from './close.js'
import { indexById } from './utils/indexUtils.js'
import Job from './jobs/Job.js'
import createDispatchScheduled from './dispatchScheduled.js'
import type {
  Definitions,
  Resources,
  Middleware,
  Dispatch,
  Action,
  Response,
  Adapter,
  Authenticator,
  MapOptions,
  ActionHandler,
} from './types.js'
import type { AuthDef } from './service/types.js'
import type { SchemaDef } from './schema/types.js'
import type { JobDef } from './jobs/types.js'

export const setUpAuth = (authenticators?: Record<string, Authenticator>) =>
  function setUpAuth(def: AuthDef) {
    const authenticator = lookupById(def.authenticator, authenticators)
    if (!authenticator) {
      throw new Error(
        `Auth config '${def.id}' references an unknown authenticator id '${def.authenticator}'`
      )
    }

    return new Auth(
      def.id,
      authenticator,
      def.options,
      def.overrideAuthAsMethod
    )
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

const isJobWithSchedule = (job: Job) => !!job.schedule

function prepareSchemas(schemaDefs: SchemaDef[]) {
  const schemas = new Map<string, Schema>()
  schemaDefs.forEach((def) => {
    schemas.set(def.id, new Schema(def, schemas))
  })
  return schemas
}

const setIdOnAuthenticators = (
  authenticators: Record<string, Authenticator>
): Record<string, Authenticator> =>
  Object.fromEntries(
    Object.entries(authenticators ?? {}).map(([id, auth]) => [
      id,
      { ...auth, id },
    ])
  )

const createAuthObjects = (
  authDefs: AuthDef[],
  authenticators: Record<string, Authenticator>
) =>
  authDefs
    .map(setUpAuth(authenticators))
    .reduce(indexById, {} as Record<string, Auth>)

function prepareJobs(jobDefs: JobDef[], mapOptions: MapOptions) {
  const jobs = new Map<string, Job>()
  ensureArray(jobDefs).forEach((job) => {
    if (typeof job.id === 'string') {
      jobs.set(job.id, new Job(job, mapOptions))
    }
  })
  return jobs
}

const combineHandlers = (
  handlers: Record<string, ActionHandler>,
  jobs: Map<string, Job>
) => ({
  ...builtinHandlers,
  ...handlers,
  RUN: runFn(jobs), // Set `RUN` handler here to include jobs
})

const handlerOptionsFromDefs = (defs: Definitions) => ({
  identConfig: defs.identConfig,
  queueService: defs.queueService,
})

function createServices(
  defs: Definitions,
  resources: Resources,
  schemas: Map<string, Schema>,
  mapOptions: MapOptions,
  middlewareForService: Middleware[],
  emit: (eventName: string | symbol, ...args: unknown[]) => boolean
) {
  const authenticators = setIdOnAuthenticators(resources.authenticators || {})
  const auths = createAuthObjects(defs.auths || [], authenticators)

  return defs.services
    .map(
      (def) =>
        new Service(def, {
          transporters: resources.transporters,
          adapters: setAdapterIds(resources.adapters),
          authenticators: authenticators,
          auths,
          schemas,
          mapOptions,
          middleware: middlewareForService,
          emit,
        })
    )
    .reduce(indexById, {} as Record<string, Service>)
}

export default class Instance extends EventEmitter {
  id?: string
  services: Record<string, Service>
  schemas: Map<string, Schema>
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

    this.id = defs.id
    this.identType = defs.identConfig?.type
    this.queueService = defs.queueService
    this.schemas = prepareSchemas(defs.schemas)

    const mapOptions = createMapOptions(
      this.schemas,
      defs.mutations,
      resources.transformers,
      defs.dictionaries
    )
    this.services = createServices(
      defs,
      resources,
      this.schemas,
      mapOptions,
      middlewareForService,
      this.emit.bind(this)
    )

    const jobs = prepareJobs(defs.jobs || [], mapOptions)
    this.dispatch = createDispatch({
      schemas: this.schemas,
      services: this.services,
      handlers: combineHandlers(resources.handlers || {}, jobs),
      middleware: middlewareForDispatch,
      options: handlerOptionsFromDefs(defs),
    })
    this.dispatchScheduled = createDispatchScheduled(
      this.dispatch,
      [...jobs.values()].filter(isJobWithSchedule)
    )
  }

  async listen(): Promise<Response> {
    return listen(Object.values(this.services), this.dispatch)
  }

  async close(): Promise<Response> {
    return close(Object.values(this.services))
  }
}
