import { MapDefinition } from 'map-transform'

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

export interface PropertySchema {
  $cast: string
  $default?: Data | DataFunction
  $const?: Data | DataFunction
}

export interface Schema {
  [key: string]: Schema | PropertySchema | string | undefined
}

export interface TransformFunction<
  T extends DataObject = DataObject,
  U extends Data = Data
> {
  (operands: T): (value: Data) => U
}

export interface MappingDef {
  id: string
  type?: string
  service?: string
  pipeline: MapDefinition
}

export interface SchemaDef {
  id: string
  plural?: string
  service?: string
  fields?: Schema
  access?: string | object
  internal?: boolean
}
