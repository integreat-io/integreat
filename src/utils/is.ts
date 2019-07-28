import { DataObject, Data, Reference, Schema, PropertySchema } from '../types'

export const isDataObject = (value: any): value is DataObject =>
  typeof value === 'object' && value !== null && !(value instanceof Date)

export const isCastedData = (value: any): value is Data =>
  typeof value === 'object' && value !== null && value.hasOwnProperty('$schema')

export const isReference = (value: any): value is Reference =>
  typeof value === 'object' && value !== null && value.hasOwnProperty('$ref')

export const isSchema = (value: any): value is Schema =>
  typeof value === 'object' && value !== null && !value.hasOwnProperty('$cast')

export const isPropertySchema = (value: any): value is PropertySchema =>
  typeof value === 'object' && value !== null && value.hasOwnProperty('$cast')

export const isNullOrUndefined = (value: any): value is null | undefined =>
  value === null || value === undefined

export const isTruthy = (value: any) => !!value
export const isFalsy = (value: any) => !value
export const not = isFalsy
