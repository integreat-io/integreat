import { EndpointOptions } from './service/endpoints/types'
import { ScheduleObject } from './queue/types'

export type DataValue = string | number | boolean | Date | null | undefined

export interface DataObject {
  [key: string]: Data
}

export type Data = DataValue | DataObject | Data[]

export interface TypedData extends DataObject {
  $type: string
  id?: string
  createdAt?: Date | string
  updatedAt?: Date | string
  isNew?: boolean
  isDeleted?: boolean
}

export interface Reference {
  id: string | null
  $ref: string
  isNew?: boolean
  isDeleted?: boolean
}

export interface DataFunction {
  (): Data
}

export interface TransformFunction<
  T extends DataObject = DataObject,
  U extends Data = Data
> {
  (operands: T): (value: Data) => U
}

export interface Ident {
  id?: string
  root?: boolean
  withToken?: string
  roles?: string[]
  tokens?: string[]
}

export type Params = Record<string, unknown>

export interface Paging {
  next?: Payload
  prev?: Payload
}

export interface Payload<T = unknown> extends Record<string, unknown> {
  type?: string | string[]
  id?: string | string[]
  data?: T
  sourceService?: string
  targetService?: string
  service?: string // For backward compability, may be removed
  endpoint?: string
  params?: Params
  uri?: string
  method?: string
  headers?: Record<string, string>
  page?: number
  pageSize?: number
  pageAfter?: string
  pageBefore?: string
  pageId?: string
  sendNoDefaults?: boolean
}

export interface Meta extends Record<string, unknown> {
  queue?: boolean | number
  queuedAt?: number
  schedule?: ScheduleObject | string | null
}

export interface ActionMeta extends Record<string, unknown> {
  id?: string
  ident?: Ident
  queue?: boolean | number
  schedule?: ScheduleObject | string | null
  auth?: Record<string, unknown> | null
  options?: EndpointOptions
  authorized?: boolean
}

export interface Response<T = unknown> {
  status: string | null
  data?: T
  reason?: string
  error?: string
  warning?: string
  paging?: Paging
  params?: Params
  returnNoDefaults?: boolean
  responses?: Response[] // TODO: Is this the right way?
  access?: Record<string, unknown>
  meta?: { id?: string }
}

export interface Action<P extends Payload = Payload, ResponseData = unknown> {
  type: string
  payload: P
  response?: Response<ResponseData>
  meta?: ActionMeta
}

export interface Dispatch<T = unknown> {
  (action: Action | null): Promise<Response<T>>
}

export interface InternalDispatch {
  (action: Action): Promise<Action>
}

export interface Middleware {
  (next: InternalDispatch): InternalDispatch
}

export interface Connection extends Record<string, unknown> {
  status: string
}

export interface Transporter {
  authentication: string | null
  prepareOptions: (options: Record<string, unknown>) => Record<string, unknown>
  connect: (
    options: Record<string, unknown>,
    authentication: Record<string, unknown> | null,
    connection: Connection | null
  ) => Promise<Connection | null>
  send: (action: Action, connection: Connection | null) => Promise<Action>
  disconnect: (connection: Connection | null) => Promise<void>
}
