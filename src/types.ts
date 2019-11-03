import { MapDefinition, CustomFunction, Dictionaries } from 'map-transform'
import { AuthDef, Auth } from './auth/types'
import { EndpointDef, EndpointOptions } from './endpoints/types'

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

export interface Adapter {
  authentication: string
  prepareEndpoint: (
    options?: EndpointOptions,
    serviceOptions?: EndpointOptions
  ) => EndpointOptions
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

export interface ServiceDef {
  id: string
  adapter: string | Adapter
  auth?: AuthDef | string | null
  meta?: string | null
  options?: { [key: string]: unknown }
  endpoints: EndpointDef[]
  mappings: Dictionary<string | MapDefinition>
}

export interface Ident {
  id: string
  root?: boolean
}

export interface Request<T = Data> {
  action: string
  params: Dictionary<Data>
  endpoint: Dictionary<Data>
  data?: T
  auth?: Auth | boolean
  access?: { ident: Ident }
}

export interface Response<T = Data> {
  status: string
  data?: T
  error?: string
  responses?: Response[]
  access?: object
  params?: Dictionary<Data>
}

export interface Payload extends Dictionary<Data> {
  type?: string
  id?: string
  data?: Data
  service?: string
  dryrun?: boolean
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
