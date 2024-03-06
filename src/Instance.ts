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
import stopListening from './stopListening.js'
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
  EmitFn,
} from './types.js'
import type { AuthDef } from './service/types.js'
import type { SchemaDef } from './schema/types.js'
import type { JobDef } from './jobs/types.js'

export const setUpAuth = (authenticators?: Record<string, Authenticator>) =>
  function setUpAuth(def: AuthDef) {
    const authenticator = lookupById(def.authenticator, authenticators)
    if (!authenticator) {
      throw new Error(
        `Auth config '${def.id}' references an unknown authenticator id '${def.authenticator}'`,
      )
    }

    return new Auth(
      def.id,
      authenticator,
      def.options,
      def.overrideAuthAsMethod,
    )
  }

const setAdapterIds = (adapters?: Record<string, Adapter>) =>
  adapters
    ? Object.fromEntries(
        Object.entries(adapters).map(([id, adapter]) => [
          id,
          { ...adapter, id },
        ]),
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
  authenticators: Record<string, Authenticator>,
): Record<string, Authenticator> =>
  Object.fromEntries(
    Object.entries(authenticators ?? {}).map(([id, auth]) => [
      id,
      { ...auth, id },
    ]),
  )

const createAuthObjects = (
  authDefs: AuthDef[],
  authenticators: Record<string, Authenticator>,
) =>
  authDefs
    .map(setUpAuth(authenticators))
    .reduce(indexById, {} as Record<string, Auth>)

function prepareJobs(
  jobDefs: JobDef[],
  mapOptions: MapOptions,
  breakByDefault: boolean,
) {
  const jobs = new Map<string, Job>()
  ensureArray(jobDefs).forEach((jobDef) => {
    const job = new Job(jobDef, mapOptions, breakByDefault)
    jobs.set(job.id, new Job(jobDef, mapOptions))
  })
  return jobs
}

const combineHandlers = (
  handlers: Record<string, ActionHandler>,
  jobs: Map<string, Job>,
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
  emit: EmitFn,
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
        }),
    )
    .reduce(indexById, {} as Record<string, Service>)
}

function setupServicesAndDispatch(
  defs: Definitions,
  resources: Resources,
  schemas: Map<string, Schema>,
  middlewareForDispatch: Middleware[],
  middlewareForService: Middleware[],
  emit: EmitFn,
  dispatchedActionId: Set<string>,
) {
  const mapOptions = createMapOptions(
    schemas,
    defs.mutations,
    resources.transformers,
    defs.dictionaries,
    defs.nonvalues,
  )
  const services = createServices(
    defs,
    resources,
    schemas,
    mapOptions,
    middlewareForService,
    emit,
  )

  const breakByDefault = defs.flags?.breakByDefault ?? false
  const jobs = prepareJobs(defs.jobs || [], mapOptions, breakByDefault)
  const dispatch = createDispatch({
    schemas,
    services,
    handlers: combineHandlers(resources.handlers || {}, jobs),
    middleware: middlewareForDispatch,
    options: handlerOptionsFromDefs(defs),
    actionIds: dispatchedActionId,
    emit,
  })
  const dispatchScheduled = createDispatchScheduled(
    dispatch,
    [...jobs.values()].filter(isJobWithSchedule),
  )

  return { services, dispatch, dispatchScheduled }
}

export default class Instance extends EventEmitter {
  id?: string
  services: Record<string, Service>
  schemas: Map<string, Schema>
  identType?: string
  queueService?: string

  dispatch: Dispatch
  dispatchScheduled: (from: Date, to: Date) => Promise<Action[]>
  #dispatchedActionId: Set<string>

  constructor(
    defs: Definitions,
    resources: Resources,
    middlewareForDispatch: Middleware[] = [],
    middlewareForService: Middleware[] = [],
  ) {
    super()

    if (!Array.isArray(defs.services) || !Array.isArray(defs.schemas)) {
      throw new TypeError(
        'Please provide Integreat with at least services and schemas',
      )
    }

    this.id = defs.id
    this.identType = defs.identConfig?.type
    this.queueService = defs.queueService
    this.schemas = prepareSchemas(defs.schemas)
    this.#dispatchedActionId = new Set<string>()

    const { services, dispatch, dispatchScheduled } = setupServicesAndDispatch(
      defs,
      resources,
      this.schemas,
      middlewareForDispatch,
      middlewareForService,
      this.emit.bind(this),
      this.#dispatchedActionId,
    )

    this.services = services
    this.dispatch = dispatch
    this.dispatchScheduled = dispatchScheduled
  }

  get dispatchedCount() {
    return this.#dispatchedActionId.size
  }

  async listen(): Promise<Response> {
    return listen(Object.values(this.services), this.dispatch)
  }

  async stopListening(): Promise<Response> {
    return stopListening(Object.values(this.services))
  }

  async close(): Promise<Response> {
    return close(Object.values(this.services))
  }
}
