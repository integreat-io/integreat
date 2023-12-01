import type { PProgress } from 'p-progress'
import type {
  Dictionaries,
  Transformer,
  AsyncTransformer,
  TransformDefinition,
  Options,
} from 'map-transform/types.js'
import type {
  ServiceDef,
  AuthDef,
  IdentConfig,
  TransporterOptions,
  Authentication,
  AuthOptions,
} from './service/types.js'
import type Service from './service/Service.js'
import type { SchemaDef } from './schema/types.js'
import type { JobDef } from './jobs/types.js'

export type MapOptions = Options

export interface Reference {
  id: string | null
  $ref: string
  isNew?: boolean
  isDeleted?: boolean
}

export interface TypedData extends Record<string, unknown> {
  $type: string
  id?: string | null
  createdAt?: Date | string
  updatedAt?: Date | string
  isNew?: boolean
  isDeleted?: boolean
}

export interface ValidateObject {
  condition: TransformDefinition
  failResponse?: Response | string
  break?: boolean
}

export interface ConditionFailObject extends Record<string, unknown> {
  message?: string
  status?: string
  break?: boolean
}

export interface Condition extends Record<string, unknown> {
  onFail?: ConditionFailObject | string
}

export interface DataFunction {
  (): unknown
}

export interface TransformFunction<
  T extends Record<string, unknown> = Record<string, unknown>,
  U = unknown,
> {
  (operands: T): (value: unknown) => U
}

export enum IdentType {
  Root = 'ROOT',
  Anon = 'ANON',
  Custom = 'CUST',
}

export interface Ident {
  id?: string
  root?: boolean // Note: The `root` flag will be replaced by the `type` enum
  withToken?: string | string[]
  roles?: string[]
  tokens?: string[]
  type?: IdentType
  isCompleted?: boolean
}

export type Params = Record<string, unknown>

export interface Paging {
  next?: Payload
  prev?: Payload
}

export type Headers = Record<string, string | string[] | undefined>

export interface Payload<T = unknown> extends Record<string, unknown> {
  type?: string | string[]
  id?: string | string[]
  data?: T
  sourceService?: string
  targetService?: string
  service?: string // For backward compability, may be removed
  endpoint?: string
  uri?: string
  method?: string
  headers?: Headers
  page?: number
  pageOffset?: number
  pageSize?: number
  pageAfter?: string
  pageBefore?: string
  pageId?: string
}

export interface Meta extends Record<string, unknown> {
  id?: string
  cid?: string
  ident?: Ident
  dispatchedAt?: number
  queue?: boolean | number
  queuedAt?: number
  cache?: boolean
  auth?: Record<string, unknown> | null
  options?: TransporterOptions
}

export interface Access {
  ident?: Ident
}

export interface Response<T = unknown> {
  status?: string
  data?: T
  reason?: string
  error?: string
  warning?: string
  origin?: string
  paging?: Paging
  params?: Params
  headers?: Headers
  responses?: Response[]
  access?: Access
}

export interface Action<P extends Payload = Payload, ResponseData = unknown> {
  type: string
  payload: P
  response?: Response<ResponseData>
  meta?: Meta
}

export interface Dispatch<T = unknown> {
  (action: Action | null): PProgress<Response<T>>
}

// Dispatch without PProgress
export interface HandlerDispatch<T = unknown> {
  (action: Action): Promise<Response<T>>
}

export interface Middleware {
  (next: HandlerDispatch): HandlerDispatch
}

export interface Connection extends Record<string, unknown> {
  status: string
}

export interface Authenticator<
  T extends Authentication = Authentication,
  U extends AuthOptions = AuthOptions,
> {
  id?: string
  extractAuthKey?: (
    options: U | null,
    action: Action | null,
  ) => string | undefined
  authenticate: (
    options: AuthOptions | null,
    action: Action | null,
  ) => Promise<T>
  isAuthenticated: (
    authentication: T | null,
    options: U | null,
    action: Action | null,
  ) => boolean
  validate?: (
    authentication: T | null,
    options: AuthOptions | null,
    action: Action | null,
  ) => Promise<Response>
  authentication: {
    [asFunction: string]: (authentication: T | null) => Record<string, unknown>
  }
}

export interface AuthenticateExternal {
  (authentication: Authentication, action?: Action | null): Promise<Response>
}

export interface Transporter {
  defaultAuthAsMethod?: string | null // Preferred alias of `authentication`
  authentication?: string | null // For backward compability, may be removed
  prepareOptions: (
    options: TransporterOptions,
    serviceId: string,
  ) => Record<string, unknown>
  connect: (
    options: TransporterOptions,
    authentication: Record<string, unknown> | null,
    connection: Connection | null,
    emit: (eventType: string, ...args: unknown[]) => void,
  ) => Promise<Connection | null>
  send: (action: Action, connection: Connection | null) => Promise<Response>
  shouldListen?: (options: TransporterOptions) => boolean
  listen?: (
    dispatch: Dispatch,
    connection: Connection | null,
    authenticate: AuthenticateExternal,
  ) => Promise<Response>
  disconnect: (connection: Connection | null) => Promise<void>
}

export interface Adapter {
  id?: string
  prepareOptions: (
    options: Record<string, unknown>,
    serviceId: string,
  ) => Record<string, unknown>
  normalize: (
    action: Action,
    options: Record<string, unknown>,
  ) => Promise<Action>
  serialize: (
    action: Action,
    options: Record<string, unknown>,
  ) => Promise<Action>
}

export interface GetService {
  (type?: string | string[], serviceId?: string): Service | undefined
}

export interface SetProgress {
  (progress: number): void
}

export interface HandlerOptions {
  identConfig?: IdentConfig
  queueService?: string
}

export interface ActionHandlerResources {
  dispatch: HandlerDispatch
  getService: GetService
  setProgress: SetProgress
  options: HandlerOptions
}

export interface ActionHandler<T = unknown> {
  (action: Action, resources: ActionHandlerResources): Promise<Response<T>>
}

export interface DefintionFlags {
  breakByDefault?: boolean
}

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
  flags?: DefintionFlags
}

export interface Resources {
  transporters?: Record<string, Transporter>
  adapters?: Record<string, Adapter>
  handlers?: Record<string, ActionHandler>
  authenticators?: Record<string, Authenticator>
  transformers?: Record<string, Transformer | AsyncTransformer>
}
