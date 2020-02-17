import { MapDefinition, CustomFunction, Dictionaries } from 'map-transform'
import { AuthDef, Auth, Authentication } from './auth/types'
import {
  EndpointDef,
  EndpointOptions,
  Endpoint
} from './service/endpoints/types'

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

export interface PropertyShape {
  $cast: string
  $default?: Data | DataFunction
  $const?: Data | DataFunction
}

export interface Shape {
  [key: string]: Shape | PropertyShape | string | undefined
}

export interface TransformFunction<
  T extends DataObject = DataObject,
  U extends Data = Data
> {
  (operands: T): (value: Data) => U
}

export interface Connection extends Dictionary<unknown> {
  status: string
}

export interface Adapter {
  authentication: string
  prepareEndpoint: (
    options: EndpointOptions,
    serviceOptions?: EndpointOptions
  ) => EndpointOptions
  connect: (
    options: EndpointOptions,
    authentication: Authentication | null,
    connection: Connection | null
  ) => Promise<Connection | null>
  send: (request: Request, connection: Connection | null) => Promise<Response>
}

export interface MappingDef {
  id: string
  type?: string
  service?: string
  mapping: MapDefinition
}

export interface SchemaDef {
  id: string
  plural?: string
  service?: string
  shape?: Shape
  access?: string | object
  internal?: boolean
}

export interface IdentConfig {
  type: string
  props?: {
    id?: string
    roles?: string
    tokens?: string
  }
}

export interface MapOptions {
  pipelines?: Dictionary<MapDefinition>
  functions?: Dictionary<CustomFunction>
  dictionaries?: Dictionaries
}

export type MapDefinitions = Dictionary<string | MapDefinition>

export interface ServiceDef {
  id: string
  adapter: string | Adapter
  auth?: AuthDef | string | null
  meta?: string
  options?: { [key: string]: unknown }
  endpoints: EndpointDef[]
  mappings: MapDefinitions
}

export interface Ident {
  id: string
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
  error?: string
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
  auth?: Authentication
  meta: Meta
  endpointId?: string
  endpoint?: Endpoint
  authorized?: boolean
}

export interface Payload extends Dictionary<Data> {
  type?: string
  id?: string | string[]
  data?: Data
  service?: string
  dryrun?: boolean
  endpoint?: string
  params?: Params
}

export interface Action {
  type: string
  payload: Payload
  meta?: {
    ident?: Ident
  }
}

export interface Dispatch {
  (action: Action): Promise<Response>
}

export interface Middleware {
  (next: Dispatch): Dispatch
}
