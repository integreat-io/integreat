import {
  DataObject,
  TypedData,
  Reference,
  Schema,
  PropertySchema
} from '../types'

export const isDataObject = (value: unknown): value is DataObject =>
  typeof value === 'object' &&
  value !== null &&
  !(value instanceof Date) &&
  !Array.isArray(value)

export const isTypedData = (value: unknown): value is TypedData =>
  isDataObject(value) && value.hasOwnProperty('$type')

export const isReference = (value: unknown): value is Reference =>
  isDataObject(value) && value.hasOwnProperty('$ref')

export const isSchema = (value: unknown): value is Schema =>
  isDataObject(value) && !value.hasOwnProperty('$cast')

export const isPropertySchema = (value: unknown): value is PropertySchema =>
  isDataObject(value) && value.hasOwnProperty('$cast')

export const isNullOrUndefined = (value: unknown): value is null | undefined =>
  value === null || value === undefined

export const isEmptyObject = (value: unknown): value is {} =>
  isDataObject(value) && Object.keys(value).length === 0

export const isTruthy = (value: unknown) => !!value
export const isFalsy = (value: unknown) => !value
export const not = isFalsy
