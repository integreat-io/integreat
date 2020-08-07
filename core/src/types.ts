import { Endpoint } from './service/endpoints/types'
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

export type Params = Record<string, Data>

export interface Payload extends Record<string, Data> {
  type?: string | string[]
  id?: string | string[]
  data?: Data
  service?: string
  endpoint?: string
  params?: Params
  page?: number
  pageSize?: number
}

export interface ActionMeta extends Record<string, unknown> {
  id?: string
  ident?: Ident
  queue?: boolean | number
  schedule?: ScheduleObject | null
}

export interface Action {
  type: string
  payload: Payload
  meta?: ActionMeta
}

export interface Paging {
  next?: Payload
  prev?: Payload
}

export interface Response<T = Data> {
  status: string | null
  data?: T
  error?: string
  responses?: Response[]
  access?: Record<string, unknown>
  params?: Params
  paging?: Paging
}

export interface ExchangeRequest<T = Data> {
  type?: string | string[]
  id?: string | string[]
  service?: string
  params?: Params
  data?: T
  uri?: string
  method?: string
  headers?: Record<string, string>
  page?: number
  pageSize?: number
  sendNoDefaults?: boolean
}

export interface ExchangeResponse<T = Data> {
  data?: T
  reason?: string
  error?: string
  warning?: string
  paging?: Paging
  params?: Params
  returnNoDefaults?: boolean
}

export type Meta = Record<string, Data>

export interface Exchange<T = Data, U = Data, V extends Meta = Meta> {
  type: string
  id?: string
  status: string | null
  request: ExchangeRequest<T>
  response: ExchangeResponse<U>
  ident?: Ident
  auth?: Record<string, unknown> | boolean | null
  meta: V
  endpointId?: string
  endpoint?: Endpoint
  authorized?: boolean
  incoming?: boolean
}

export interface Dispatch<T extends Data = Data> {
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
  authentication: string // ?
  prepareOptions: (options: Record<string, unknown>) => Record<string, unknown>
  connect: (
    options: Record<string, unknown>,
    authentication: Record<string, unknown> | null,
    connection: Connection | null
  ) => Promise<Connection | null>
  send: (exchange: Exchange, connection: Connection | null) => Promise<Exchange>
  disconnect: (connection: Connection | null) => Promise<void>
}
