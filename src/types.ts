import Auth from './service/Auth'
import { Endpoint } from './service/endpoints/types'

export interface Dictionary<T> {
  [key: string]: T
}

export type DataValue = string | number | boolean | Date | null | undefined

export interface DataObject {
  [key: string]: Data
}

export type Data = DataValue | DataObject | DataArray

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataArray extends Array<Data> {}

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

export type Params = Dictionary<Data>

export interface Request<T = Data> {
  action: string
  params: Params
  endpoint: Dictionary<unknown>
  data?: T
  auth?: Auth | boolean | null
  access?: { ident: Ident }
}

export interface Response<T = Data> {
  status: string | null
  data?: T
  error?: string
  responses?: Response[]
  access?: object
  params?: Params
}

export interface ExchangeRequest<T = Data> {
  type?: string | string[]
  id?: string | string[]
  service?: string
  params?: Params
  data?: T
  uri?: string
  method?: string
  headers?: Dictionary<string>
  page?: number
  pageSize?: number
}

export interface ExchangeResponse<T = Data> {
  data?: T
  reason?: string
  error?: string
  warning?: string
  paging?: object
  params?: Params
}

export type Meta = Dictionary<Data>

export interface Exchange<ReqData = Data, RespData = Data> {
  type: string
  id?: string
  status: string | null
  request: ExchangeRequest<ReqData>
  response: ExchangeResponse<RespData>
  ident?: Ident
  auth?: object | null
  meta: Meta
  endpointId?: string
  endpoint?: Endpoint
  authorized?: boolean
  incoming?: boolean
}

export interface Payload extends Dictionary<Data> {
  type?: string | string[]
  id?: string | string[]
  data?: Data
  service?: string
  dryrun?: boolean
  endpoint?: string
  params?: Params
  page?: number
  pageSize?: number
}

export interface ActionMeta {
  [key: string]: unknown
  ident?: Ident
}

export interface Action {
  type: string
  payload: Payload
  meta?: ActionMeta
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
