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
  createdAt?: TypedData | string
  updatedAt?: TypedData | string
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
  page?: number
  pageSize?: number
  pageAfter?: string
  pageBefore?: string
  pageId?: string
}

export interface ExchangeRequest<T = unknown> {
  type?: string | string[]
  id?: string | string[]
  params?: Params
  data?: T
  uri?: string
  method?: string
  headers?: Record<string, string>
  page?: number
  pageAfter?: string
  pageBefore?: string
  pageSize?: number
  pageId?: string
  sendNoDefaults?: boolean
}

export interface ExchangeResponse<T = unknown> {
  data?: T
  reason?: string
  error?: string
  warning?: string
  paging?: Paging
  params?: Params
  returnNoDefaults?: boolean
}

export type Meta = Record<string, unknown>

export interface Exchange<
  RequestData = unknown,
  ResponseData = unknown,
  MetaData extends Meta = Meta
> {
  type: string
  id?: string
  status: string | null
  request: ExchangeRequest<RequestData>
  response: ExchangeResponse<ResponseData>
  ident?: Ident
  auth?: Record<string, unknown> | null
  meta: MetaData
  endpointId?: string
  options?: EndpointOptions
  authorized?: boolean
  source?: string
  target?: string
}

export interface ActionMeta extends Record<string, unknown> {
  id?: string
  ident?: Ident
  queue?: boolean | number
  schedule?: ScheduleObject | string | null
}

export interface Action<P extends Payload = Payload> {
  type: string
  payload: P
  meta?: ActionMeta
}

export interface Response<T = unknown> extends ExchangeResponse<T> {
  status: string | null
  responses?: Response[] // TODO: Is this the right way?
  access?: Record<string, unknown>
}

export interface Dispatch<T = unknown> {
  (action: Action | null): Promise<Response<T>>
}

export interface InternalDispatch {
  (exchange: Exchange): Promise<Exchange>
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
  send: (exchange: Exchange, connection: Connection | null) => Promise<Exchange>
  disconnect: (connection: Connection | null) => Promise<void>
}
