import { MapDefinition } from 'map-transform'

export type DataValue = string | number | boolean | Date | null | undefined

export interface DataObject {
  [key: string]: DataValue | DataObject | (DataValue | DataObject)[] | undefined
}

export type GenericData = DataValue | DataObject | (DataValue | DataObject)[]

export interface Data extends DataObject {
  $schema: string
  id?: string
  createdAt?: Data | string
  updatedAt?: Data | string
}

export interface Reference {
  id: string | null
  $ref: string
}

export interface PropertySchema {
  $cast: string
  $default?: GenericData
  $const?: GenericData
}

export interface Schema {
  [key: string]: Schema | PropertySchema | string | undefined
}

export interface TransformFunction<
  T extends DataObject = DataObject,
  U extends GenericData = GenericData
> {
  (operands: T): (value: GenericData) => U
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
  attributes?: Schema
  relationships?: Schema
  access?: string | object
  internal?: boolean
}
