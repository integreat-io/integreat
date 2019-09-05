import { DataObject, Data, Reference, Schema, PropertySchema } from '../types'

export const isDataObject = (value: unknown): value is DataObject =>
  typeof value === 'object' && value !== null && !(value instanceof Date)

export const isCastedData = (value: unknown): value is Data =>
  typeof value === 'object' && value !== null && value.hasOwnProperty('$type')

export const isReference = (value: unknown): value is Reference =>
  typeof value === 'object' && value !== null && value.hasOwnProperty('$ref')

export const isSchema = (value: unknown): value is Schema =>
  typeof value === 'object' && value !== null && !value.hasOwnProperty('$cast')

export const isPropertySchema = (value: unknown): value is PropertySchema =>
  typeof value === 'object' && value !== null && value.hasOwnProperty('$cast')

export const isNullOrUndefined = (value: unknown): value is null | undefined =>
  value === null || value === undefined

export const isEmptyObject = (value: unknown): value is {} =>
  typeof value === 'object' && value !== null && Object.keys(value).length === 0

export const isTruthy = (value: unknown) => !!value
export const isFalsy = (value: unknown) => !value
export const not = isFalsy
